'use strict';

/**
 * simulate_fixes.js
 * Verify that the proposed changes fix:
 * 1. Buffer detachment / caller buffer mutation
 * 2. Null options handling
 * 3. NaN context window
 * 4. Typographic quote segmentation
 * 5. Challenge harness 29/29 check
 */

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

// Let's monkey-patch or load modified modules in memory to test against challenge_harness
// First, let's test the sentence segmenter with the new regex
const segmenterCode = fs.readFileSync(path.resolve(__dirname, '../../src/services/pdf/sentence-segmenter.js'), 'utf8');
const patchedSegmenterCode = segmenterCode.replace(
  `/(?<=[.!?]["')\\]]*)\\s+(?=[A-Z0-9([“"'])/`,
  `/(?<=[.!?]["')\\]\\u201D\\u2019]*)\\s+(?=[A-Z0-9([“"'])/`
);

// Second, unpdf-adapter
const unpdfCode = fs.readFileSync(path.resolve(__dirname, '../../src/services/pdf/adapters/unpdf-adapter.js'), 'utf8');
const patchedUnpdfCode = unpdfCode
  .replace(
    'return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);',
    'return new Uint8Array(input);'
  )
  .replace(
    'if (input instanceof Uint8Array) {\n      if (input.byteLength === 0) {\n        throw new PdfError(\'PDF Uint8Array is empty (0 bytes)\', \'EMPTY_PDF\');\n      }\n      return input;\n    }',
    'if (input instanceof Uint8Array) {\n      if (input.byteLength === 0) {\n        throw new PdfError(\'PDF Uint8Array is empty (0 bytes)\', \'EMPTY_PDF\');\n      }\n      return new Uint8Array(input);\n    }'
  );

// Third, pdf-extractor
const extractorCode = fs.readFileSync(path.resolve(__dirname, '../../src/services/pdf/pdf-extractor.js'), 'utf8');
let patchedExtractorCode = extractorCode
  .replace(
    'async function extractTargetedPdfText(input, options = {}) {',
    'async function extractTargetedPdfText(input, options = {}) {\n  const opts = options || {};'
  )
  .replace(/options\.adapter/g, 'opts.adapter')
  .replace('const adapterResult = await adapter.extractPages(input, options);', 'const adapterResult = await adapter.extractPages(input, opts);')
  .replace(
    "const mode = options.mode === 'page' ? 'page' : 'sentence';",
    "const mode = opts.mode === 'page' ? 'page' : 'sentence';"
  )
  .replace(
    "const contextBefore = typeof options.contextBefore === 'number' ? Math.max(0, options.contextBefore) : 1;\n  const contextAfter = typeof options.contextAfter === 'number' ? Math.max(0, options.contextAfter) : 1;\n  const wholeWord = options.wholeWord !== false;\n  const minSentenceLength = typeof options.minSentenceLength === 'number' ? options.minSentenceLength : 3;\n\n  const compiledKeywords = compileKeywords(options.keywords, wholeWord);",
    "const contextBefore = Number.isFinite(opts.contextBefore) ? Math.max(0, Math.floor(opts.contextBefore)) : 1;\n  const contextAfter = Number.isFinite(opts.contextAfter) ? Math.max(0, Math.floor(opts.contextAfter)) : 1;\n  const wholeWord = opts.wholeWord !== false;\n  const minSentenceLength = Number.isFinite(opts.minSentenceLength) ? Math.max(0, Math.floor(opts.minSentenceLength)) : 3;\n\n  const compiledKeywords = compileKeywords(opts.keywords, wholeWord);"
  );

console.log('Patches prepared. Testing in temporary execution context...');

// Write patched files to a temp directory inside .agents/m1_iter2_explorer_3/temp_lib/
const tempDir = path.resolve(__dirname, 'temp_lib');
const tempAdaptersDir = path.resolve(tempDir, 'adapters');
fs.mkdirSync(tempAdaptersDir, { recursive: true });

fs.writeFileSync(path.resolve(tempDir, 'sentence-segmenter.js'), patchedSegmenterCode, 'utf8');
fs.writeFileSync(path.resolve(tempAdaptersDir, 'unpdf-adapter.js'), patchedUnpdfCode, 'utf8');
// Copy mock-adapter
fs.copyFileSync(
  path.resolve(__dirname, '../../src/services/pdf/adapters/mock-adapter.js'),
  path.resolve(tempAdaptersDir, 'mock-adapter.js')
);
// In patchedExtractorCode, change requires to point locally
patchedExtractorCode = patchedExtractorCode
  .replace("require('./sentence-segmenter')", "require('./sentence-segmenter')")
  .replace("require('./adapters/unpdf-adapter')", "require('./adapters/unpdf-adapter')")
  .replace("require('./adapters/mock-adapter')", "require('./adapters/mock-adapter')");

fs.writeFileSync(path.resolve(tempDir, 'pdf-extractor.js'), patchedExtractorCode, 'utf8');
fs.writeFileSync(
  path.resolve(tempDir, 'index.js'),
  `const { extractTargetedPdfText, compileKeywords, calculateMetrics, resolveAdapter } = require('./pdf-extractor');
const { segmentSentences, splitSentences, cleanPdfText, ABBREVIATIONS } = require('./sentence-segmenter');
const { UnpdfAdapter, PdfError } = require('./adapters/unpdf-adapter');
const { MockPdfAdapter } = require('./adapters/mock-adapter');

module.exports = {
  extractTargetedPdfText,
  compileKeywords,
  calculateMetrics,
  resolveAdapter,
  segmentSentences,
  splitSentences,
  cleanPdfText,
  ABBREVIATIONS,
  UnpdfAdapter,
  PdfError,
  MockPdfAdapter
};`,
  'utf8'
);

console.log('Temporary patched library created at:', tempDir);
