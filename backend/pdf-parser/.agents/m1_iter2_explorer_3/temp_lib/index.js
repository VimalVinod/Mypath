const { extractTargetedPdfText, compileKeywords, calculateMetrics, resolveAdapter } = require('./pdf-extractor');
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
};