'use strict';

/**
 * src/services/ai/gemini-parser.js
 * Core extraction service orchestrating live Gemini API calls and offline mock fallbacks.
 * Conforms to Interface Contract #2 in PROJECT.md.
 */

let GoogleGenAI;
try {
  ({ GoogleGenAI } = require('@google/genai'));
} catch {
  // Handled dynamically if @google/genai is not available
}

const { CRITERIA_SCHEMA } = require('./schema');
const { SYSTEM_INSTRUCTION, buildExtractionPrompt, DEFAULT_EXTRACTION_CONFIG } = require('./prompt');
const { generateMockResponse, getEmptyCriteria } = require('./mock-gemini');

/**
 * Safely parses JSON string, stripping optional markdown code fences and conversational prose.
 * @param {string} text 
 * @returns {Object}
 */
function parseJsonSafely(text) {
  if (typeof text !== 'string') {
    throw new Error('Model response text is not a string.');
  }
  const clean = text.replace(/^\uFEFF/, '').trim();

  // Fast path: clean JSON string directly
  if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    try {
      return JSON.parse(clean);
    } catch {
      // Fall through to resilient extractors if direct parse fails
    }
  }

  // Attempt 1: Extract from markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Fall through
    }
  }

  // Attempt 2: Unclosed markdown code fence (```json ... [EOF])
  const unclosedMatch = clean.match(/^```(?:json)?\s*\n?([\s\S]+)$/i);
  if (unclosedMatch) {
    try {
      return JSON.parse(unclosedMatch[1].trim());
    } catch {
      // Fall through
    }
  }

  // Attempt 3: Outermost JSON object extraction from conversational prose
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    } catch {
      // Fall through
    }
  }

  // Fallback: standard JSON.parse on full text to produce standard SyntaxError
  return JSON.parse(clean);
}

/**
 * Normalizes raw parsed criteria data to guarantee full compliance with Interface Contract #2.
 * @param {Object} raw 
 * @returns {Object}
 */
function normalizeCriteriaData(raw) {
  if (!raw || typeof raw !== 'object') {
    return getEmptyCriteria();
  }

  const d = raw;
  const eligibility = d.eligibility || {};
  const importantDates = d.importantDates || {};
  const applicationFee = d.applicationFee || {};

  return {
    examTitle: typeof d.examTitle === 'string' && d.examTitle.trim() ? d.examTitle.trim() : null,
    organization: typeof d.organization === 'string' && d.organization.trim() ? d.organization.trim() : null,
    eligibility: {
      minAge: typeof eligibility.minAge === 'number' && Number.isFinite(eligibility.minAge) && eligibility.minAge >= 0
        ? eligibility.minAge
        : null,
      maxAge: typeof eligibility.maxAge === 'number' && Number.isFinite(eligibility.maxAge) && eligibility.maxAge >= 0
        ? eligibility.maxAge
        : null,
      ageRelaxation: Array.isArray(eligibility.ageRelaxation)
        ? eligibility.ageRelaxation
            .filter(r => r && typeof r === 'object')
            .map(r => ({
              category: typeof r.category === 'string' ? r.category : 'General',
              years: typeof r.years === 'number' && Number.isFinite(r.years) && r.years >= 0 ? r.years : 0
            }))
        : [],
      requiredEducation: Array.isArray(eligibility.requiredEducation)
        ? eligibility.requiredEducation.filter(e => typeof e === 'string')
        : [],
      eligibleStreams: Array.isArray(eligibility.eligibleStreams)
        ? eligibility.eligibleStreams.filter(s => typeof s === 'string')
        : []
    },
    importantDates: {
      applicationStartDate: typeof importantDates.applicationStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(importantDates.applicationStartDate)
        ? importantDates.applicationStartDate
        : null,
      applicationEndDate: typeof importantDates.applicationEndDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(importantDates.applicationEndDate)
        ? importantDates.applicationEndDate
        : null,
      examDate: typeof importantDates.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(importantDates.examDate)
        ? importantDates.examDate
        : null
    },
    vacancies: typeof d.vacancies === 'number' && Number.isInteger(d.vacancies) && d.vacancies >= 0
      ? d.vacancies
      : null,
    applicationFee: {
      general: typeof applicationFee.general === 'number' && Number.isFinite(applicationFee.general) && applicationFee.general >= 0
        ? applicationFee.general
        : null,
      reserved: typeof applicationFee.reserved === 'number' && Number.isFinite(applicationFee.reserved) && applicationFee.reserved >= 0
        ? applicationFee.reserved
        : null
    },
    status: typeof d.status === 'string' && d.status.trim() ? d.status.trim() : 'UNKNOWN'
  };
}

/**
 * Alias for normalizeCriteriaData to ensure backwards compatibility with any explorer imports
 */
const normalizeExtractedData = normalizeCriteriaData;

/**
 * Safely extracts a human-readable error message from any thrown value.
 * Guards against null, undefined, primitives, non-Error objects, and circular structures.
 * @param {unknown} err
 * @returns {string}
 */
function extractErrorMessage(err) {
  if (err === null || err === undefined) {
    return 'Unknown error (null or undefined rejection)';
  }
  if (typeof err === 'object') {
    if (typeof err.message === 'string' && err.message.trim().length > 0) {
      return err.message.trim();
    }
    if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string' && err.error.message.trim().length > 0) {
      return err.error.message.trim();
    }
    if (typeof err.statusText === 'string' && err.statusText.trim().length > 0) {
      return err.statusText.trim();
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') {
        return json;
      }
    } catch {
      // Circular reference fallback
    }
  }
  const str = String(err).trim();
  return str.length > 0 ? str : 'Unknown error';
}

/**
 * Safely extracts raw response object or null from any thrown error.
 * @param {unknown} err
 * @returns {Object|null}
 */
function extractRawResponse(err) {
  if (err && typeof err === 'object' && err.response !== undefined && err.response !== null) {
    return err.response;
  }
  return null;
}

/**
 * Main entry point: Parses targeted notification text into structured criteria.
 * 
 * @param {string} targetedText - Extracted text from PDF parser
 * @param {Object} [options={}]
 * @param {string} [options.apiKey] - Google Gemini API key (defaults to process.env.GEMINI_API_KEY)
 * @param {string} [options.model='gemini-2.5-flash'] - Model name
 * @param {boolean} [options.mockMode] - Explicitly enable or disable mock mode
 * @param {Object} [options.client] - Injected GoogleGenAI client (for testing)
 * @param {boolean} [options.fallbackToMockOnError=false] - Fall back to mock on API errors
 * @returns {Promise<Object>} CriteriaEnvelope conforming to Interface Contract #2
 */
async function parseStructuredCriteria(targetedText, options = {}) {
  const opts = options || {};
  const model = opts.model || 'gemini-2.5-flash';
  const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;

  // 1. Input Type Validation
  if (typeof targetedText !== 'string') {
    return {
      success: false,
      isMock: Boolean(opts.mockMode),
      modelUsed: model,
      data: null,
      error: 'Invalid input: targetedText must be a non-null string.'
    };
  }

  // 2. Mock Mode Arbitration
  const isExplicitMock = opts.mockMode === true;
  const isAutoMock = !apiKey && opts.mockMode !== false && !opts.client;

  if (isExplicitMock || isAutoMock) {
    return generateMockResponse(targetedText, { ...opts, modelUsed: 'mock-rules-v1' });
  }

  // 3. Key Absence with Explicit mockMode: false
  if (!apiKey && !opts.client) {
    return {
      success: false,
      isMock: false,
      modelUsed: model,
      data: null,
      error: 'GEMINI_API_KEY is required when mockMode is false.'
    };
  }

  // 4. Empty/Whitespace Input in Live / Client Double Mode
  if (!targetedText.trim()) {
    return {
      success: true,
      isMock: false,
      modelUsed: model,
      data: getEmptyCriteria(),
      rawResponse: null
    };
  }

  // 5. Live / Injected Client Execution
  try {
    let ai = opts.client;
    if (typeof opts.clientFactory === 'function') {
      ai = opts.clientFactory({ apiKey, model });
    } else if (!ai) {
      if (!GoogleGenAI) {
        ({ GoogleGenAI } = require('@google/genai'));
      }
      ai = new GoogleGenAI({ apiKey });
    }

    const userPrompt = buildExtractionPrompt(targetedText, opts);

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        ...DEFAULT_EXTRACTION_CONFIG,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: CRITERIA_SCHEMA
      }
    });

    const parsedRaw = parseJsonSafely(response.text);
    const normalizedData = normalizeCriteriaData(parsedRaw);

    return {
      success: true,
      isMock: false,
      modelUsed: model,
      data: normalizedData,
      rawResponse: response
    };
  } catch (err) {
    const errorMessage = extractErrorMessage(err);
    const rawResponse = extractRawResponse(err);

    if (opts.fallbackToMockOnError) {
      return {
        ...generateMockResponse(targetedText, opts),
        error: `Gemini API call failed (${errorMessage}); fell back to mock mode`
      };
    }

    return {
      success: false,
      isMock: false,
      modelUsed: model,
      data: null,
      error: errorMessage,
      rawResponse
    };
  }
}

module.exports = { parseStructuredCriteria, normalizeCriteriaData, normalizeExtractedData, parseJsonSafely, verifyScrapedExamsBatch, auditFinalExamLogic };;

/**
 * Checkpoint 1: Scrape Verifier
 * Batches multiple scraped exams and asks Gemini if they are valid Indian government exams.
 * Returns an array of valid exam IDs.
 */
async function verifyScrapedExamsBatch(exams, options = {}) {
  if (!exams || exams.length === 0) return [];
  const opts = options || {};
  const model = opts.model || 'gemini-2.5-flash';
  const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey && !opts.client) return exams.map(e => e.id); // Passthrough if no key

  try {
    let ai = opts.client;
    if (!ai) {
      const { GoogleGenAI } = require('@google/genai');
      ai = new GoogleGenAI({ apiKey });
    }

    const payload = exams.map(e => ({ id: e.id, title: e.title, organization: e.organization }));
    const prompt = `You are a strict data quality inspector for an Indian government exam portal.
Review the following list of scraped records. Filter out any that are obvious advertisements, broken links, or non-exam junk.
Return a JSON array containing ONLY the 'id' strings of the valid exams.

Scraped Data:
${JSON.stringify(payload, null, 2)}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of valid exam IDs'
        }
      }
    });

    const validIds = parseJsonSafely(response.text);
    return Array.isArray(validIds) ? validIds : exams.map(e => e.id);
  } catch (err) {
    console.warn('âa ï¸ Scrape Verifier failed (falling back to accepting all):', extractErrorMessage(err));
    return exams.map(e => e.id);
  }
}

/**
 * Checkpoint 3: Pre-Database Auditor
 * Validates the logical consistency of an exam before it is saved to the database.
 */
async function auditFinalExamLogic(exam, options = {}) {
  const opts = options || {};
  const model = opts.model || 'gemini-2.5-flash';
  const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey && !opts.client) return { isLogicallySound: true, reason: 'Skipped (No API Key)' };

  try {
    let ai = opts.client;
    if (!ai) {
      const { GoogleGenAI } = require('@google/genai');
      ai = new GoogleGenAI({ apiKey });
    }

    const prompt = `You are a logic auditor for a government exam portal.
Review the following exam record. Check for fatal logical errors:
1. Is minAge greater than maxAge?
2. Are the application dates completely nonsensical (e.g., end date before start date)?
If there are fatal errors that make this record corrupt, return isLogicallySound: false with a reason.
Otherwise, return true.

Exam Record:
${JSON.stringify(exam, null, 2)}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            isLogicallySound: { type: 'boolean' },
            reason: { type: 'string' }
          },
          required: ['isLogicallySound', 'reason']
        }
      }
    });

    const result = parseJsonSafely(response.text);
    return {
      isLogicallySound: result?.isLogicallySound ?? true,
      reason: result?.reason ?? 'Passed'
    };
  } catch (err) {
    console.warn('âa ï¸ Pre-DB Auditor failed (falling back to accepting):', extractErrorMessage(err));
    return { isLogicallySound: true, reason: 'Auditor Error Fallback' };
  }
}



