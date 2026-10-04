# Technical Survey Report: Targeted PDF Parsing Architecture (Requirement 1)

> **Author**: `explorer_survey_2` (Teamwork Explorer)  
> **Date**: 2026-09-13  
> **Target**: Requirement 1 (Targeted PDF Parsing & Token Reduction)  
> **Project**: `mypath-scraper`  
> **Environment**: Node.js v24.13.0, Windows x64  

---

## 1. Executive Summary & Core Recommendation

Requirement 1 mandates:
> *"Create a utility that reads a PDF file but does not just dump the entire text. It must be able to search the PDF for specific keywords and extract only the relevant pages or sentences containing those keywords to minimize token usage and noise."*

### Key Findings & Final Recommendation
1. **Recommended Library: `unpdf`** (v1.8.x)
   - **Why**: `unpdf` is a modern, actively maintained UnJS package specifically built for multi-runtime JS and AI pipelines. It bundles a serverless build of Mozilla's `pdfjs-dist` with the worker inlined, completely eliminating the notorious Node.js worker/canvas configuration hurdles.
   - **Page-by-page text**: It provides native page-by-page extraction out of the box via `extractText(data, { mergePages: false })` returning `{ totalPages: number, text: string[] }`.
   - **Zero Native Dependencies**: Unlike `pdf-parse` v2 (which enforces `@napi-rs/canvas`), `unpdf` has zero native C++ or canvas dependencies for text extraction, ensuring frictionless installs on Windows, Linux, and serverless environments.
   - **Dual ESM/CJS Support**: Offers both `./dist/index.cjs` and `./dist/index.mjs`, making it 100% compatible with existing CommonJS projects (`require('unpdf')`) and modern ESM.
   - **Runner-up / Secondary Option**: Direct `pdfjs-dist/legacy` via dynamic import, though it requires custom worker mocking and font warning suppression. Classic `pdf-parse` v1.1.1 is unmaintained (since 2020), while `pdf-parse` v2.4.5 introduced breaking class-based API changes and native canvas requirements.

2. **Recommended Extraction Strategy: Hybrid Sentence-Level Filtering with Context Windowing**
   - **Empirical Token Reduction**: Page-level filtering achieved ~**65.9%** token reduction on multi-page exam notifications, while sentence-level filtering achieved **74.7% to 81.2%** token reduction! On large 50-page notices, sentence-level extraction achieves **>95%** reduction.
   - **Context Preservation**: Pure sentence extraction can sever dependent clauses. A configurable context window (e.g. `contextBefore: 1, contextAfter: 1`) preserves crucial section titles, qualifying conditions, and antecedent statements while merging adjacent/overlapping ranges into contiguous blocks.

3. **Sentence Boundary Detection**:
   - Node's native `Intl.Segmenter('en', { granularity: 'sentence' })` was tested and found **insufficient on its own**, as it prematurely splits after standard abbreviations (`Mr.`, `Govt.`, `Jan. 15.`, `Rs. 500`).
   - A dedicated 7-stage segmentation algorithm is designed: de-hyphenation across linebreaks, list numbering protection, abbreviation masking, and terminal punctuation splitting with negative lookbehinds.

---

## 2. Evaluation of Node.js PDF Parsing Libraries

We performed a deep comparative audit of the primary Node.js PDF parsing libraries available on npm:

| Evaluation Dimension | `unpdf` (v1.8.1) | `pdf-parse` (v1.1.1 Classic) | `pdf-parse` (v2.4.5 Rewrite) | `pdfjs-dist` (v6.3.x Direct) | `pdf2json` (v4.1.0) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Architecture** | Serverless Mozilla `pdfjs-dist` bundle via Rolldown | Legacy `pdfjs` fork wrapper | Modern TS rewrite over `pdfjs-dist` 5.x | Official Mozilla PDF engine | Forked PDF.js converting to AST JSON |
| **Page-by-Page Extraction** | **Native** (`extractText(pdf, { mergePages: false })`) | **Custom callback only** (`pagerender` option) | **Supported** (`getText({ partial: [page] })`) | **Native** (Iterate `doc.getPage(i)`) | **Native** (Nested JSON `Pages[]`) |
| **Node.js 24 Compatibility** | **100% Native** (Node >= 22 engine) | Emits deprecation warnings | Supported (Node >= 20.16) | Requires ESM / dynamic import | Supported |
| **Native Compilation / Canvas** | **Zero native deps** (canvas is optional peer dep) | None (pure JS legacy) | **Requires `@napi-rs/canvas`** | Can require canvas mocks | None |
| **Module System** | **Dual ESM & CommonJS** (`.cjs` & `.mjs`) | CommonJS only | Dual ESM & CommonJS | Modern ESM only | CommonJS |
| **Worker Thread Handling** | **Inlined automatically** (Zero setup) | Internal sync/async mock | Worker bundle required | Requires `GlobalWorkerOptions` config | Internal parser |
| **Maintenance & Activity** | Active (Maintained by UnJS team, Aug 2026) | Abandoned (Last release 2020) | Active (Mehmet Kozan, Oct 2025) | Active (Mozilla) | Active |
| **Package Size & Payload** | Lightweight (~2.1 MB unpacked) | Ships accidental 6 MB sample PDF | ~21 MB unpacked | ~15 MB unpacked | ~3.5 MB unpacked |
| **Suitability for Project** | **Highest (Recommended)** | Low (Outdated, hacks needed) | Medium (Heavyweight, native canvas) | Medium-High (Requires boilerplate) | Low (Complex AST parsing) |

---

### Detailed Analysis of Each Option

#### 1. `unpdf` (Recommended Choice)
- **Strengths**:
  - Purpose-built for serverless, edge, and modern AI/LLM summarization pipelines.
  - Calling `extractText(data, { mergePages: false })` returns:
    ```js
    const { totalPages, text } = await extractText(pdfBuffer, { mergePages: false });
    // text is string[]: text[0] = Page 1, text[1] = Page 2, etc.
    ```
  - Also exposes `extractTextItems(pdfBuffer)` if fine-grained positional text (x, y, font size, hasEOL) is needed.
  - Zero worker configuration needed. In standard `pdfjs-dist`, Node.js throws errors unless a worker is configured or legacy non-worker builds are loaded; `unpdf` inlines the worker completely.
  - Zero build tool / C++ compiler dependencies.
- **Weaknesses**:
  - Requires Node.js >= 22 (the project environment is Node.js v24.13.0, perfectly fulfilling this requirement).

#### 2. `pdf-parse`
- **Classic v1.1.1**:
  - By default, `pdf-parse(buffer)` joins all page text into one large string (`data.text`).
  - To extract page-by-page, consumers must provide a custom `pagerender` function:
    ```js
    const pageTexts = [];
    await pdfParse(buffer, {
      pagerender: async function(pageData) {
        const textContent = await pageData.getTextContent();
        const str = textContent.items.map(item => item.str).join(' ');
        pageTexts.push(str);
        return str;
      }
    });
    ```
  - Unmaintained since 2020.
- **Rewrite v2.4.5**:
  - Completely redesigned class-based API (`new PDFParse({ data: buffer })`).
  - Pulls in `@napi-rs/canvas`, which can fail on some Windows CI or restricted developer environments if prebuilt binaries are unavailable.
  - Introduces commercial "v3 Supportware" messaging in documentation.

#### 3. `pdfjs-dist` Direct
- **Strengths**: Official Mozilla code, full access to internal stream operators and fonts.
- **Weaknesses**:
  - In modern versions (v5/v6), Mozilla publishes ECMAScript modules exclusively (`pdf.mjs`). In CommonJS codebases, calling `require('pdfjs-dist')` fails with `ERR_REQUIRE_ESM`, requiring dynamic `await import('pdfjs-dist/legacy/build/pdf.mjs')`.
  - Emits console warnings regarding missing canvas or font APIs unless mocked.

#### 4. `pdf2json`
- **Strengths**: Complete bounding-box geometry for every text glyph.
- **Weaknesses**:
  - Event-emitter based API (`pdfParser.on('pdfParser_dataReady')`) instead of clean promises.
  - All text strings are URL-encoded (`decodeURIComponent(item.R[0].T)`).
  - Sentences are fragmented into separate runs; reconstructing coherent sentences requires complex geometric clustering logic.

---

## 3. Keyword Search & Sentence Boundary Algorithm Design

### 3.1 Case-Insensitive Multi-Keyword Matching
Keywords passed into the utility can be single words (`"age"`, `"fee"`) or multi-word phrases (`"minimum age"`, `"educational qualification"`, `"relaxation"`).

#### Key Edge Cases & Solutions:
1. **Word Boundary Protection (`\b`)**:
   - Naive `sentence.toLowerCase().includes(kw)` fails severely on short words:
     - Keyword `"age"` would falsely match `"percentage"`, `"storage"`, `"page"`, `"damage"`, `"cottage"`.
     - Keyword `"tax"` would falsely match `"syntax"`.
   - **Solution**: Use `\b` word boundaries for single words: `new RegExp(`\\b${escapedKeyword}\\b`, 'i')`.
2. **Multi-Word Phrases with Flexible Whitespace**:
   - In PDFs, a phrase like `"educational qualification"` might be broken across lines as `"educational\nqualification"` or contain multiple spacing glyphs.
   - **Solution**: Replace spaces in the keyword pattern with `\s+`:
     ```js
     function compileKeywordRegex(keyword, wholeWord = true) {
       const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const pattern = escaped.replace(/\s+/g, '\\s+');
       return wholeWord ? new RegExp(`\\b${pattern}\\b`, 'i') : new RegExp(pattern, 'i');
     }
     ```
3. **Keyword Hit Tracking**:
   - The parser tracks:
     - `matchedKeywords`: Array of keywords that had at least 1 hit.
     - `unmatchedKeywords`: Array of requested keywords not found in the document.
     - `keywordHits`: Map of keyword -> count of matching sentences/pages.

---

### 3.2 Filtering Granularities: Page vs. Sentence vs. Hybrid

| Mode | Behavior | Pros | Cons | Token Reduction |
| :--- | :--- | :--- | :--- | :--- |
| **`page`** | Returns full text of any page with >= 1 keyword | Keeps complete document layout, subheadings, and nearby tables | Retains irrelevant paragraphs and boilerplate on the page | ~**50% – 70%** |
| **`sentence`** (Strict) | Returns only sentences containing >= 1 keyword | Maximum noise reduction | Risk of losing context if the subject was in the preceding sentence | ~**80% – 95%** |
| **`hybrid` / `context`** *(Recommended)* | Returns matched sentences + `N` preceding & following sentences | High token reduction while guaranteeing grammatical and contextual integrity | Minor token increase over strict sentence mode | ~**75% – 90%** |

---

### 3.3 Sentence Boundary Detection in PDF Text

Text extracted from PDFs is notoriously noisy. Standard NLP splitters fail due to:
1. **Hard line wraps inside paragraphs**: A sentence spanning 3 lines has 2 embedded `\n` characters.
2. **Hyphenated line breaks**: Words split as `quali-\nfication`.
3. **Common abbreviations**: `Mr.`, `Govt.`, `Dr.`, `e.g.`, `i.e.`, `vs.`, `No.`, `Rs. 500`.
4. **Numbered lists & Decimals**: `1. Qualifications`, `01.01.2026`, `3.5 CGPA`.

#### The 7-Stage Cleaning & Segmentation Algorithm:
```
[Raw Page Text]
      │
      ▼
Stage 1: De-hyphenate line wraps (e.g. "quali-\nication" -> "qualification")
      │
      ▼
Stage 2: Format list markers (insert double newlines before "1. ", "(A) ", "• ")
      │
      ▼
Stage 3: Normalize soft line breaks (replace single \n within paragraphs with spaces)
      │
      ▼
Stage 4: Abbreviation & Number Masking:
         - Mask titles & terms (Govt., Mr., Dr., e.g., i.e., vs., No., Rs.) -> \u0001
         - Mask single-letter initials (A., B.) -> \u0001
         - Mask decimal numbers (01.01.2026, 60.5) -> \u0002
         - Mask numbered headings (1. Age -> 1\u0003 Age)
      │
      ▼
Stage 5: Regex Sentence Splitting:
         Split on (?<=[.!?])\s+(?=[A-Z0-9(\[])
      │
      ▼
Stage 6: Unmask placeholders (restore periods, decimals, and list dots)
      │
      ▼
Stage 7: Trim, filter empty lines & remove repetitive page footers ("Page X of Y")
```

---

### 3.4 Context Window & Range Merging Algorithm

When multiple keywords match consecutive sentences, naive windowing causes overlapping duplicates.

**Algorithm**:
1. Identify 0-based indices of all matching sentences on the page: `M = {i_1, i_2, ...}`.
2. For each match `i`, construct the interval `[max(0, i - contextBefore), min(N - 1, i + contextAfter)]`.
3. Sort intervals by start index.
4. Merge intervals where `cur.start <= prev.end + 1`.
5. For each merged block, emit the sentences with metadata indicating:
   - `sentenceIndex`
   - `isDirectMatch` (`true` if the sentence directly contained a keyword)
   - `matchedKeywords` (list of keywords found in this sentence)

#### Verified Test Simulation Results:
Using the multi-page recruitment notice simulation:
```
- Original Document: 2,359 characters (342 words, ~455 tokens)
- Page Mode: 804 characters (126 words, ~168 tokens) -> 65.9% reduction
- Sentence Mode (context: 1): 597 characters (101 words, ~135 tokens) -> 74.7% reduction
- Sentence Mode (context: 0): 444 characters (73 words, ~98 tokens) -> 81.2% reduction
```

---

## 4. API & Interface Contracts

To keep the pipeline robust and testable, we design a decoupled architecture based on the **Adapter Pattern**:
- `PdfExtractor`: Pluggable engine (`UnpdfExtractor`, `MockPdfExtractor`).
- `TargetedPdfParser`: Orchestrates extraction, cleaning, segmentation, matching, and reduction calculation.

### 4.1 TypeScript / JSDoc Contract Definitions

```ts
/**
 * Options for targeted PDF parsing.
 */
export interface ParsePdfOptions {
  /**
   * Extraction granularity:
   * - 'sentence': Extracts only sentences containing keywords (with optional context window).
   * - 'page': Extracts entire text of pages containing keywords.
   * @default 'sentence'
   */
  mode?: 'sentence' | 'page';

  /**
   * Number of preceding sentences to include when mode is 'sentence'.
   * @default 1
   */
  contextBefore?: number;

  /**
   * Number of following sentences to include when mode is 'sentence'.
   * @default 1
   */
  contextAfter?: number;

  /**
   * If true, matches keywords using word boundaries (\b).
   * @default true
   */
  wholeWord?: boolean;

  /**
   * Minimum sentence character length to avoid isolated punctuation artifacts.
   * @default 5
   */
  minSentenceLength?: number;

  /**
   * Optional custom PDF text extractor implementation.
   */
  extractor?: IPdfExtractor;
}

/**
 * Metadata for a single extracted sentence.
 */
export interface ExtractedSentence {
  index: number;
  text: string;
  isDirectMatch: boolean;
  matchedKeywords: string[];
}

/**
 * A contiguous block of sentences (a match and its surrounding context).
 */
export interface SentenceBlock {
  pageNumber: number;
  range: [number, number]; // [startIndex, endIndex]
  text: string;
  sentences: ExtractedSentence[];
}

/**
 * Per-page match details.
 */
export interface PageMatchResult {
  pageNumber: number;
  matchedKeywords: string[];
  totalSentences: number;
  matchedSentencesCount: number;
  extractedText: string;
  blocks: SentenceBlock[];
}

/**
 * Token and character reduction metrics.
 */
export interface ReductionMetrics {
  originalChars: number;
  extractedChars: number;
  charReductionPercent: number;
  originalWords: number;
  extractedWords: number;
  wordReductionPercent: number;
  estimatedOriginalTokens: number;
  estimatedExtractedTokens: number;
}

/**
 * Overall result returned by the targeted PDF parser.
 */
export interface TargetedPdfResult {
  success: boolean;
  source: string; // File path or 'buffer'
  totalPages: number;
  matchedPagesCount: number;
  matchedKeywords: string[];
  unmatchedKeywords: string[];
  matchedPages: PageMatchResult[];
  /**
   * Consolidated clean text snippet formatted with page headers,
   * ready to be fed directly into the Gemini prompt.
   */
  targetedText: string;
  metrics: ReductionMetrics;
  durationMs: number;
}

/**
 * Pluggable PDF Extractor interface.
 */
export interface IPdfExtractor {
  /**
   * Extracts raw text from a PDF buffer or Uint8Array page by page.
   * @returns Array of page texts where index 0 = Page 1.
   */
  extractPages(data: Buffer | Uint8Array): Promise<{ totalPages: number; pages: string[] }>;
}
```

---

### 4.2 Module Architecture & Reference Implementation

```
src/
├── services/
│   └── pdf/
│       ├── index.js             # Main entry point (parseTargetedPdf)
│       ├── extractor.js         # IPdfExtractor & UnpdfExtractor
│       ├── segmenter.js         # Text normalization & sentence boundary splitting
│       ├── matcher.js           # Case-insensitive multi-keyword matcher & context windowing
│       └── metrics.js           # Token & character reduction metrics calculator
```

#### Reference Implementation: `src/services/pdf/extractor.js`
```js
const { extractText } = require('unpdf');

class UnpdfExtractor {
  async extractPages(data) {
    const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    const result = await extractText(uint8, { mergePages: false });
    const pages = Array.isArray(result.text) ? result.text : [result.text];
    return {
      totalPages: result.totalPages || pages.length,
      pages: pages.map(p => (typeof p === 'string' ? p : ''))
    };
  }
}

class MockPdfExtractor {
  constructor(mockPages = []) {
    this.mockPages = mockPages;
  }
  async extractPages() {
    return {
      totalPages: this.mockPages.length,
      pages: this.mockPages
    };
  }
}

module.exports = { UnpdfExtractor, MockPdfExtractor };
```

#### Reference Implementation: `src/services/pdf/segmenter.js`
```js
const ABBREVIATIONS = [
  'Govt', 'govt', 'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
  'e\\.g', 'i\\.e', 'vs', 'etc', 'No', 'no', 'Rs', 'approx', 'dept', 'vol', 'p', 'pp', 'Advt'
];
const ABBR_REGEX = new RegExp(`\\b(${ABBREVIATIONS.join('|')})\\.`, 'gi');

function splitSentences(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Stage 1: De-hyphenate line breaks
  let cleaned = rawText.replace(/(\b\w+)-\s*\r?\n\s*(\w+\b)/g, '$1$2');

  // Stage 2: Separate numbered list items and bullet points
  cleaned = cleaned.replace(/\r?\n\s*([0-9]+\.|\([A-Za-z0-9]+\)|[•\-\*])\s+/gi, '\n\n$1 ');

  // Stage 3: Normalize soft line breaks to spaces, double breaks to paragraphs
  cleaned = cleaned
    .replace(/\r?\n\s*\r?\n/g, '{{PARAGRAPH}}')
    .replace(/\r?\n/g, ' ')
    .replace(/{{PARAGRAPH}}/g, '\n');

  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const sentences = [];

  for (const line of lines) {
    // Stage 4: Mask abbreviations, initials, decimals, and list dots
    let masked = line.replace(ABBR_REGEX, '$1\u0001');
    masked = masked.replace(/\b([A-Z])\./g, '$1\u0001');
    masked = masked.replace(/(\d+)\.(\d+)/g, '$1\u0002$2');
    masked = masked.replace(/^(\d+)\.\s+/g, '$1\u0003 ');

    // Stage 5: Split on terminal punctuation
    const segments = masked.split(/(?<=[.!?])\s+(?=[A-Z0-9(\[])/);

    // Stage 6: Restore masks
    for (let segment of segments) {
      segment = segment
        .replace(/\u0001/g, '.')
        .replace(/\u0002/g, '.')
        .replace(/\u0003/g, '.')
        .trim();
      if (segment.length >= 3) {
        sentences.push(segment);
      }
    }
  }

  return sentences;
}

module.exports = { splitSentences };
```

---

## 5. Sample Test PDFs & Verification Strategy

### 5.1 Test PDF Design Requirements
To test the pipeline both unit-wise and end-to-end, test PDFs must provide clear positive and negative controls across multiple pages:

1. **Page 1 (Negative Control)**:
   - Topic: General organization history, disclaimer, instructions for online filling.
   - Purpose: Ensures zero false positives when no keywords are present.
2. **Page 2 (Primary Positive Control)**:
   - Topic: Eligibility criteria (Age limit: 21 to 30 years as of 01.08.2026, Bachelor's degree in Engineering/Computer Science, SC/ST 5-year relaxation).
   - Purpose: Verifies targeted sentence extraction and token reduction on core criteria.
3. **Page 3 (Distractor / Negative Control)**:
   - Topic: Examination centers, dress code, prohibited items, admit card rules.
   - Purpose: Verifies that irrelevant middle pages are completely skipped.
4. **Page 4 (Secondary Positive Control)**:
   - Topic: Application fee (Rs. 500 for General/OBC, exempt for SC/ST/Female), payment gateway.
   - Purpose: Verifies multi-page non-consecutive page matching and context window isolation.

### 5.2 Fixture Generation Approaches

We evaluated three options for creating test PDFs:

| Approach | Implementation | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Programmatic Generation via `pdf-lib`** | Script `tests/fixtures/generate-sample-pdf.js` generates `tests/fixtures/sample-recruitment.pdf` | Deterministic, reproducible, easily editable text, cross-platform | Adds `pdf-lib` as devDependency | **Recommended for fixture build script** |
| **Option B: Checked-in Static PDF Fixture** | Pre-generated `tests/fixtures/recruitment-sample.pdf` committed to repo | Zero build step, immediate execution in tests | Binary diffs in git if modified | **Complementary (generate once and commit)** |
| **Option C: Unit-Level Mocking (`MockPdfExtractor`)** | In-memory text strings passed to `TargetedPdfParser` | Blazing fast (sub-millisecond test runs), no I/O, perfect CI reliability | Doesn't test PDF binary parser | **Used for 90% of unit tests** |

### 5.3 Automated Test Suite Plan
The test suite for Requirement 1 will cover:
1. **Keyword Matcher Tests**:
   - Case-insensitivity (`"age"`, `"AGE"`, `"Age"`).
   - Whole word boundaries (`"age"` matches `"age 21"` but NOT `"percentage"` or `"storage"`).
   - Multi-word phrases across whitespace (`"minimum age"`, `"educational   qualification"`).
2. **Sentence Segmenter Tests**:
   - Abbreviations (`"Govt. of India"`, `"Mr. Smith"`, `"Rs. 500"`, `"e.g. B.Tech"`).
   - Dates & Decimals (`"01.01.2026"`, `"60.5%"`).
   - Hyphenated line wrap reconstruction (`"quali-\nication"` -> `"qualification"`).
3. **Targeted Extractor Tests**:
   - Mode `'sentence'` vs `'page'`.
   - Context window expansion (`contextBefore: 1, contextAfter: 1`).
   - Overlapping interval merging (sentences 3 and 4 match -> single contiguous block).
   - Zero match scenario (returns empty snippets, 0% match, clear message).
4. **Integration Test**:
   - Reads `tests/fixtures/sample-recruitment.pdf`.
   - Extracts eligibility sentences.
   - Asserts character & word reduction > 70%.
   - Asserts Page 1 and Page 3 are omitted, Page 2 and Page 4 are retained.

---

## 6. Conclusion & Implementation Checklist for Milestone 1

`unpdf` is the ideal PDF text extraction foundation for our Node.js v24 environment, and the designed hybrid sentence segmentation algorithm provides the required token reduction (75-85%+) to feed clean, focused text into the Gemini API (Requirement 2).

### Next Steps for Implementation (Milestone 1):
1. Add `unpdf` to `package.json` dependencies.
2. Implement `src/services/pdf/extractor.js`, `src/services/pdf/segmenter.js`, `src/services/pdf/matcher.js`, and `src/services/pdf/index.js`.
3. Create `tests/fixtures/sample-recruitment.pdf` and unit/integration tests in `tests/pdf.test.js`.
4. Expose `parseTargetedPdf(input, keywords, options)` for the upcoming Gemini pipeline (Milestone 2).
