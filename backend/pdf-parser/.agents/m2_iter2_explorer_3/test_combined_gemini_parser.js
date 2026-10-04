'use strict';

const assert = require('node:assert/strict');
const { getEmptyCriteria, generateMockResponse } = require('../../src/services/ai/mock-gemini');

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
      // Fall through to resilient regex extractors
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

function normalizeCriteriaData(raw) {
  if (!raw || typeof raw !== 'object') {
    return getEmptyCriteria();
  }

  const d = raw;
  const eligibility = (d.eligibility && typeof d.eligibility === 'object') ? d.eligibility : {};
  const importantDates = (d.importantDates && typeof d.importantDates === 'object') ? d.importantDates : {};
  const applicationFee = (d.applicationFee && typeof d.applicationFee === 'object') ? d.applicationFee : {};

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
              category: typeof r.category === 'string' && r.category.trim() ? r.category.trim() : 'General',
              years: typeof r.years === 'number' && Number.isFinite(r.years) && r.years >= 0 ? r.years : 0
            }))
        : [],
      requiredEducation: Array.isArray(eligibility.requiredEducation)
        ? eligibility.requiredEducation.filter(e => typeof e === 'string' && e.trim().length > 0)
        : [],
      eligibleStreams: Array.isArray(eligibility.eligibleStreams)
        ? eligibility.eligibleStreams.filter(s => typeof s === 'string' && s.trim().length > 0)
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
    } catch {}
  }
  const str = String(err).trim();
  return str.length > 0 ? str : 'Unknown error';
}

function extractRawResponse(err) {
  if (err && typeof err === 'object' && err.response !== undefined && err.response !== null) {
    return err.response;
  }
  return null;
}

async function parseStructuredCriteriaPatched(targetedText, options = {}) {
  const opts = options || {};
  const model = opts.model || 'gemini-2.5-flash';
  const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;

  if (typeof targetedText !== 'string') {
    return {
      success: false,
      isMock: Boolean(opts.mockMode),
      modelUsed: model,
      data: null,
      error: 'Invalid input: targetedText must be a non-null string.'
    };
  }

  const isExplicitMock = opts.mockMode === true;
  const isAutoMock = !apiKey && opts.mockMode !== false && !opts.client;

  if (isExplicitMock || isAutoMock) {
    return generateMockResponse(targetedText, { ...opts, modelUsed: 'mock-rules-v1' });
  }

  if (!apiKey && !opts.client) {
    return {
      success: false,
      isMock: false,
      modelUsed: model,
      data: null,
      error: 'GEMINI_API_KEY is required when mockMode is false.'
    };
  }

  if (!targetedText.trim()) {
    return {
      success: true,
      isMock: false,
      modelUsed: model,
      data: getEmptyCriteria(),
      rawResponse: null
    };
  }

  try {
    let ai = opts.client;
    if (typeof opts.clientFactory === 'function') {
      ai = opts.clientFactory({ apiKey, model });
    }

    const response = await ai.models.generateContent({});
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

async function testAll() {
  // Test 2.8: client double rejecting with null
  const clientNull = { models: { generateContent: async () => { throw null; } } };
  const resNull = await parseStructuredCriteriaPatched('sample text', { apiKey: 'k', client: clientNull });
  assert.equal(resNull.success, false);
  assert.equal(resNull.data, null);
  assert.ok(typeof resNull.error === 'string' && resNull.error.length > 0);
  assert.equal(resNull.rawResponse, null);

  // Test 2.9: client double rejecting with undefined
  const clientUndef = { models: { generateContent: async () => { throw undefined; } } };
  const resUndef = await parseStructuredCriteriaPatched('sample text', { apiKey: 'k', client: clientUndef });
  assert.equal(resUndef.success, false);
  assert.equal(resUndef.data, null);
  assert.ok(typeof resUndef.error === 'string' && resUndef.error.length > 0);

  // Test 2.13: fallbackToMockOnError: true when client throws null
  const resFallback = await parseStructuredCriteriaPatched('Candidate must be of age 21 to 32 years.', {
    apiKey: 'k',
    client: clientNull,
    fallbackToMockOnError: true
  });
  assert.equal(resFallback.success, true);
  assert.equal(resFallback.isMock, true);
  assert.ok(resFallback.data !== null);
  assert.match(resFallback.error, /Gemini API call failed/);

  // Test 1.6: Markdown code fence with trailing commentary
  const clientTrailing = { models: { generateContent: async () => ({ text: '```json\n{"examTitle": "UPSC 2026", "status": "ACTIVE"}\n```\nNote: All fields were parsed accurately.' }) } };
  const resTrailing = await parseStructuredCriteriaPatched('sample text', { apiKey: 'k', client: clientTrailing });
  assert.equal(resTrailing.success, true);
  assert.equal(resTrailing.data.examTitle, 'UPSC 2026');

  // Test 1.7: Markdown code fence with leading conversational prose
  const clientLeading = { models: { generateContent: async () => ({ text: 'Here is the extracted JSON criteria:\n```json\n{"examTitle": "UPSC 2026", "status": "ACTIVE"}\n```' }) } };
  const resLeading = await parseStructuredCriteriaPatched('sample text', { apiKey: 'k', client: clientLeading });
  assert.equal(resLeading.success, true);
  assert.equal(resLeading.data.examTitle, 'UPSC 2026');

  console.log('ALL COMBINED PATCHED TESTS PASSED!');
}

testAll().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
