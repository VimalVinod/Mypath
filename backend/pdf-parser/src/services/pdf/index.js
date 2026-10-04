'use strict';

/**
 * src/services/pdf/index.js
 * Central entry point and facade for the PDF parsing service.
 */

const { UnpdfAdapter, PdfError } = require('./adapters/unpdf-adapter');
const { MockPdfAdapter } = require('./adapters/mock-adapter');
const { segmentSentences, splitSentences, cleanPdfText, ABBREVIATIONS } = require('./sentence-segmenter');
const { extractTargetedPdfText, compileKeywords, calculateMetrics, resolveAdapter } = require('./pdf-extractor');

/**
 * Factory creating or resolving a PDF adapter instance.
 * @param {'unpdf'|'mock'|Object} [typeOrInstance='unpdf'] Adapter name or existing adapter instance
 * @param {Object} [options={}] Configuration options for the adapter
 * @returns {UnpdfAdapter|MockPdfAdapter|Object}
 */
function createPdfAdapter(typeOrInstance = 'unpdf', options = {}) {
  return resolveAdapter(typeOrInstance, options);
}

/**
 * Direct page extraction utility using the configured adapter.
 * @param {string|Buffer|Uint8Array} input
 * @param {Object} [options]
 * @param {'unpdf'|'mock'|Object} [options.adapter='unpdf']
 * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }>, hasText: boolean, emptyPages: number[] }>}
 */
async function extractPdfPages(input, options = {}) {
  const adapter = createPdfAdapter(options.adapter, options);
  return adapter.extractPages(input, options);
}

module.exports = {
  // Classes
  UnpdfAdapter,
  MockPdfAdapter,
  PdfError,

  // Adapter Factory & Utilities
  createPdfAdapter,
  extractPdfPages,

  // Core Extractor
  extractTargetedPdfText,
  compileKeywords,
  calculateMetrics,

  // Sentence Segmenter & Cleaners
  segmentSentences,
  splitSentences,
  cleanPdfText,
  ABBREVIATIONS
};
