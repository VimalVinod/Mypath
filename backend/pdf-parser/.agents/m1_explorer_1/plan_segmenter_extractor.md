# Implementation Blueprint: Sentence Segmenter & PDF Extractor

> **Document**: Implementation Blueprint for `src/services/pdf/sentence-segmenter.js` and `src/services/pdf/pdf-extractor.js`  
> **Author**: `m1_explorer_1` (Teamwork Explorer)  
> **Target Milestone**: Milestone 1 (Targeted PDF Parsing Module)  
> **Workspace**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
> **Date**: 2026-09-13  
> **Status**: Ready for Worker Implementation  

---

## 1. Architectural Overview & Context

In the PDF Parsing and Validation Pipeline, the PDF extraction layer serves as the critical gatekeeper between raw, token-heavy PDF documents (often 10–50+ pages of dense regulatory notices) and downstream AI models (Gemini API via `@google/genai`).

Passing an entire 50-page recruitment notification directly to an LLM wastes thousands of tokens, increases latency, and degrades extraction accuracy by introducing noise from irrelevant sections (e.g., examination venue rules, biometric instructions, disclaimers).

```
                      [Raw PDF File / Buffer]
                                 │
                                 ▼
                     [PDF Adapter (unpdf / mock)]
                     Extracts raw text per page
                                 │
                                 ▼
                 [Sentence Segmenter (7-Stage Engine)]
          Normalizes whitespace, line breaks, de-hyphenates,
          masks abbreviations, decimals & dates, splits sentences
                                 │
                                 ▼
                    [Targeted PDF Extractor]
          • Multi-keyword case-insensitive matching (\b boundaries)
          • Page-level vs. Sentence-level filtering
          • Context windowing: [i - contextBefore, i + contextAfter]
          • Overlapping interval union & deduplication
          • Formatted targeted text output with page headers
          • Accurate reduction metrics (chars, words, tokens ~4c/t)
                                 │
                                 ▼
            Targeted Text Output (~75–85% token reduction)
               Ready for Gemini Parser (Milestone 2)
```

This blueprint specifies the exact production-ready implementation details for:
1. `src/services/pdf/sentence-segmenter.js`
2. `src/services/pdf/pdf-extractor.js`

---

## 2. Component 1: `src/services/pdf/sentence-segmenter.js`

### 2.1 The Problem & Limitations of Standard Tools
Standard sentence splitters (including Node's `Intl.Segmenter('en', { granularity: 'sentence' })` and naive `split(/[.!?]/)`) catastrophically fail on government and recruitment notices:
- They split on titles (`Mr.`, `Dr.`, `Prof.`).
- They split on abbreviations (`Govt.`, `dept.`, `e.g.`, `i.e.`, `vs.`, `No.`).
- They split on currency and section notations (`Rs. 500`, `Sec. 4`, `Fig. 1`).
- They split on dates and decimals (`01.01.2026`, `31st Dec.`, `60.5%`, `3.5 CGPA`).
- They get confused by PDF line wrapping (`appli-\ncant`) and bullet lists (`1. Age Limit\n2. Fee`).

### 2.2 The 7-Stage Segmentation Engine

To solve this deterministically with zero heavy native dependencies, `sentence-segmenter.js` implements a sequential 7-stage transformation pipeline:

```
[Input Text]
    │
    ▼ Stage 1: De-hyphenate line wraps ("quali-\nication" -> "qualification")
    │
    ▼ Stage 2: Format list markers (insert paragraph breaks before "1. ", "(A) ", "• ")
    │
    ▼ Stage 3: Normalize soft line breaks (single \n -> ' ', double \n -> paragraph token)
    │
    ▼ Stage 4: Mask non-terminal dots using ASCII placeholders (\u0001, \u0002, \u0003)
    │          - Abbreviations & Titles (Govt., Mr., Dr., e.g., i.e., vs., Rs., No., etc.)
    │          - Single-letter initials (A. K. Sharma)
    │          - Decimals & numeric dots (01.01.2026, 60.5)
    │          - Numbered list dots at line starts (1. -> 1\u0003)
    │
    ▼ Stage 5: Split sentences on terminal punctuation: (?<=[.!?]["')\]]*)\s+(?=[A-Z0-9([“"'])
    │
    ▼ Stage 6: Restore masked placeholders (\u0001, \u0002, \u0003 -> .)
    │
    ▼ Stage 7: Post-clean, trim, collapse whitespace, and filter artifacts
    │
[Extracted Sentences Array]
```

### 2.3 Detailed Stage Specifications & Regex Formulations

#### Stage 1: De-hyphenation across line wraps
- **Regex**: `/(\b[A-Za-z]+)-\s*\r?\n\s*([A-Za-z]+\b)/g`
- **Replacement**: `'$1$2'`
- **Purpose**: Fixes words severed across line breaks by PDF layout formatters (e.g. `"quali-\n fication"` becomes `"qualification"`).
- **Safe Boundary**: Only joins when alphabetical characters precede and follow the hyphen, avoiding negative numbers like `-5`.

#### Stage 2: List Marker Formatting
- **Regex**: `/(?:^|\r?\n)\s*([0-9]+\.|\([A-Za-z0-9]+\)|[•\-\*⁃◦▪▫►✓✔])\s+/gi`
- **Replacement**: `'\n\n$1 '`
- **Purpose**: Guarantees that numbered items (`1. `, `(a) `) and bullet points (`• `, `- `) start on new paragraph boundaries so they are not swallowed into preceding unpunctuated sentences.

#### Stage 3: Whitespace & Line Break Normalization
- **Step 3a**: Normalize all CRLF to LF: `text.replace(/\r\n/g, '\n')`.
- **Step 3b**: Mark multi-newline paragraph boundaries: `text.replace(/\n\s*\n+/g, '{{PARA}}')`.
- **Step 3c**: Convert soft line breaks within a paragraph to single spaces: `text.replace(/\n/g, ' ')`.
- **Step 3d**: Restore paragraph boundaries as single newlines: `text.replace(/{{PARA}}/g, '\n')`.
- **Step 3e**: Collapse repeated spaces/tabs: `text.replace(/[ \t]+/g, ' ')`.

#### Stage 4: Non-Terminal Dot Masking
Mask dots that do not signify the end of a sentence using unprintable ASCII sentinel characters:
- `\u0001`: Abbreviation / title dot.
- `\u0002`: Decimal / date numeric dot.
- `\u0003`: Numbered list item dot at start of line.

**Comprehensive Abbreviation & Title Dictionary**:
```javascript
const ABBREVIATIONS = [
  // Titles & Honorifics
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Shri', 'Smt', 'Rev', 'Hon',
  // Official & Administrative
  'Govt', 'govt', 'Dept', 'dept', 'Advt', 'advt', 'Ref', 'ref', 'No', 'no', 'Nos', 'nos',
  'Sec', 'sec', 'Para', 'para', 'Vol', 'vol', 'Art', 'art', 'Cl', 'cl',
  'Co', 'Corp', 'Ltd', 'Pvt', 'Inc',
  // Academic & Degrees
  'approx', 'estd', 'min', 'max', 'e\\.g', 'i\\.e', 'vs', 'v', 'etc', 'viz', 'al',
  'Ph\\.D', 'M\\.Tech', 'B\\.Tech', 'M\\.Sc', 'B\\.Sc', 'M\\.Com', 'B\\.Com', 'M\\.A', 'B\\.A',
  'LL\\.B', 'LL\\.M', 'M\\.B\\.B\\.S',
  // Currency & Measures
  'Rs', 'INR', 'sq', 'ft', 'km', 'kg',
  // Months
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'
];
```

**Masking Executions**:
1. **Abbreviations**: Replace `\b(${ABBREVIATIONS.join('|')})\.` with `$1\u0001` (case-insensitive).
2. **Single-letter Initials**: Replace `\b([A-Za-z])\.(?=\s|[A-Za-z]|\u0001)` with `$1\u0001` (e.g. `A. K. Sharma` -> `A\u0001 K\u0001 Sharma`).
3. **Decimals & Numbers with Dots**: Replace `(\d+)\.(\d+)` with `$1\u0002$2` (e.g. `60.5` -> `60\u00025`, `01.01.2026` -> `01\u000201\u00022026`).
4. **Leading Numbered List Dots**: Replace `(^|\n)\s*(\d+)\.\s+` with `$1$2\u0003 ` (preserves `1. Eligibility` without splitting immediately after the `1.`).

#### Stage 5: Regex Sentence Splitting
Iterate through each paragraph line:
- **Split Pattern**: `/(?<=[.!?]["')\]]*)\s+(?=[A-Z0-9([“"'])/`
- **Explanation**:
  - `(?<=[.!?]["')\]]*)`: Positive lookbehind asserting preceding char is a terminal punctuation mark (`.`, `!`, `?`), optionally followed by closing quotes or parentheses.
  - `\s+`: One or more whitespace characters.
  - `(?=[A-Z0-9([“"'])`: Positive lookahead asserting next sentence starts with an uppercase letter, number, bracket, or opening quote.

#### Stage 6: Unmask Placeholders
Restore the sentinel placeholders back to periods:
- `.replace(/\u0001/g, '.')`
- `.replace(/\u0002/g, '.')`
- `.replace(/\u0003/g, '.')`

#### Stage 7: Post-Clean, Trim & Artifact Filtering
- Trim leading and trailing whitespace.
- Filter out empty strings.
- Filter out segments shorter than `minSentenceLength` (default: 3 chars), removing stray punctuation artifacts like `.` or `-`.
- Filter out common PDF running headers/footers (e.g., `Page 1 of 12` or `http://...`).

### 2.4 Complete Implementation Specification: `src/services/pdf/sentence-segmenter.js`

```javascript
'use strict';

/**
 * 7-Stage Abbreviation-Aware Sentence Boundary Detector for PDF Extraction.
 * Designed specifically for official documents, recruitment notices, and regulatory notifications.
 */

const ABBREVIATIONS = [
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Shri', 'Smt', 'Rev', 'Hon',
  'Govt', 'govt', 'Dept', 'dept', 'Advt', 'advt', 'Ref', 'ref', 'No', 'no', 'Nos', 'nos',
  'Sec', 'sec', 'Para', 'para', 'Vol', 'vol', 'Art', 'art', 'Cl', 'cl',
  'Co', 'Corp', 'Ltd', 'Pvt', 'Inc',
  'approx', 'estd', 'min', 'max', 'e\\.g', 'i\\.e', 'vs', 'v', 'etc', 'viz', 'al',
  'Ph\\.D', 'M\\.Tech', 'B\\.Tech', 'M\\.Sc', 'B\\.Sc', 'M\\.Com', 'B\\.Com', 'M\\.A', 'B\\.A',
  'LL\\.B', 'LL\\.M', 'M\\.B\\.B\\.S',
  'Rs', 'INR', 'sq', 'ft', 'km', 'kg',
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
    // Note: run twice to catch chained dots in dates "01.01.2026"
    masked = masked.replace(/(\d+)\.(\d+)/g, '$1\u0002$2');
    masked = masked.replace(/(\d+)\.(\d+)/g, '$1\u0002$2');

    // Numbered list dots at start of line (e.g., "1. Eligibility criteria")
    masked = masked.replace(/^(\d+)\.\s+/g, '$1\u0003 ');

    // Stage 5: Regex sentence split
    const segments = masked.split(/(?<=[.!?]["')\]]*)\s+(?=[A-Z0-9([“"'])/);

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
  splitSentences: segmentSentences, // Alias for backward compatibility
  cleanPdfText,
  ABBREVIATIONS
};
```

---

## 3. Component 2: `src/services/pdf/pdf-extractor.js`

### 3.1 Interface Contract Conformance
`pdf-extractor.js` must strictly adhere to the contract established in `PROJECT.md` §Interface Contracts:
```javascript
extractTargetedPdfText(input, options)
```

**Inputs**:
- `input`: `string` (file path) or `Buffer` (or `Uint8Array`).
- `options`:
  - `keywords`: `string[]` (e.g. `['eligibility', 'age limit', 'qualification', 'fee', 'vacancy']`).
  - `contextBefore`: `number` (default: `1`).
  - `contextAfter`: `number` (default: `1`).
  - `mode`: `'sentence'` | `'page'` (default: `'sentence'`).
  - `wholeWord`: `boolean` (default: `true`).
  - `minSentenceLength`: `number` (default: `5`).
  - `adapter`: optional PDF extractor adapter instance (defaults to `new UnpdfAdapter()`).

**Output Object**:
```javascript
{
  success: true,
  rawStats: {
    totalPages: 4,
    rawCharCount: 4520,
    rawWordCount: 685,
    estimatedRawTokens: 1130
  },
  extractedStats: {
    matchedPages: [2, 4],
    sentenceCount: 8,
    extractedCharCount: 890,
    extractedWordCount: 135,
    estimatedTokens: 223,
    reductionPercentage: 80.3
  },
  targetedText: "--- [Page 2] ---\nEligibility Criteria: Candidates must be 21 to 30 years...\n\n--- [Page 4] ---\nApplication fee is Rs. 100 for General...",
  sections: [
    { pageNumber: 2, sentences: ["Eligibility Criteria...", "..."] },
    { pageNumber: 4, sentences: ["Application fee is...", "..."] }
  ]
}
```

### 3.2 Keyword Compilation & Case-Insensitive Matching

#### Word Boundary Safety
A common defect in naive keyword search is substring false positives:
- Searching for `"age"` matches `"percentage"`, `"voltage"`, `"package"`.
- Searching for `"tax"` matches `"syntax"`.

To prevent this:
1. Escape regex special characters: `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.
2. Normalize multi-word phrases with flexible whitespace: `replace(/\s+/g, '\\s+')`.
3. Apply `\b` word boundary check **only if** the keyword starts/ends with a word character (`\w`). If a keyword ends with punctuation like `"B.Tech."`, a trailing `\b` would fail because `.` is non-word (`\W`).

**Keyword Compiler**:
```javascript
function compileKeywords(keywords, wholeWord = true) {
  if (!Array.isArray(keywords)) {
    if (typeof keywords === 'string') {
      keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    } else {
      return [];
    }
  }

  return keywords
    .map(kw => (typeof kw === 'string' ? kw.trim() : ''))
    .filter(Boolean)
    .map(rawKw => {
      const escaped = rawKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexibleWhitespace = escaped.replace(/\s+/g, '\\s+');

      let pattern = flexibleWhitespace;
      if (wholeWord) {
        const hasLeadingWordChar = /^\w/.test(rawKw);
        const hasTrailingWordChar = /\w$/.test(rawKw);
        pattern = `${hasLeadingWordChar ? '\\b' : ''}${pattern}${hasTrailingWordChar ? '\\b' : ''}`;
      }

      return {
        raw: rawKw,
        regex: new RegExp(pattern, 'i')
      };
    });
}
```

### 3.3 Context Windowing & Overlapping Span Deduplication

When multiple sentences on a page match keywords, naive windowing (`i - 1` to `i + 1`) produces duplicate sentences if matching sentences are adjacent or nearby.

#### Mathematical Interval Union Algorithm:
1. Let sentences on page be $S = [s_0, s_1, \dots, s_{N-1}]$.
2. Identify 0-based indices of matching sentences: $M = \{i \mid \text{matchesAnyKeyword}(s_i)\}$.
3. For each index $i \in M$, form the interval:
   $$[S_i, E_i] = [\max(0, i - \text{contextBefore}), \min(N - 1, i + \text{contextAfter})]$$
4. Sort intervals by `start` ascending.
5. Merge overlapping or adjacent intervals:
   - If `current.start <= prev.end + 1`:
     `prev.end = Math.max(prev.end, current.end)`
   - Else:
     Push `current` to `mergedIntervals`.
6. For each merged interval $[S_k, E_k]$, slice sentences $s_{S_k}, \dots, s_{E_k}$.
7. Deduplication guarantee: because merged intervals are strictly disjoint ($E_k < S_{k+1}$), each sentence index appears **at most once**!

```
Example:
Page Sentences (10 total, indices 0..9)
Keywords match at index 2 ("eligibility") and index 3 ("qualification")
contextBefore: 1, contextAfter: 1

Raw Windows:
Match 2 -> [max(0, 1), min(9, 3)] = [1, 3]
Match 3 -> [max(0, 2), min(9, 4)] = [2, 4]

Interval Union:
[1, 3] and [2, 4] overlap (2 <= 3 + 1) -> Merged to [1, 4]

Extracted Sentences:
Indices 1, 2, 3, 4 (Zero duplicates, seamless contiguous block!)
```

### 3.4 Page-Level vs. Sentence-Level Modes
- **`mode: 'sentence'` (Default)**:
  Applies the context windowing algorithm described above. Maximizes token reduction (75–85%+).
- **`mode: 'page'`**:
  If any sentence on the page matches a keyword, the entire page's sentences are included in `sections` and `targetedText`. Useful for tabular or tightly coupled layouts where sentence extraction might sever cross-column text.

### 3.5 Metrics Calculation Specification
1. `rawCharCount`: Sum of lengths of all raw page text strings.
2. `rawWordCount`: Count of whitespace-separated tokens in raw text:
   `rawText.trim().split(/\s+/).filter(Boolean).length`.
3. `estimatedRawTokens`:
   `Math.ceil(rawCharCount / 4)` (Standard 4 chars/token heuristic).
4. `extractedCharCount`: Sum of lengths of all extracted sentences.
5. `extractedWordCount`: Count of words in extracted sentences:
   `extractedSentences.join(' ').trim().split(/\s+/).filter(Boolean).length`.
6. `estimatedTokens`:
   `Math.ceil(extractedCharCount / 4)`.
7. `reductionPercentage`:
   $$\text{reduction} = \frac{\text{rawCharCount} - \text{extractedCharCount}}{\text{rawCharCount}} \times 100$$
   - Clamped to $[0, 100]$.
   - Rounded to 1 decimal place: `Math.round(val * 10) / 10`.
   - If `rawCharCount === 0`, returns `0.0`.
   - If `extractedCharCount === 0` and `rawCharCount > 0`, returns `100.0`.

### 3.6 Targeted Text Formatting
The resulting `targetedText` string is structured with standardized page headers so downstream LLMs (Gemini) have full provenance and grounding:

```
--- [Page 2] ---
Sentence 1 text. Sentence 2 text. Sentence 3 text.

--- [Page 4] ---
Sentence 1 text. Sentence 2 text.
```

If multiple non-contiguous blocks exist within the same page, blocks are separated by `\n\n` to signify a section break.

### 3.7 Complete Implementation Specification: `src/services/pdf/pdf-extractor.js`

```javascript
'use strict';

const fs = require('fs');
const { segmentSentences, cleanPdfText } = require('./sentence-segmenter');

/**
 * Compiles an array of string keywords into word-boundary safe, case-insensitive regular expressions.
 * @param {string[]|string} keywords 
 * @param {boolean} [wholeWord=true] 
 * @returns {Array<{ raw: string, regex: RegExp }>}
 */
function compileKeywords(keywords, wholeWord = true) {
  if (!keywords) return [];
  const list = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
      ? keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

  return list
    .map(kw => (typeof kw === 'string' ? kw.trim() : ''))
    .filter(Boolean)
    .map(rawKw => {
      const escaped = rawKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexibleWhitespace = escaped.replace(/\s+/g, '\\s+');

      let pattern = flexibleWhitespace;
      if (wholeWord) {
        const hasLeadingWord = /^\w/.test(rawKw);
        const hasTrailingWord = /\w$/.test(rawKw);
        pattern = `${hasLeadingWord ? '\\b' : ''}${pattern}${hasTrailingWord ? '\\b' : ''}`;
      }

      return {
        raw: rawKw,
        regex: new RegExp(pattern, 'i')
      };
    });
}

/**
 * Calculates reduction metrics between raw text and extracted text.
 * @param {string} rawText 
 * @param {string} extractedText 
 * @returns {Object}
 */
function calculateMetrics(rawText, extractedText) {
  const rawCharCount = rawText ? rawText.length : 0;
  const rawWordCount = rawText && rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedRawTokens = Math.ceil(rawCharCount / 4);

  const extractedCharCount = extractedText ? extractedText.length : 0;
  const extractedWordCount = extractedText && extractedText.trim() ? extractedText.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedTokens = Math.ceil(extractedCharCount / 4);

  let reductionPercentage = 0;
  if (rawCharCount > 0) {
    reductionPercentage = ((rawCharCount - extractedCharCount) / rawCharCount) * 100;
    reductionPercentage = Math.max(0, Math.min(100, Math.round(reductionPercentage * 10) / 10));
  }

  return {
    rawStats: {
      rawCharCount,
      rawWordCount,
      estimatedRawTokens
    },
    extractedStats: {
      extractedCharCount,
      extractedWordCount,
      estimatedTokens,
      reductionPercentage
    }
  };
}

/**
 * Core targeted PDF extraction engine.
 * Reads PDF via adapter, segments text, matches keywords with context windowing, and calculates reduction metrics.
 * 
 * @param {string|Buffer|Uint8Array} input - PDF file path or buffer
 * @param {Object} [options={}]
 * @param {string[]} [options.keywords=[]] - Target search keywords
 * @param {number} [options.contextBefore=1] - Preceding context sentences
 * @param {number} [options.contextAfter=1] - Following context sentences
 * @param {'sentence'|'page'} [options.mode='sentence'] - Extraction mode
 * @param {boolean} [options.wholeWord=true] - Word boundary matching
 * @param {number} [options.minSentenceLength=5] - Minimum sentence length
 * @param {Object} [options.adapter] - Optional PDF extraction adapter
 * @returns {Promise<Object>} Conforms to PROJECT.md extractTargetedPdfText output contract
 */
async function extractTargetedPdfText(input, options = {}) {
  if (!input) {
    throw new Error('Invalid PDF input: expected a non-empty file path or Buffer');
  }

  // 1. Resolve input to Buffer if file path is given
  let pdfData = input;
  if (typeof input === 'string') {
    if (!fs.existsSync(input)) {
      throw new Error(`PDF file not found at path: ${input}`);
    }
    pdfData = fs.readFileSync(input);
  }

  // 2. Resolve PDF Adapter (dependency injection or default unpdf adapter)
  let adapter = options.adapter;
  if (!adapter) {
    // Lazy-load default adapter
    const { UnpdfAdapter } = require('./adapters/unpdf-adapter');
    adapter = new UnpdfAdapter();
  }

  // 3. Extract raw pages from adapter
  const adapterResult = await adapter.extractPages(pdfData);
  const totalPages = adapterResult.totalPages || (adapterResult.pages ? adapterResult.pages.length : 0);
  
  // Normalize pages format (handles both string[] and { pageNumber, text }[])
  const normalizedPages = (adapterResult.pages || []).map((page, idx) => {
    if (typeof page === 'string') {
      return { pageNumber: idx + 1, text: page };
    }
    return {
      pageNumber: page.pageNumber || idx + 1,
      text: typeof page.text === 'string' ? page.text : ''
    };
  });

  const mode = options.mode === 'page' ? 'page' : 'sentence';
  const contextBefore = typeof options.contextBefore === 'number' ? Math.max(0, options.contextBefore) : 1;
  const contextAfter = typeof options.contextAfter === 'number' ? Math.max(0, options.contextAfter) : 1;
  const wholeWord = options.wholeWord !== false;
  const minSentenceLength = typeof options.minSentenceLength === 'number' ? options.minSentenceLength : 5;

  const compiledKeywords = compileKeywords(options.keywords, wholeWord);

  const matchedPages = [];
  const sections = [];
  const rawTextParts = [];
  let totalExtractedSentenceCount = 0;

  for (const page of normalizedPages) {
    rawTextParts.push(page.text);

    if (compiledKeywords.length === 0) {
      // If no keywords specified, nothing matches targeted search
      continue;
    }

    // Segment page into sentences
    const pageSentences = segmentSentences(page.text, { minSentenceLength });
    if (pageSentences.length === 0) continue;

    // Identify matching sentence indices
    const matchingIndices = [];
    pageSentences.forEach((sentence, idx) => {
      const isMatch = compiledKeywords.some(kw => kw.regex.test(sentence));
      if (isMatch) {
        matchingIndices.push(idx);
      }
    });

    if (matchingIndices.length === 0) {
      // No keywords matched on this page
      continue;
    }

    matchedPages.push(page.pageNumber);

    if (mode === 'page') {
      // Page mode: Include all sentences from the page
      sections.push({
        pageNumber: page.pageNumber,
        sentences: pageSentences
      });
      totalExtractedSentenceCount += pageSentences.length;
    } else {
      // Sentence mode: Context windowing with overlapping span deduplication
      const intervals = matchingIndices.map(matchIdx => ({
        start: Math.max(0, matchIdx - contextBefore),
        end: Math.min(pageSentences.length - 1, matchIdx + contextAfter)
      }));

      // Sort intervals by start index
      intervals.sort((a, b) => a.start - b.start);

      // Merge overlapping or adjacent intervals
      const mergedIntervals = [];
      for (const interval of intervals) {
        if (mergedIntervals.length === 0) {
          mergedIntervals.push({ ...interval });
        } else {
          const prev = mergedIntervals[mergedIntervals.length - 1];
          if (interval.start <= prev.end + 1) {
            prev.end = Math.max(prev.end, interval.end);
          } else {
            mergedIntervals.push({ ...interval });
          }
        }
      }

      // Collect deduplicated sentences for this page
      const pageExtractedSentences = [];
      for (const span of mergedIntervals) {
        for (let sIdx = span.start; sIdx <= span.end; sIdx++) {
          pageExtractedSentences.push(pageSentences[sIdx]);
        }
      }

      if (pageExtractedSentences.length > 0) {
        sections.push({
          pageNumber: page.pageNumber,
          sentences: pageExtractedSentences
        });
        totalExtractedSentenceCount += pageExtractedSentences.length;
      }
    }
  }

  // 4. Construct targetedText formatted by page
  const targetedTextBlocks = sections.map(sec => {
    return `--- [Page ${sec.pageNumber}] ---\n${sec.sentences.join(' ')}`;
  });
  const targetedText = targetedTextBlocks.join('\n\n');

  // 5. Calculate metrics
  const fullRawText = rawTextParts.join('\n\n');
  const metrics = calculateMetrics(fullRawText, targetedText);

  return {
    success: true,
    rawStats: {
      totalPages,
      rawCharCount: metrics.rawStats.rawCharCount,
      rawWordCount: metrics.rawStats.rawWordCount,
      estimatedRawTokens: metrics.rawStats.estimatedRawTokens
    },
    extractedStats: {
      matchedPages,
      sentenceCount: totalExtractedSentenceCount,
      extractedCharCount: metrics.extractedStats.extractedCharCount,
      extractedWordCount: metrics.extractedStats.extractedWordCount,
      estimatedTokens: metrics.extractedStats.estimatedTokens,
      reductionPercentage: metrics.extractedStats.reductionPercentage
    },
    targetedText,
    sections
  };
}

module.exports = {
  extractTargetedPdfText,
  compileKeywords,
  calculateMetrics
};
```

---

## 4. Edge Cases & Boundary Handling

| Edge Case | Scenario | Expected Behavior & Solution |
|---|---|---|
| **Substring False Matches** | Keyword is `"age"`, document contains `"percentage"`, `"voltage"`, `"storage"`. | `compileKeywords` enforces word boundaries (`\b(age)\b`), strictly rejecting `"percentage"`. |
| **Multi-Word Across Line Wraps** | Keyword `"educational qualification"`, PDF has `"educational\nqualification"`. | Regex replaces whitespace with `\s+`, allowing newline and multiple space matching across lines. |
| **Abbreviation At Sentence End** | Text: `"The fee must be paid to the Govt. Candidates must apply online."` | Protected by abbreviation list; keeps both statements in the same or adjacent window without corrupting `"Govt."`. |
| **Overlapping Context Windows** | Sentence 2 matches `"eligibility"` and Sentence 3 matches `"qualification"` with `contextBefore: 1, contextAfter: 1`. | Intervals `[1, 3]` and `[2, 4]` are unioned into `[1, 4]`. Deduplicated; sentences 2 and 3 are extracted exactly once. |
| **Empty or No Matching Keywords** | `keywords: []` or keywords do not exist in the document. | Returns `success: true`, `matchedPages: []`, `sentenceCount: 0`, `targetedText: ''`, `reductionPercentage: 100.0`. Never throws. |
| **Empty or Corrupted PDF Pages** | Page has no text or image-only scanned page. | Returns empty sentence array for that page; does not throw, continues scanning other pages. |
| **Single-Page PDF** | PDF has only 1 page. | Boundary clipping `Math.max(0, ...)` and `Math.min(N - 1, ...)` safely bounds intervals to `[0, N-1]`. |
| **Zero Raw Text Document** | Completely blank document (0 characters). | Handled safely: `reductionPercentage: 0.0`, `estimatedRawTokens: 0`. No `NaN` or division by zero. |
| **Decimal / Currency Numbers** | `"Rs. 500"`, `"No. 1"`, `"01.01.2026"`, `"60.5%"` | Masking Sentinel replaces inner dots with `\u0001`, `\u0002` so numbers are never split across sentence boundaries. |

---

## 5. Verification & Unit Test Suite Blueprint

To verify the implementation independently, the following test cases should be implemented in `test/pdf-extractor.test.js`:

### Test Group 1: Sentence Segmenter (`test/sentence-segmenter.test.js` or `test/pdf-extractor.test.js`)
1. **Title & Abbreviation Protection**:
   - Input: `"Dr. A. K. Sharma met with Prof. Smith from the Govt. of India."`
   - Assertion: Length must equal 1 sentence. No split after `Dr.`, `A.`, `K.`, `Prof.`, or `Govt.`.
2. **Currency & Section Protection**:
   - Input: `"Application fee is Rs. 500 under Sec. 4. Candidates must pay online."`
   - Assertion: Exactly 2 sentences. First sentence contains `"Rs. 500 under Sec. 4."`.
3. **Dates & Decimals**:
   - Input: `"The cut-off date is 01.01.2026. Minimum aggregate marks required is 60.5%."`
   - Assertion: Exactly 2 sentences. `01.01.2026.` and `60.5%` remain intact.
4. **Line-Wrap De-hyphenation**:
   - Input: `"Candidates must possess required quali-\n fication before applying."`
   - Assertion: Sentence contains `"qualification"`, not `"quali-"`.
5. **List Markers & Bullet Points**:
   - Input: `"General Requirements:\n1. Minimum age 21.\n2. Bachelor's degree.\n• Indian citizenship."`
   - Assertion: Each list item is segmented cleanly into its own sentence.

### Test Group 2: PDF Extractor (`test/pdf-extractor.test.js`)
1. **Word-Boundary Matcher**:
   - Page with `"Storage percentage is 90%. Minimum age is 21 years."`
   - Keyword: `['age']`
   - Assertion: Only sentence 2 is extracted; sentence 1 is omitted.
2. **Context Windowing**:
   - 5 sentences: `[S0, S1, S2, S3, S4]`. S2 matches. `contextBefore: 1, contextAfter: 1`.
   - Assertion: Extracts `[S1, S2, S3]`.
3. **Overlapping Interval Union**:
   - 6 sentences: `[S0, S1, S2, S3, S4, S5]`. S2 and S3 match. `contextBefore: 1, contextAfter: 1`.
   - Assertion: Extracts `[S1, S2, S3, S4]` without duplicating S2 or S3.
4. **Reduction Metrics**:
   - Assertion: `rawCharCount > extractedCharCount`, `reductionPercentage > 0`, `estimatedTokens === Math.ceil(extractedCharCount / 4)`.
5. **Page Mode vs. Sentence Mode**:
   - Assertion: `mode: 'page'` returns all sentences on matched page; `mode: 'sentence'` returns only windowed sentences.
6. **Mock Adapter Execution**:
   - Pass `MockAdapter` with 4 pages (Pages 1 & 3 negative control, Pages 2 & 4 positive control).
   - Assertion: `matchedPages` is `[2, 4]`. Pages 1 and 3 are completely absent.

---

## 6. Summary of Exports & Handoff to Implementer (`m1_worker`)

| File | Target Path | Key Functions / Classes | Dependencies |
|---|---|---|---|
| Sentence Segmenter | `src/services/pdf/sentence-segmenter.js` | `segmentSentences`, `cleanPdfText`, `ABBREVIATIONS` | Native Node.js only |
| PDF Extractor | `src/services/pdf/pdf-extractor.js` | `extractTargetedPdfText`, `compileKeywords`, `calculateMetrics` | `./sentence-segmenter`, `fs`, `./adapters/unpdf-adapter` |

This blueprint provides the exact formulas, regex patterns, edge case defenses, and data contracts needed for `m1_worker` to write zero-defect implementations.
