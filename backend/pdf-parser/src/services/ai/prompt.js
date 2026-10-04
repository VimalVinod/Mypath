'use strict';

/**
 * src/services/ai/prompt.js
 * Grounded extraction system instructions and prompt builders for Gemini API.
 * Enforces zero-hallucination and closed-world assumption constraints.
 */

const SYSTEM_INSTRUCTION = `You are a precision data extraction engine specialized in public recruitment notifications and competitive examination circulars.

Your task is to extract structured examination criteria strictly and exclusively from the provided targeted text according to the requested JSON schema.

CRITICAL ZERO-HALLUCINATION RULES:
1. STRICT GROUNDING: Every extracted value MUST be explicitly stated in the provided text. Never extrapolate, assume, infer, or use external knowledge about the organization, exam, or statutory rules.
2. NULL DEFAULT FOR UNMENTIONED SCALARS: If a scalar field (such as examTitle, organization, minAge, maxAge, applicationStartDate, applicationEndDate, examDate, vacancies, general fee, reserved fee) is not explicitly mentioned in the text, you MUST return null. Never use 0, "N/A", "None", or empty string as a fallback for scalar fields.
3. EMPTY ARRAY DEFAULT FOR UNMENTIONED LISTS: If no age relaxations, required educational degrees, or eligible streams are mentioned, return an empty array [] for those fields. Never invent categories or qualifications.
4. EXACT VALUE NORMALIZATION:
   - Numbers: Must be numeric values (integers). For age limits, extract integer years (e.g., 21, not "21 years"). For vacancies, extract integer count (e.g., 1056). For fees, extract integer currency amount in INR (e.g., 100 for "Rs. 100").
   - Fee Exemption: If reserved categories or females are explicitly exempt or fee is "Nil" or "free", set reserved fee to 0. If fee is not mentioned at all, set to null.
   - Dates: Must be normalized to ISO 8601 calendar date format "YYYY-MM-DD". If a date cannot be resolved to a specific day, return null.
   - Age Relaxation: Each item must be an object with { category: string, years: number }. E.g., { category: "SC/ST", years: 5 }, { category: "OBC", years: 3 }.
   - Status: One of "ACTIVE", "UPCOMING", "CLOSED", "EXPIRED", "UNKNOWN". If application dates indicate the process is currently active or open, use "ACTIVE". If deadline has passed, use "CLOSED" or "EXPIRED". If future start date, use "UPCOMING". If dates are not mentioned, use "UNKNOWN".
5. IGNORE STRUCTURAL ARTIFACTS: Page markers like "--- [Page X] ---", headers, footers, and page numbers are document artifacts and not part of the exam title or content.`;

/**
 * Builds the user prompt containing the targeted notification text.
 * @param {string} targetedText 
 * @param {Object} [options={}]
 * @returns {string} Formatted user prompt
 */
function buildExtractionPrompt(targetedText, options = {}) {
  if (typeof targetedText !== 'string') {
    throw new TypeError('Targeted notification text must be a string.');
  }

  const cleanText = targetedText.trim();
  if (!cleanText) {
    return `--- BEGIN TARGETED TEXT ---
(empty document)
--- END TARGETED TEXT ---

The provided document is empty. Return the JSON schema with all fields set to null or empty arrays.`;
  }

  return `Please analyze the following targeted recruitment notification text and extract all structured criteria adhering strictly to the JSON schema and zero-hallucination rules. Extract ONLY information explicitly present in the text and default any unmentioned scalar fields to null and lists to [].

--- BEGIN TARGETED TEXT ---
${cleanText}
--- END TARGETED TEXT ---

Extract all matching criteria from the text above strictly conforming to the JSON schema.`;
}

/**
 * Alias for buildExtractionPrompt
 */
const buildPrompt = buildExtractionPrompt;

/**
 * Default generation configuration for deterministic extraction.
 */
const DEFAULT_EXTRACTION_CONFIG = {
  temperature: 0.0,
  topP: 0.95,
  maxOutputTokens: 2048,
  responseMimeType: 'application/json'
};

module.exports = {
  SYSTEM_INSTRUCTION,
  buildExtractionPrompt,
  buildPrompt,
  DEFAULT_EXTRACTION_CONFIG
};
