'use strict';

/**
 * src/services/ai/index.js
 * Unified entry point for the AI extraction service module.
 */

const {
  parseStructuredCriteria,
  normalizeCriteriaData,
  normalizeExtractedData,
  parseJsonSafely
} = require('./gemini-parser');

const {
  CRITERIA_SCHEMA,
  EXAM_CRITERIA_SCHEMA,
  examSchema,
  Type
} = require('./schema');

const {
  SYSTEM_INSTRUCTION,
  buildExtractionPrompt,
  buildPrompt,
  DEFAULT_EXTRACTION_CONFIG
} = require('./prompt');

const {
  extractMockCriteria,
  getMockExtraction,
  generateMockResponse,
  getEmptyCriteria,
  MOCK_NOTIFICATION_FIXTURE
} = require('./mock-gemini');

module.exports = {
  // Main parser
  parseStructuredCriteria,
  normalizeCriteriaData,
  normalizeExtractedData,
  parseJsonSafely,

  // Schema & Types
  CRITERIA_SCHEMA,
  EXAM_CRITERIA_SCHEMA,
  examSchema,
  Type,

  // Prompt builders & configuration
  SYSTEM_INSTRUCTION,
  buildExtractionPrompt,
  buildPrompt,
  DEFAULT_EXTRACTION_CONFIG,

  // Mock extractor & fixtures
  extractMockCriteria,
  getMockExtraction,
  generateMockResponse,
  getEmptyCriteria,
  MOCK_NOTIFICATION_FIXTURE
};
