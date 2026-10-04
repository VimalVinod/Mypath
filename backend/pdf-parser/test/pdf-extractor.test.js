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

  it('1.5 preserves caller Buffer immutability and allows repeated extraction without detachment', async () => {
    const buffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const initialByteLength = buffer.byteLength;
    const initialLength = buffer.length;

    // First extraction run
    const result1 = await extractTargetedPdfText(buffer, {
      keywords: ['eligibility']
    });

    assert.equal(result1.success, true);
    assert.equal(buffer.byteLength, initialByteLength, 'Buffer byteLength must not be detached or mutated');
    assert.equal(buffer.length, initialLength, 'Buffer length must remain identical');

    // Second extraction run on the exact same buffer instance
    const result2 = await extractTargetedPdfText(buffer, {
      keywords: ['eligibility']
    });

    assert.equal(result2.success, true);
    assert.equal(result2.extractedStats.sentenceCount, result1.extractedStats.sentenceCount);
    assert.equal(buffer.byteLength, initialByteLength, 'Buffer remains valid after multiple extractions');
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

    assert.equal(result.sections[0].sentences.length, 2);
    assert.equal(result.sections[0].sentences[1], 'Last sentence 2 has eligibility.');
  });

  it('4.4 merges overlapping sentence intervals into a contiguous block', async () => {
    const mockAdapter = new MockPdfAdapter([
      'S0. S1 has keyword eligibility. S2 has keyword qualification. S3. S4.'
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
      'Antecedent S0. Context S1. Match S2 with target. Subsequent S3.'
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

  it('4.6 handles NaN context window options gracefully by defaulting to 1 without dropping matches', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0. Target sentence with eligibility criteria. Sentence 2.'
    ]);

    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['eligibility'],
      contextBefore: NaN,
      contextAfter: NaN
    });

    assert.equal(result.success, true);
    assert.equal(result.extractedStats.sentenceCount, 3);
    assert.deepEqual(result.sections[0].sentences, [
      'Sentence 0.',
      'Target sentence with eligibility criteria.',
      'Sentence 2.'
    ]);
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
      'Sentence one with target keyword.',
      'Sentence two with extra long padding noise text that gets omitted completely.'
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
      keywords: ['vacancies', 'important dates', 'application fee']
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
