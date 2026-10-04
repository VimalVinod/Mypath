
'use strict';

const { segmentSentences, cleanPdfText, ABBREVIATIONS } = require('../../src/services/pdf/sentence-segmenter');
const { extractTargetedPdfText, compileKeywords, calculateMetrics } = require('../../src/services/pdf/pdf-extractor');
const { MockPdfAdapter } = require('../../src/services/pdf/adapters/mock-adapter');

console.log('================================================================');
console.log('EMPIRICAL PROBE SUITE FOR M1 PDF PARSING & KEYWORD MATCHING');
console.log('================================================================\n');

// Vector 1: Nested Parentheses & Abbreviations
console.log('--- 1. NESTED PARENTHESES & ABBREVIATIONS ---');
const v1_cases = [
  { name: '1.1 Standalone parenthetical', input: '(e.g., Govt. of India, Dept. of Space)' },
  { name: '1.2 Embedded with abbrevs', input: 'The candidate must be an Indian citizen (e.g., Govt. of India, Dept. of Space approved). All applications must be submitted online.' },
  { name: '1.3 Nested parens', input: 'Eligibility criteria (including central Govt. (Dept. of Personnel) norms) must be satisfied. Examination date will be notified later.' },
  { name: '1.4 Parenthetical at sentence boundary', input: 'Selected candidates will be posted in Bangalore (Dept. of Space). They will receive central pay scales.' },
  { name: '1.5 Multiple academic abbrevs in parens', input: 'Required qualifications (i.e., B.Tech., M.Tech., or Ph.D.) are listed in Sec. 4. Candidates must apply by Dec. 31.' },
  { name: '1.6 Parenthetical abbreviation without comma', input: 'Citizens of India (e.g. Govt. employees) receive relaxation. Apply before deadline.' }
];
v1_cases.forEach(c => {
  console.log(`[Case ${c.name}]`);
  console.log('Input:   ', c.input);
  const out = segmentSentences(c.input);
  console.log('Output:  ', JSON.stringify(out));
  console.log('Count:   ', out.length);
});

// Vector 2: Dates with trailing dots
console.log('\n--- 2. DATES WITH TRAILING DOTS ---');
const v2_cases = [
  { name: '2.1 Leading date with trailing dot', input: 'On 31.12.2025. The examination starts.' },
  { name: '2.2 Date at end of sentence', input: 'The last date for submission of online application is 31.12.2025. The examination starts on 15.01.2026.' },
  { name: '2.3 Date with trailing comma', input: 'On 31.12.2025, the portal will close. Late submissions are rejected.' },
  { name: '2.4 Month.Year format ending sentence', input: 'Valid from 01.2025 to 12.2025. Candidates must check eligibility.' },
  { name: '2.5 Date at document end without period', input: 'Notification issued on 01.08.2026' },
  { name: '2.6 Multiple dates in single sentence', input: 'The window opens on 01.10.2025 and closes on 31.10.2025 for all candidates. No extension will be granted.' }
];
v2_cases.forEach(c => {
  console.log(`[Case ${c.name}]`);
  console.log('Input:   ', c.input);
  const out = segmentSentences(c.input);
  console.log('Output:  ', JSON.stringify(out));
  console.log('Count:   ', out.length);
});

// Vector 3: Decimal percentages, financial amounts
console.log('\n--- 3. DECIMAL PERCENTAGES & FINANCIAL AMOUNTS ---');
const v3_cases = [
  { name: '3.1 Rs. with decimal per candidate', input: 'Rs. 500.50 per candidate.' },
  { name: '3.2 Application fee Rs. with decimal', input: 'Application fee is Rs. 500.50. Candidates must pay online.' },
  { name: '3.3 Percentage with decimals', input: 'Candidates must secure at least 60.50% marks (55.75% for reserved categories). Relaxation of 5.0% is applicable.' },
  { name: '3.4 Currency with comma and decimals', input: 'Basic pay is Rs. 56,100.00 per month. Allowances will be paid as per rules.' },
  { name: '3.5 Multiple decimal amounts', input: 'Fees are Rs. 100.00, Rs. 250.50, and Rs. 500.75 respectively. No refund is permitted.' },
  { name: '3.6 Decimal percentage at end of sentence', input: 'Minimum qualifying mark is 50.0%. Candidates scoring less will be disqualified.' }
];
v3_cases.forEach(c => {
  console.log(`[Case ${c.name}]`);
  console.log('Input:   ', c.input);
  const out = segmentSentences(c.input);
  console.log('Output:  ', JSON.stringify(out));
  console.log('Count:   ', out.length);
});

// Vector 4: Edge case initials
console.log('\n--- 4. EDGE CASE INITIALS ---');
const v4_cases = [
  { name: '4.1 Mixed initials with/without space', input: 'Shri A.K. Sharma and Prof. M. S. Swaminathan.' },
  { name: '4.2 Initials in multi-sentence text', input: 'Shri A.K. Sharma and Prof. M. S. Swaminathan joined the committee. The committee met today.' },
  { name: '4.3 Three letter initials', input: 'Dr. J.R.D. Tata established the institute. He was a visionary.' },
  { name: '4.4 Initials at sentence start', input: 'A.K. Sharma was appointed chairman. He took charge immediately.' },
  { name: '4.5 Initials at sentence end', input: 'The inquiry was conducted by Shri P.K. The report was submitted yesterday.' },
  { name: '4.6 Single letter surname/initial at end of sentence', input: 'Awarded to John D. The ceremony concluded.' }
];
v4_cases.forEach(c => {
  console.log(`[Case ${c.name}]`);
  console.log('Input:   ', c.input);
  const out = segmentSentences(c.input);
  console.log('Output:  ', JSON.stringify(out));
  console.log('Count:   ', out.length);
});

// Vector 5: Hyphenated words across line wraps
console.log('\n--- 5. HYPHENATED WORDS ACROSS LINE WRAPS ---');
const v5_cases = [
  { name: '5.1 CRLF hyphenation', input: 'quali-\r\nfication' },
  { name: '5.2 LF hyphenation with space', input: 'recog-\n nized' },
  { name: '5.3 CRLF with multiple spaces', input: 'certi-\r\n   ficate' },
  { name: '5.4 Hyphen with space before hyphen', input: 'quali -\n fication' },
  { name: '5.5 Legitimate hyphenated compound word (not line-wrapped)', input: 'self-discipline and well-qualified candidates' },
  { name: '5.6 Line wrap with capital second word', input: 'Post-\r\nGraduate degree is mandatory.' }
];
v5_cases.forEach(c => {
  console.log(`[Case ${c.name}]`);
  const cleaned = cleanPdfText(c.input);
  console.log('Input:   ', JSON.stringify(c.input));
  console.log('Cleaned: ', JSON.stringify(cleaned));
  console.log('Segmented:', JSON.stringify(segmentSentences(c.input)));
});

// Vector 6: Ellipses and multi-dot runs
console.log('\n--- 6. ELLIPSES & MULTI-DOT RUNS ---');
const v6_cases = [
  { name: '6.1 3-dot ellipsis between sentences', input: 'Eligibility: Degree in Engineering... Experience required.' },
  { name: '6.2 4-dot run', input: 'Please wait.... Applications are being processed.' },
  { name: '6.3 Dotted table leader', input: 'Eligibility criteria.......... Page 5\nApplication fee.......... Page 10' },
  { name: '6.4 Unicode ellipsis', input: 'Requirements? Selection is based on merit.' },
  { name: '6.5 Ellipsis at end of sentence followed by lowercase', input: 'Wait... this is not right.' }
];
v6_cases.forEach(c => {
  console.log(`[Case ${c.name}]`);
  console.log('Input:   ', JSON.stringify(c.input));
  const out = segmentSentences(c.input);
  console.log('Output:  ', JSON.stringify(out));
  console.log('Count:   ', out.length);
});

// Vector 7: Keywords overlapping
console.log('\n--- 7. KEYWORDS OVERLAPPING ---');
const kwTestList = ['cat', 'age', 'fee', 'B.Tech.', 'SC/ST', 'C++', 'Rs.'];
const compiled = compileKeywords(kwTestList);
const v7_cases = [
  { text: 'General certificate of education is required.', shouldMatch: [], shouldNotMatch: ['cat'] },
  { text: 'Candidates belonging to cat category are eligible.', shouldMatch: ['cat'], shouldNotMatch: [] },
  { text: 'SC/ST category candidates receive fee waiver.', shouldMatch: ['SC/ST', 'fee'], shouldNotMatch: ['cat'] },
  { text: 'Minimum percentage required is 60%.', shouldMatch: [], shouldNotMatch: ['age'] },
  { text: 'Candidates must manage their own accommodation.', shouldMatch: [], shouldNotMatch: ['age'] },
  { text: 'Maximum age limit is 30 years.', shouldMatch: ['age'], shouldNotMatch: [] },
  { text: 'Candidate feedback must be provided.', shouldMatch: [], shouldNotMatch: ['fee'] },
  { text: 'Application fee is Rs. 500.', shouldMatch: ['fee', 'Rs.'], shouldNotMatch: [] },
  { text: 'Degree in B.Tech. or equivalent required.', shouldMatch: ['B.Tech.'], shouldNotMatch: [] },
  { text: 'Degree in B.Tech is acceptable.', shouldMatch: [], shouldNotMatch: [] },
  { text: 'Proficiency in C++ is required.', shouldMatch: ['C++'], shouldNotMatch: [] }
];
v7_cases.forEach((c, i) => {
  const matches = compiled.filter(k => k.regex.test(c.text)).map(k => k.raw);
  console.log(`[Case 7.${i+1}] Text: "${c.text}"`);
  console.log('  Matched:', matches);
  const falsePositives = c.shouldNotMatch.filter(m => matches.includes(m));
  const falseNegatives = c.shouldMatch.filter(m => !matches.includes(m));
  console.log('  False positives:', falsePositives.length > 0 ? falsePositives : 'None');
  console.log('  False negatives:', falseNegatives.length > 0 ? falseNegatives : 'None');
});
