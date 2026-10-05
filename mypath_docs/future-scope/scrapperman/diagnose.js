'use strict';
/**
 * diagnose.js — The Doctor
 * Uses Google Gemini API to analyze website layout changes and failures.
 */

const { GoogleGenAI } = require('@google/genai');

/**
 * @param {string} source - 'upsc' | 'ssc'
 * @param {Object} issue - The triggered issue from health-rules.js
 * @param {Object} options - { registry, htmlContent }
 * @returns {Promise<DiagnosticReport>}
 */
async function diagnoseFailure(source, issue, options = {}) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY missing' };
    }

    const ai = new GoogleGenAI({ apiKey });
    const reg = options.registry || {};
    const htmlContent = options.htmlContent || '(No HTML content provided)';

    const prompt = `
You are ScrapperMan, an expert web scraping diagnostic AI.
The scraper for ${reg.name || source} has failed or detected an anomaly.

ISSUE: ${issue.name} (${issue.description})
SOURCE URL: ${reg.primary?.url || 'Unknown'}
EXPECTED SELECTOR: ${JSON.stringify(reg.selectors || {})}

Here is the raw HTML/JSON content we received (truncated to first 10000 chars):
---
${String(htmlContent).substring(0, 10000)}
---

Analyze the content and provide a root cause and suggested fix.
Return ONLY a valid JSON object matching this schema:
{
  "rootCause": "Explanation of what changed on the website",
  "suggestedFix": "Code/selector update needed",
  "confidence": "HIGH|MEDIUM|LOW"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    const json = JSON.parse(text);

    return {
      success: true,
      rootCause: json.rootCause || 'Unknown',
      suggestedFix: json.suggestedFix || 'Unknown',
      confidence: json.confidence || 'LOW',
      rawResponse: json
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { diagnoseFailure };
