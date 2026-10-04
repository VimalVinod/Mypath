'use strict';

/**
 * test/unity-checker.test.js
 * Comprehensive 4-Tier test suite for the Unity / Database Checking Module.
 * Conforms to Interface Contract #3 and Requirements §R3, §R4.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport,
  rules
} = require('../src/services/validator');

const {
  BENCHMARK_CRITERIA,
  UPSC_BENCHMARK_CRITERIA,
  SSC_CGL_BENCHMARK_CRITERIA,
  IBPS_PO_BENCHMARK_CRITERIA,
  TECHNICAL_SERVICES_BENCHMARK_CRITERIA,
  MOCK_CANDIDATES,
  createCustomCriteria,
  createCustomCandidate,
  getBenchmarkCriteria
} = require('../fixtures/mock-criteria');

const { MOCK_NOTIFICATION_FIXTURE, getEmptyCriteria } = require('../src/services/ai/mock-gemini');

// Helper to validate Interface Contract #3 schema
function assertUnityVerdictContract(result) {
  assert.ok(result !== null && typeof result === 'object', 'result must be non-null object');
  assert.ok(['PASS', 'FAIL', 'WARNING'].includes(result.overallVerdict), `Invalid verdict: ${result.overallVerdict}`);
  assert.ok(result.summary && typeof result.summary === 'object', 'summary must be object');
  assert.equal(typeof result.summary.totalChecks, 'number', 'totalChecks must be number');
  assert.equal(typeof result.summary.passedChecks, 'number', 'passedChecks must be number');
  assert.equal(typeof result.summary.failedChecks, 'number', 'failedChecks must be number');
  assert.equal(typeof result.summary.warningChecks, 'number', 'warningChecks must be number');
  assert.equal(typeof result.summary.passRate, 'number', 'passRate must be number');
  assert.equal(
    result.summary.totalChecks,
    result.summary.passedChecks + result.summary.failedChecks + result.summary.warningChecks,
    'totalChecks must equal passedChecks + failedChecks + warningChecks'
  );
  assert.ok(Array.isArray(result.evaluations), 'evaluations must be array');
  for (const ev of result.evaluations) {
    assert.equal(typeof ev.field, 'string', 'eval.field must be string');
    assert.ok(['PASS', 'FAIL', 'WARNING'].includes(ev.status), `eval.status invalid: ${ev.status}`);
    assert.equal(typeof ev.reason, 'string', 'eval.reason must be string');
  }
  assert.ok(result.candidateEligibility && typeof result.candidateEligibility === 'object', 'candidateEligibility must be object');
  assert.equal(typeof result.candidateEligibility.isEligible, 'boolean', 'isEligible must be boolean');
  assert.ok(Array.isArray(result.candidateEligibility.disqualifications), 'disqualifications must be array');
  assert.ok(Array.isArray(result.candidateEligibility.matchedQualifications), 'matchedQualifications must be array');
}

// =============================================================================
// TIER 1: FEATURE COVERAGE TESTS
// =============================================================================
describe('Tier 1: Feature Coverage (Rules in Isolation & Contract Compliance)', () => {
  it('1.1 verifyUnity conforms strictly to Interface Contract #3 output envelope shape', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
  });

  it('1.2 correctly matches organization and examTitle benchmarks (PASS)', () => {
    const criteria = {
      organization: 'UNION PUBLIC SERVICE COMMISSION',
      examTitle: 'CIVIL SERVICES'
    };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.summary.passedChecks, 2);
    assert.equal(result.summary.failedChecks, 0);
  });

  it('1.3 flags FAIL when organization does not match benchmark', () => {
    const criteria = { organization: 'STAFF SELECTION COMMISSION' };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    const orgEval = result.evaluations.find(e => e.field === 'organization');
    assert.ok(orgEval);
    assert.equal(orgEval.status, 'FAIL');
  });

  it('1.4 flags FAIL when examTitle does not match benchmark', () => {
    const criteria = { examTitle: 'ENGINEERING SERVICES' };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    const titleEval = result.evaluations.find(e => e.field === 'examTitle');
    assert.ok(titleEval);
    assert.equal(titleEval.status, 'FAIL');
  });

  it('1.5 validates status check against permitted list (PASS & WARNING)', () => {
    const passResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { status: ['ACTIVE', 'UPCOMING'] });
    const statusEval1 = passResult.evaluations.find(e => e.field === 'status');
    assert.equal(statusEval1.status, 'PASS');

    const warnResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { status: ['CLOSED', 'EXPIRED'] });
    const statusEval2 = warnResult.evaluations.find(e => e.field === 'status');
    assert.equal(statusEval2.status, 'WARNING');
    assert.equal(warnResult.overallVerdict, 'WARNING');
  });

  it('1.6 evaluates vacancy threshold (PASS when >= minVacancies, WARNING when below)', () => {
    const passResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { minVacancies: 1000 });
    const vacEval1 = passResult.evaluations.find(e => e.field === 'vacancies');
    assert.equal(vacEval1.status, 'PASS');

    const warnResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { minVacancies: 2000 });
    const vacEval2 = warnResult.evaluations.find(e => e.field === 'vacancies');
    assert.equal(vacEval2.status, 'WARNING');
  });

  it('1.7 evaluates general fee cap and reserved fee cap (PASS & FAIL)', () => {
    const passResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { maxGeneralFee: 100, maxReservedFee: 0 });
    assert.equal(passResult.overallVerdict, 'PASS');

    const failResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { maxReservedFee: -1 });
    assert.equal(failResult.overallVerdict, 'FAIL');
    const resFeeEval = failResult.evaluations.find(e => e.field === 'applicationFee.reserved');
    assert.equal(resFeeEval.status, 'FAIL');
  });

  it('1.8 evaluates active application window deadline (PASS when active, FAIL when expired)', () => {
    const activeResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { applicationEndDateMin: '2026-02-01' });
    const activeEval = activeResult.evaluations.find(e => e.field === 'importantDates.applicationEndDate');
    assert.equal(activeEval.status, 'PASS');

    const expiredResult = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { applicationEndDateMin: '2026-03-01' });
    const expiredEval = expiredResult.evaluations.find(e => e.field === 'importantDates.applicationEndDate');
    assert.equal(expiredEval.status, 'FAIL');
    assert.equal(expiredResult.overallVerdict, 'FAIL');
  });

  it('1.9 validates fully qualified general candidate as ELIGIBLE', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
    assert.equal(result.candidateEligibility.disqualifications.length, 0);
  });

  it('1.10 flags underage candidate as DISQUALIFIED', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.UNDERAGE_CANDIDATE
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('below the minimum') || d.includes('below minimum')));
  });

  it('1.11 flags overage general candidate as DISQUALIFIED', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_GENERAL_CANDIDATE
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('exceeds maximum')));
  });

  it('1.12 allows overage SC candidate within 5-year relaxation as ELIGIBLE', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_SC_ELIGIBLE_WITH_RELAXATION
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('1.13 flags overage SC candidate exceeding 5-year relaxation as DISQUALIFIED', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('1.14 allows overage OBC candidate within 3-year relaxation as ELIGIBLE', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('1.15 flags overage OBC candidate exceeding 3-year relaxation as DISQUALIFIED', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('1.16 statutory invariant: category relaxation NEVER reduces minAge requirement', () => {
    // Underage SC candidate (age 19, minAge 21). SC relaxation (+5) applies to maxAge only!
    const underageSc = createCustomCandidate({ age: 19, category: 'SC' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: underageSc });
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('below the minimum') || d.includes('below minimum')));
  });

  it('1.17 higher education degree satisfies lower requirement (Master / PhD satisfies Bachelor)', () => {
    const pgCand = createCustomCandidate({ education: 'Master of Science in Mathematics' });
    const result1 = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: pgCand });
    assert.equal(result1.candidateEligibility.isEligible, true);

    const phdCand = createCustomCandidate({ education: 'PhD in Computer Science' });
    const result2 = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: phdCand });
    assert.equal(result2.candidateEligibility.isEligible, true);
  });

  it('1.18 flags education requirement mismatch when candidate holds subordinate degree', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.MISSING_MANDATORY_EDUCATION_DISQUALIFIED
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('education') || d.includes('satisfy')));
  });

  it('1.19 stream matching allows any discipline when notification is open', () => {
    const artsCand = createCustomCandidate({ stream: 'History & Sanskrit' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: artsCand });
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('1.20 stream mismatch flags DISQUALIFIED on stream-restricted benchmark', () => {
    const techNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    techNotice.eligibility.eligibleStreams = ['Engineering', 'Computer Science'];
    const criteria = { candidate: MOCK_CANDIDATES.WRONG_STREAM_DISQUALIFIED };
    const result = verifyUnity(techNotice, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('stream')));
  });

  it('1.21 declarative rule registry evaluates required, equals, range, enum, dateOrder, regex, custom', () => {
    const reg = rules.defaultRegistry;

    // required
    const reqRes = reg.evaluate({ type: 'required', field: 'name' }, 'John');
    assert.equal(reqRes.status, 'PASS');
    const reqFail = reg.evaluate({ type: 'required', field: 'name' }, '');
    assert.equal(reqFail.status, 'FAIL');

    // equals
    const eqRes = reg.evaluate({ type: 'equals', expected: 'active', ignoreCase: true }, 'ACTIVE');
    assert.equal(eqRes.status, 'PASS');

    // range
    const rangeRes = reg.evaluate({ type: 'range', min: 10, max: 20 }, 15);
    assert.equal(rangeRes.status, 'PASS');
    const rangeFail = reg.evaluate({ type: 'range', min: 10, max: 20 }, 25);
    assert.equal(rangeFail.status, 'FAIL');

    // enum
    const enumRes = reg.evaluate({ type: 'enum', allowed: ['A', 'B'] }, 'A');
    assert.equal(enumRes.status, 'PASS');

    // dateOrder
    const dateRes = reg.evaluate(
      { type: 'dateOrder', beforeField: 'start', afterField: 'end' },
      null,
      { root: { start: '2026-01-01', end: '2026-02-01' } }
    );
    assert.equal(dateRes.status, 'PASS');

    // regex
    const regexRes = reg.evaluate({ type: 'regex', pattern: '^UPSC' }, 'UPSC CSE 2026');
    assert.equal(regexRes.status, 'PASS');

    // custom
    const customRes = reg.evaluate({ type: 'custom', fn: val => val % 2 === 0 }, 4);
    assert.equal(customRes.status, 'PASS');
  });

  it('1.22 console report formatting and printing functions execute cleanly', () => {
    const res = verifyUnity(MOCK_NOTIFICATION_FIXTURE, UPSC_BENCHMARK_CRITERIA);
    const report = formatUnityReport(res, { noColor: true });
    assert.equal(typeof report, 'string');
    assert.ok(report.includes('UNITY CHECK VERIFICATION REPORT'));
    assert.ok(report.includes('Scorecard'));

    // printUnityReport does not throw
    let logged = false;
    const origLog = console.log;
    console.log = () => { logged = true; };
    try {
      printUnityReport(res, { noColor: true });
      assert.equal(logged, true);
    } finally {
      console.log = origLog;
    }
  });
});

// =============================================================================
// TIER 2: BOUNDARY CONDITIONS & CORNER CASES
// =============================================================================
describe('Tier 2: Boundary Conditions & Corner Cases', () => {
  it('2.1 candidate at exact minimum age boundary (candidate.age === minAge) is ELIGIBLE', () => {
    const criteria = { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_MIN_AGE };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('2.2 candidate at exact maximum age boundary (candidate.age === maxAge) is ELIGIBLE', () => {
    const criteria = { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_MAX_AGE };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('2.3 candidate at exact maximum relaxed age boundary (candidate.age === maxAge + relaxation) is ELIGIBLE', () => {
    const criteria = { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_RELAXED_MAX_AGE };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('2.4 off-by-one under minimum age (candidate.age === minAge - 1) is DISQUALIFIED', () => {
    const cand = createCustomCandidate({ age: 20 });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('2.5 off-by-one over maximum age (candidate.age === maxAge + 1) for General is DISQUALIFIED', () => {
    const cand = createCustomCandidate({ age: 33, category: 'General' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('2.6 off-by-one over relaxed age (candidate.age === maxAge + relaxation + 1) for SC is DISQUALIFIED', () => {
    const cand = createCustomCandidate({ age: 38, category: 'SC' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('2.7 zero fee (0 INR) boundary handled correctly without treating 0 as falsy or null', () => {
    const zeroFeeNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    zeroFeeNotice.applicationFee.general = 0;
    const result = verifyUnity(zeroFeeNotice, { maxGeneralFee: 0 });
    const feeEval = result.evaluations.find(e => e.field === 'applicationFee.general');
    assert.ok(feeEval);
    assert.equal(feeEval.status, 'PASS');
    assert.equal(feeEval.actual, 0);
  });

  it('2.8 exact vacancy threshold equality (vacancies === minVacancies)', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { minVacancies: 1056 });
    const vacEval = result.evaluations.find(e => e.field === 'vacancies');
    assert.equal(vacEval.status, 'PASS');
  });

  it('2.9 vacancy off-by-one warning (vacancies === minVacancies - 1)', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { minVacancies: 1057 });
    const vacEval = result.evaluations.find(e => e.field === 'vacancies');
    assert.equal(vacEval.status, 'WARNING');
  });

  it('2.10 leap year calendar boundary (applicationEndDate: 2028-02-29)', () => {
    const leapNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    leapNotice.importantDates.applicationEndDate = '2028-02-29';
    const result = verifyUnity(leapNotice, { applicationEndDateMin: '2028-02-01' });
    const dateEval = result.evaluations.find(e => e.field === 'importantDates.applicationEndDate');
    assert.equal(dateEval.status, 'PASS');
  });

  it('2.11 same-day application window (applicationStartDate === applicationEndDate)', () => {
    const singleDayNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    singleDayNotice.importantDates.applicationStartDate = '2026-05-15';
    singleDayNotice.importantDates.applicationEndDate = '2026-05-15';
    const orderCheck = rules.evaluateDateOrder(
      { beforeField: 'applicationStartDate', afterField: 'applicationEndDate', allowEqual: true },
      null,
      { root: singleDayNotice.importantDates }
    );
    assert.equal(orderCheck.status, 'PASS');
  });

  it('2.12 empty education or stream lists in notification allow candidate unconditionally', () => {
    const openNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    openNotice.eligibility.requiredEducation = [];
    openNotice.eligibility.eligibleStreams = [];
    const candidate = createCustomCandidate({ education: 'Any Non-Standard Degree', stream: 'Any Stream' });
    const result = verifyUnity(openNotice, { candidate });
    assert.equal(result.candidateEligibility.isEligible, true);
  });
});

// =============================================================================
// TIER 3: NEGATIVE, CORRUPTED & ROBUSTNESS TESTING
// =============================================================================
describe('Tier 3: Negative, Corrupted & Robustness Testing', () => {
  it('3.1 handles null extractedData gracefully returning FAIL envelope without throwing', () => {
    const result = verifyUnity(null, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.summary.failedChecks, 1);
  });

  it('3.2 handles undefined extractedData gracefully returning FAIL envelope', () => {
    const result = verifyUnity(undefined, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'FAIL');
  });

  it('3.3 handles non-object primitive extractedData (number, boolean, string) safely', () => {
    for (const prim of [123, true, 'corrupted string']) {
      const result = verifyUnity(prim, UPSC_BENCHMARK_CRITERIA);
      assertUnityVerdictContract(result);
      assert.equal(result.overallVerdict, 'FAIL');
    }
  });

  it('3.4 handles null databaseCriteria gracefully returning WARNING envelope without throwing', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, null);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'WARNING');
  });

  it('3.5 handles empty criteria object {} returning neutral PASS envelope without throwing', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, {});
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.summary.totalChecks, 0);
  });

  it('3.6 handles completely blank extracted data (getEmptyCriteria()) without throwing', () => {
    const empty = getEmptyCriteria();
    const result = verifyUnity(empty, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'FAIL');
  });

  it('3.7 coerces string numeric age gracefully ("25" -> 25)', () => {
    const cand = createCustomCandidate({ age: '25' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('3.8 safely rejects NaN, Infinity, negative, and non-numeric age values', () => {
    for (const badAge of [NaN, Infinity, -5, 'not-a-number', {}]) {
      const cand = createCustomCandidate({ age: badAge, dob: null });
      const res = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
      assert.equal(res.candidateEligibility.isEligible, false);
    }
  });

  it('3.9 safely handles missing nested fields in extractedData', () => {
    const stripped = { examTitle: 'UNION PUBLIC SERVICE COMMISSION' };
    const result = verifyUnity(stripped, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
  });

  it('3.10 catches invalid calendar dates and rollovers in date parsing', () => {
    assert.equal(rules.parseIsoDateSafely('2026-02-31'), null);
    assert.equal(rules.parseIsoDateSafely('2025-02-29'), null); // Non-leap year
    assert.notEqual(rules.parseIsoDateSafely('2024-02-29'), null); // Leap year valid
    assert.equal(rules.parseIsoDateSafely('invalid-date'), null);
    assert.equal(rules.parseIsoDateSafely(null), null);
  });

  it('3.11 safely handles unknown candidate category by defaulting relaxation to 0', () => {
    const cand = createCustomCandidate({ age: 34, category: 'UNKNOWN_CATEGORY_XYZ' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    // Candidate age 34 > maxAge 32 and receives 0 relaxation
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('3.12 protects against prototype pollution in nested path resolution', () => {
    const payload = {};
    const res1 = rules.getNestedValue(payload, '__proto__.polluted');
    const res2 = rules.getNestedValue(payload, 'constructor.prototype.polluted');
    assert.equal(res1, undefined);
    assert.equal(res2, undefined);
  });

  it('3.13 automatically unwraps top-level Gemini envelope { success: true, isMock: false, data: { ... } }', () => {
    const envelope = {
      success: true,
      isMock: false,
      modelUsed: 'gemini-2.5-flash',
      data: JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE))
    };
    const result = verifyUnity(envelope, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'PASS');
  });
});

// =============================================================================
// TIER 4: REAL-WORLD BENCHMARK SCENARIOS
// =============================================================================
describe('Tier 4: Real-World Workload Scenarios', () => {
  it('4.1 evaluates full candidate batch against UPSC CSE 2026 notification fixture', () => {
    const batchExpectations = [
      { profile: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL, expectedEligible: true },
      { profile: MOCK_CANDIDATES.UNDERAGE_CANDIDATE, expectedEligible: false },
      { profile: MOCK_CANDIDATES.OVERAGE_GENERAL_CANDIDATE, expectedEligible: false },
      { profile: MOCK_CANDIDATES.OVERAGE_SC_ELIGIBLE_WITH_RELAXATION, expectedEligible: true },
      { profile: MOCK_CANDIDATES.OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION, expectedEligible: false },
      { profile: MOCK_CANDIDATES.OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION, expectedEligible: true },
      { profile: MOCK_CANDIDATES.OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION, expectedEligible: false },
      // UPSC CSE sample PDF does not contain PwBD clause, so 40yo PwBD candidate is disqualified here
      { profile: MOCK_CANDIDATES.PWBD_ELIGIBLE_WITH_RELAXATION, expectedEligible: false },
      { profile: MOCK_CANDIDATES.MISSING_MANDATORY_EDUCATION_DISQUALIFIED, expectedEligible: false },
      { profile: MOCK_CANDIDATES.EXACT_BOUNDARY_MIN_AGE, expectedEligible: true },
      { profile: MOCK_CANDIDATES.EXACT_BOUNDARY_MAX_AGE, expectedEligible: true },
      { profile: MOCK_CANDIDATES.EXACT_BOUNDARY_RELAXED_MAX_AGE, expectedEligible: true },
      { profile: MOCK_CANDIDATES.FEMALE_EXEMPT_FEE_CANDIDATE, expectedEligible: true },
      { profile: MOCK_CANDIDATES.MALFORMED_CANDIDATE_PROFILE, expectedEligible: false }
    ];

    for (const item of batchExpectations) {
      const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, { candidate: item.profile });
      const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
      assert.equal(
        result.candidateEligibility.isEligible,
        item.expectedEligible,
        `Candidate ${item.profile.name} (${item.profile.category}, age ${item.profile.age}) expected isEligible=${item.expectedEligible}`
      );
    }
  });

  it('4.2 evaluates PwBD candidate as ELIGIBLE when notification includes PwBD relaxation clause', () => {
    const noticeWithPwbd = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    noticeWithPwbd.eligibility.ageRelaxation.push({ category: 'PwBD', years: 10 });

    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.PWBD_ELIGIBLE_WITH_RELAXATION
    });

    const result = verifyUnity(noticeWithPwbd, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('4.3 evaluates Staff Selection Commission (SSC CGL 2026) multi-tiered benchmark', () => {
    const sscNotice = {
      examTitle: 'COMBINED GRADUATE LEVEL EXAMINATION 2026',
      organization: 'STAFF SELECTION COMMISSION',
      eligibility: {
        minAge: 18,
        maxAge: 30,
        ageRelaxation: [{ category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 }],
        requiredEducation: ["Bachelor's Degree from a recognized University"],
        eligibleStreams: ['Any Discipline']
      },
      importantDates: {
        applicationStartDate: '2026-06-01',
        applicationEndDate: '2026-07-15',
        examDate: '2026-09-10'
      },
      vacancies: 7500,
      applicationFee: { general: 100, reserved: 0 },
      status: 'ACTIVE'
    };

    const sscCriteria = Object.assign({}, SSC_CGL_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL
    });

    const result = verifyUnity(sscNotice, sscCriteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('4.4 evaluates Technical Engineering Services (IES 2026) stream filtering', () => {
    const iesNotice = {
      examTitle: 'ENGINEERING SERVICES EXAMINATION 2026',
      organization: 'UNION PUBLIC SERVICE COMMISSION',
      eligibility: {
        minAge: 21,
        maxAge: 30,
        ageRelaxation: [{ category: 'SC/ST', years: 5 }],
        requiredEducation: ['Bachelor of Technology', 'Bachelor of Engineering'],
        eligibleStreams: ['Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Computer Science']
      },
      importantDates: {
        applicationStartDate: '2026-09-01',
        applicationEndDate: '2026-10-01',
        examDate: '2027-02-15'
      },
      vacancies: 250,
      applicationFee: { general: 200, reserved: 0 },
      status: 'ACTIVE'
    };

    // Candidate with Engineering stream -> Eligible
    const engCand = createCustomCandidate({ education: 'B.Tech in Civil Engineering', stream: 'Civil Engineering', age: 26 });
    const res1 = verifyUnity(iesNotice, Object.assign({}, TECHNICAL_SERVICES_BENCHMARK_CRITERIA, { candidate: engCand }));
    assert.equal(res1.overallVerdict, 'PASS');
    assert.equal(res1.candidateEligibility.isEligible, true);

    // Candidate with Arts stream -> Disqualified
    const artsCand = createCustomCandidate({ education: 'B.A. in History', stream: 'History', age: 26 });
    const res2 = verifyUnity(iesNotice, Object.assign({}, TECHNICAL_SERVICES_BENCHMARK_CRITERIA, { candidate: artsCand }));
    assert.equal(res2.overallVerdict, 'FAIL');
    assert.equal(res2.candidateEligibility.isEligible, false);
  });

  it('4.5 evaluates IBPS PO banking recruitment benchmark preset', () => {
    const ibpsNotice = {
      examTitle: 'COMMON RECRUITMENT PROCESS FOR PROBATIONARY OFFICERS',
      organization: 'INSTITUTE OF BANKING PERSONNEL SELECTION',
      eligibility: {
        minAge: 20,
        maxAge: 30,
        ageRelaxation: [{ category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 }],
        requiredEducation: ['Graduation in any discipline'],
        eligibleStreams: ['Any Discipline']
      },
      importantDates: {
        applicationStartDate: '2026-08-01',
        applicationEndDate: '2026-08-28',
        examDate: '2026-10-15'
      },
      vacancies: 3500,
      applicationFee: { general: 850, reserved: 175 },
      status: 'ACTIVE'
    };

    const criteria = getBenchmarkCriteria('IBPS');
    const result = verifyUnity(ibpsNotice, criteria);
    assert.equal(result.overallVerdict, 'PASS');
  });

  it('4.6 end-to-end co-validation: raw mock extraction verified cleanly by unity checker', () => {
    const extracted = MOCK_NOTIFICATION_FIXTURE;
    const criteria = UPSC_BENCHMARK_CRITERIA;
    const result = verifyUnity(extracted, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.summary.failedChecks, 0);
    assert.ok(result.summary.passedChecks >= 5);
  });
});

// =============================================================================
// TIER 5: ADVERSARIAL REGRESSION & EDGE-CASE REMEDIATION SUITE
// =============================================================================
describe('Tier 5: Adversarial Regression & Edge-Case Remediation Suite', () => {
  it('5.1 eliminates vacuous substring match: null/empty organization or examTitle returns FAIL', () => {
    const resOrg = verifyUnity({ organization: null }, { organization: 'UNION PUBLIC SERVICE COMMISSION' });
    assert.equal(resOrg.overallVerdict, 'FAIL');
    assert.equal(resOrg.evaluations[0].field, 'organization');
    assert.equal(resOrg.evaluations[0].status, 'FAIL');

    const resTitle = verifyUnity({ examTitle: '' }, { examTitle: 'CIVIL SERVICES' });
    assert.equal(resTitle.overallVerdict, 'FAIL');
    assert.equal(resTitle.evaluations[0].field, 'examTitle');
    assert.equal(resTitle.evaluations[0].status, 'FAIL');

    const resBothNull = verifyUnity({}, { organization: 'UPSC', examTitle: 'CIVIL SERVICES' });
    assert.equal(resBothNull.overallVerdict, 'FAIL');
    assert.equal(resBothNull.summary.failedChecks, 2);
  });

  it('5.2 prevents category relaxation substring traps for SC, ST, OBC, and Creamy Layer', () => {
    const { resolveRelaxationYears } = rules;
    const rulesList = [
      { category: 'SC', years: 5 },
      { category: 'ST', years: 5 },
      { category: 'OBC', years: 3 }
    ];

    // Arbitrary words containing 'sc'/'st' must NOT match
    assert.equal(resolveRelaxationYears('Descendant of Freedom Fighter', rulesList), 0);
    assert.equal(resolveRelaxationYears('Staff Candidate', rulesList), 0);
    assert.equal(resolveRelaxationYears('School Quota', rulesList), 0);
    assert.equal(resolveRelaxationYears('Non-OBC', rulesList), 0);

    // OBC Creamy Layer (OBC-CL) must receive 0 years
    assert.equal(resolveRelaxationYears('OBC-CL', rulesList), 0);
    assert.equal(resolveRelaxationYears('OBC (Creamy Layer)', rulesList), 0);

    // Legitimate categories
    assert.equal(resolveRelaxationYears('OBC-NCL', rulesList), 3);
    assert.equal(resolveRelaxationYears('SC', rulesList), 5);
    assert.equal(resolveRelaxationYears('ST', rulesList), 5);

    // Disentangled SC vs ST rules
    assert.equal(resolveRelaxationYears('SC', [{ category: 'ST', years: 8 }]), 0);
    assert.equal(resolveRelaxationYears('ST', [{ category: 'SC', years: 5 }]), 0);
    assert.equal(resolveRelaxationYears('SC', [{ category: 'SC/ST', years: 5 }]), 5);
  });

  it('5.3 prevents education level inflation on short acronyms and recognizes BE degree', () => {
    const { getEducationLevel, matchesEducation } = rules;

    // Word boundary checks prevent false substring upgrades
    assert.equal(getEducationLevel('Embedded Systems Diploma'), 3);
    assert.equal(getEducationLevel('Ballroom Dance Certificate'), 0);
    assert.equal(getEducationLevel('Upgrade Certificate'), 0);

    // BE degree without dots recognized as Level 4 Bachelor
    assert.equal(getEducationLevel('BE in Civil'), 4);
    assert.equal(getEducationLevel('B.E. in Civil'), 4);

    const engCheck = matchesEducation('BE in Civil', ['B.E.', 'B.Tech', 'Bachelor of Engineering']);
    assert.equal(engCheck.matches, true);

    // Specialized domain mismatch prevention
    const artsVsEng = matchesEducation('B.A. in History', ['Bachelor of Engineering in Civil Engineering']);
    assert.equal(artsVsEng.matches, false);

    const medVsEng = matchesEducation('MBBS', ['B.Tech in Computer Science']);
    assert.equal(medVsEng.matches, false);
  });

  it('5.4 flags candidate age <= 0 as DISQUALIFIED with positive integer reason', () => {
    const noMinNotice = {
      eligibility: { minAge: null, maxAge: 35, requiredEducation: [], eligibleStreams: [] }
    };

    const infantCand = createCustomCandidate({ age: 0 });
    const resInfant = verifyUnity(noMinNotice, { candidate: infantCand });
    assert.equal(resInfant.candidateEligibility.isEligible, false);
    assert.ok(resInfant.candidateEligibility.disqualifications.some(d => d.includes('positive integer')));

    const negCand = createCustomCandidate({ age: -3 });
    const resNeg = verifyUnity(noMinNotice, { candidate: negCand });
    assert.equal(resNeg.candidateEligibility.isEligible, false);
    assert.ok(resNeg.candidateEligibility.disqualifications.some(d => d.includes('positive integer')));
  });

  it('5.5 evaluates maxReservedFee as WARNING when notification omits reserved fee', () => {
    const res = verifyUnity({ applicationFee: { general: 100, reserved: null } }, { maxReservedFee: 0 });
    assert.equal(res.evaluations.length, 1);
    assert.equal(res.evaluations[0].field, 'applicationFee.reserved');
    assert.equal(res.evaluations[0].status, 'WARNING');
    assert.equal(res.overallVerdict, 'WARNING');
  });

  it('5.6 blocks prototype property inheritance in getNestedValue', () => {
    const { getNestedValue } = rules;
    assert.equal(getNestedValue({}, 'toString'), undefined);
    assert.equal(getNestedValue({}, 'valueOf'), undefined);
    assert.equal(getNestedValue({ toString: 'custom' }, 'toString'), 'custom');
  });

  it('5.7 formatting functions are resilient against null, undefined, primitives, and BigInt/Symbols', () => {
    assert.equal(typeof formatUnityReport(null), 'string');
    assert.equal(typeof formatUnityReport(undefined), 'string');
    assert.equal(typeof formatUnityReport({}), 'string');
    assert.equal(typeof formatUnityReport({ overallVerdict: 'FAIL' }), 'string');
    assert.equal(typeof formatUnityReport({ summary: null }), 'string');
    assert.equal(typeof formatUnityReport({ evaluations: null }), 'string');
    assert.equal(typeof formatUnityReport({ evaluations: [null] }), 'string');
    assert.equal(typeof formatUnityReport({ candidateEligibility: null }), 'string');
    assert.equal(typeof formatUnityReport({ evaluations: [{ status: 'FAIL' }] }), 'string');

    // printUnityReport executes without throwing
    assert.doesNotThrow(() => printUnityReport(null));
    assert.doesNotThrow(() => printUnityReport({}));
    assert.doesNotThrow(() => printUnityReport({ summary: null }));
  });
});
