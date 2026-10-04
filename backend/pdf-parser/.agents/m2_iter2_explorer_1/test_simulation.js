'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

// Read original mock-gemini.js
let code = fs.readFileSync(path.resolve(__dirname, '../../src/services/ai/mock-gemini.js'), 'utf8');

// 1. ReDoS fix at line 83: Replace unbounded [A-Z\s]{3,} with length-bounded, word-anchored pattern
code = code.replace(
  `const orgMatch = text.match(/(?:UNION\\s+PUBLIC\\s+SERVICE\\s+COMMISSION|STAFF\\s+SELECTION\\s+COMMISSION|INSTITUTE\\s+OF\\s+BANKING\\s+PERSONNEL\\s+SELECTION|RAILWAY\\s+RECRUITMENT\\s+BOARD|\\bUPSC\\b|\\bSSC\\b|\\bIBPS\\b|\\bRRB\\b)/i) ||\n                   text.match(/([A-Z\\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);`,
  `const orgMatch = text.match(/(?:UNION\\s+PUBLIC\\s+SERVICE\\s+COMMISSION|STAFF\\s+SELECTION\\s+COMMISSION|INSTITUTE\\s+OF\\s+BANKING\\s+PERSONNEL\\s+SELECTION|RAILWAY\\s+RECRUITMENT\\s+BOARD|\\bUPSC\\b|\\bSSC\\b|\\bIBPS\\b|\\bRRB\\b)/i) ||\n                   text.match(/\\b([A-Z][A-Z\\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\\b/);`
);

// 2. Age regex colon & experience fixes at lines 102-110
code = code.replace(
  `const minAgeMatch = text.match(/(?:minimum\\s+age(?:\\s+of)?|min\\.?\\s*age:?)\\s*(\\d+)/i) ||\n                      text.match(/(\\d+)\\s*(?:to|-)\\s*\\d+\\s*years/i) ||\n                      text.match(/Age(?:\\s+Limit)?:?\\s*(\\d+)\\s*(?:to|-)/i);\n  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;\n\n  const maxAgeMatch = text.match(/(?:maximum\\s+age(?:\\s+of)?|max\\.?\\s*age:?|upper\\s+age\\s+limit(?:\\s+is)?:?)\\s*(\\d+)/i) ||\n                      text.match(/\\d+\\s*(?:to|-)\\s*(\\d+)\\s*years/i) ||\n                      text.match(/Age(?:\\s+Limit)?:?\\s*\\d+\\s*(?:to|-)\\s*(\\d+)/i);\n  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;`,
  `const minAgeMatch = text.match(/(?:minimum\\s+age(?:\\s+(?:of|is))?|min\\.?\\s*age)(?:\\s*:)?\\s*(\\d+)/i) ||\n                      text.match(/Age(?:\\s+Limit)?(?:\\s*:)?\\s*(\\d+)\\s*(?:to|-)/i) ||\n                      text.match(/(?<!experience[^\\n.]{0,30})(\\b\\d+)\\s*(?:to|-)\\s*\\d+\\s*years(?!\\s+experience)/i);\n  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;\n\n  const maxAgeMatch = text.match(/(?:maximum\\s+age(?:\\s+(?:of|is))?|max\\.?\\s*age|upper\\s+age\\s+limit(?:\\s+is)?)(?:\\s*:)?\\s*(\\d+)/i) ||\n                      text.match(/Age(?:\\s+Limit)?(?:\\s*:)?\\s*\\d+\\s*(?:to|-)\\s*(\\d+)/i) ||\n                      text.match(/(?<!experience[^\\n.]{0,30})\\b\\d+\\s*(?:to|-)\\s*(\\d+)\\s*years(?!\\s+experience)/i);\n  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;`
);

// 3. Exam date phrasing fix at line 153
code = code.replace(
  `const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\\s+(\\d{4}-\\d{2}-\\d{2})/i);`,
  `const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|(?:preliminary\\s+|tentative\\s+)?exam(?:ination)?\\s+date(?:\\s+is)?|date of exam(?:ination)?(?:\\s+is)?)(?:\\s*:)?\\s+(\\d{4}-\\d{2}-\\d{2})/i);`
);

// 4. Vacancy thousands separators fix at lines 157-160
code = code.replace(
  `const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\\s+(\\d+)\\s+posts/i) ||\n                   text.match(/(?:total vacancies|vacancies)\\s*:\\s*(\\d+)/i) ||\n                   text.match(/(\\d+)\\s+vacancies/i);\n  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;`,
  `const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\\s+([\\d,]+)\\s+(?:posts|vacancies)/i) ||\n                   text.match(/(?:\\b|\\()(?:total\\s+)?vacancies(?:\\s*\\([^)]*\\))?(?:\\s*\\))?\\s*:\\s*([\\d,]+)/i) ||\n                   text.match(/([\\d,]+)\\s+vacancies/i) ||\n                   text.match(/(?:total\\s+)?vacancies\\s+(?:are|is)\\s+([\\d,]+)\\s+posts/i);\n  const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;`
);

// Instantiate patched module in-memory
const m = { exports: {} };
const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', code);
fn(m, m.exports, require, path.resolve(__dirname, '../../src/services/ai'), path.resolve(__dirname, '../../src/services/ai/mock-gemini.js'));
const patched = m.exports;

console.log('--- TEST 1: ReDoS on 100,000 characters ---');
const t0 = performance.now();
const res1 = patched.extractMockCriteria('A'.repeat(50000) + ' ' + 'B'.repeat(50000));
const d1 = performance.now() - t0;
console.log(`Duration: ${d1.toFixed(3)}ms`);
assert.ok(d1 < 50, `Expected < 50ms, got ${d1}ms`);
console.log('✓ PASS: ReDoS safely mitigated to linear time.');

console.log('\n--- TEST 2: Colon in Age Regex ---');
const textMin = 'Minimum age: 21 years and maximum age : 32 years.';
const resMin = patched.extractMockCriteria(textMin);
assert.equal(resMin.eligibility.minAge, 21);
assert.equal(resMin.eligibility.maxAge, 32);
console.log(`Extracted minAge: ${resMin.eligibility.minAge}, maxAge: ${resMin.eligibility.maxAge}`);
console.log('✓ PASS: Colons with/without whitespace parse correctly.');

console.log('\n--- TEST 3: Vacancy Thousands Separators ---');
const vacCases = [
  { text: 'Total vacancies: 1,056 posts.', expected: 1056 },
  { text: 'There are approximately 1,056 vacancies.', expected: 1056 },
  { text: '1,056 vacancies announced across divisions.', expected: 1056 },
  { text: 'कुल रिक्तियां (Total vacancies): 800 posts.', expected: 800 }
];
for (const tc of vacCases) {
  const r = patched.extractMockCriteria(tc.text);
  assert.equal(r.vacancies, tc.expected, `For "${tc.text}", expected ${tc.expected}, got ${r.vacancies}`);
  console.log(`✓ "${tc.text}" => ${r.vacancies}`);
}
console.log('✓ PASS: Thousands separators parse correctly.');

console.log('\n--- TEST 4: Exam Date Phrasing ---');
const dateCases = [
  { text: 'The preliminary exam date is 2026-11-20.', expected: '2026-11-20' },
  { text: 'exam date : 2026-11-20', expected: '2026-11-20' },
  { text: 'The Preliminary Examination is scheduled to be conducted nationwide on 2026-05-24.', expected: '2026-05-24' }
];
for (const tc of dateCases) {
  const r = patched.extractMockCriteria(tc.text);
  assert.equal(r.importantDates.examDate, tc.expected, `For "${tc.text}", expected ${tc.expected}, got ${r.importantDates.examDate}`);
  console.log(`✓ "${tc.text}" => ${r.importantDates.examDate}`);
}
console.log('✓ PASS: Exam date phrasing parsed correctly.');

console.log('\n--- ALL 4 REMEDIATIONS VERIFIED SUCCESSFULLY ---');
