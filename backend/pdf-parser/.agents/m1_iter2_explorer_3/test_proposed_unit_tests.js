'use strict';

/**
 * test_proposed_unit_tests.js
 * Test the 4 newly designed unit tests against temp_lib.
 */

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  extractTargetedPdfText,
  MockPdfAdapter,
  splitSentences
} = require('./temp_lib');

const SAMPLE_PDF_PATH = path.resolve(__dirname, '../../fixtures/sample-notification.pdf');

async function testAll() {
  console.log('Testing proposed unit test 1: Buffer Immutability...');
  const buffer = fs.readFileSync(SAMPLE_PDF_PATH);
  const initialByteLength = buffer.byteLength;
  const initialLength = buffer.length;

  const result1 = await extractTargetedPdfText(buffer, {
    keywords: ['eligibility']
  });

  assert.equal(result1.success, true);
  assert.equal(buffer.byteLength, initialByteLength, 'Buffer byteLength must not be detached or mutated');
  assert.equal(buffer.length, initialLength, 'Buffer length must remain identical');

  const result2 = await extractTargetedPdfText(buffer, {
    keywords: ['eligibility']
  });

  assert.equal(result2.success, true);
  assert.equal(result2.extractedStats.sentenceCount, result1.extractedStats.sentenceCount);
  assert.equal(buffer.byteLength, initialByteLength, 'Buffer remains valid after multiple extractions');
  console.log('Test 1: PASSED');

  console.log('Testing proposed unit test 2: Null Options Handling...');
  const resultNull = await extractTargetedPdfText(SAMPLE_PDF_PATH, null);

  assert.equal(resultNull.success, true);
  assert.equal(resultNull.targetedText, '');
  assert.equal(resultNull.extractedStats.sentenceCount, 0);
  assert.deepEqual(resultNull.extractedStats.matchedPages, []);
  assert.equal(resultNull.extractedStats.reductionPercentage, 100);
  console.log('Test 2: PASSED');

  console.log('Testing proposed unit test 3: NaN Context Window Handling...');
  const mockAdapter = new MockPdfAdapter([
    'Sentence 0. Target sentence with eligibility criteria. Sentence 2.'
  ]);

  const resultNaN = await extractTargetedPdfText('mock', {
    adapter: mockAdapter,
    keywords: ['eligibility'],
    contextBefore: NaN,
    contextAfter: NaN
  });

  assert.equal(resultNaN.success, true);
  assert.equal(resultNaN.extractedStats.sentenceCount, 3);
  assert.deepEqual(resultNaN.sections[0].sentences, [
    'Sentence 0.',
    'Target sentence with eligibility criteria.',
    'Sentence 2.'
  ]);
  console.log('Test 3: PASSED');

  console.log('Testing proposed unit test 4: Typographic Curly Quote Sentence Splitting...');
  const doubleCurly = 'The notice states “Candidates must apply.” All fees are non-refundable.';
  const sentsDouble = splitSentences(doubleCurly);

  assert.equal(sentsDouble.length, 2, 'Must split into 2 sentences on right curly double quote');
  assert.equal(sentsDouble[0], 'The notice states “Candidates must apply.”');
  assert.equal(sentsDouble[1], 'All fees are non-refundable.');

  const singleCurly = 'The rule states ‘Payment is final.’ Late appeals are rejected.';
  const sentsSingle = splitSentences(singleCurly);

  assert.equal(sentsSingle.length, 2, 'Must split into 2 sentences on right curly single quote');
  assert.equal(sentsSingle[0], 'The rule states ‘Payment is final.’');
  assert.equal(sentsSingle[1], 'Late appeals are rejected.');
  console.log('Test 4: PASSED');

  console.log('\nALL 4 PROPOSED UNIT TESTS PASSED WITH 100% SUCCESS!');
}

testAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
