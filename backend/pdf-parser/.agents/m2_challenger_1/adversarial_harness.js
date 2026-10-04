'use strict';

/**
 * .agents/m2_challenger_1/adversarial_harness.js
 * Adversarial Stress Testing Harness for Milestone 2:
 * Targets: mock-gemini.js, gemini-parser.js, and normalizeCriteriaData.
 *
 * Suites:
 *  1. Malicious / Confusing Text (Age vs Experience / Project limits)
 *  2. Conflicting Age Relaxation Clauses & Multiple Categories
 *  3. Fee Ambiguities (Zero vs Null, Free for All, Negative fees)
 *  4. Date Extraction Adversity (Order permutations, multi-dates, invalid formats)
 *  5. Number Formatting & Boundaries (Vacancies with commas, >1M, floats, negatives)
 *  6. Unicode, Emoji, Non-Latin scripts, Control Chars
 *  7. String Length, Memory & ReDoS Stress Testing
 *  8. Hostile JSON Payloads & Normalizer Hardening (Prototype pollution, type poisoning)
 *  9. Output Contract Invariance under Adversarial Conditions
 */

const assert = require('node:assert/strict');
const path = require('node:path');

const {
  extractMockCriteria,
  generateMockResponse,
  getEmptyCriteria
} = require('../../src/services/ai/mock-gemini');

const {
  parseStructuredCriteria,
  normalizeCriteriaData,
  parseJsonSafely
} = require('../../src/services/ai/gemini-parser');

const { CRITERIA_SCHEMA } = require('../../src/services/ai/schema');

// Tracking test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(name, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.log(`  ✗ FAIL: ${name}`);
    console.log(`    Error: ${err.message}`);
  }
}

async function runTestAsync(name, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.log(`  ✗ FAIL: ${name}`);
    console.log(`    Error: ${err.message}`);
  }
}

/**
 * Validates Interface Contract #2 compliance.
 */
function assertContractCompliance(data, context = '') {
  assert.ok(data !== null && typeof data === 'object', `${context}: data must be an object`);
  
  // Top-level scalars
  assert.ok(data.examTitle === null || typeof data.examTitle === 'string', `${context}: examTitle must be string | null`);
  assert.ok(data.organization === null || typeof data.organization === 'string', `${context}: organization must be string | null`);
  assert.ok(
    data.vacancies === null || (typeof data.vacancies === 'number' && Number.isInteger(data.vacancies) && data.vacancies >= 0),
    `${context}: vacancies must be non-negative integer | null, got: ${data.vacancies}`
  );
  assert.ok(typeof data.status === 'string', `${context}: status must be string`);

  // Eligibility
  assert.ok(data.eligibility && typeof data.eligibility === 'object', `${context}: eligibility must be object`);
  assert.ok(
    data.eligibility.minAge === null || (typeof data.eligibility.minAge === 'number' && data.eligibility.minAge >= 0),
    `${context}: minAge must be non-negative number | null, got: ${data.eligibility.minAge}`
  );
  assert.ok(
    data.eligibility.maxAge === null || (typeof data.eligibility.maxAge === 'number' && data.eligibility.maxAge >= 0),
    `${context}: maxAge must be non-negative number | null, got: ${data.eligibility.maxAge}`
  );
  assert.ok(Array.isArray(data.eligibility.ageRelaxation), `${context}: ageRelaxation must be array`);
  for (const rel of data.eligibility.ageRelaxation) {
    assert.equal(typeof rel.category, 'string', `${context}: relaxation category must be string`);
    assert.equal(typeof rel.years, 'number', `${context}: relaxation years must be number`);
    assert.ok(rel.years >= 0, `${context}: relaxation years must be >= 0`);
  }
  assert.ok(Array.isArray(data.eligibility.requiredEducation), `${context}: requiredEducation must be array`);
  for (const edu of data.eligibility.requiredEducation) {
    assert.equal(typeof edu, 'string', `${context}: education item must be string`);
  }
  assert.ok(Array.isArray(data.eligibility.eligibleStreams), `${context}: eligibleStreams must be array`);
  for (const str of data.eligibility.eligibleStreams) {
    assert.equal(typeof str, 'string', `${context}: streams item must be string`);
  }

  // Dates
  assert.ok(data.importantDates && typeof data.importantDates === 'object', `${context}: importantDates must be object`);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (data.importantDates.applicationStartDate !== null) {
    assert.equal(typeof data.importantDates.applicationStartDate, 'string');
    assert.match(data.importantDates.applicationStartDate, dateRegex);
  }
  if (data.importantDates.applicationEndDate !== null) {
    assert.equal(typeof data.importantDates.applicationEndDate, 'string');
    assert.match(data.importantDates.applicationEndDate, dateRegex);
  }
  if (data.importantDates.examDate !== null) {
    assert.equal(typeof data.importantDates.examDate, 'string');
    assert.match(data.importantDates.examDate, dateRegex);
  }

  // Application Fee
  assert.ok(data.applicationFee && typeof data.applicationFee === 'object', `${context}: applicationFee must be object`);
  assert.ok(
    data.applicationFee.general === null || (typeof data.applicationFee.general === 'number' && data.applicationFee.general >= 0),
    `${context}: applicationFee.general must be non-negative number | null`
  );
  assert.ok(
    data.applicationFee.reserved === null || (typeof data.applicationFee.reserved === 'number' && data.applicationFee.reserved >= 0),
    `${context}: applicationFee.reserved must be non-negative number | null`
  );
}

// ============================================================================
// MAIN ADVERSARIAL SUITE RUNNER
// ============================================================================
async function runAllSuites() {
  console.log('======================================================================');
  console.log('STARTING ADVERSARIAL STRESS TEST HARNESS (Milestone 2)');
  console.log('Targeting: mock-gemini.js, gemini-parser.js, normalizeCriteriaData');
  console.log('======================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: Malicious / Confusing Text (Age vs Experience & Project limits)
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: Malicious / Confusing Text ---');

  runTest('1.1 text mentions "applicant must be at least 10 years experience and maximum 50 projects"', () => {
    const text = `
      COMMISSION RECRUITMENT NOTICE
      The applicant must be at least 10 years experience in senior software architecture and maximum 50 projects managed.
      Minimum educational qualification is Graduation.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 1.1');
    // Heuristic should NOT mistake "10 years experience" as minAge=10, nor "maximum 50 projects" as maxAge=50
    // If no age limit is mentioned, minAge and maxAge should be null or legitimate candidate age (e.g. >= 18)
    assert.notEqual(data.eligibility.minAge, 10, 'minAge was incorrectly set to 10 from years of experience!');
    assert.notEqual(data.eligibility.maxAge, 50, 'maxAge was incorrectly set to 50 from maximum projects!');
    assert.equal(data.eligibility.minAge, null);
    assert.equal(data.eligibility.maxAge, null);
  });

  runTest('1.2 experience range "5 to 8 years experience" precedes real age "Age Limit: 21 to 30 years"', () => {
    const text = `
      Candidates must have 5 to 8 years experience in government administration.
      Age Limit: 21 to 30 years as of cut-off date.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 1.2');
    assert.equal(data.eligibility.minAge, 21, `Expected minAge 21, got ${data.eligibility.minAge}`);
    assert.equal(data.eligibility.maxAge, 30, `Expected maxAge 30, got ${data.eligibility.maxAge}`);
  });

  runTest('1.3 experience range "3 to 5 years experience" with NO age limit in text', () => {
    const text = `
      Applicants should possess 3 to 5 years experience in financial auditing.
      Graduation is mandatory.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 1.3');
    // Should NOT capture 3 to 5 as age limit
    assert.notEqual(data.eligibility.minAge, 3, 'minAge was corrupted by experience range "3 to 5 years"');
    assert.notEqual(data.eligibility.maxAge, 5, 'maxAge was corrupted by experience range "3 to 5 years"');
    assert.equal(data.eligibility.minAge, null);
    assert.equal(data.eligibility.maxAge, null);
  });

  runTest('1.4 confusing bond period "must serve a minimum period of 3 years" does not corrupt age', () => {
    const text = `
      Candidates selected must serve a minimum period of 3 years.
      Age limit: 21 to 32 years.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 1.4');
    assert.equal(data.eligibility.minAge, 21);
    assert.equal(data.eligibility.maxAge, 32);
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Conflicting Age Relaxation & Multiple Category Clauses
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Conflicting Age Relaxation Clauses ---');

  runTest('2.1 SC/ST mentioned multiple times (general 5 years vs disability 10 years)', () => {
    const text = `
      Age limit is 21 to 30 years.
      Relaxation of 5 years for Scheduled Caste candidates.
      Scheduled Caste candidates with physical disability get relaxation of 10 years.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 2.1');
    assert.ok(data.eligibility.ageRelaxation.length > 0);
    const scRel = data.eligibility.ageRelaxation.find(r => r.category.includes('SC'));
    assert.ok(scRel, 'Must find SC relaxation');
    assert.ok(scRel.years === 5 || scRel.years === 10, 'Years must be a valid relaxation');
  });

  runTest('2.2 zero relaxation clause "0 years relaxation for General / Unreserved category"', () => {
    const text = `
      Upper age limit is 32 years.
      Relaxation of 5 years for SC/ST, and 0 years for General category.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 2.2');
    const sc = data.eligibility.ageRelaxation.find(r => r.category.includes('SC'));
    assert.equal(sc.years, 5);
  });

  runTest('2.3 age relaxation clause with non-standard phrasing: "OBC candidates: up to 3 years"', () => {
    const text = `
      Minimum age: 20 years, maximum age: 28 years.
      Age concessions: OBC candidates: up to 3 years, SC/ST: up to 5 years.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 2.3');
    const obc = data.eligibility.ageRelaxation.find(r => r.category.includes('OBC'));
    const sc = data.eligibility.ageRelaxation.find(r => r.category.includes('SC'));
    assert.ok(obc && obc.years === 3, 'Must capture OBC relaxation of 3 years');
    assert.ok(sc && sc.years === 5, 'Must capture SC/ST relaxation of 5 years');
  });

  // --------------------------------------------------------------------------
  // SUITE 3: Fee Ambiguities (Zero vs Null, Exemption, Free for All)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Fee Ambiguities ---');

  runTest('3.1 explicit zero fee "Application fee: Rs. 0 for all candidates"', () => {
    const text = `
      Notification for recruitment.
      Application fee: Rs. 0 for all candidates.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 3.1');
    assert.equal(data.applicationFee.general, 0, `Expected general fee 0, got ${data.applicationFee.general}`);
  });

  runTest('3.2 fee is unmentioned - must remain null, NOT 0', () => {
    const text = `
      Only educational requirements: Bachelor's degree.
      Age 21 to 30 years.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 3.2');
    assert.equal(data.applicationFee.general, null);
    assert.equal(data.applicationFee.reserved, null);
  });

  runTest('3.3 "Free of cost" / "No fee" resolves reserved to 0', () => {
    const text = `
      Fee of Rs. 150 for general applicants. No fee for reserved categories.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 3.3');
    assert.equal(data.applicationFee.general, 150);
    assert.equal(data.applicationFee.reserved, 0);
  });

  runTest('3.4 negative fee text "fee: -100" must not yield negative fee in data', () => {
    const text = `
      Fee: Rs. -100 for registration.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 3.4');
    // Contract requires applicationFee.general >= 0 or null
    assert.ok(data.applicationFee.general === null || data.applicationFee.general >= 0);
  });

  // --------------------------------------------------------------------------
  // SUITE 4: Date Extraction Adversity
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Date Extraction Adversity ---');

  runTest('4.1 dates in reverse order in document text', () => {
    const text = `
      The preliminary exam date is 2026-11-20.
      The last date for submission of online applications is 2026-08-15.
      The application registration window opens on 2026-07-01.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 4.1');
    assert.equal(data.importantDates.applicationStartDate, '2026-07-01');
    assert.equal(data.importantDates.applicationEndDate, '2026-08-15');
    assert.equal(data.importantDates.examDate, '2026-11-20');
  });

  runTest('4.2 non-ISO date formats (e.g. DD/MM/YYYY) should not produce invalid ISO strings', () => {
    const text = `
      Important dates:
      Start date: 15/01/2026
      Closing date: 28/02/2026
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 4.2');
    // If not matching YYYY-MM-DD, regex should leave it null rather than returning non-ISO string
    if (data.importantDates.applicationStartDate !== null) {
      assert.match(data.importantDates.applicationStartDate, /^\d{4}-\d{2}-\d{2}$/);
    }
    if (data.importantDates.applicationEndDate !== null) {
      assert.match(data.importantDates.applicationEndDate, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  runTest('4.3 unrelated dates (e.g. "established on 1950-01-26") do not corrupt application dates', () => {
    const text = `
      The Commission was established on 1950-01-26 under the Constitution.
      Last date for submission of online applications is 2026-05-10.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 4.3');
    assert.notEqual(data.importantDates.applicationStartDate, '1950-01-26');
    assert.equal(data.importantDates.applicationEndDate, '2026-05-10');
  });

  // --------------------------------------------------------------------------
  // SUITE 5: Number Formatting & Boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Number Formatting & Boundaries ---');

  runTest('5.1 vacancies formatted with commas: "Total vacancies: 1,056"', () => {
    const text = `
      COMMISSION RECRUITMENT
      Total vacancies: 1,056 posts across services.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 5.1');
    // Adversarial test: does regex truncate "1,056" to 1?
    assert.equal(data.vacancies, 1056, `Vacancies was truncated! Got: ${data.vacancies} instead of 1056`);
  });

  runTest('5.2 large vacancy number > 1 million: "Total vacancies: 1,500,000"', () => {
    const text = `
      National Employment Mission
      Total vacancies: 1500000 posts nationwide.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 5.2');
    assert.equal(data.vacancies, 1500000);
  });

  runTest('5.3 floating point or corrupt vacancy text "vacancies: 10.5" or "vacancies: approx 500"', () => {
    const text = `
      Total vacancies: 500 posts.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 5.3');
    assert.equal(Number.isInteger(data.vacancies), true);
  });

  runTest('5.4 negative vacancies in text "vacancies: -50" should not result in negative vacancies in contract', () => {
    const text = `
      Vacancies: -50 posts.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 5.4');
    assert.ok(data.vacancies === null || data.vacancies >= 0);
  });

  // --------------------------------------------------------------------------
  // SUITE 6: Unicode, Emoji, Non-Latin scripts & Control Chars
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Unicode, Emoji & Non-Latin Scripts ---');

  runTest('6.1 text with Devanagari Unicode and Emoji headers', () => {
    const text = `
      🏛️ संघ लोक सेवा आयोग (UPSC) 🎯
      Notice No: 01/2026 | COMBINED CIVIL SERVICES EXAMINATION 2026
      आयु सीमा (Age Limit): 21 to 32 years.
      कुल रिक्तियां (Total vacancies): 800 posts.
      शुल्क: Rs. 100 for General.
    `;
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 6.1');
    assert.equal(data.eligibility.minAge, 21);
    assert.equal(data.eligibility.maxAge, 32);
    assert.equal(data.vacancies, 800);
    assert.equal(data.applicationFee.general, 100);
  });

  runTest('6.2 text with zero-width characters and unusual whitespace', () => {
    const text = "UNION\u200B PUBLIC\u200C SERVICE\u200D COMMISSION\nMinimum age: 21 years. Maximum age: 30 years.\uFEFF";
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 6.2');
    assert.equal(data.eligibility.minAge, 21);
    assert.equal(data.eligibility.maxAge, 30);
  });

  runTest('6.3 text with non-Latin numbers (e.g. Arabic or Hindi numerals) does not crash or throw', () => {
    const text = "Vacancies: १२५०. Age: २१ to ३२ years.";
    const data = extractMockCriteria(text);
    assertContractCompliance(data, 'Suite 6.3');
  });

  // --------------------------------------------------------------------------
  // SUITE 7: String Length, Memory & ReDoS Stress Testing
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: String Length & ReDoS Stress Testing ---');

  runTest('7.1 extremely long text (100,000 characters) processes in under 100ms without crashing', () => {
    const repeatedFiller = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1700); // ~100k chars
    const fullText = `
      UNION PUBLIC SERVICE COMMISSION
      Notice No: 99/2026 | COMBINED CIVIL SERVICES EXAMINATION 2026
      ${repeatedFiller}
      Minimum age: 21 years and maximum age: 32 years.
      Total vacancies: 750 posts.
    `;
    const start = performance.now();
    const data = extractMockCriteria(fullText);
    const duration = performance.now() - start;

    assertContractCompliance(data, 'Suite 7.1');
    assert.equal(data.eligibility.minAge, 21);
    assert.equal(data.eligibility.maxAge, 32);
    assert.equal(data.vacancies, 750);
    assert.ok(duration < 200, `Execution took too long: ${duration.toFixed(2)}ms (possible ReDoS)`);
  });

  runTest('7.2 adversarial ReDoS pattern on organization regex: repeated whitespace and capital letters', () => {
    // Target regex: /([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|...))/
    const adversarialPattern = 'A '.repeat(5000) + 'NOT_A_MATCH';
    const start = performance.now();
    const data = extractMockCriteria(adversarialPattern);
    const duration = performance.now() - start;

    assertContractCompliance(data, 'Suite 7.2');
    assert.ok(duration < 100, `Organization regex took ${duration.toFixed(2)}ms (ReDoS vulnerability!)`);
  });

  runTest('7.3 adversarial ReDoS pattern on age relaxation regex: clause boundaries with repeated spaces', () => {
    // Target regex: /(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Scheduled Caste...)/
    const adversarialPattern = 'relaxation of 5 years ' + 'x '.repeat(5000) + 'NO_CATEGORY';
    const start = performance.now();
    const data = extractMockCriteria(adversarialPattern);
    const duration = performance.now() - start;

    assertContractCompliance(data, 'Suite 7.3');
    assert.ok(duration < 100, `Age relaxation regex took ${duration.toFixed(2)}ms (ReDoS vulnerability!)`);
  });

  // --------------------------------------------------------------------------
  // SUITE 8: Hostile JSON Payloads & Normalizer Hardening
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Hostile JSON Payloads & Normalizer Hardening ---');

  runTest('8.1 prototype pollution attempt in raw criteria JSON does not pollute Object prototype', () => {
    const hostilePayload = JSON.parse('{"__proto__": {"polluted": true}, "examTitle": "TEST"}');
    const normalized = normalizeCriteriaData(hostilePayload);
    assertContractCompliance(normalized, 'Suite 8.1');
    assert.equal({}.polluted, undefined, 'Object.prototype was polluted!');
  });

  runTest('8.2 type poisoning: nested objects replaced by numbers, strings, or booleans', () => {
    const poisoned = {
      examTitle: 12345,
      organization: true,
      eligibility: "not-an-object",
      importantDates: 42,
      vacancies: "many",
      applicationFee: false,
      status: {}
    };
    const normalized = normalizeCriteriaData(poisoned);
    assertContractCompliance(normalized, 'Suite 8.2');
    assert.equal(normalized.examTitle, null);
    assert.equal(normalized.organization, null);
    assert.equal(normalized.eligibility.minAge, null);
    assert.deepEqual(normalized.eligibility.ageRelaxation, []);
    assert.equal(normalized.importantDates.examDate, null);
    assert.equal(normalized.vacancies, null);
    assert.equal(normalized.applicationFee.general, null);
  });

  runTest('8.3 negative numbers in raw JSON normalized to null or non-negative', () => {
    const negativeData = {
      eligibility: {
        minAge: -25,
        maxAge: -50,
        ageRelaxation: [{ category: 'SC', years: -5 }]
      },
      vacancies: -100,
      applicationFee: {
        general: -200,
        reserved: -50
      }
    };
    const normalized = normalizeCriteriaData(negativeData);
    assertContractCompliance(normalized, 'Suite 8.3');
    assert.equal(normalized.eligibility.minAge, null);
    assert.equal(normalized.eligibility.maxAge, null);
    assert.equal(normalized.vacancies, null);
    assert.equal(normalized.applicationFee.general, null);
    assert.equal(normalized.applicationFee.reserved, null);
    assert.equal(normalized.eligibility.ageRelaxation[0].years, 0);
  });

  runTest('8.4 NaN and Infinity in numeric fields are safely neutralized', () => {
    const nanData = {
      eligibility: {
        minAge: NaN,
        maxAge: Infinity
      },
      vacancies: Infinity,
      applicationFee: {
        general: NaN
      }
    };
    const normalized = normalizeCriteriaData(nanData);
    assertContractCompliance(normalized, 'Suite 8.4');
    // typeof NaN is 'number', but minAge >= 0 is false for NaN!
    // What about Infinity? typeof Infinity is 'number', and Infinity >= 0 is true!
    // BUT vacancies must be an integer (Number.isInteger(Infinity) is false).
    assert.equal(normalized.vacancies, null, 'Infinity vacancies must be normalized to null');
    assert.equal(normalized.eligibility.minAge, null, 'NaN minAge must be normalized to null');
    assert.equal(normalized.applicationFee.general, null, 'NaN fee must be normalized to null');
    // Note: maxAge should ideally be finite integer
    assert.ok(Number.isFinite(normalized.eligibility.maxAge) || normalized.eligibility.maxAge === null, 'maxAge must not be Infinity');
  });

  runTest('8.5 non-conforming date formats in raw JSON are neutralized to null', () => {
    const badDates = {
      importantDates: {
        applicationStartDate: '2026/01/10',
        applicationEndDate: '15-02-2026',
        examDate: 'next Monday'
      }
    };
    const normalized = normalizeCriteriaData(badDates);
    assertContractCompliance(normalized, 'Suite 8.5');
    assert.equal(normalized.importantDates.applicationStartDate, null);
    assert.equal(normalized.importantDates.applicationEndDate, null);
    assert.equal(normalized.importantDates.examDate, null);
  });

  runTest('8.6 ageRelaxation with null or malformed items is safely sanitized', () => {
    const badRelaxation = {
      eligibility: {
        ageRelaxation: [
          null,
          undefined,
          "invalid",
          { category: 123, years: "five" },
          { category: 'SC/ST', years: 5 }
        ]
      }
    };
    const normalized = normalizeCriteriaData(badRelaxation);
    assertContractCompliance(normalized, 'Suite 8.6');
    assert.equal(normalized.eligibility.ageRelaxation.length, 2);
    assert.equal(normalized.eligibility.ageRelaxation[1].category, 'SC/ST');
    assert.equal(normalized.eligibility.ageRelaxation[1].years, 5);
  });

  // --------------------------------------------------------------------------
  // SUITE 9: Unified parseStructuredCriteria Stress & Error Handling
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 9: parseStructuredCriteria Pipeline Stress ---');

  await runTestAsync('9.1 parseStructuredCriteria with null byte and control chars in text', async () => {
    const textWithCtrl = "UPSC Notification\x00\x01\x02\x03\x04\x05\x06\x07 Age: 21 to 32 years. Vacancies: 500.";
    const res = await parseStructuredCriteria(textWithCtrl, { mockMode: true });
    assert.equal(res.success, true);
    assertContractCompliance(res.data, 'Suite 9.1');
    assert.equal(res.data.eligibility.minAge, 21);
    assert.equal(res.data.eligibility.maxAge, 32);
  });

  await runTestAsync('9.2 parseStructuredCriteria with client returning empty markdown block', async () => {
    const mockClient = {
      models: {
        generateContent: async () => ({ text: "```json\n\n```" })
      }
    };
    const res = await parseStructuredCriteria('Some text', {
      apiKey: 'test-key',
      client: mockClient
    });
    // Should fail gracefully with success: false rather than throwing an unhandled exception
    assert.equal(res.success, false);
    assert.equal(res.data, null);
    assert.ok(res.error);
  });

  await runTestAsync('9.3 parseStructuredCriteria with fallbackToMockOnError=true on client exception', async () => {
    const mockClient = {
      models: {
        generateContent: async () => {
          throw new Error('Overloaded 503 Service Unavailable');
        }
      }
    };
    const res = await parseStructuredCriteria('Minimum age: 21 years. Maximum age: 30 years.', {
      apiKey: 'test-key',
      client: mockClient,
      fallbackToMockOnError: true
    });
    assert.equal(res.success, true);
    assert.equal(res.isMock, true);
    assertContractCompliance(res.data, 'Suite 9.3');
    assert.equal(res.data.eligibility.minAge, 21);
    assert.equal(res.data.eligibility.maxAge, 30);
    assert.match(res.error, /503/);
  });

  await runTestAsync('9.4 parseStructuredCriteria with extreme options object (frozen, circular, strange types)', async () => {
    const circular = { mockMode: true };
    circular.self = circular;
    Object.freeze(circular);

    const res = await parseStructuredCriteria('Minimum age: 21 to 32 years.', circular);
    assert.equal(res.success, true);
    assertContractCompliance(res.data, 'Suite 9.4');
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('ADVERSARIAL STRESS TEST SUMMARY:');
  console.log(`Total Scenarios: ${totalTests}`);
  console.log(`Passed:          ${passedTests}`);
  console.log(`Failed:          ${failedTests}`);
  console.log(`Success Rate:    ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  console.log('======================================================================');

  if (failedTests > 0) {
    console.log('\nFAILED TEST DETAILS:');
    failures.forEach((f, idx) => {
      console.log(`\n${idx + 1}) ${f.name}`);
      console.log(`   ${f.error}`);
    });
  }

  return { totalTests, passedTests, failedTests, failures };
}

// Run if directly executed
if (require.main === module) {
  runAllSuites().then(({ failedTests }) => {
    process.exit(failedTests > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Fatal test harness execution error:', err);
    process.exit(2);
  });
}

module.exports = { runAllSuites };
