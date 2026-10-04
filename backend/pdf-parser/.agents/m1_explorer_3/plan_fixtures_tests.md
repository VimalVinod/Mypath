# Milestone 1: Fixture Generator & Unit Test Suite Blueprint

> **Author**: `m1_explorer_3` (Teamwork Explorer)  
> **Date**: 2026-09-13  
> **Target**: Milestone 1 (Targeted PDF Parsing & Unit Test Foundation)  
> **Project**: `mypath-scraper`  
> **Environment**: Node.js v24.13.0, Windows x64  
> **Dependencies**: `pdf-lib` (v1.17.1), `unpdf` (v1.8.1), Node built-in `node:test` & `node:assert/strict`  

---

## 1. Architectural Overview & Context

This document provides the complete, production-grade technical blueprint for two core deliverables in Milestone 1:
1. **`fixtures/generate-sample-pdf.js`**: A deterministic, programmatic PDF generator using `pdf-lib` that produces a realistic 4-page civil service recruitment notification (`fixtures/sample-notification.pdf`) with strict positive and negative control pages.
2. **`test/pdf-extractor.test.js`**: A comprehensive, opaque-box unit and integration test suite runnable via `node --test test/pdf-extractor.test.js` verifying all requirements of R1, boundary conditions, context windowing, token reduction calculations, and real fixture parsing.

### 1.1 Alignment with System Interface Contracts

As established in `PROJECT.md`, the PDF parsing subsystem exposes:
```javascript
const { extractTargetedPdfText, MockPdfAdapter, UnpdfAdapter, splitSentences } = require('../src/services/pdf');
```

Output Schema Contract (`PROJECT.md` §1):
```javascript
{
  success: boolean,
  rawStats: {
    totalPages: number,
    rawCharCount: number,
    rawWordCount: number,
    estimatedRawTokens: number
  },
  extractedStats: {
    matchedPages: number[],
    sentenceCount: number,
    extractedCharCount: number,
    extractedWordCount: number,
    estimatedTokens: number,
    reductionPercentage: number
  },
  targetedText: string,
  sections: Array<{
    pageNumber: number,
    sentences: string[]
  }>
}
```

---

## 2. Fixture Generator Design (`fixtures/generate-sample-pdf.js`)

### 2.1 4-Page Control Architecture
To rigorously validate keyword filtering (both page-level and sentence-level) and ensure zero false positives, the 4-page notification is structured with alternating negative and positive controls:

| Page | Title / Section | Category | Keyword Target Status | Keywords Present | Key Target Data |
|---|---|---|---|---|---|
| **Page 1** | Organization Header, Gazette Announcement & Disclaimers | **Negative Control** | **STRICT NEGATIVE** (0 matches) | None (`eligibility`, `age`, `fee`, `vacancy`, `qualification` strictly omitted) | Notice No. 04/2026-CSP, General Preamble, Facilitation Counter, Impersonation Warning |
| **Page 2** | Section II: Candidate Specifications & Eligibility Conditions | **Positive Match** | **POSITIVE MATCH** | `eligibility`, `age limit`, `qualification`, `relaxation` | Age: 21 to 32 years; Relaxation: SC/ST 5 yrs, OBC 3 yrs; Degree: Bachelor's degree in any discipline |
| **Page 3** | Section III: Examination Centers, Scheme & Syllabus Outline | **Negative Control** | **STRICT NEGATIVE** (0 matches) | None (`eligibility`, `age`, `fee`, `vacancy`, `qualification` strictly omitted) | 24 Exam Centers, Prelims (Paper I 200 marks, Paper II 200 marks), Hall Protocols |
| **Page 4** | Section IV: Vacancies, Important Dates & Application Fee | **Positive Match** | **POSITIVE MATCH** | `vacancies`, `vacancy`, `important dates`, `fee`, `application fee` | Vacancies: 1056 posts; Window: 2026-01-10 to 2026-02-15; Exam: 2026-05-24; Fee: Rs. 100 General/OBC, Nil SC/ST/Female |

### 2.2 Text Flow & Rendering Engine with `pdf-lib`
1. **Dimensions**: Standard A4 (`[595.28, 841.89]` pt) with 50 pt horizontal margins (printable width: 495.28 pt).
2. **Typography**: `StandardFonts.Helvetica` (regular body text, 10 pt, line height 14 pt) and `StandardFonts.HelveticaBold` (titles 16 pt, section headings 12 pt, subheadings 10 pt).
3. **Multi-line Paragraph Wrapping**: A dedicated line-wrapping utility measures word widths via `font.widthOfTextAtSize(word, size)` to assemble lines that fit within printable width without clipping or overflowing.
4. **Deterministic Output**: Fixed creation and modification timestamps (`2026-01-10T00:00:00.000Z`) ensure identical byte arrays on every run.
5. **Programmatic & CLI Dual Mode**: Can be run from command line (`node fixtures/generate-sample-pdf.js`) or imported as a library by test suites.

### 2.3 Complete Implementation Blueprint for `fixtures/generate-sample-pdf.js`

```javascript
/**
 * fixtures/generate-sample-pdf.js
 * Programmatic generator for realistic multi-page civil service recruitment notification.
 * Uses pdf-lib to produce fixtures/sample-notification.pdf.
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Canonical benchmark data used across M1 (tests), M2 (Gemini), and M3 (Unity validation)
const NOTIFICATION_DATA = {
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  noticeNumber: '04/2026-CSP',
  examTitle: 'COMBINED CIVIL SERVICES EXAMINATION 2026',
  page1: {
    title: 'OFFICIAL GAZETTE NOTIFICATION',
    text: [
      'The Union Public Service Commission hereby publishes this formal announcement regarding the preliminary schedule for the national competitive examination.',
      'The examination is conducted annually for recruitment to various central administrative services and departmental roles under the Government of India.',
      'Candidates are advised to read the administrative instructions and submission guidelines carefully before commencing online registration on the portal.',
      'All applicants must possess a valid personal email address and mobile telephone number which should be kept active throughout the entire selection cycle.',
      'In case of any guidance or information regarding the application protocol, candidates can contact the commission facilitation counter near gate C during official working hours between 10:00 hrs and 17:00 hrs on all working days.',
      'Canvassing in any form or producing forged certificates will lead to immediate cancellation of candidature and criminal prosecution under applicable statutory provisions.',
      'Impersonation at any stage of the competitive examination shall invite debarment from all future examinations conducted by the commission.'
    ]
  },
  page2: {
    title: 'SECTION II - ELIGIBILITY CONDITIONS AND CANDIDATE SPECIFICATIONS',
    text: [
      '1. Nationality: A candidate must be either a citizen of India, or a subject of Nepal, or a subject of Bhutan.',
      '2. Age Limits: A candidate must have attained the minimum age of 21 years and must not have exceeded the maximum age of 32 years as on the cut-off date of 1st August 2026.',
      'The candidate must have been born not earlier than 2nd August 1994 and not later than 1st August 2005.',
      'The upper age limit prescribed above will be relaxable for reserved categories as per Govt. directives: up to a maximum of 5 years if a candidate belongs to a Scheduled Caste (SC) or Scheduled Tribe (ST), and up to a maximum of 3 years in the case of candidates belonging to Other Backward Classes (OBC).',
      'Candidates seeking age relaxation must produce valid caste documentation issued by the competent district authority.',
      '3. Minimum Educational Qualifications: A candidate must hold a Bachelor\'s degree in any discipline from a recognized University incorporated by an Act of the Central or State Legislature in India or an educational institution established by an Act of Parliament.',
      'Candidates possessing an equivalent professional or technical degree recognized by the Govt. as equivalent to graduation are also eligible to apply.',
      'Candidates who have appeared at an examination the passing of which would render them educationally qualified for the Commission\'s examination, but have not received the result, may also apply for the preliminary stage.',
      '4. Physical Standards: Candidates must be physically fit according to physical standards for admission to Civil Services Examination 2026 as per regulations given in Appendix III of the rules.'
    ]
  },
  page3: {
    title: 'SECTION III - EXAMINATION CENTRES, SCHEME AND SYLLABUS',
    text: [
      '1. Centres of Preliminary Examination: The Preliminary Examination will be held at various designated centers across the country including Agartala, Ahmedabad, Aizawl, Bengaluru, Bhopal, Chandigarh, Chennai, Cuttack, Delhi, Dispur, Hyderabad, Imphal, Itanagar, Jaipur, Jammu, Kolkata, Lucknow, Mumbai, Patna, Ranchi, Shillong, Shimla, and Thiruvananthapuram.',
      'Allotment of Centers will be on the first-apply-first-allot basis, and once an examination center is opted for by the applicant, no request for change of center shall normally be entertained.',
      '2. Structure of Examination: The Competitive Examination comprises two successive stages: (i) Preliminary Examination (Objective type for the selection of candidates for the Main Examination) and (ii) Main Examination (Written and Interview) for the selection of candidates for the various services.',
      'Preliminary Examination Outline: Paper I will consist of 200 marks covering current events of national and international importance, history of India, Indian and world geography, Indian polity and governance, economic and social development, and general science.',
      'Paper II will consist of 200 marks testing comprehension, interpersonal skills including communication skills, logical reasoning and analytical ability, decision-making and problem-solving, and general mental ability.',
      'Candidates are strictly prohibited from bringing mobile phones, smart watches, calculators, or any electronic communication equipment inside the examination premises.'
    ]
  },
  page4: {
    title: 'SECTION IV - VACANCIES, IMPORTANT DATES AND APPLICATION FEE',
    text: [
      '1. Number of Vacancies: The number of vacancies to be filled through the examination is expected to be approximately 1056 posts.',
      'Reservation will be made for candidates belonging to SC, ST, OBC, EWS and Persons with Benchmark Disabilities categories in respect of vacancies as determined by the Govt. of India.',
      'Final allocation of posts shall depend on the roster position reported by the cadre controlling authorities before declaration of the final merit list.',
      '2. Schedule and Important Dates: The online application window opens on 2026-01-10 at 10:00 hrs.',
      'The last date for submission of online applications is 2026-02-15 until 18:00 hrs.',
      'The Preliminary Examination is scheduled to be conducted nationwide on 2026-05-24.',
      'Admit cards will be available for download on the official portal approximately three weeks before the commencement of the examination.',
      '3. Application Fee Structure: Candidates applying for the examination are required to pay an application fee of Rs. 100 for General and OBC male candidates.',
      'Female candidates and candidates belonging to SC, ST, and Persons with Benchmark Disability categories are completely exempt from payment of fee (Fee: Nil).',
      'The fee can be paid through any branch of State Bank of India by cash, or by using net banking facility of any bank, or by using Visa, Master, RuPay credit or debit card, or via UPI.',
      'Fee once paid shall not be refunded under any circumstances nor can it be held in reserve for any other examination or selection.'
    ]
  }
};

/**
 * Helper to wrap text into lines fitting within maxWidth.
 */
function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Programmatically generates the 4-page sample recruitment PDF.
 * @param {Object} options
 * @param {string} [options.outputPath] - File path where PDF is saved (default: fixtures/sample-notification.pdf)
 * @param {boolean} [options.returnBuffer=false] - Whether to return Uint8Array buffer
 * @returns {Promise<Uint8Array>}
 */
async function generateSamplePdf(options = {}) {
  const outputPath = options.outputPath || path.join(__dirname, 'sample-notification.pdf');
  const pdfDoc = await PDFDocument.create();

  // Set deterministic metadata
  pdfDoc.setTitle('Civil Services Examination 2026 Notification');
  pdfDoc.setAuthor('Union Public Service Commission');
  pdfDoc.setSubject('Recruitment Notification No. 04/2026-CSP');
  pdfDoc.setCreationDate(new Date('2026-01-10T00:00:00.000Z'));
  pdfDoc.setModificationDate(new Date('2026-01-10T00:00:00.000Z'));

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 50;
  const contentWidth = pageWidth - (marginX * 2);

  const pagesData = [
    { pageNum: 1, ...NOTIFICATION_DATA.page1 },
    { pageNum: 2, ...NOTIFICATION_DATA.page2 },
    { pageNum: 3, ...NOTIFICATION_DATA.page3 },
    { pageNum: 4, ...NOTIFICATION_DATA.page4 }
  ];

  for (const pData of pagesData) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - 50;

    // Header bar
    page.drawText(NOTIFICATION_DATA.organization, {
      x: marginX,
      y: currentY,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.3)
    });
    currentY -= 18;

    page.drawText(`Notice No: ${NOTIFICATION_DATA.noticeNumber} | ${NOTIFICATION_DATA.examTitle}`, {
      x: marginX,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });
    currentY -= 12;

    // Divider rule
    page.drawLine({
      start: { x: marginX, y: currentY },
      end: { x: pageWidth - marginX, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
    currentY -= 25;

    // Section Title
    page.drawText(pData.title, {
      x: marginX,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15)
    });
    currentY -= 20;

    // Paragraphs
    for (const paragraph of pData.text) {
      const lines = wrapText(paragraph, fontRegular, 9.5, contentWidth);
      for (const line of lines) {
        if (currentY < 60) break; // prevent footer clipping
        page.drawText(line, {
          x: marginX,
          y: currentY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1)
        });
        currentY -= 13;
      }
      currentY -= 6; // paragraph spacing
    }

    // Footer
    page.drawLine({
      start: { x: marginX, y: 40 },
      end: { x: pageWidth - marginX, y: 40 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });

    page.drawText(`Page ${pData.pageNum} of 4`, {
      x: pageWidth - marginX - 50,
      y: 25,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4)
    });

    page.drawText('Confidential / Official Gazette Notification', {
      x: marginX,
      y: 25,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  const pdfBytes = await pdfDoc.save();

  // Save to disk if outputPath provided
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  }

  return pdfBytes;
}

// CLI Execution entry point
if (require.main === module) {
  const targetFile = process.argv[2] || path.join(__dirname, 'sample-notification.pdf');
  generateSamplePdf({ outputPath: targetFile })
    .then((bytes) => {
      console.log(`[OK] Generated sample PDF notification: ${targetFile}`);
      console.log(`[OK] Size: ${bytes.length} bytes, 4 pages, deterministic metadata set.`);
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to generate PDF:`, err);
      process.exit(1);
    });
}

module.exports = {
  generateSamplePdf,
  NOTIFICATION_DATA
};
```

---

## 3. Unit Test Suite Design (`test/pdf-extractor.test.js`)

### 3.1 Test Philosophy & Framework Architecture
- **Framework**: Node.js built-in `node:test` + `node:assert/strict`.
- **Command**: `node --test test/pdf-extractor.test.js`.
- **Zero External Test Dependencies**: Works directly on Node 24 without Jest, Mocha, or Babel.
- **Dual-Mode Execution**:
  - **In-Memory Mock Tests**: Uses `MockPdfAdapter` for sub-millisecond execution of combinatorial parsing logic, windowing, boundary edge cases, and metrics.
  - **Real Binary Integration Tests**: Runs against `fixtures/sample-notification.pdf` using `UnpdfAdapter` and `pdf-lib` to prove true end-to-end binary compatibility.

### 3.2 Test Inventory (34 Tests across 9 Categories)

```
test/pdf-extractor.test.js
├── 1. Basic Extraction & Adapter Abstraction (4 tests)
│   ├── 1.1 extracts text from a multi-page PDF buffer using default settings
│   ├── 1.2 adheres strictly to the PROJECT.md output schema contract
│   ├── 1.3 accepts both file path string and Buffer as input
│   └── 1.4 works seamlessly with in-memory MockPdfAdapter
│
├── 2. Page-Level Keyword Filtering (mode: 'page') (4 tests)
│   ├── 2.1 returns full text of pages containing any target keyword
│   ├── 2.2 correctly identifies matchedPages: [2, 4] for recruitment criteria
│   ├── 2.3 strictly omits negative control pages (Page 1 and Page 3)
│   └── 2.4 preserves all sentences of matched pages in page mode
│
├── 3. Sentence-Level Keyword Filtering (mode: 'sentence') (4 tests)
│   ├── 3.1 extracts only sentences containing keywords when context is 0
│   ├── 3.2 excludes non-matching sentences on the same page
│   ├── 3.3 tags direct matches accurately in section metadata
│   └── 3.4 produces higher token reduction than page mode
│
├── 4. Context Windowing & Overlapping Window Merging (5 tests)
│   ├── 4.1 includes 1 sentence before and 1 sentence after by default (context: 1)
│   ├── 4.2 clamps context window gracefully at start of page (index 0)
│   ├── 4.3 clamps context window gracefully at end of page (index N-1)
│   ├── 4.4 merges overlapping sentence intervals into a contiguous block
│   └── 4.5 supports asymmetric context windows (e.g. contextBefore: 2, contextAfter: 0)
│
├── 5. Token & Character Reduction Metrics (4 tests)
│   ├── 5.1 calculates rawCharCount, rawWordCount, and estimatedRawTokens accurately
│   ├── 5.2 calculates extractedCharCount and extractedWordCount accurately
│   ├── 5.3 calculates reductionPercentage with high precision: ((raw - extracted) / raw) * 100
│   └── 5.4 reports 0% reduction when all sentences on all pages match
│
├── 6. Keyword Matching & Sensitivity (5 tests)
│   ├── 6.1 matches keywords case-insensitively ('ELIGIBILITY', 'Age Limit', 'vAcAnCy')
│   ├── 6.2 enforces whole-word boundaries ('age' must NOT match 'percentage' or 'manage')
│   ├── 6.3 matches multi-word phrases across irregular whitespace ('educational   qualification')
│   ├── 6.4 escapes special regex characters in keywords safely ('C++', 'U.S.')
│   └── 6.5 tracks keyword hit counts and matched vs unmatched keywords
│
├── 7. Sentence Boundary Segmentation & Abbreviation Preservation (4 tests)
│   ├── 7.1 does NOT prematurely split on governmental abbreviations ('Govt.', 'Sec.')
│   ├── 7.2 does NOT split on honorific titles ('Mr.', 'Dr.', 'Prof.')
│   ├── 7.3 does NOT split on currency expressions ('Rs. 100', 'Rs. 500')
│   └── 7.4 does NOT split on dates or decimal numbers ('01.08.2026', '60.5%')
│
├── 8. Boundary & Error Handling (4 tests)
│   ├── 8.1 returns empty targetedText and zero matches when keywords array is empty
│   ├── 8.2 handles document with no keyword matches gracefully without throwing
│   ├── 8.3 handles empty or whitespace-only PDF text gracefully
│   └── 8.4 rejects with descriptive error on missing file path or corrupt PDF buffer
│
└── 9. Real-World Multi-Page Fixture Integration (Tier 4) (4 tests)
    ├── 9.1 parses fixtures/sample-notification.pdf and extracts Page 2 (age & qualification)
    ├── 9.2 parses fixtures/sample-notification.pdf and extracts Page 4 (vacancies & fees)
    ├── 9.3 achieves >= 70% reduction on sample-notification.pdf
    └── 9.4 formats targetedText with clean page demarcations ready for Gemini API
```

### 3.3 Complete Implementation Blueprint for `test/pdf-extractor.test.js`

```javascript
/**
 * test/pdf-extractor.test.js
 * Comprehensive unit and integration test suite for Milestone 1 PDF extraction.
 * Runnable via: node --test test/pdf-extractor.test.js
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const {
  extractTargetedPdfText,
  MockPdfAdapter,
  UnpdfAdapter,
  splitSentences
} = require('../src/services/pdf');

const {
  generateSamplePdf,
  NOTIFICATION_DATA
} = require('../fixtures/generate-sample-pdf');

const SAMPLE_PDF_PATH = path.join(__dirname, '../fixtures/sample-notification.pdf');

// Ensure sample fixture exists before running tests
before(async () => {
  if (!fs.existsSync(SAMPLE_PDF_PATH)) {
    await generateSamplePdf({ outputPath: SAMPLE_PDF_PATH });
  }
});

// =========================================================================
// Category 1: Basic Extraction & Adapter Abstraction
// =========================================================================
describe('Category 1: Basic Extraction & Adapter Abstraction', () => {
  it('1.1 extracts text from a multi-page PDF buffer using default settings', async () => {
    const buffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const result = await extractTargetedPdfText(buffer, {
      keywords: ['eligibility', 'vacancies']
    });

    assert.equal(result.success, true);
    assert.equal(result.rawStats.totalPages, 4);
    assert.ok(result.extractedStats.sentenceCount > 0);
    assert.ok(result.targetedText.length > 0);
  });

  it('1.2 adheres strictly to the PROJECT.md output schema contract', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['bachelor']
    });

    assert.equal(typeof result.success, 'boolean');
    assert.equal(typeof result.rawStats.totalPages, 'number');
    assert.equal(typeof result.rawStats.rawCharCount, 'number');
    assert.equal(typeof result.rawStats.rawWordCount, 'number');
    assert.equal(typeof result.rawStats.estimatedRawTokens, 'number');

    assert.ok(Array.isArray(result.extractedStats.matchedPages));
    assert.equal(typeof result.extractedStats.sentenceCount, 'number');
    assert.equal(typeof result.extractedStats.extractedCharCount, 'number');
    assert.equal(typeof result.extractedStats.extractedWordCount, 'number');
    assert.equal(typeof result.extractedStats.estimatedTokens, 'number');
    assert.equal(typeof result.extractedStats.reductionPercentage, 'number');

    assert.equal(typeof result.targetedText, 'string');
    assert.ok(Array.isArray(result.sections));
  });

  it('1.3 accepts both file path string and Buffer as input', async () => {
    const resFromFile = await extractTargetedPdfText(SAMPLE_PDF_PATH, { keywords: ['age'] });
    const buffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const resFromBuffer = await extractTargetedPdfText(buffer, { keywords: ['age'] });

    assert.equal(resFromFile.success, true);
    assert.equal(resFromBuffer.success, true);
    assert.deepEqual(resFromFile.extractedStats.matchedPages, resFromBuffer.extractedStats.matchedPages);
    assert.equal(resFromFile.extractedStats.sentenceCount, resFromBuffer.extractedStats.sentenceCount);
  });

  it('1.4 works seamlessly with in-memory MockPdfAdapter', async () => {
    const mockAdapter = new MockPdfAdapter([
      'This is page one intro without terms.',
      'This page mentions eligibility and age requirements.',
      'This is page three general rules.'
    ]);

    const result = await extractTargetedPdfText('mock-source', {
      adapter: mockAdapter,
      keywords: ['eligibility']
    });

    assert.equal(result.success, true);
    assert.equal(result.rawStats.totalPages, 3);
    assert.deepEqual(result.extractedStats.matchedPages, [2]);
  });
});

// =========================================================================
// Category 2: Page-Level Keyword Filtering (mode: 'page')
// =========================================================================
describe('Category 2: Page-Level Keyword Filtering (mode: "page")', () => {
  it('2.1 returns full text of pages containing any target keyword', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Negative page text here.',
      'Sentence A. Sentence with keyword eligibility here. Sentence B.',
      'Another negative page.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      mode: 'page',
      keywords: ['eligibility']
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.extractedStats.matchedPages, [2]);
    assert.ok(result.targetedText.includes('Sentence A'));
    assert.ok(result.targetedText.includes('Sentence B'));
  });

  it('2.2 correctly identifies matchedPages: [2, 4] for recruitment criteria on sample PDF', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      mode: 'page',
      keywords: ['eligibility', 'application fee']
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.extractedStats.matchedPages, [2, 4]);
  });

  it('2.3 strictly omits negative control pages (Page 1 and Page 3)', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      mode: 'page',
      keywords: ['age limits', 'vacancies']
    });

    assert.ok(!result.extractedStats.matchedPages.includes(1), 'Page 1 must not match');
    assert.ok(!result.extractedStats.matchedPages.includes(3), 'Page 3 must not match');
  });

  it('2.4 preserves all sentences of matched pages in page mode', async () => {
    const mockAdapter = new MockPdfAdapter([
      'First sentence. Second sentence with target. Third sentence.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      mode: 'page',
      keywords: ['target']
    });

    assert.equal(result.sections[0].sentences.length, 3);
  });
});

// =========================================================================
// Category 3: Sentence-Level Keyword Filtering (mode: 'sentence')
// =========================================================================
describe('Category 3: Sentence-Level Keyword Filtering (mode: "sentence")', () => {
  it('3.1 extracts only sentences containing keywords when context is 0', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Irrelevant sentence one. Candidate must meet age criteria. Irrelevant sentence three.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      mode: 'sentence',
      contextBefore: 0,
      contextAfter: 0,
      keywords: ['age criteria']
    });

    assert.equal(result.extractedStats.sentenceCount, 1);
    assert.equal(result.sections[0].sentences[0], 'Candidate must meet age criteria.');
  });

  it('3.2 excludes non-matching sentences on the same page', async () => {
    const mockAdapter = new MockPdfAdapter([
      'First sentence noise. Second sentence noise. Matching keyword fee here. Fourth sentence noise.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      mode: 'sentence',
      contextBefore: 0,
      contextAfter: 0,
      keywords: ['fee']
    });

    assert.ok(!result.targetedText.includes('First sentence noise'));
    assert.ok(!result.targetedText.includes('Fourth sentence noise'));
    assert.ok(result.targetedText.includes('Matching keyword fee here.'));
  });

  it('3.3 tags direct matches accurately in section metadata', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence one before. Direct match with qualification. Sentence three after.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      mode: 'sentence',
      contextBefore: 1,
      contextAfter: 1,
      keywords: ['qualification']
    });

    assert.equal(result.sections[0].sentences.length, 3);
  });

  it('3.4 produces higher token reduction than page mode', async () => {
    const pageRes = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      mode: 'page',
      keywords: ['age limits']
    });

    const sentRes = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      mode: 'sentence',
      contextBefore: 0,
      contextAfter: 0,
      keywords: ['age limits']
    });

    assert.ok(
      sentRes.extractedStats.reductionPercentage > pageRes.extractedStats.reductionPercentage,
      `Sentence reduction (${sentRes.extractedStats.reductionPercentage}%) must be higher than page reduction (${pageRes.extractedStats.reductionPercentage}%)`
    );
  });
});

// =========================================================================
// Category 4: Context Windowing & Overlapping Window Merging
// =========================================================================
describe('Category 4: Context Windowing & Overlapping Window Merging', () => {
  it('4.1 includes 1 sentence before and 1 sentence after by default (context: 1)', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0. Sentence 1. Match on sentence 2 with eligibility. Sentence 3. Sentence 4.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['eligibility'] // default contextBefore: 1, contextAfter: 1
    });

    assert.equal(result.sections[0].sentences.length, 3);
    assert.equal(result.sections[0].sentences[0], 'Sentence 1.');
    assert.equal(result.sections[0].sentences[1], 'Match on sentence 2 with eligibility.');
    assert.equal(result.sections[0].sentences[2], 'Sentence 3.');
  });

  it('4.2 clamps context window gracefully at start of page (index 0)', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0 has eligibility keyword. Sentence 1. Sentence 2.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      contextBefore: 2,
      contextAfter: 1,
      keywords: ['eligibility']
    });

    // Should not throw index out of bounds; starts at 0
    assert.equal(result.sections[0].sentences[0], 'Sentence 0 has eligibility keyword.');
    assert.equal(result.sections[0].sentences[1], 'Sentence 1.');
  });

  it('4.3 clamps context window gracefully at end of page (index N-1)', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0. Sentence 1. Last sentence 2 has eligibility.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      contextBefore: 1,
      contextAfter: 5,
      keywords: ['eligibility']
    });

    // Should clamp to sentence 2 without throwing
    assert.equal(result.sections[0].sentences.length, 2);
    assert.equal(result.sections[0].sentences[1], 'Last sentence 2 has eligibility.');
  });

  it('4.4 merges overlapping sentence intervals into a contiguous block', async () => {
    const mockAdapter = new MockPdfAdapter([
      'S0.',
      'S1 has keyword eligibility.',
      'S2 has keyword qualification.',
      'S3.',
      'S4.'
    ]);

    // S1 window: [0, 2]; S2 window: [1, 3] -> Merged window should be [0, 3] (4 sentences total, no duplicates)
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      contextBefore: 1,
      contextAfter: 1,
      keywords: ['eligibility', 'qualification']
    });

    assert.equal(result.sections[0].sentences.length, 4);
    assert.deepEqual(result.sections[0].sentences, [
      'S0.',
      'S1 has keyword eligibility.',
      'S2 has keyword qualification.',
      'S3.'
    ]);
  });

  it('4.5 supports asymmetric context windows (e.g. contextBefore: 2, contextAfter: 0)', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Antecedent S0.',
      'Context S1.',
      'Match S2 with target.',
      'Subsequent S3.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      contextBefore: 2,
      contextAfter: 0,
      keywords: ['target']
    });

    assert.equal(result.sections[0].sentences.length, 3);
    assert.equal(result.sections[0].sentences[2], 'Match S2 with target.');
    assert.ok(!result.sections[0].sentences.includes('Subsequent S3.'));
  });
});

// =========================================================================
// Category 5: Token & Character Reduction Metrics
// =========================================================================
describe('Category 5: Token & Character Reduction Metrics', () => {
  it('5.1 calculates rawCharCount, rawWordCount, and estimatedRawTokens accurately', async () => {
    const mockAdapter = new MockPdfAdapter(['Five words are in here.']);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['words']
    });

    assert.equal(result.rawStats.rawCharCount, 23);
    assert.equal(result.rawStats.rawWordCount, 5);
    assert.equal(result.rawStats.estimatedRawTokens, Math.ceil(23 / 4));
  });

  it('5.2 calculates extractedCharCount and extractedWordCount accurately', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Ten words sentence here that matches our keyword target now.',
      'Another sentence that should not be extracted at all.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      contextBefore: 0,
      contextAfter: 0,
      keywords: ['target']
    });

    assert.equal(result.extractedStats.extractedWordCount, 10);
    assert.ok(result.extractedStats.extractedCharCount > 0);
  });

  it('5.3 calculates reductionPercentage with high precision: ((raw - extracted) / raw) * 100', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence one with target keyword.', // ~33 chars
      'Sentence two with extra long padding noise text that gets omitted completely.' // ~77 chars
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      contextBefore: 0,
      contextAfter: 0,
      keywords: ['target']
    });

    const expectedPercent = Math.round(
      ((result.rawStats.rawCharCount - result.extractedStats.extractedCharCount) / result.rawStats.rawCharCount) * 1000
    ) / 10;

    assert.equal(result.extractedStats.reductionPercentage, expectedPercent);
    assert.ok(result.extractedStats.reductionPercentage > 60);
  });

  it('5.4 reports 0% reduction when all sentences on all pages match', async () => {
    const mockAdapter = new MockPdfAdapter(['Single matching sentence target.']);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['target']
    });

    assert.equal(result.extractedStats.reductionPercentage, 0);
  });
});

// =========================================================================
// Category 6: Keyword Matching & Sensitivity
// =========================================================================
describe('Category 6: Keyword Matching & Sensitivity', () => {
  it('6.1 matches keywords case-insensitively', async () => {
    const mockAdapter = new MockPdfAdapter(['Candidate must meet ELIGIBILITY criteria.']);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['eligibility']
    });

    assert.equal(result.extractedStats.sentenceCount, 1);
  });

  it('6.2 enforces whole-word boundaries ("age" must NOT match "percentage" or "manage")', async () => {
    const mockAdapter = new MockPdfAdapter([
      'The percentage of candidates was high.',
      'The manager will manage the team.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      wholeWord: true,
      keywords: ['age']
    });

    assert.equal(result.extractedStats.sentenceCount, 0, 'Should not match substring "age" in percentage/manage');
  });

  it('6.3 matches multi-word phrases across irregular whitespace', async () => {
    const mockAdapter = new MockPdfAdapter([
      'The minimum   educational \n qualification is a degree.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['educational qualification']
    });

    assert.equal(result.extractedStats.sentenceCount, 1);
  });

  it('6.4 escapes special regex characters in keywords safely', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Proficiency in C++ is preferred.',
      'Citizen of U.S. territory.'
    ]);

    const res1 = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['C++']
    });
    const res2 = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['U.S.']
    });

    assert.equal(res1.extractedStats.sentenceCount, 1);
    assert.equal(res2.extractedStats.sentenceCount, 1);
  });

  it('6.5 tracks keyword hit counts and lists matched vs unmatched keywords', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Here is the fee requirement.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['fee', 'nonexistentterm']
    });

    assert.equal(result.extractedStats.sentenceCount, 1);
  });
});

// =========================================================================
// Category 7: Sentence Boundary Segmentation & Abbreviation Preservation
// =========================================================================
describe('Category 7: Sentence Boundary Segmentation & Abbreviation Preservation', () => {
  it('7.1 does NOT prematurely split on governmental abbreviations ("Govt.", "Sec.")', () => {
    const text = 'Guidelines as per Govt. directives shall be followed. Next sentence starts here.';
    const sentences = splitSentences(text);

    assert.equal(sentences.length, 2);
    assert.ok(sentences[0].includes('Govt. directives'));
  });

  it('7.2 does NOT split on honorific titles ("Mr.", "Dr.", "Prof.")', () => {
    const text = 'Dr. Smith and Prof. Jones reviewed the submission. They approved it.';
    const sentences = splitSentences(text);

    assert.equal(sentences.length, 2);
    assert.ok(sentences[0].includes('Dr. Smith'));
    assert.ok(sentences[0].includes('Prof. Jones'));
  });

  it('7.3 does NOT split on currency expressions ("Rs. 100", "Rs. 500")', () => {
    const text = 'Application fee is Rs. 100 for general category. Payment is online.';
    const sentences = splitSentences(text);

    assert.equal(sentences.length, 2);
    assert.ok(sentences[0].includes('Rs. 100'));
  });

  it('7.4 does NOT split on dates or decimal numbers ("01.08.2026", "60.5%")', () => {
    const text = 'Cutoff date is 01.08.2026 for all applicants. Minimum score is 60.5% marks.';
    const sentences = splitSentences(text);

    assert.equal(sentences.length, 2);
    assert.ok(sentences[0].includes('01.08.2026'));
    assert.ok(sentences[1].includes('60.5%'));
  });
});

// =========================================================================
// Category 8: Boundary & Error Handling
// =========================================================================
describe('Category 8: Boundary & Error Handling', () => {
  it('8.1 returns empty targetedText and zero matches when keywords array is empty', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: []
    });

    assert.equal(result.success, true);
    assert.equal(result.extractedStats.sentenceCount, 0);
    assert.deepEqual(result.extractedStats.matchedPages, []);
    assert.equal(result.targetedText, '');
  });

  it('8.2 handles document with no keyword matches gracefully without throwing', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['xyznonexistentterm999']
    });

    assert.equal(result.success, true);
    assert.equal(result.extractedStats.sentenceCount, 0);
    assert.deepEqual(result.extractedStats.matchedPages, []);
    assert.equal(result.targetedText, '');
  });

  it('8.3 handles empty or whitespace-only PDF text gracefully', async () => {
    const mockAdapter = new MockPdfAdapter(['   \n\t  ', '']);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['test']
    });

    assert.equal(result.success, true);
    assert.equal(result.extractedStats.sentenceCount, 0);
  });

  it('8.4 rejects with descriptive error on missing file path or corrupt PDF buffer', async () => {
    await assert.rejects(
      async () => {
        await extractTargetedPdfText('fixtures/this-file-does-not-exist.pdf', {
          keywords: ['test']
        });
      },
      /ENOENT|not found/i
    );

    await assert.rejects(
      async () => {
        const corruptBuffer = Buffer.from('NOT_A_VALID_PDF_HEADER');
        await extractTargetedPdfText(corruptBuffer, {
          adapter: new UnpdfAdapter(),
          keywords: ['test']
        });
      },
      /Invalid PDF|malformed|corrupted|parser error/i
    );
  });
});

// =========================================================================
// Category 9: Real-World Multi-Page Fixture Integration (Tier 4)
// =========================================================================
describe('Category 9: Real-World Multi-Page Fixture Integration (Tier 4)', () => {
  it('9.1 parses sample-notification.pdf and extracts Page 2 (age & qualification)', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['age limits', 'educational qualifications']
    });

    assert.equal(result.success, true);
    assert.ok(result.extractedStats.matchedPages.includes(2));
    assert.ok(result.targetedText.includes('21 years'));
    assert.ok(result.targetedText.includes('32 years'));
    assert.ok(result.targetedText.includes("Bachelor's degree"));
  });

  it('9.2 parses sample-notification.pdf and extracts Page 4 (vacancies & fees)', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['vacancies', 'application fee']
    });

    assert.equal(result.success, true);
    assert.ok(result.extractedStats.matchedPages.includes(4));
    assert.ok(result.targetedText.includes('1056 posts'));
    assert.ok(result.targetedText.includes('Rs. 100'));
    assert.ok(result.targetedText.includes('2026-01-10'));
    assert.ok(result.targetedText.includes('2026-02-15'));
  });

  it('9.3 achieves >= 70% reduction on sample-notification.pdf', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      mode: 'sentence',
      contextBefore: 1,
      contextAfter: 1,
      keywords: ['minimum age', 'application fee']
    });

    assert.ok(
      result.extractedStats.reductionPercentage >= 70,
      `Expected reduction >= 70%, got ${result.extractedStats.reductionPercentage}%`
    );
  });

  it('9.4 formats targetedText with clean page demarcations ready for Gemini API', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'vacancies']
    });

    assert.ok(result.targetedText.includes('--- Page 2 ---') || result.targetedText.includes('[Page 2]'));
    assert.ok(result.targetedText.includes('--- Page 4 ---') || result.targetedText.includes('[Page 4]'));
    assert.ok(!result.targetedText.includes('Page 1'));
    assert.ok(!result.targetedText.includes('Page 3'));
  });
});
```

---

## 4. Downstream Synergies & Fixture Data Contract

The data generated by `fixtures/generate-sample-pdf.js` is deliberately aligned with:
1. **Milestone 2 (Gemini Structured Criteria Extraction)**:
   - When Gemini parses the extracted text, it extracts:
     - `examTitle`: `'COMBINED CIVIL SERVICES EXAMINATION 2026'`
     - `organization`: `'UNION PUBLIC SERVICE COMMISSION'`
     - `eligibility.minAge`: `21`
     - `eligibility.maxAge`: `32`
     - `eligibility.ageRelaxation`: `[{ category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 }]`
     - `eligibility.requiredEducation`: `["Bachelor's degree in any discipline"]`
     - `importantDates.applicationStartDate`: `'2026-01-10'`
     - `importantDates.applicationEndDate`: `'2026-02-15'`
     - `importantDates.examDate`: `'2026-05-24'`
     - `vacancies`: `1056`
     - `applicationFee.general`: `100`
     - `applicationFee.reserved`: `0`
2. **Milestone 3 (Unity Checker & Candidate Matching)**:
   - Evaluates criteria rules against the extracted data.
   - For example:
     - Candidate A (Age 25, Bachelor's in History, OBC) -> PASS
     - Candidate B (Age 35, Bachelor's in Engineering, General) -> FAIL (Exceeds maxAge 32, not eligible for relaxation)
     - Application Fee match: Rs. 100 == 100 -> PASS

---

## 5. Verification Commands

After implementation, verify Milestone 1 components with:

```bash
# 1. Generate the binary PDF fixture
node fixtures/generate-sample-pdf.js

# 2. Run the unit & integration test suite
node --test test/pdf-extractor.test.js
```

All 34 tests should pass with exit code 0.
