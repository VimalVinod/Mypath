'use strict';

const assert = require('node:assert/strict');
const { extractMockCriteria } = require('../../src/services/ai/mock-gemini');
const { parseStructuredCriteria, normalizeCriteriaData, parseJsonSafely } = require('../../src/services/ai/gemini-parser');

console.log('--- STARTING INDEPENDENT ADVERSARIAL STRESS SUITE (Reviewer 2) ---');

// 1. ReDoS & Performance Check on Org Regex
console.log('\n[TEST 1] ReDoS on Organization Regex:');
const orgRegex = /\b([A-Z][A-Z\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\b/;
const orgInputs = [
  'A'.repeat(100000),
  'A '.repeat(50000),
  ('A '.repeat(50000)) + 'COMMISSION',
  ('A'.repeat(79) + ' ').repeat(1000),
  'X '.repeat(40) + 'BOARD ' + 'Y '.repeat(40),
  'RECRUITMENT BOARD',
  'CENTRAL POLLUTION CONTROL BOARD'
];

for (let i = 0; i < orgInputs.length; i++) {
  const input = orgInputs[i];
  const t0 = performance.now();
  const m = input.match(orgRegex);
  const dt = performance.now() - t0;
  console.log(`  Org Input ${i} (len ${input.length}): ${dt.toFixed(2)}ms, match: ${Boolean(m)}`);
  assert.ok(dt < 50, `ReDoS detected! Took ${dt}ms on input ${i}`);
}

// 2. Candidate Age Disambiguation vs Experience
console.log('\n[TEST 2] Candidate Age Disambiguation:');
const expCases = [
  {
    input: 'Candidates must have 5 to 8 years experience in government administration. Age Limit: 21 to 30 years as of cut-off date.',
    expectedMin: 21,
    expectedMax: 30,
    desc: 'Experience preceding explicit Age Limit'
  },
  {
    input: 'Age Limit: 21 to 30 years. Candidates must have 5 to 8 years experience.',
    expectedMin: 21,
    expectedMax: 30,
    desc: 'Experience succeeding explicit Age Limit'
  },
  {
    input: 'Applicants should possess 3 to 5 years experience in financial auditing. Graduation is mandatory.',
    expectedMin: null,
    expectedMax: null,
    desc: 'Experience only without any age limit'
  },
  {
    input: 'Must have 10-15 years of service experience in defense. Minimum age: 25 years. Maximum age: 45 years.',
    expectedMin: 25,
    expectedMax: 45,
    desc: 'Service experience with explicit minimum and maximum age with colons'
  },
  {
    input: 'Minimum age is 20 years and upper age limit is 35 years.',
    expectedMin: 20,
    expectedMax: 35,
    desc: 'Explicit minimum age is and upper age limit is'
  },
  {
    input: 'Must have attained the minimum age of 18 years and not exceeded maximum age of 27 years.',
    expectedMin: 18,
    expectedMax: 27,
    desc: 'Attained minimum age of ... and not exceeded'
  },
  {
    input: 'Selected candidates must complete 2 to 4 years bond. Candidate must be between 22 to 28 years of age.',
    expectedMin: 22,
    expectedMax: 28,
    desc: 'Bond duration preceding between X to Y years of age'
  },
  {
    input: 'Requires 2 to 5 years of practice in High Court. Age limit 25 to 35.',
    expectedMin: 25,
    expectedMax: 35,
    desc: 'Practice duration preceding age limit without years word'
  },
  {
    input: 'Requires 1 to 2 years contract. 21 to 32 years.',
    expectedMin: 21,
    expectedMax: 32,
    desc: 'Contract duration preceding unguarded range within bounds'
  }
];

for (const c of expCases) {
  const res = extractMockCriteria(c.input);
  console.log(`  Case: ${c.desc} -> minAge: ${res.eligibility.minAge}, maxAge: ${res.eligibility.maxAge}`);
  assert.equal(res.eligibility.minAge, c.expectedMin, `minAge mismatch in ${c.desc}`);
  assert.equal(res.eligibility.maxAge, c.expectedMax, `maxAge mismatch in ${c.desc}`);
}

// 3. Age Relaxation Clause Boundary Delimiters
console.log('\n[TEST 3] Age Relaxation Cross-Clause Isolation:');
const relCases = [
  {
    input: 'A candidate must be between 18 to 25 years. Relaxation of 5 years for SC/ST and 3 years for OBC.',
    sc: 5,
    obc: 3,
    desc: 'Conjoined with "and"'
  },
  {
    input: 'Upper age limit is relaxable by 5 years for Scheduled Caste candidates, whereas 3 years for Other Backward Classes.',
    sc: 5,
    obc: 3,
    desc: 'Conjoined with "whereas"'
  },
  {
    input: 'Age relaxation: 5 years for SC/ST while 3 years for OBC candidates.',
    sc: 5,
    obc: 3,
    desc: 'Conjoined with "while"'
  },
  {
    input: 'Relaxation: SC/ST candidates get up to 5 years; OBC candidates get up to 3 years.',
    sc: 5,
    obc: 3,
    desc: 'Category first with semicolons'
  },
  {
    input: 'Candidates must have 3 years experience for OBC category posts. Relaxation of 5 years for SC/ST only.',
    sc: 5,
    obc: null,
    desc: 'Experience mentioned alongside category OBC but without relaxation for OBC'
  }
];

for (const c of relCases) {
  const res = extractMockCriteria(c.input);
  const scMatch = res.eligibility.ageRelaxation.find(r => r.category.includes('SC'));
  const obcMatch = res.eligibility.ageRelaxation.find(r => r.category.includes('OBC'));
  const scYears = scMatch ? scMatch.years : null;
  const obcYears = obcMatch ? obcMatch.years : null;
  console.log(`  Case: ${c.desc} -> SC: ${scYears}, OBC: ${obcYears}`);
  assert.equal(scYears, c.sc, `SC mismatch in: ${c.desc}`);
  assert.equal(obcYears, c.obc, `OBC mismatch in: ${c.desc}`);
}

// 4. Vacancy Commas, Dates, and Copulas
console.log('\n[TEST 4] Vacancy & Date Variations:');
const vacDateCases = [
  {
    input: 'Total vacancies: 1,056 posts.',
    expectedVac: 1056,
    desc: 'Standard 4-digit comma vacancy'
  },
  {
    input: 'Total vacancies: 1,500,000 posts in national drive.',
    expectedVac: 1500000,
    desc: 'Millions comma vacancy'
  },
  {
    input: '12,345 vacancies available.',
    expectedVac: 12345,
    desc: 'Leading comma vacancy'
  },
  {
    input: 'रिक्तियां (Total vacancies): 800 posts.',
    expectedVac: 800,
    desc: 'Parenthetical vacancy'
  },
  {
    input: 'The preliminary exam date is 2026-11-20.',
    expectedDate: '2026-11-20',
    desc: 'Exam date with copula "is"'
  },
  {
    input: 'Tentative exam date: 2026-12-15.',
    expectedDate: '2026-12-15',
    desc: 'Tentative exam date with colon'
  },
  {
    input: 'Date of examination is 2027-01-10.',
    expectedDate: '2027-01-10',
    desc: 'Date of examination is'
  }
];

for (const c of vacDateCases) {
  const res = extractMockCriteria(c.input);
  if (c.expectedVac !== undefined) {
    console.log(`  Case: ${c.desc} -> vacancies: ${res.vacancies}`);
    assert.equal(res.vacancies, c.expectedVac, `Vacancy mismatch in: ${c.desc}`);
  }
  if (c.expectedDate !== undefined) {
    console.log(`  Case: ${c.desc} -> examDate: ${res.importantDates.examDate}`);
    assert.equal(res.importantDates.examDate, c.expectedDate, `ExamDate mismatch in: ${c.desc}`);
  }
}

console.log('\n--- ALL INDEPENDENT TESTS PASSED SUCCESSFULLY ---');
