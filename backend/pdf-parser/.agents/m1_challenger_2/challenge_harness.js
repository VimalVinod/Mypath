/**
 * .agents/m1_challenger_2/challenge_harness.js
 * Standalone Empirical Adversarial Challenge Harness for pdf-extractor.js.
 *
 * Requirements:
 * 1. Extreme context window options: contextBefore: 100, contextAfter: 100 (graceful clamping without duplication)
 * 2. Asymmetric context windows: contextBefore: 5, contextAfter: 0 vs contextBefore: 0, contextAfter: 5
 * 3. All sentences containing keywords (100% density: exactly 0% reduction without duplicating text)
 * 4. Zero sentences containing keywords (0% density: empty targetedText, 0 matches without throwing)
 * 5. Repeated adjacent sentence matches & interval union deduplication
 * 6. Performance benchmark: multi-page fixture, high iteration, memory/latency
 * 7. Fault injection: corrupted buffers, empty buffers, null options, buffer detachment
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  extractTargetedPdfText,
  MockPdfAdapter,
  UnpdfAdapter,
  calculateMetrics,
  compileKeywords
} = require('../../src/services/pdf');

const SAMPLE_PDF_PATH = path.resolve(__dirname, '../../fixtures/sample-notification.pdf');

async function runAllChallenges() {
  console.log('===============================================================');
  console.log('   M1 EMPIRICAL ADVERSARIAL CHALLENGE HARNESS EXECUTION');
  console.log('===============================================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function record(suite, testName, passed, error = null, extra = null) {
    results.total++;
    if (passed) {
      results.passed++;
      console.log(`  [PASS] ${suite} > ${testName}`);
    } else {
      results.failed++;
      console.error(`  [FAIL] ${suite} > ${testName}`);
      if (error) console.error(`         Error: ${error.message || error}`);
    }
    results.details.push({
      suite,
      testName,
      passed,
      error: error ? (error.message || String(error)) : null,
      extra
    });
  }

  // -----------------------------------------------------------------
  // Challenge 1: Extreme Context Window Options
  // -----------------------------------------------------------------
  console.log('--- Challenge 1: Extreme Context Window Options ---');
  try {
    const sentences = Array.from({ length: 15 }, (_, i) => `Sentence number ${i} for testing.`);
    const mock = new MockPdfAdapter([sentences.join(' ')]);

    // Test 1.1: contextBefore: 100, contextAfter: 100 on middle match (index 7)
    const res1 = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Sentence number 7'],
      contextBefore: 100,
      contextAfter: 100
    });

    const sec1 = res1.sections[0];
    const uniqueSentences = new Set(sec1.sentences);
    const noDuplicates = uniqueSentences.size === sec1.sentences.length;
    const allCaptured = sec1.sentences.length === 15;
    const clampedGracefully = sec1.sentences[0] === sentences[0] && sec1.sentences[14] === sentences[14];

    record('Challenge 1', '1.1 Extreme window (100, 100) clamps to [0, N-1] with zero duplicates',
      noDuplicates && allCaptured && clampedGracefully, null, { sentenceCount: sec1.sentences.length });

    // Test 1.2: contextBefore: MAX_SAFE_INTEGER, contextAfter: MAX_SAFE_INTEGER
    const res2 = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Sentence number 7'],
      contextBefore: Number.MAX_SAFE_INTEGER,
      contextAfter: Number.MAX_SAFE_INTEGER
    });
    record('Challenge 1', '1.2 MAX_SAFE_INTEGER context clamps gracefully without overflow',
      res2.sections[0].sentences.length === 15 && new Set(res2.sections[0].sentences).size === 15);

    // Test 1.3: Negative context window options (e.g. contextBefore: -5, contextAfter: -5)
    const res3 = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Sentence number 7'],
      contextBefore: -5,
      contextAfter: -5
    });
    const onlyTarget = res3.sections[0].sentences.length === 1 && res3.sections[0].sentences[0] === sentences[7];
    record('Challenge 1', '1.3 Negative context window (-5, -5) clamps to 0 context (only target sentence)',
      onlyTarget, null, { extractedCount: res3.sections[0].sentences.length });

    // Test 1.4: Zero context window options (contextBefore: 0, contextAfter: 0)
    const res4 = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Sentence number 7'],
      contextBefore: 0,
      contextAfter: 0
    });
    record('Challenge 1', '1.4 Zero context window (0, 0) captures exactly 1 sentence',
      res4.sections[0].sentences.length === 1 && res4.sections[0].sentences[0] === sentences[7]);

    // Test 1.5: Non-finite context window options (NaN)
    const res5 = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Sentence number 7'],
      contextBefore: NaN,
      contextAfter: NaN
    });
    // If typeof is 'number', Math.max(0, NaN) is NaN, causing 0 extracted sentences!
    const nanHandled = res5.sections.length > 0 && res5.sections[0].sentences.length >= 1;
    record('Challenge 1', '1.5 NaN context window handled gracefully without dropping target match',
      nanHandled, null, { sentenceCount: res5.extractedStats.sentenceCount });

  } catch (err) {
    record('Challenge 1', 'Unexpected failure in Challenge 1', false, err);
  }

  // -----------------------------------------------------------------
  // Challenge 2: Asymmetric Context Windows
  // -----------------------------------------------------------------
  console.log('\n--- Challenge 2: Asymmetric Context Windows ---');
  try {
    const sentences = Array.from({ length: 15 }, (_, i) => `Item ${i}.`);
    const mock = new MockPdfAdapter([sentences.join(' ')]);

    // Match index 6: Item 6.
    // contextBefore: 5, contextAfter: 0 -> indices 1..6 (6 sentences: Item 1..6)
    const resBefore = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Item 6'],
      contextBefore: 5,
      contextAfter: 0
    });
    const expectedBefore = sentences.slice(1, 7);
    const matchBefore = JSON.stringify(resBefore.sections[0].sentences) === JSON.stringify(expectedBefore);
    record('Challenge 2', '2.1 contextBefore: 5, contextAfter: 0 extracts exactly indices [1..6]',
      matchBefore, null, { extracted: resBefore.sections[0].sentences });

    // contextBefore: 0, contextAfter: 5 -> indices 6..11 (6 sentences: Item 6..11)
    const resAfter = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Item 6'],
      contextBefore: 0,
      contextAfter: 5
    });
    const expectedAfter = sentences.slice(6, 12);
    const matchAfter = JSON.stringify(resAfter.sections[0].sentences) === JSON.stringify(expectedAfter);
    record('Challenge 2', '2.2 contextBefore: 0, contextAfter: 5 extracts exactly indices [6..11]',
      matchAfter, null, { extracted: resAfter.sections[0].sentences });

    // Boundary asymmetric: Match index 1 with contextBefore: 5, contextAfter: 1
    const resClamp = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['Item 1'],
      contextBefore: 5,
      contextAfter: 1
    });
    const expectedClamp = sentences.slice(0, 3);
    const matchClamp = JSON.stringify(resClamp.sections[0].sentences) === JSON.stringify(expectedClamp);
    record('Challenge 2', '2.3 Asymmetric window at boundary clamps before-index cleanly', matchClamp);

  } catch (err) {
    record('Challenge 2', 'Unexpected failure in Challenge 2', false, err);
  }

  // -----------------------------------------------------------------
  // Challenge 3: All Sentences Containing Keywords (100% Density)
  // -----------------------------------------------------------------
  console.log('\n--- Challenge 3: 100% Keyword Density Across All Sentences ---');
  try {
    const page1Sentences = [
      'Eligibility requirement alpha is met.',
      'Eligibility requirement beta is satisfied.',
      'Eligibility requirement gamma is validated.'
    ];
    const page2Sentences = [
      'Eligibility condition delta is confirmed.',
      'Eligibility condition epsilon is completed.'
    ];
    const mock = new MockPdfAdapter([
      page1Sentences.join(' '),
      page2Sentences.join(' ')
    ]);

    const res = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['eligibility'],
      contextBefore: 1,
      contextAfter: 1
    });

    const totalExpected = 5;
    const sentenceCountMatch = res.extractedStats.sentenceCount === totalExpected;
    const p1Count = res.sections[0].sentences.length === 3;
    const p2Count = res.sections[1].sentences.length === 2;
    const noDupP1 = new Set(res.sections[0].sentences).size === 3;
    const noDupP2 = new Set(res.sections[1].sentences).size === 2;

    const reductionZero = res.extractedStats.reductionPercentage === 0;

    record('Challenge 3', '3.1 100% density extracts every sentence across pages without duplication',
      sentenceCountMatch && p1Count && p2Count && noDupP1 && noDupP2);
    record('Challenge 3', '3.2 100% density yields exactly 0.0% reduction percentage',
      reductionZero, null, { reductionPercentage: res.extractedStats.reductionPercentage });

  } catch (err) {
    record('Challenge 3', 'Unexpected failure in Challenge 3', false, err);
  }

  // -----------------------------------------------------------------
  // Challenge 4: Zero Sentences Containing Keywords (0% Density)
  // -----------------------------------------------------------------
  console.log('\n--- Challenge 4: Zero Sentences Containing Keywords ---');
  try {
    const mock = new MockPdfAdapter([
      'This is an announcement about weather.',
      'It rained heavily in the northern valley.',
      'Temperatures dropped below seasonal averages.'
    ]);

    const res = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['qualification', 'eligibility', 'vacancies']
    });

    const successTrue = res.success === true;
    const emptyTargetedText = res.targetedText === '';
    const zeroMatchedPages = Array.isArray(res.extractedStats.matchedPages) && res.extractedStats.matchedPages.length === 0;
    const zeroSentences = res.extractedStats.sentenceCount === 0;
    const zeroExtractedChars = res.extractedStats.extractedCharCount === 0;
    const fullReduction = res.extractedStats.reductionPercentage === 100;
    const emptySections = Array.isArray(res.sections) && res.sections.length === 0;
    const unmatchedAll = res.extractedStats.unmatchedKeywords.length === 3;

    record('Challenge 4', '4.1 Document with 0 keyword matches produces empty targetedText and empty sections',
      successTrue && emptyTargetedText && emptySections);
    record('Challenge 4', '4.2 Document with 0 keyword matches produces 0 matched pages and 100% reduction',
      zeroMatchedPages && zeroSentences && zeroExtractedChars && fullReduction && unmatchedAll);

    // Test on real PDF fixture with non-existent keyword
    const resRealPdf = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['NONEXISTENT_KEYWORD_XYZ_9999']
    });
    record('Challenge 4', '4.3 Real PDF fixture with non-existent keyword returns clean empty result without throwing',
      resRealPdf.success === true && resRealPdf.targetedText === '' && resRealPdf.extractedStats.sentenceCount === 0);

  } catch (err) {
    record('Challenge 4', 'Unexpected failure in Challenge 4', false, err);
  }

  // -----------------------------------------------------------------
  // Challenge 5: Repeated Adjacent Matches & Interval Union
  // -----------------------------------------------------------------
  console.log('\n--- Challenge 5: Repeated Adjacent Matches & Interval Union ---');
  try {
    const sentences = Array.from({ length: 12 }, (_, i) => `Sentence ${i} text.`);

    // Case 5.1: Adjacent matches at indices 3 and 4 with context 1
    const sAdjacent = sentences.slice();
    sAdjacent[3] = 'Sentence 3 target keyword matched.';
    sAdjacent[4] = 'Sentence 4 target keyword matched.';
    const mock1 = new MockPdfAdapter([sAdjacent.join(' ')]);

    const res1 = await extractTargetedPdfText('mock', {
      adapter: mock1,
      keywords: ['target keyword'],
      contextBefore: 1,
      contextAfter: 1
    });

    const sec1 = res1.sections[0].sentences;
    const expected1 = [sAdjacent[2], sAdjacent[3], sAdjacent[4], sAdjacent[5]];
    const match1 = JSON.stringify(sec1) === JSON.stringify(expected1);
    record('Challenge 5', '5.1 Merges adjacent match windows [2,4] + [3,5] into [2,5] cleanly',
      match1, null, { actual: sec1, expected: expected1 });

    // Case 5.2: Gap-of-one matches: indices 3 and 5 with context 1
    const sGap = sentences.slice();
    sGap[3] = 'Sentence 3 target keyword matched.';
    sGap[5] = 'Sentence 5 target keyword matched.';
    const mock2 = new MockPdfAdapter([sGap.join(' ')]);

    const res2 = await extractTargetedPdfText('mock', {
      adapter: mock2,
      keywords: ['target keyword'],
      contextBefore: 1,
      contextAfter: 1
    });

    const sec2 = res2.sections[0].sentences;
    const expected2 = [sGap[2], sGap[3], sGap[4], sGap[5], sGap[6]];
    const match2 = JSON.stringify(sec2) === JSON.stringify(expected2);
    record('Challenge 5', '5.2 Merges gap-of-1 windows [2,4] and [4,6] touching at 4 into [2,6]',
      match2, null, { actual: sec2, expected: expected2 });

    // Case 5.3: Multiple different keywords matching the SAME sentence
    const sMultiKw = sentences.slice();
    sMultiKw[4] = 'Sentence 4 has age limit and eligibility and vacancy details.';
    const mock3 = new MockPdfAdapter([sMultiKw.join(' ')]);

    const res3 = await extractTargetedPdfText('mock', {
      adapter: mock3,
      keywords: ['age limit', 'eligibility', 'vacancy'],
      contextBefore: 1,
      contextAfter: 1
    });

    const sec3 = res3.sections[0].sentences;
    const noDupSameSentence = sec3.length === 3 && sec3[1] === sMultiKw[4];
    record('Challenge 5', '5.3 Multiple keywords matching same sentence does NOT duplicate sentence',
      noDupSameSentence);

    // Case 5.4: Stress randomized interval union property test (50 random combinations)
    let propertyPassed = true;
    for (let run = 0; run < 50; run++) {
      const len = 30;
      const testSentences = Array.from({ length: len }, (_, i) => `Line ${i} value.`);
      const matchCount = Math.floor(Math.random() * 7) + 2;
      const matchIndices = new Set();
      while (matchIndices.size < matchCount) {
        matchIndices.add(Math.floor(Math.random() * len));
      }
      for (const idx of matchIndices) {
        testSentences[idx] = `Line ${idx} MATCH_HIT.`;
      }

      const cBefore = Math.floor(Math.random() * 4);
      const cAfter = Math.floor(Math.random() * 4);

      const resRand = await extractTargetedPdfText('mock', {
        adapter: new MockPdfAdapter([testSentences.join(' ')]),
        keywords: ['MATCH_HIT'],
        contextBefore: cBefore,
        contextAfter: cAfter
      });

      const extracted = resRand.sections[0].sentences;
      if (new Set(extracted).size !== extracted.length) { propertyPassed = false; break; }
      let lastOriginalIdx = -1;
      for (const sent of extracted) {
        const origIdx = testSentences.indexOf(sent);
        if (origIdx <= lastOriginalIdx) { propertyPassed = false; break; }
        lastOriginalIdx = origIdx;
      }
      if (!propertyPassed) break;
    }
    record('Challenge 5', '5.4 Invariant: interval union preserves monotonic order & uniqueness (50 runs)',
      propertyPassed);

  } catch (err) {
    record('Challenge 5', 'Unexpected failure in Challenge 5', false, err);
  }

  // -----------------------------------------------------------------
  // Challenge 6: Performance Benchmark & Memory Stress
  // -----------------------------------------------------------------
  console.log('\n--- Challenge 6: Performance Benchmark & Memory Stress ---');
  try {
    const largePages = Array.from({ length: 50 }, (_, p) => {
      const pS = Array.from({ length: 10 }, (_, s) => {
        return (s === 3 || s === 7)
          ? `Page ${p + 1} Section ${s + 1} contains eligibility and age criteria.`
          : `Page ${p + 1} Section ${s + 1} contains standard procedural rules and regulations.`;
      });
      return pS.join(' ');
    });
    const largeMock = new MockPdfAdapter(largePages);

    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;
    const startMockTime = process.hrtime.bigint();
    const mockIterations = 100;
    for (let i = 0; i < mockIterations; i++) {
      await extractTargetedPdfText('mock', {
        adapter: largeMock,
        keywords: ['eligibility', 'age']
      });
    }
    const endMockTime = process.hrtime.bigint();
    const memAfter = process.memoryUsage().heapUsed;
    const totalMsMock = Number(endMockTime - startMockTime) / 1e6;
    const avgMsMock = totalMsMock / mockIterations;
    const heapGrowthMb = (memAfter - memBefore) / (1024 * 1024);

    console.log(`     Benchmark (50 pages x 100 runs): Total: ${totalMsMock.toFixed(1)}ms, Avg: ${avgMsMock.toFixed(2)}ms/run, Heap Delta: ${heapGrowthMb.toFixed(2)}MB`);
    record('Challenge 6', '6.1 50-page document 100-run mock throughput (< 15ms/call)', avgMsMock < 15.0, null, { avgMsMock });
    record('Challenge 6', '6.2 In-memory heap stability across 100 iterations (< 25MB delta)', heapGrowthMb < 25.0, null, { heapGrowthMb });

    // 6.3: Real PDF fixture benchmark (file path string to measure pure unpdf parsing)
    const pdfRuns = 30;
    const startPdfTime = process.hrtime.bigint();
    for (let i = 0; i < pdfRuns; i++) {
      await extractTargetedPdfText(SAMPLE_PDF_PATH, {
        keywords: ['eligibility', 'vacancies', 'fee']
      });
    }
    const endPdfTime = process.hrtime.bigint();
    const totalMsPdf = Number(endPdfTime - startPdfTime) / 1e6;
    const avgMsPdf = totalMsPdf / pdfRuns;
    console.log(`     Benchmark Real PDF (4 pages x 30 runs): Total: ${totalMsPdf.toFixed(1)}ms, Avg: ${avgMsPdf.toFixed(2)}ms/run`);
    record('Challenge 6', '6.3 Real 4-page PDF fixture parsing throughput (< 40ms/call)', avgMsPdf < 40.0, null, { avgMsPdf });

  } catch (err) {
    record('Challenge 6', 'Unexpected failure in Challenge 6', false, err);
  }

  // -----------------------------------------------------------------
  // Challenge 7: Fault Injection & Boundary Robustness
  // -----------------------------------------------------------------
  console.log('\n--- Challenge 7: Fault Injection & Boundary Robustness ---');

  // 7.1: Empty Buffer
  try {
    await extractTargetedPdfText(Buffer.alloc(0), { keywords: ['test'] });
    record('Challenge 7', '7.1 Empty buffer rejects with error', false, 'Did not reject');
  } catch (err) {
    const codeMatches = err.code === 'EMPTY_PDF' || /empty/i.test(err.message);
    record('Challenge 7', '7.1 Empty buffer rejects with EMPTY_PDF code', codeMatches, err);
  }

  // 7.2: Corrupted Buffer
  try {
    const corruptBuf = Buffer.from('NOT_A_VALID_PDF_GARBAGE_BYTES_1234567890');
    await extractTargetedPdfText(corruptBuf, { keywords: ['test'] });
    record('Challenge 7', '7.2 Corrupted buffer rejects with error', false, 'Did not reject');
  } catch (err) {
    const codeMatches = err.code === 'INVALID_PDF' || /invalid|corrupt/i.test(err.message);
    record('Challenge 7', '7.2 Corrupted buffer rejects with INVALID_PDF code', codeMatches, err);
  }

  // 7.3: Missing file path
  try {
    await extractTargetedPdfText('this_file_does_not_exist_xyz_123.pdf', { keywords: ['test'] });
    record('Challenge 7', '7.3 Non-existent file path rejects with error', false, 'Did not reject');
  } catch (err) {
    const codeMatches = err.code === 'FILE_NOT_FOUND' || /not found/i.test(err.message);
    record('Challenge 7', '7.3 Non-existent file rejects with FILE_NOT_FOUND code', codeMatches, err);
  }

  // 7.4: Null input
  try {
    await extractTargetedPdfText(null, { keywords: ['test'] });
    record('Challenge 7', '7.4 null input rejects with descriptive error', false, 'Did not reject');
  } catch (err) {
    const isDescriptive = /Invalid PDF input/i.test(err.message);
    record('Challenge 7', '7.4 null input rejects with descriptive error', isDescriptive, err);
  }

  // 7.5: options = null
  try {
    await extractTargetedPdfText(SAMPLE_PDF_PATH, null);
    record('Challenge 7', '7.5 null options does not throw TypeError (graceful fallback)', true);
  } catch (err) {
    const isTypeError = err instanceof TypeError && /null/i.test(err.message);
    record('Challenge 7', '7.5 null options does not throw TypeError (graceful fallback)',
      !isTypeError, err, { isTypeError, errorMsg: err.message });
  }

  // 7.6: options = undefined
  try {
    const resUndef = await extractTargetedPdfText(SAMPLE_PDF_PATH, undefined);
    record('Challenge 7', '7.6 undefined options defaults gracefully to empty options',
      resUndef.success === true && resUndef.targetedText === '');
  } catch (err) {
    record('Challenge 7', '7.6 undefined options defaults gracefully to empty options', false, err);
  }

  // 7.7: Regex special characters in keywords
  try {
    const mock = new MockPdfAdapter([
      'Special clause [Ref: *123+?] applies here.',
      'Normal clause applies elsewhere.'
    ]);
    const resSpecial = await extractTargetedPdfText('mock', {
      adapter: mock,
      keywords: ['[Ref: *123+?]']
    });
    const foundSpecial = resSpecial.extractedStats.sentenceCount === 1;
    record('Challenge 7', '7.7 Keywords with raw regex symbols match literally without error', foundSpecial);
  } catch (err) {
    record('Challenge 7', '7.7 Keywords with raw regex symbols match literally without error', false, err);
  }

  // 7.8: Adapter error code propagation
  try {
    const failingMock = MockPdfAdapter.createFailing('ENCRYPTED_PDF');
    await extractTargetedPdfText('mock', {
      adapter: failingMock,
      keywords: ['test']
    });
    record('Challenge 7', '7.8 Adapter error codes propagate cleanly', false, 'Did not reject');
  } catch (err) {
    const codeMatches = err.code === 'ENCRYPTED_PDF';
    record('Challenge 7', '7.8 Adapter error code ENCRYPTED_PDF propagates cleanly', codeMatches, err);
  }

  // 7.9: Caller Buffer Immutability & Reusability (Vulnerability Check)
  // UnpdfAdapter zero-copy conversion (new Uint8Array(buffer.buffer, ...)) causes PDF.js
  // to detach the underlying ArrayBuffer, mutating caller buffer length from 8089 to 0!
  try {
    const callerBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const initialByteLength = callerBuffer.byteLength;
    await extractTargetedPdfText(callerBuffer, { keywords: ['eligibility'] });
    const retainedLength = callerBuffer.byteLength === initialByteLength;

    // Second call on the same buffer must succeed without throwing EMPTY_PDF
    let secondCallSucceeded = false;
    try {
      await extractTargetedPdfText(callerBuffer, { keywords: ['eligibility'] });
      secondCallSucceeded = true;
    } catch (e) {
      secondCallSucceeded = false;
    }

    record('Challenge 7', '7.9 Caller Buffer immutability: Buffer is not detached/mutated by UnpdfAdapter',
      retainedLength && secondCallSucceeded,
      !retainedLength ? new Error(`Caller buffer byteLength mutated from ${initialByteLength} to ${callerBuffer.byteLength}`) : null,
      { initialByteLength, afterByteLength: callerBuffer.byteLength, secondCallSucceeded });
  } catch (err) {
    record('Challenge 7', '7.9 Caller Buffer immutability: Buffer is not detached/mutated by UnpdfAdapter', false, err);
  }

  console.log('\n===============================================================');
  console.log(`HARNESS RESULTS: ${results.passed}/${results.total} Passed (${results.failed} Failed)`);
  console.log('===============================================================\n');
  return results;
}

if (require.main === module) {
  runAllChallenges()
    .then(results => {
      const summaryFile = path.resolve(__dirname, 'challenge_results.json');
      fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2), 'utf8');
      console.log(`Results saved to ${summaryFile}`);
    })
    .catch(err => {
      console.error('Fatal crash:', err);
      process.exit(2);
    });
}
module.exports = { runAllChallenges };
