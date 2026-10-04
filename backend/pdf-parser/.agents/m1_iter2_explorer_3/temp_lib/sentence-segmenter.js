'use strict';

/**
 * src/services/pdf/sentence-segmenter.js
 * 7-Stage Abbreviation-Aware Sentence Boundary Detector for PDF Extraction.
 * Designed specifically for official documents, recruitment notices, and regulatory notifications.
 */

const ABBREVIATIONS = [
  // Titles & Honorifics
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Shri', 'Smt', 'Rev', 'Hon',
  // Official & Administrative
  'Govt', 'govt', 'Dept', 'dept', 'Advt', 'advt', 'Ref', 'ref', 'No', 'no', 'Nos', 'nos',
  'Sec', 'sec', 'Para', 'para', 'Vol', 'vol', 'Art', 'art', 'Cl', 'cl',
  'Co', 'Corp', 'Ltd', 'Pvt', 'Inc',
  // Academic & General
  'approx', 'estd', 'min', 'max', 'e\\.g', 'i\\.e', 'vs', 'v', 'etc', 'viz', 'al',
  'Ph\\.D', 'M\\.Tech', 'B\\.Tech', 'M\\.Sc', 'B\\.Sc', 'M\\.Com', 'B\\.Com', 'M\\.A', 'B\\.A',
  'LL\\.B', 'LL\\.M', 'M\\.B\\.B\\.S',
  // Currency & Units
  'Rs', 'INR', 'sq', 'ft', 'km', 'kg',
  // Months
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'
];

const ABBR_REGEX = new RegExp(`\\b(${ABBREVIATIONS.join('|')})\\.`, 'gi');

/**
 * Clean and normalize raw extracted PDF text.
 * @param {string} text 
 * @returns {string} Normalized text with paragraphs on separate lines
 */
function cleanPdfText(text) {
  if (!text || typeof text !== 'string') return '';

  // Stage 1: De-hyphenate line breaks (e.g. "quali-\n fication" -> "qualification")
  let cleaned = text.replace(/(\b[A-Za-z]+)-\s*\r?\n\s*([A-Za-z]+\b)/g, '$1$2');

  // Stage 2: Format list markers (ensure list items start on new lines)
  cleaned = cleaned.replace(/(?:^|\r?\n)\s*([0-9]+\.|\([A-Za-z0-9]+\)|[•\-\*⁃◦▪▫►✓✔])\s+/gi, '\n\n$1 ');

  // Stage 3: Normalize line breaks
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n+/g, '{{PARA}}')
    .replace(/\n/g, ' ')
    .replace(/{{PARA}}/g, '\n')
    .replace(/[ \t]+/g, ' ');

  return cleaned.trim();
}

/**
 * Segment raw text into individual sentences with abbreviation protection.
 * @param {string} rawText 
 * @param {Object} [options]
 * @param {number} [options.minSentenceLength=3] - Minimum character length to retain
 * @param {string[]} [options.customAbbreviations=[]] - Extra abbreviations to protect
 * @returns {string[]} Array of clean, segmented sentences
 */
function segmentSentences(rawText, options = {}) {
  if (!rawText || typeof rawText !== 'string') return [];

  const minLength = typeof options.minSentenceLength === 'number' ? options.minSentenceLength : 3;
  const customAbbrs = Array.isArray(options.customAbbreviations) ? options.customAbbreviations : [];

  let activeAbbrRegex = ABBR_REGEX;
  if (customAbbrs.length > 0) {
    const escaped = customAbbrs.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    activeAbbrRegex = new RegExp(`\\b(${[...ABBREVIATIONS, ...escaped].join('|')})\\.`, 'gi');
  }

  // Stages 1-3: Normalization
  const cleanedText = cleanPdfText(rawText);
  if (!cleanedText) return [];

  const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);
  const sentences = [];

  for (const line of lines) {
    // Stage 4: Mask non-terminal dots
    let masked = line.replace(activeAbbrRegex, '$1\u0001');

    // Single-letter initials (e.g., "A. K. Sharma")
    masked = masked.replace(/\b([A-Za-z])\.(?=\s|[A-Za-z]|\u0001)/g, '$1\u0001');

    // Decimal numbers & dotted dates (e.g., "60.5%", "01.01.2026")
    // Repeat while chained dots in numbers exist
    while (/(\d+)\.(\d+)/.test(masked)) {
      masked = masked.replace(/(\d+)\.(\d+)/g, '$1\u0002$2');
    }

    // Numbered list dots at start of line (e.g., "1. Eligibility criteria")
    masked = masked.replace(/^(\d+)\.\s+/g, '$1\u0003 ');

    // Stage 5: Regex sentence split
    const segments = masked.split(/(?<=[.!?]["')\]\u201D\u2019]*)\s+(?=[A-Z0-9([“"'])/);

    // Stage 6: Restore masks & Stage 7: Post-clean and validate
    for (let segment of segments) {
      segment = segment
        .replace(/\u0001/g, '.')
        .replace(/\u0002/g, '.')
        .replace(/\u0003/g, '.')
        .replace(/[ \t]+/g, ' ')
        .trim();

      if (segment.length >= minLength) {
        // Strip out isolated non-informative page footer artifacts like "Page 1 of 4"
        if (/^Page\s+\d+\s+of\s+\d+$/i.test(segment)) {
          continue;
        }
        sentences.push(segment);
      }
    }
  }

  return sentences;
}

module.exports = {
  segmentSentences,
  splitSentences: segmentSentences, // Alias
  cleanPdfText,
  ABBREVIATIONS
};
