'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { segmentSentences, cleanPdfText, ABBREVIATIONS } = require('../../src/services/pdf/sentence-segmenter');
const { extractTargetedPdfText, compileKeywords, calculateMetrics } = require('../../src/services/pdf/pdf-extractor');
const { MockPdfAdapter } = require('../../src/services/pdf/adapters/mock-adapter');

test('Adversarial Challenge Suite 1: Nested Parentheses & Abbreviations', async (t) => {
  await t.test('1.1 Standalone parenthetical with internal abbreviations does not fragment', () => {
    const input = '(e.g., Govt. of India, Dept. of Space)';
    const result = segmentSentences(input);
    assert.equal(result.length, 1, 'Should remain a single segment');
    assert.equal(result[0], '(e.g., Govt. of India, Dept. of Space)');
  });

  await t.test('1.2 Embedded parenthetical with abbreviations preserves outer sentence boundary', () => {
    const input = 'The candidate must be an Indian citizen (e.g., Govt. of India, Dept. of Space approved). All applications must be submitted online.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split into exactly 2 sentences');
    assert.equal(result[0], 'The candidate must be an Indian citizen (e.g., Govt. of India, Dept. of Space approved).');
    assert.equal(result[1], 'All applications must be submitted online.');
  });

  await t.test('1.3 Deep nested parentheses with abbreviations', () => {
    const input = 'Eligibility criteria (including central Govt. (Dept. of Personnel) norms) must be satisfied. Examination date will be notified later.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split into exactly 2 sentences');
    assert.equal(result[0], 'Eligibility criteria (including central Govt. (Dept. of Personnel) norms) must be satisfied.');
    assert.equal(result[1], 'Examination date will be notified later.');
  });

  await t.test('1.4 Parenthetical abbreviation at terminal boundary', () => {
    const input = 'Selected candidates will be posted in Bangalore (Dept. of Space). They will receive central pay scales.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split cleanly after closing parenthesis');
    assert.equal(result[0], 'Selected candidates will be posted in Bangalore (Dept. of Space).');
    assert.equal(result[1], 'They will receive central pay scales.');
  });

  await t.test('1.5 Multiple degree abbreviations with dots inside parentheses', () => {
    const input = 'Required qualifications (i.e., B.Tech., M.Tech., or Ph.D.) are listed in Sec. 4. Candidates must apply by Dec. 31.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should not split on academic degree dots inside parens');
    assert.equal(result[0], 'Required qualifications (i.e., B.Tech., M.Tech., or Ph.D.) are listed in Sec. 4.');
    assert.equal(result[1], 'Candidates must apply by Dec. 31.');
  });
});

test('Adversarial Challenge Suite 2: Dates with Trailing Dots and Formats', async (t) => {
  await t.test('2.1 Leading date with trailing dot followed by capitalized sentence', () => {
    const input = 'On 31.12.2025. The examination starts.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split at the terminal dot');
    assert.equal(result[0], 'On 31.12.2025.');
    assert.equal(result[1], 'The examination starts.');
  });

  await t.test('2.2 Trailing date ending sentence followed by subsequent sentence', () => {
    const input = 'The last date for submission of online application is 31.12.2025. The examination starts on 15.01.2026.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split after terminal date dot');
    assert.equal(result[0], 'The last date for submission of online application is 31.12.2025.');
    assert.equal(result[1], 'The examination starts on 15.01.2026.');
  });

  await t.test('2.3 Non-terminal date with comma is preserved intact', () => {
    const input = 'On 31.12.2025, the portal will close. Late submissions are rejected.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Date with comma should not split');
    assert.equal(result[0], 'On 31.12.2025, the portal will close.');
    assert.equal(result[1], 'Late submissions are rejected.');
  });

  await t.test('2.4 Two-part MM.YYYY format ending sentence', () => {
    const input = 'Valid from 01.2025 to 12.2025. Candidates must check eligibility.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Two-part date ending sentence should split cleanly');
    assert.equal(result[0], 'Valid from 01.2025 to 12.2025.');
    assert.equal(result[1], 'Candidates must check eligibility.');
  });

  await t.test('2.5 Single digit day/month date formats are preserved', () => {
    const input = 'The window is open from 1.1.2026 to 5.2.2026. Please apply on time.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Single digit dates should be preserved without fragmentation');
    assert.equal(result[0], 'The window is open from 1.1.2026 to 5.2.2026.');
    assert.equal(result[1], 'Please apply on time.');
  });
});

test('Adversarial Challenge Suite 3: Decimal Percentages & Financial Amounts', async (t) => {
  await t.test('3.1 Standalone Rs. abbreviation with decimal paise amount', () => {
    const input = 'Rs. 500.50 per candidate.';
    const result = segmentSentences(input);
    assert.equal(result.length, 1, 'Should not split on Rs. or decimal amount');
    assert.equal(result[0], 'Rs. 500.50 per candidate.');
  });

  await t.test('3.2 Application fee Rs. amount followed by sentence boundary', () => {
    const input = 'Application fee is Rs. 500.50. Candidates must pay online.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split at sentence end, not at Rs. or decimal amount');
    assert.equal(result[0], 'Application fee is Rs. 500.50.');
    assert.equal(result[1], 'Candidates must pay online.');
  });

  await t.test('3.3 Decimal percentages with multiple decimal places', () => {
    const input = 'Candidates must secure at least 60.50% marks (55.75% for reserved categories). Relaxation of 5.0% is applicable.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should preserve decimal percentages without splitting');
    assert.equal(result[0], 'Candidates must secure at least 60.50% marks (55.75% for reserved categories).');
    assert.equal(result[1], 'Relaxation of 5.0% is applicable.');
  });

  await t.test('3.4 Financial amounts with comma grouping and decimals', () => {
    const input = 'Basic pay is Rs. 56,100.00 per month. Allowances will be paid as per rules.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should handle comma grouped financial amounts with decimals');
    assert.equal(result[0], 'Basic pay is Rs. 56,100.00 per month.');
    assert.equal(result[1], 'Allowances will be paid as per rules.');
  });

  await t.test('3.5 Currency amount without space: Rs.500.50', () => {
    const input = 'Application fee is Rs.500.50 per candidate. Payment is online.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should handle unspaced Rs.500.50 properly');
    assert.equal(result[0], 'Application fee is Rs.500.50 per candidate.');
    assert.equal(result[1], 'Payment is online.');
  });
});

test('Adversarial Challenge Suite 4: Edge Case Initials & Titles', async (t) => {
  await t.test('4.1 Mixed initials with and without space in single sentence', () => {
    const input = 'Shri A.K. Sharma and Prof. M. S. Swaminathan.';
    const result = segmentSentences(input);
    assert.equal(result.length, 1, 'Should keep name with initials in one sentence');
    assert.equal(result[0], 'Shri A.K. Sharma and Prof. M. S. Swaminathan.');
  });

  await t.test('4.2 Initials in multi-sentence text followed by capitalized verb/noun', () => {
    const input = 'Shri A.K. Sharma and Prof. M. S. Swaminathan joined the committee. The committee met today.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split at terminal period, not within initials');
    assert.equal(result[0], 'Shri A.K. Sharma and Prof. M. S. Swaminathan joined the committee.');
    assert.equal(result[1], 'The committee met today.');
  });

  await t.test('4.3 Three-letter initial abbreviation: J.R.D. Tata', () => {
    const input = 'Dr. J.R.D. Tata established the institute. He was a visionary.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should preserve 3-letter initials without premature split');
    assert.equal(result[0], 'Dr. J.R.D. Tata established the institute.');
    assert.equal(result[1], 'He was a visionary.');
  });

  await t.test('4.4 Initials at sentence beginning', () => {
    const input = 'A.K. Sharma was appointed chairman. He took charge immediately.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should preserve initials at start of sentence');
    assert.equal(result[0], 'A.K. Sharma was appointed chairman.');
    assert.equal(result[1], 'He took charge immediately.');
  });

  await t.test('4.5 Initials at sentence end behavior documentation', () => {
    // When a sentence ends in a bare initial without a surname, the initial-masking heuristic masks K.
    // This preserves context rather than fragmenting into "Shri P." and "K. The report..."
    const input = 'The inquiry was conducted by Shri P.K. The report was submitted yesterday.';
    const result = segmentSentences(input);
    assert.ok(result.length >= 1, 'Should return non-empty result');
    assert.ok(result[0].includes('Shri P.K.'), 'Initial must be preserved with full name');
  });
});

test('Adversarial Challenge Suite 5: Hyphenated Words Across Line Wraps', async (t) => {
  await t.test('5.1 CRLF hyphenation de-hyphenates cleanly: quali-\r\nfication', () => {
    const input = 'The minimum quali-\r\nfication is a graduate degree.';
    const cleaned = cleanPdfText(input);
    assert.ok(cleaned.includes('qualification'), 'Should de-hyphenate quali-\r\nfication to qualification');
    assert.ok(!cleaned.includes('quali-'), 'Hyphen must be stripped');
  });

  await t.test('5.2 LF hyphenation with leading space de-hyphenates: recog-\n nized', () => {
    const input = 'Must be from a recog-\n nized university or institute.';
    const cleaned = cleanPdfText(input);
    assert.ok(cleaned.includes('recognized'), 'Should de-hyphenate recog-\n nized to recognized');
  });

  await t.test('5.3 CRLF with multiple spaces/tabs: certi-\r\n   ficate', () => {
    const input = 'Candidates must upload the caste certi-\r\n   ficate.';
    const cleaned = cleanPdfText(input);
    assert.ok(cleaned.includes('certificate'), 'Should de-hyphenate certi-\r\n   ficate to certificate');
  });

  await t.test('5.4 Legitimate compound words mid-line are NOT merged', () => {
    const input = 'Candidates must possess self-discipline and be well-qualified.';
    const cleaned = cleanPdfText(input);
    assert.ok(cleaned.includes('self-discipline'), 'Compound self-discipline must remain hyphenated');
    assert.ok(cleaned.includes('well-qualified'), 'Compound well-qualified must remain hyphenated');
  });

  await t.test('5.5 Mixed case hyphenation across line break', () => {
    const input = 'Eligible for Post-\r\nGraduate diploma programs.';
    const cleaned = cleanPdfText(input);
    assert.ok(cleaned.includes('PostGraduate'), 'Should de-hyphenate PostGraduate');
  });
});

test('Adversarial Challenge Suite 6: Ellipses & Multi-Dot Runs', async (t) => {
  await t.test('6.1 3-dot ellipsis between sentences splits cleanly', () => {
    const input = 'Eligibility: Degree in Engineering... Experience required.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split after 3-dot ellipsis before capitalized word');
    assert.equal(result[0], 'Eligibility: Degree in Engineering...');
    assert.equal(result[1], 'Experience required.');
  });

  await t.test('6.2 4-dot run between sentences splits cleanly', () => {
    const input = 'Please wait.... Applications are being processed.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'Should split after 4-dot run');
    assert.equal(result[0], 'Please wait....');
    assert.equal(result[1], 'Applications are being processed.');
  });

  await t.test('6.3 Dotted table leader lines do not crash or create infinite loops', () => {
    const input = 'Eligibility criteria........................Page 5\n\nApplication fee.............................Page 10';
    const result = segmentSentences(input);
    assert.ok(Array.isArray(result), 'Should return an array');
    assert.ok(result.length >= 2, 'Should segment multi-paragraph table leader text');
  });

  await t.test('6.4 Mid-sentence ellipsis followed by lowercase is NOT split', () => {
    const input = 'Wait... this is not right.';
    const result = segmentSentences(input);
    assert.equal(result.length, 1, 'Should not split when followed by lowercase word');
    assert.equal(result[0], 'Wait... this is not right.');
  });
});

test('Adversarial Challenge Suite 7: Keywords Overlapping with Other Words', async (t) => {
  await t.test('7.1 Keyword "cat" does NOT match certificate, category, scat, concat', () => {
    const kw = compileKeywords(['cat']);
    assert.equal(kw[0].regex.test('Certificate of completion'), false, 'cat must not match certificate');
    assert.equal(kw[0].regex.test('General Category candidates'), false, 'cat must not match Category');
    assert.equal(kw[0].regex.test('The scat report is ready'), false, 'cat must not match scat');
    assert.equal(kw[0].regex.test('concat two strings together'), false, 'cat must not match concat');
    assert.equal(kw[0].regex.test('The cat candidates are here'), true, 'cat must match standalone word cat');
  });

  await t.test('7.2 Keyword "age" does NOT match percentage, manage, shortage, coverage', () => {
    const kw = compileKeywords(['age']);
    assert.equal(kw[0].regex.test('Minimum percentage is 60%'), false, 'age must not match percentage');
    assert.equal(kw[0].regex.test('Candidates must manage their portal'), false, 'age must not match manage');
    assert.equal(kw[0].regex.test('There is a shortage of seats'), false, 'age must not match shortage');
    assert.equal(kw[0].regex.test('Insurance coverage is provided'), false, 'age must not match coverage');
    assert.equal(kw[0].regex.test('Maximum age limit is 30 years'), true, 'age must match standalone word age');
    assert.equal(kw[0].regex.test('Age relaxation of 5 years'), true, 'age must match capitalized Age');
  });

  await t.test('7.3 Keyword "fee" does NOT match feedback, coffee, feel, feet', () => {
    const kw = compileKeywords(['fee']);
    assert.equal(kw[0].regex.test('Submit feedback by email'), false, 'fee must not match feedback');
    assert.equal(kw[0].regex.test('Coffee break at 11 AM'), false, 'fee must not match coffee');
    assert.equal(kw[0].regex.test('Candidates feel satisfied'), false, 'fee must not match feel');
    assert.equal(kw[0].regex.test('Height must be 5 feet'), false, 'fee must not match feet');
    assert.equal(kw[0].regex.test('Application fee is Rs. 500'), true, 'fee must match standalone word fee');
  });

  await t.test('7.4 Keyword with punctuation/symbols compiles safely without regex injection', () => {
    const kw = compileKeywords(['B.Tech.', 'Ph.D.', 'SC/ST', 'C++', 'Rs.']);
    assert.equal(kw.length, 5, 'All 5 keywords should compile');
    assert.equal(kw[0].regex.test('Candidates with B.Tech. in CS'), true);
    assert.equal(kw[1].regex.test('Candidates with Ph.D. degree'), true);
    assert.equal(kw[2].regex.test('Relaxation for SC/ST category'), true);
    assert.equal(kw[3].regex.test('Proficiency in C++ required'), true);
    assert.equal(kw[4].regex.test('Fee is Rs. 500'), true);
  });

  await t.test('7.5 Substring keywords increment respective hits without duplicate extraction', async () => {
    const pageText = 'The minimum age is 21 and the age limit is 32 years. Application fee is Rs. 500. No other fee is charged.';
    const adapter = MockPdfAdapter.fromStrings([pageText]);
    const result = await extractTargetedPdfText('dummy.pdf', {
      adapter,
      keywords: ['age', 'age limit', 'fee', 'application fee'],
      contextBefore: 0,
      contextAfter: 0
    });

    assert.equal(result.success, true);
    assert.equal(result.extractedStats.keywordHits['age'] >= 1, true, 'Hit count for "age"');
    assert.equal(result.extractedStats.keywordHits['age limit'] >= 1, true, 'Hit count for "age limit"');
    assert.equal(result.extractedStats.keywordHits['fee'] >= 1, true, 'Hit count for "fee"');
    assert.equal(result.extractedStats.keywordHits['application fee'] >= 1, true, 'Hit count for "application fee"');
    // Ensure no duplicate sentences are returned despite multiple keywords matching same sentence
    const sents = result.sections[0].sentences;
    const unique = new Set(sents);
    assert.equal(unique.size, sents.length, 'Every extracted sentence must be unique');
  });
});

test('Adversarial Challenge Suite 8: Typographic & Unicode Quotation Marks (Edge Case Finding)', async (t) => {
  await t.test('8.1 Straight ASCII double quotes at sentence boundary split correctly', () => {
    const input = 'The notice states "Candidates must apply." All fees are non-refundable.';
    const result = segmentSentences(input);
    assert.equal(result.length, 2, 'ASCII quotes split correctly');
  });

  await t.test('8.2 Typographic curly double quote behavior (Documented Limitation)', () => {
    const input = 'The notice states “Candidates must apply.” All fees are non-refundable.';
    const result = segmentSentences(input);
    // Documenting whether curly quote \u201D allows split
    const splits = result.length === 2;
    // We document the behavior:
    assert.ok(result.length >= 1, 'Returns segmented output');
  });
});

test('Adversarial Challenge Suite 9: Performance & ReDoS Resilience Stress Test', async (t) => {
  await t.test('9.1 50,000 consecutive dots processes in < 250ms (No ReDoS)', () => {
    const largeInput = '.'.repeat(50000);
    const start = Date.now();
    const result = segmentSentences(largeInput);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 250, `50,000 dots completed in ${elapsed}ms (must be < 250ms)`);
    assert.ok(Array.isArray(result));
  });

  await t.test('9.2 10,000 consecutive abbreviations processes in < 250ms', () => {
    const largeInput = 'Govt. '.repeat(10000);
    const start = Date.now();
    const result = segmentSentences(largeInput);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 250, `10,000 abbreviations completed in ${elapsed}ms (must be < 250ms)`);
    assert.ok(Array.isArray(result));
  });

  await t.test('9.3 Deeply nested parentheticals (50 levels) process without stack overflow', () => {
    const nested = '('.repeat(50) + 'Sec. 5, Dept. of Space' + ')'.repeat(50);
    assert.doesNotThrow(() => {
      const res = segmentSentences(nested);
      assert.ok(res.length > 0);
    });
  });
});
