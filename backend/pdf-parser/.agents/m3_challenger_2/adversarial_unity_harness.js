'use strict';

/**
 * .agents/m3_challenger_2/adversarial_unity_harness.js
 * Comprehensive Adversarial Stress Test Harness for Unity / Database Checking Module.
 * 
 * Tests 5 Challenge Focus Areas:
 * 1. Extreme input malformations (null, undefined, primitives, arrays)
 * 2. Invariant fuzzing (1,000 randomized criteria/data permutations)
 * 3. Scorecard division-by-zero & arithmetic precision
 * 4. Overall verdict consistency & truth table enforcement
 * 5. Formatting resilience (formatUnityReport, printUnityReport under corrupt inputs)
 */

const assert = require('node:assert/strict');
const {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport
} = require('../../src/services/validator/unity-checker');
const rulesEngine = require('../../src/services/validator/rules');
const {
  UPSC_BENCHMARK_CRITERIA,
  SSC_CGL_BENCHMARK_CRITERIA,
  IBPS_PO_BENCHMARK_CRITERIA,
  TECHNICAL_SERVICES_BENCHMARK_CRITERIA,
  MOCK_CANDIDATES
} = require('../../fixtures/mock-criteria');
const { MOCK_NOTIFICATION_FIXTURE, getEmptyCriteria } = require('../../src/services/ai/mock-gemini');

const stats = {
  totalPassed: 0,
  totalFailed: 0,
  findings: []
};

function recordTest(name, passed, err = null, category = 'General') {
  if (passed) {
    stats.totalPassed++;
    console.log(`  ✔ PASS: ${name}`);
  } else {
    stats.totalFailed++;
    const errMsg = err ? (err.message || String(err)) : 'Assertion failed';
    stats.findings.push({ name, category, error: errMsg });
    console.log(`  ✘ FAIL: [${category}] ${name}`);
    console.log(`     Details: ${errMsg}`);
  }
}

function assertContract(result, contextDesc) {
  assert.ok(result !== null && typeof result === 'object', `${contextDesc}: result must be an object`);
  assert.ok(['PASS', 'FAIL', 'WARNING'].includes(result.overallVerdict), `${contextDesc}: invalid overallVerdict '${result.overallVerdict}'`);
  assert.ok(result.summary && typeof result.summary === 'object', `${contextDesc}: summary must be an object`);
  assert.equal(typeof result.summary.totalChecks, 'number', `${contextDesc}: totalChecks must be number`);
  assert.equal(typeof result.summary.passedChecks, 'number', `${contextDesc}: passedChecks must be number`);
  assert.equal(typeof result.summary.failedChecks, 'number', `${contextDesc}: failedChecks must be number`);
  assert.equal(typeof result.summary.warningChecks, 'number', `${contextDesc}: warningChecks must be number`);
  assert.equal(typeof result.summary.passRate, 'number', `${contextDesc}: passRate must be number`);
  assert.ok(!Number.isNaN(result.summary.passRate), `${contextDesc}: passRate must not be NaN`);
  assert.ok(Number.isFinite(result.summary.passRate), `${contextDesc}: passRate must be finite`);
  assert.equal(
    result.summary.totalChecks,
    result.summary.passedChecks + result.summary.failedChecks + result.summary.warningChecks,
    `${contextDesc}: totalChecks (${result.summary.totalChecks}) !== sum (${result.summary.passedChecks}+${result.summary.failedChecks}+${result.summary.warningChecks})`
  );
  assert.ok(Array.isArray(result.evaluations), `${contextDesc}: evaluations must be array`);
  for (let i = 0; i < result.evaluations.length; i++) {
    const ev = result.evaluations[i];
    assert.ok(ev && typeof ev === 'object', `${contextDesc}: eval[${i}] must be object`);
    assert.equal(typeof ev.field, 'string', `${contextDesc}: eval[${i}].field must be string`);
    assert.ok(['PASS', 'FAIL', 'WARNING'].includes(ev.status), `${contextDesc}: eval[${i}].status invalid: ${ev.status}`);
    assert.equal(typeof ev.reason, 'string', `${contextDesc}: eval[${i}].reason must be string`);
  }
  assert.ok(result.candidateEligibility && typeof result.candidateEligibility === 'object', `${contextDesc}: candidateEligibility must be object`);
  assert.equal(typeof result.candidateEligibility.isEligible, 'boolean', `${contextDesc}: isEligible must be boolean`);
  assert.ok(Array.isArray(result.candidateEligibility.disqualifications), `${contextDesc}: disqualifications must be array`);
  assert.ok(Array.isArray(result.candidateEligibility.matchedQualifications), `${contextDesc}: matchedQualifications must be array`);
}

console.log('================================================================================');
console.log('      ADVERSARIAL STRESS TEST HARNESS: UNITY CHECKER (m3_challenger_2)           ');
console.log('================================================================================\n');

// ============================================================================
// FOCUS AREA 1: EXTREME INPUT MALFORMATIONS
// ============================================================================
console.log('--- Focus Area 1: Extreme Input Malformations ---');

const malformedPrimitives = [
  ['verifyUnity(null, null)', null, null, 'FAIL'],
  ['verifyUnity(undefined, {})', undefined, {}, 'FAIL'],
  ['verifyUnity({}, undefined)', {}, undefined, 'WARNING'],
  ['verifyUnity(undefined, undefined)', undefined, undefined, 'FAIL'],
  ['verifyUnity(0, {})', 0, {}, 'FAIL'],
  ['verifyUnity(42, {})', 42, {}, 'FAIL'],
  ['verifyUnity(-1, {})', -1, {}, 'FAIL'],
  ['verifyUnity(NaN, {})', NaN, {}, 'FAIL'],
  ['verifyUnity(Infinity, {})', Infinity, {}, 'FAIL'],
  ['verifyUnity(true, {})', true, {}, 'FAIL'],
  ['verifyUnity(false, {})', false, {}, 'FAIL'],
  ['verifyUnity("", {})', '', {}, 'FAIL'],
  ['verifyUnity("malformed", {})', 'malformed', {}, 'FAIL'],
  ['verifyUnity(123n, {})', 123n, {}, 'FAIL'],
  ['verifyUnity(() => {}, {})', () => {}, {}, 'FAIL'],
  ['verifyUnity({}, 0)', {}, 0, 'WARNING'],
  ['verifyUnity({}, 42)', {}, 42, 'WARNING'],
  ['verifyUnity({}, -1)', {}, -1, 'WARNING'],
  ['verifyUnity({}, NaN)', {}, NaN, 'WARNING'],
  ['verifyUnity({}, Infinity)', {}, Infinity, 'WARNING'],
  ['verifyUnity({}, true)', {}, true, 'WARNING'],
  ['verifyUnity({}, false)', {}, false, 'WARNING'],
  ['verifyUnity({}, "")', {}, '', 'WARNING'],
  ['verifyUnity({}, "criteria")', {}, 'criteria', 'WARNING'],
  ['verifyUnity({}, 123n)', {}, 123n, 'WARNING'],
  ['verifyUnity({}, () => {})', {}, () => {}, 'WARNING'],
  ['verifyUnity([], [])', [], [], 'PASS'],
  ['verifyUnity([], {})', [], {}, 'PASS'],
  ['verifyUnity({}, [])', {}, [], 'PASS'],
  ['verifyUnity([1, 2, 3], [4, 5, 6])', [1, 2, 3], [4, 5, 6], 'PASS'],
  ['verifyUnity({ data: null }, {})', { data: null }, {}, 'PASS'],
  ['verifyUnity({ data: "string" }, {})', { data: 'string' }, {}, 'PASS'],
  ['verifyUnity({ data: [] }, {})', { data: [] }, {}, 'PASS'],
  ['verifyUnity({ data: 123 }, {})', { data: 123 }, {}, 'PASS'],
  ['verifyUnity({}, {})', {}, {}, 'PASS']
];

for (const [desc, ext, crit, expectedVerdict] of malformedPrimitives) {
  try {
    const res = verifyUnity(ext, crit);
    assertContract(res, desc);
    assert.equal(res.overallVerdict, expectedVerdict, `${desc}: expected overallVerdict '${expectedVerdict}' but got '${res.overallVerdict}'`);
    recordTest(desc, true);
  } catch (err) {
    recordTest(desc, false, err, 'Extreme Input Malformations');
  }
}

// BUG 1 SPECIFIC TEST: Vacuous substring matching when actual organization/title is null
console.log('\n--- Bug Verification: Vacuous Substring Match on Null Fields ---');
try {
  // When an empty extracted document is checked against an expected organization, it MUST FAIL!
  const emptyDocRes = verifyUnity({}, { organization: 'UNION PUBLIC SERVICE COMMISSION' });
  assert.equal(
    emptyDocRes.evaluations[0].status,
    'FAIL',
    `Vacuous Substring Bug: When normData.organization is null, empty string '' matched 'UNION PUBLIC SERVICE COMMISSION' via exp.includes('') resulting in status 'PASS'`
  );
  recordTest('verifyUnity({}, { organization: "UPSC" }) correctly FAILS when organization is null', true);
} catch (err) {
  recordTest('verifyUnity({}, { organization: "UPSC" }) correctly FAILS when organization is null', false, err, 'Vacuous Substring Match Bug');
}

try {
  const emptyTitleRes = verifyUnity({}, { examTitle: 'CIVIL SERVICES' });
  assert.equal(
    emptyTitleRes.evaluations[0].status,
    'FAIL',
    `Vacuous Substring Bug: When normData.examTitle is null, empty string '' matched 'CIVIL SERVICES' via exp.includes('') resulting in status 'PASS'`
  );
  recordTest('verifyUnity({}, { examTitle: "CIVIL SERVICES" }) correctly FAILS when examTitle is null', true);
} catch (err) {
  recordTest('verifyUnity({}, { examTitle: "CIVIL SERVICES" }) correctly FAILS when examTitle is null', false, err, 'Vacuous Substring Match Bug');
}

// Symbol conversion crash test
try {
  verifyUnity({}, { organization: Symbol('org') });
  recordTest('verifyUnity handles Symbol in criteria without crashing', true);
} catch (err) {
  recordTest('verifyUnity handles Symbol in criteria without crashing', false, err, 'Symbol Coercion Crash Bug');
}

try {
  verifyUnity({}, { minVacancies: Symbol('vac') });
  recordTest('verifyUnity handles Symbol minVacancies without crashing', true);
} catch (err) {
  recordTest('verifyUnity handles Symbol minVacancies without crashing', false, err, 'Symbol Coercion Crash Bug');
}

// ============================================================================
// FOCUS AREA 2: INVARIANT FUZZING (1000 RANDOMIZED PERMUTATIONS)
// ============================================================================
console.log('\n--- Focus Area 2: Invariant Fuzzing (1000 Randomized Permutations) ---');

const randomValues = [
  null, undefined, 0, 1, -1, 100, 999999, NaN, Infinity, -Infinity,
  '', '   ', 'UPSC', 'CIVIL SERVICES', 'Staff Selection Commission',
  'invalid-date', '2026-02-31', '2028-02-29', '1990-01-01', '2099-12-31',
  true, false, [], [null], [1, 2], ['bachelor'], ['master'], ['10th'],
  {}, { nested: null }, { age: -5 }, { age: 'not-a-number' },
  100n
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomExtractedData() {
  const roll = Math.random();
  if (roll < 0.1) return getRandomElement(randomValues);
  return {
    examTitle: getRandomElement(randomValues),
    organization: getRandomElement(randomValues),
    vacancies: getRandomElement(randomValues),
    status: getRandomElement(randomValues),
    eligibility: {
      minAge: getRandomElement(randomValues),
      maxAge: getRandomElement(randomValues),
      ageRelaxation: [
        { category: getRandomElement(['SC', 'ST', 'OBC', 'General', 'PwBD', 'UNKNOWN', null, 123]), years: getRandomElement([0, 3, 5, 10, -2, NaN, '5', null]) }
      ],
      requiredEducation: getRandomElement([[], ['Bachelor'], ['Master', 'PhD'], ['10th'], [null], [123]]),
      eligibleStreams: getRandomElement([[], ['Engineering'], ['Any'], ['Commerce'], [null], [456]])
    },
    importantDates: {
      applicationStartDate: getRandomElement(randomValues),
      applicationEndDate: getRandomElement(randomValues),
      examDate: getRandomElement(randomValues)
    },
    applicationFee: {
      general: getRandomElement(randomValues),
      reserved: getRandomElement(randomValues)
    }
  };
}

function generateRandomDatabaseCriteria() {
  const roll = Math.random();
  if (roll < 0.1) return getRandomElement(randomValues);
  const crit = {};
  if (Math.random() > 0.3) crit.organization = getRandomElement(randomValues);
  if (Math.random() > 0.3) crit.examTitle = getRandomElement(randomValues);
  if (Math.random() > 0.3) crit.status = getRandomElement(randomValues);
  if (Math.random() > 0.3) crit.minVacancies = getRandomElement(randomValues);
  if (Math.random() > 0.3) crit.maxGeneralFee = getRandomElement(randomValues);
  if (Math.random() > 0.3) crit.maxReservedFee = getRandomElement(randomValues);
  if (Math.random() > 0.3) crit.applicationEndDateMin = getRandomElement(randomValues);
  if (Math.random() > 0.4) {
    crit.candidate = {
      age: getRandomElement(randomValues),
      dob: getRandomElement(randomValues),
      category: getRandomElement(['General', 'SC', 'ST', 'OBC', 'PwBD', 'EWS', 'EX-SERVICEMEN', 'UNKNOWN', '', null, 99]),
      education: getRandomElement(['Bachelor of Technology', 'Master of Science', '10th', 'PhD', 'Diploma', '', null, 123]),
      stream: getRandomElement(['Civil Engineering', 'Computer Science', 'Commerce', 'Arts', '', null, 456])
    };
  }
  if (Math.random() > 0.5) {
    crit.rules = [
      { field: 'organization', type: getRandomElement(['required', 'equals', 'contains', 'unknown_type']), expected: getRandomElement(randomValues) },
      { field: 'vacancies', type: 'range', min: getRandomElement([0, 10, -5, NaN]), max: getRandomElement([1000, 50000, Infinity]) },
      { field: 'custom_check', type: 'custom', fn: Math.random() > 0.5 ? () => true : () => { throw new Error('Random rule explosion'); } }
    ];
  }
  return crit;
}

let fuzzInvariantViolations = 0;
let fuzzCrashes = 0;
const FUZZ_ITERATIONS = 1000;

for (let i = 0; i < FUZZ_ITERATIONS; i++) {
  const ext = generateRandomExtractedData();
  const crit = generateRandomDatabaseCriteria();
  try {
    const res = verifyUnity(ext, crit);
    assertContract(res, `Fuzz #${i + 1}`);
  } catch (err) {
    fuzzCrashes++;
    if (fuzzCrashes <= 3) {
      console.log(`  [Fuzz Error #${i + 1}]: ${err.message}`);
    }
  }
}

recordTest(
  `Invariant fuzzing across ${FUZZ_ITERATIONS} randomized permutations (totalChecks === passed + failed + warnings)`,
  fuzzCrashes === 0,
  fuzzCrashes > 0 ? new Error(`${fuzzCrashes} crashes encountered during fuzzing`) : null,
  'Invariant Fuzzing'
);

// ============================================================================
// FOCUS AREA 3: SCORECARD DIVISION-BY-ZERO & METRICS PRECISION
// ============================================================================
console.log('\n--- Focus Area 3: Scorecard Division-by-Zero & Metrics Precision ---');

try {
  const resZeroChecks = verifyUnity({}, {});
  assert.equal(resZeroChecks.summary.totalChecks, 0);
  assert.equal(resZeroChecks.summary.passedChecks, 0);
  assert.equal(resZeroChecks.summary.failedChecks, 0);
  assert.equal(resZeroChecks.summary.warningChecks, 0);
  assert.equal(resZeroChecks.summary.passRate, 100);
  assert.ok(!Number.isNaN(resZeroChecks.summary.passRate), 'passRate must not be NaN');
  assert.equal(resZeroChecks.overallVerdict, 'PASS');
  recordTest('Zero checks configured yields safe passRate: 100 without NaN', true);
} catch (err) {
  recordTest('Zero checks configured yields safe passRate: 100 without NaN', false, err, 'Division by Zero');
}

try {
  // Check rounding precision: 1 pass, 2 fail -> 33.33%
  const critPrecision = {
    organization: 'UNION PUBLIC SERVICE COMMISSION',
    examTitle: 'NON-EXISTENT-TITLE',
    applicationEndDateMin: '2099-01-01'
  };
  const resPrecision = verifyUnity(MOCK_NOTIFICATION_FIXTURE, critPrecision);
  assert.equal(resPrecision.summary.totalChecks, 3);
  assert.equal(resPrecision.summary.passedChecks, 1);
  assert.equal(resPrecision.summary.failedChecks, 2);
  assert.equal(resPrecision.summary.passRate, 33.33);
  recordTest('Scorecard passRate formats with 2 decimal precision (33.33%)', true);
} catch (err) {
  recordTest('Scorecard passRate formats with 2 decimal precision (33.33%)', false, err, 'Scorecard Precision');
}

try {
  // Check 100% fail passRate: 0.00
  const critAllFail = {
    organization: 'INCORRECT_ORG',
    examTitle: 'INCORRECT_TITLE'
  };
  const resAllFail = verifyUnity(MOCK_NOTIFICATION_FIXTURE, critAllFail);
  assert.equal(resAllFail.summary.totalChecks, 2);
  assert.equal(resAllFail.summary.passedChecks, 0);
  assert.equal(resAllFail.summary.failedChecks, 2);
  assert.equal(resAllFail.summary.passRate, 0);
  recordTest('Scorecard passRate formats 0% when 0 checks pass', true);
} catch (err) {
  recordTest('Scorecard passRate formats 0% when 0 checks pass', false, err, 'Scorecard Precision');
}

// ============================================================================
// FOCUS AREA 4: OVERALL VERDICT CONSISTENCY & TRUTH TABLE
// ============================================================================
console.log('\n--- Focus Area 4: Overall Verdict Consistency & Truth Table ---');

const truthTableCases = [
  {
    name: 'Truth Table: All PASS checks -> PASS',
    criteria: { organization: 'UNION PUBLIC SERVICE COMMISSION', examTitle: 'CIVIL SERVICES' },
    expectedVerdict: 'PASS'
  },
  {
    name: 'Truth Table: PASS + WARNING checks -> WARNING',
    criteria: { organization: 'UNION PUBLIC SERVICE COMMISSION', status: ['CLOSED', 'EXPIRED'] },
    expectedVerdict: 'WARNING'
  },
  {
    name: 'Truth Table: Only WARNING checks -> WARNING',
    criteria: { status: ['CLOSED', 'EXPIRED'] },
    expectedVerdict: 'WARNING'
  },
  {
    name: 'Truth Table: PASS + FAIL checks -> FAIL',
    criteria: { organization: 'UNION PUBLIC SERVICE COMMISSION', examTitle: 'WRONG_EXAM' },
    expectedVerdict: 'FAIL'
  },
  {
    name: 'Truth Table: WARNING + FAIL checks -> FAIL',
    criteria: { status: ['CLOSED'], examTitle: 'WRONG_EXAM' },
    expectedVerdict: 'FAIL'
  },
  {
    name: 'Truth Table: Only FAIL checks -> FAIL',
    criteria: { organization: 'WRONG_ORG', examTitle: 'WRONG_EXAM' },
    expectedVerdict: 'FAIL'
  },
  {
    name: 'Truth Table: All PASS checks + Disqualified Candidate -> FAIL',
    criteria: {
      organization: 'UNION PUBLIC SERVICE COMMISSION',
      examTitle: 'CIVIL SERVICES',
      candidate: MOCK_CANDIDATES.UNDERAGE_CANDIDATE
    },
    expectedVerdict: 'FAIL'
  },
  {
    name: 'Truth Table: Zero benchmark checks + Disqualified Candidate -> FAIL',
    criteria: {
      candidate: MOCK_CANDIDATES.UNDERAGE_CANDIDATE
    },
    expectedVerdict: 'FAIL'
  },
  {
    name: 'Truth Table: Zero checks + Eligible Candidate -> PASS',
    criteria: {
      candidate: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL
    },
    expectedVerdict: 'PASS'
  }
];

for (const tt of truthTableCases) {
  try {
    const res = verifyUnity(MOCK_NOTIFICATION_FIXTURE, tt.criteria);
    assert.equal(res.overallVerdict, tt.expectedVerdict, `${tt.name}: expected '${tt.expectedVerdict}' but got '${res.overallVerdict}'`);
    recordTest(tt.name, true);
  } catch (err) {
    recordTest(tt.name, false, err, 'Truth Table');
  }
}

// ============================================================================
// FOCUS AREA 5: FORMATTING RESILIENCE
// ============================================================================
console.log('\n--- Focus Area 5: Formatting Resilience ---');

const formattingCorruptCases = [
  ['formatUnityReport(null)', null],
  ['formatUnityReport(undefined)', undefined],
  ['formatUnityReport({})', {}],
  ['formatUnityReport({ overallVerdict: "FAIL" })', { overallVerdict: 'FAIL' }],
  ['formatUnityReport({ summary: null })', { summary: null }],
  ['formatUnityReport({ evaluations: null })', { summary: { totalChecks: 0, passedChecks: 0, failedChecks: 0, warningChecks: 0, passRate: 100 }, evaluations: null }],
  ['formatUnityReport({ evaluations: [null] })', {
    summary: { totalChecks: 1, passedChecks: 0, failedChecks: 1, warningChecks: 0, passRate: 0 },
    evaluations: [null],
    candidateEligibility: { isEligible: false, matchedQualifications: [], disqualifications: [] }
  }],
  ['formatUnityReport({ candidateEligibility: null })', {
    summary: { totalChecks: 0, passedChecks: 0, failedChecks: 0, warningChecks: 0, passRate: 100 },
    evaluations: [],
    candidateEligibility: null
  }],
  ['formatUnityReport({ evaluations: [{ status: "FAIL" }] }) (missing field & reason)', {
    summary: { totalChecks: 1, passedChecks: 0, failedChecks: 1, warningChecks: 0, passRate: 0 },
    evaluations: [{ status: 'FAIL' }],
    candidateEligibility: { isEligible: false, matchedQualifications: [], disqualifications: [] }
  }],
  ['formatUnityReport(extreme string lengths: 100,000 chars)', {
    overallVerdict: 'PASS',
    summary: { totalChecks: 1, passedChecks: 1, failedChecks: 0, warningChecks: 0, passRate: 100 },
    evaluations: [{ field: 'X'.repeat(100000), status: 'PASS', reason: 'Y'.repeat(100000), expected: 'Z'.repeat(100000), actual: 'W'.repeat(100000) }],
    candidateEligibility: { isEligible: true, matchedQualifications: ['M'.repeat(100000)], disqualifications: [] }
  }],
  ['printUnityReport(null)', null, true],
  ['printUnityReport({})', {}, true],
  ['printUnityReport({ summary: null })', { summary: null }, true]
];

for (const [desc, corruptInput, isPrint] of formattingCorruptCases) {
  try {
    if (isPrint) {
      const origLog = console.log;
      console.log = () => {};
      try {
        printUnityReport(corruptInput);
      } finally {
        console.log = origLog;
      }
    } else {
      const out = formatUnityReport(corruptInput);
      assert.equal(typeof out, 'string', 'Expected formatted report to return a string');
    }
    recordTest(desc, true);
  } catch (err) {
    recordTest(desc, false, err, 'Formatting Resilience');
  }
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================================');
console.log('                          HARNESS EXECUTION SUMMARY                             ');
console.log('================================================================================');
console.log(`Total Passed: ${stats.totalPassed}`);
console.log(`Total Failed: ${stats.totalFailed}`);
if (stats.findings.length > 0) {
  console.log('\nFailures & Vulnerabilities Encountered:');
  stats.findings.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.category}] ${f.name}`);
    console.log(`     Error: ${f.error.split('\n')[0]}`);
  });
}
console.log('================================================================================\n');

process.exit(stats.totalFailed > 0 ? 1 : 0);
