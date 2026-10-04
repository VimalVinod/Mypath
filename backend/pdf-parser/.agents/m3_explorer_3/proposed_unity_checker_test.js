'use strict';

/**
 * .agents/m3_explorer_3/proposed_unity_checker_test.js
 * Prototype verification of the proposed test suite architecture for test/unity-checker.test.js.
 * Demonstrates Tiers 1-4 coverage and validates fixtures/mock-criteria.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  BENCHMARK_CRITERIA,
  UPSC_BENCHMARK_CRITERIA,
  SSC_CGL_BENCHMARK_CRITERIA,
  TECHNICAL_SERVICES_BENCHMARK_CRITERIA,
  MOCK_CANDIDATES,
  createCustomCriteria,
  createCustomCandidate
} = require('./proposed_mock_criteria');

const { MOCK_NOTIFICATION_FIXTURE, getEmptyCriteria } = require('../../src/services/ai/mock-gemini');

// Load prototype validator from m3_explorer_2
// For verification, we dynamically load or implement the unity engine contract
const pathValidator = path.resolve(__dirname, '../m3_explorer_2/test_unity_prototype.js');

// Helper to assert Interface Contract #3 structure
function assertUnityVerdictContract(result) {
  assert.ok(result !== null && typeof result === 'object', 'result must be non-null object');
  assert.ok(['PASS', 'FAIL', 'WARNING'].includes(result.overallVerdict), `Invalid verdict: ${result.overallVerdict}`);
  assert.ok(result.summary && typeof result.summary === 'object', 'summary must be object');
  assert.equal(typeof result.summary.totalChecks, 'number', 'totalChecks must be number');
  assert.equal(typeof result.summary.passedChecks, 'number', 'passedChecks must be number');
  assert.equal(typeof result.summary.failedChecks, 'number', 'failedChecks must be number');
  assert.equal(typeof result.summary.warningChecks, 'number', 'warningChecks must be number');
  assert.equal(typeof result.summary.passRate, 'number', 'passRate must be number');
  assert.ok(Array.isArray(result.evaluations), 'evaluations must be array');
  assert.ok(result.candidateEligibility && typeof result.candidateEligibility === 'object', 'candidateEligibility must be object');
  assert.equal(typeof result.candidateEligibility.isEligible, 'boolean', 'isEligible must be boolean');
  assert.ok(Array.isArray(result.candidateEligibility.disqualifications), 'disqualifications must be array');
  assert.ok(Array.isArray(result.candidateEligibility.matchedQualifications), 'matchedQualifications must be array');
}

// Inline engine matching m3_explorer_2 specification for standalone test execution
function verifyUnity(extractedData, databaseCriteria) {
  if (!extractedData || typeof extractedData !== 'object') {
    return {
      overallVerdict: 'FAIL',
      summary: { totalChecks: 1, passedChecks: 0, failedChecks: 1, warningChecks: 0, passRate: 0 },
      evaluations: [{ field: '_extractedData', expected: 'Object', actual: extractedData, status: 'FAIL', reason: 'Null or invalid extracted data' }],
      candidateEligibility: { isEligible: false, disqualifications: ['Extracted data is missing'], matchedQualifications: [] }
    };
  }

  const data = extractedData.data && typeof extractedData.data === 'object' && !extractedData.examTitle ? extractedData.data : extractedData;

  if (!databaseCriteria || typeof databaseCriteria !== 'object') {
    return {
      overallVerdict: 'WARNING',
      summary: { totalChecks: 1, passedChecks: 0, failedChecks: 0, warningChecks: 1, passRate: 0 },
      evaluations: [{ field: '_databaseCriteria', expected: 'Object', actual: databaseCriteria, status: 'WARNING', reason: 'No criteria provided' }],
      candidateEligibility: { isEligible: true, disqualifications: [], matchedQualifications: ['No candidate provided'] }
    };
  }

  const evaluations = [];
  const disqualifications = [];
  const matchedQualifications = [];
  let candidateEvaluated = false;

  // 1. Document Benchmark Checks
  if (databaseCriteria.organization) {
    const actOrg = (data.organization || '').toUpperCase();
    const expOrg = String(databaseCriteria.organization).toUpperCase();
    const pass = actOrg.includes(expOrg) || expOrg.includes(actOrg);
    evaluations.push({
      field: 'organization',
      expected: databaseCriteria.organization,
      actual: data.organization,
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? `Organization matches '${databaseCriteria.organization}'` : `Expected organization '${databaseCriteria.organization}' but found '${data.organization}'`
    });
  }

  if (databaseCriteria.examTitle) {
    const actTitle = (data.examTitle || '').toUpperCase();
    const expTitle = String(databaseCriteria.examTitle).toUpperCase();
    const pass = actTitle.includes(expTitle) || expTitle.includes(actTitle);
    evaluations.push({
      field: 'examTitle',
      expected: databaseCriteria.examTitle,
      actual: data.examTitle,
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? `Exam title matches '${databaseCriteria.examTitle}'` : `Expected exam title '${databaseCriteria.examTitle}' but found '${data.examTitle}'`
    });
  }

  if (databaseCriteria.minVacancies !== undefined) {
    const vac = typeof data.vacancies === 'number' ? data.vacancies : null;
    const pass = vac !== null && vac >= databaseCriteria.minVacancies;
    evaluations.push({
      field: 'vacancies',
      expected: `>= ${databaseCriteria.minVacancies}`,
      actual: vac,
      status: pass ? 'PASS' : 'WARNING',
      reason: pass ? `Vacancies ${vac} meet minimum threshold ${databaseCriteria.minVacancies}` : `Vacancies ${vac} below required ${databaseCriteria.minVacancies}`
    });
  }

  if (databaseCriteria.maxGeneralFee !== undefined) {
    const fee = data.applicationFee ? data.applicationFee.general : null;
    const pass = fee !== null && fee <= databaseCriteria.maxGeneralFee;
    evaluations.push({
      field: 'applicationFee.general',
      expected: `<= ${databaseCriteria.maxGeneralFee}`,
      actual: fee,
      status: pass ? 'PASS' : 'WARNING',
      reason: pass ? `Fee ${fee} satisfies maximum cap ${databaseCriteria.maxGeneralFee}` : `Fee ${fee} exceeds cap ${databaseCriteria.maxGeneralFee}`
    });
  }

  if (databaseCriteria.applicationEndDateMin !== undefined) {
    const end = data.importantDates ? data.importantDates.applicationEndDate : null;
    const pass = end && end >= databaseCriteria.applicationEndDateMin;
    evaluations.push({
      field: 'importantDates.applicationEndDate',
      expected: `>= ${databaseCriteria.applicationEndDateMin}`,
      actual: end,
      status: pass ? 'PASS' : 'FAIL',
      reason: pass ? `Application deadline ${end} active` : `Deadline ${end} expired or invalid`
    });
  }

  // 2. Candidate Eligibility Checks
  const cand = databaseCriteria.candidate;
  if (cand && typeof cand === 'object') {
    candidateEvaluated = true;
    const elig = data.eligibility || {};

    // Safe age check
    let candAge = typeof cand.age === 'number' && Number.isFinite(cand.age) ? cand.age : null;
    if (candAge === null && typeof cand.age === 'string' && cand.age.trim() !== '') {
      const parsed = Number(cand.age.trim());
      if (Number.isFinite(parsed)) candAge = parsed;
    }

    if (candAge === null || candAge < 0) {
      disqualifications.push('Candidate age is missing, invalid, or negative');
      evaluations.push({ field: 'candidate.age', expected: 'Valid positive number', actual: cand.age, status: 'FAIL', reason: 'Invalid candidate age' });
    } else {
      const minAge = typeof elig.minAge === 'number' ? elig.minAge : null;
      const maxAge = typeof elig.maxAge === 'number' ? elig.maxAge : null;

      // Category relaxation
      let relaxation = 0;
      const candCat = String(cand.category || 'General').toUpperCase();
      if (Array.isArray(elig.ageRelaxation)) {
        for (const rel of elig.ageRelaxation) {
          const relCat = String(rel.category || '').toUpperCase();
          if (relCat.includes(candCat) || (candCat === 'SC' && relCat.includes('SC')) || (candCat === 'ST' && relCat.includes('ST')) || (candCat === 'OBC' && relCat.includes('OBC')) || (candCat === 'PWBD' && relCat.includes('PWBD'))) {
            relaxation = Math.max(relaxation, typeof rel.years === 'number' ? rel.years : 0);
          }
        }
      }

      const effectiveMaxAge = maxAge !== null ? maxAge + relaxation : null;

      if (minAge !== null && candAge < minAge) {
        disqualifications.push(`Candidate age (${candAge}) is below minimum requirement of ${minAge}`);
        evaluations.push({ field: 'candidate.age', expected: `>= ${minAge}`, actual: candAge, status: 'FAIL', reason: `Underage: ${candAge} < ${minAge}` });
      } else if (effectiveMaxAge !== null && candAge > effectiveMaxAge) {
        disqualifications.push(`Candidate age (${candAge}) exceeds maximum limit of ${effectiveMaxAge} (base ${maxAge} + ${relaxation} yrs ${candCat} relaxation)`);
        evaluations.push({ field: 'candidate.age', expected: `<= ${effectiveMaxAge}`, actual: candAge, status: 'FAIL', reason: `Overage: ${candAge} > ${effectiveMaxAge}` });
      } else {
        matchedQualifications.push(`Candidate age (${candAge}) is within eligible range [${minAge || 'none'} - ${effectiveMaxAge || 'none'}]`);
        evaluations.push({ field: 'candidate.age', expected: `[${minAge || 18} - ${effectiveMaxAge || 65}]`, actual: candAge, status: 'PASS', reason: `Age ${candAge} eligible` });
      }
    }

    // Education check
    const candEdu = String(cand.education || cand.degree || '').toLowerCase();
    const reqEdu = Array.isArray(elig.requiredEducation) ? elig.requiredEducation : [];
    if (reqEdu.length > 0) {
      if (!candEdu) {
        disqualifications.push('Candidate education qualification is missing');
        evaluations.push({ field: 'candidate.education', expected: reqEdu, actual: null, status: 'FAIL', reason: 'Missing education' });
      } else {
        const isGrad = /bachelor|graduate|graduation|b\.tech|b\.e|b\.sc|b\.com|b\.a|mbbs|degree/i.test(candEdu);
        const isPostGrad = /master|postgraduate|m\.tech|m\.e|m\.sc|m\.com|m\.a|mba|doctorate|phd/i.test(candEdu);
        let match = false;
        for (const req of reqEdu) {
          const rLow = req.toLowerCase();
          if (rLow.includes('bachelor') || rLow.includes('graduation') || rLow.includes('degree')) {
            if (isGrad || isPostGrad) { match = true; break; }
          } else if (rLow.includes('10+2') || rLow.includes('higher secondary')) {
            if (isGrad || isPostGrad || /10\+2|12th/i.test(candEdu)) { match = true; break; }
          } else if (rLow.includes('10th') || rLow.includes('matriculation')) {
            match = true; break;
          }
        }
        if (match) {
          matchedQualifications.push(`Candidate education '${cand.education || cand.degree}' meets requirement`);
          evaluations.push({ field: 'candidate.education', expected: reqEdu, actual: cand.education || cand.degree, status: 'PASS', reason: 'Education requirement met' });
        } else {
          disqualifications.push(`Candidate education '${cand.education || cand.degree}' does not meet requirements`);
          evaluations.push({ field: 'candidate.education', expected: reqEdu, actual: cand.education || cand.degree, status: 'FAIL', reason: 'Education below requirement' });
        }
      }
    }

    // Stream check
    const candStream = cand.stream ? String(cand.stream).toLowerCase() : '';
    const eligStreams = Array.isArray(elig.eligibleStreams) ? elig.eligibleStreams : [];
    if (eligStreams.length > 0) {
      const isOpen = eligStreams.some(s => /any|all/i.test(s));
      if (isOpen) {
        matchedQualifications.push(`Stream accepted (Open to all disciplines)`);
        evaluations.push({ field: 'candidate.stream', expected: eligStreams, actual: cand.stream, status: 'PASS', reason: 'Open stream' });
      } else {
        const streamMatch = candStream && eligStreams.some(s => s.toLowerCase().includes(candStream) || candStream.includes(s.toLowerCase()));
        if (streamMatch) {
          matchedQualifications.push(`Candidate stream '${cand.stream}' matches eligible streams`);
          evaluations.push({ field: 'candidate.stream', expected: eligStreams, actual: cand.stream, status: 'PASS', reason: 'Stream matched' });
        } else {
          disqualifications.push(`Candidate stream '${cand.stream}' not in eligible streams`);
          evaluations.push({ field: 'candidate.stream', expected: eligStreams, actual: cand.stream, status: 'FAIL', reason: 'Stream mismatch' });
        }
      }
    }
  }

  // Summary Metrics
  const totalChecks = evaluations.length;
  const passedChecks = evaluations.filter(e => e.status === 'PASS').length;
  const failedChecks = evaluations.filter(e => e.status === 'FAIL').length;
  const warningChecks = evaluations.filter(e => e.status === 'WARNING').length;
  const passRate = totalChecks > 0 ? parseFloat(((passedChecks / totalChecks) * 100).toFixed(2)) : 100;

  const isEligible = candidateEvaluated ? disqualifications.length === 0 : true;

  let overallVerdict = 'PASS';
  if (failedChecks > 0 || !isEligible) {
    overallVerdict = 'FAIL';
  } else if (warningChecks > 0) {
    overallVerdict = 'WARNING';
  }

  return {
    overallVerdict,
    summary: { totalChecks, passedChecks, failedChecks, warningChecks, passRate },
    evaluations,
    candidateEligibility: {
      isEligible,
      disqualifications,
      matchedQualifications
    }
  };
}

// =============================================================================
// TIER 1: FEATURE COVERAGE TESTS
// =============================================================================
describe('Tier 1: Feature Coverage (Rules in Isolation & Contract Compliance)', () => {
  it('1.1 verifyUnity conforms strictly to Interface Contract #3 output shape', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
  });

  it('1.2 correctly matches organization and examTitle benchmarks', () => {
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
    assert.equal(orgEval.status, 'FAIL');
  });

  it('1.4 validates fully qualified general candidate as ELIGIBLE', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
    assert.equal(result.candidateEligibility.disqualifications.length, 0);
  });

  it('1.5 flags underage candidate as DISQUALIFIED', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.UNDERAGE_CANDIDATE
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('below minimum')));
  });

  it('1.6 flags overage general candidate as DISQUALIFIED', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_GENERAL_CANDIDATE
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('exceeds maximum')));
  });

  it('1.7 allows overage SC candidate within 5-year relaxation as ELIGIBLE', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_SC_ELIGIBLE_WITH_RELAXATION
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('1.8 allows overage OBC candidate within 3-year relaxation as ELIGIBLE', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'PASS');
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('1.9 flags education requirement mismatch when candidate lacks graduate degree', () => {
    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.MISSING_MANDATORY_EDUCATION_DISQUALIFIED
    });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('education')));
  });

  it('1.10 flags stream mismatch on stream-restricted technical benchmark', () => {
    const techCriteria = Object.assign({}, TECHNICAL_SERVICES_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.WRONG_STREAM_DISQUALIFIED
    });
    // Create technical notification fixture requiring engineering stream
    const techNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    techNotice.eligibility.eligibleStreams = ['Engineering', 'Computer Science'];
    const result = verifyUnity(techNotice, techCriteria);
    assert.equal(result.overallVerdict, 'FAIL');
    assert.equal(result.candidateEligibility.isEligible, false);
    assert.ok(result.candidateEligibility.disqualifications.some(d => d.includes('stream')));
  });
});

// =============================================================================
// TIER 2: BOUNDARY CONDITIONS
// =============================================================================
describe('Tier 2: Boundary Conditions & Corner Cases', () => {
  it('2.1 candidate at exact minimum age (21) is ELIGIBLE', () => {
    const criteria = { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_MIN_AGE };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('2.2 candidate at exact maximum age (32 for General) is ELIGIBLE', () => {
    const criteria = { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_MAX_AGE };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('2.3 candidate at exact maximum relaxed age (37 for SC) is ELIGIBLE', () => {
    const criteria = { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_RELAXED_MAX_AGE };
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('2.4 off-by-one: candidate age 20 (minAge 21 - 1) is DISQUALIFIED', () => {
    const cand = createCustomCandidate({ age: 20 });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('2.5 off-by-one: candidate age 33 (maxAge 32 + 1) for General is DISQUALIFIED', () => {
    const cand = createCustomCandidate({ age: 33, category: 'General' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('2.6 off-by-one: candidate age 38 (maxAge 32 + 5 + 1) for SC is DISQUALIFIED', () => {
    const cand = createCustomCandidate({ age: 38, category: 'SC' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, false);
  });

  it('2.7 handles zero fee (0 INR) boundary without treating 0 as falsy/missing', () => {
    const noticeWithZeroFee = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    noticeWithZeroFee.applicationFee.general = 0;
    const result = verifyUnity(noticeWithZeroFee, { maxGeneralFee: 0 });
    const feeEval = result.evaluations.find(e => e.field === 'applicationFee.general');
    assert.equal(feeEval.status, 'PASS');
    assert.equal(feeEval.actual, 0);
  });

  it('2.8 handles exact vacancy threshold equality (vacancies === minVacancies)', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { minVacancies: 1056 });
    const vacEval = result.evaluations.find(e => e.field === 'vacancies');
    assert.equal(vacEval.status, 'PASS');
  });

  it('2.9 handles leap year dates gracefully', () => {
    const leapNotice = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    leapNotice.importantDates.applicationEndDate = '2028-02-29';
    const result = verifyUnity(leapNotice, { applicationEndDateMin: '2028-02-01' });
    const dateEval = result.evaluations.find(e => e.field === 'importantDates.applicationEndDate');
    assert.equal(dateEval.status, 'PASS');
  });
});

// =============================================================================
// TIER 3: NEGATIVE & ROBUSTNESS TESTS
// =============================================================================
describe('Tier 3: Negative, Corrupted & Robustness Testing', () => {
  it('3.1 handles null extractedData gracefully returning FAIL verdict', () => {
    const result = verifyUnity(null, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'FAIL');
  });

  it('3.2 handles undefined extractedData gracefully returning FAIL verdict', () => {
    const result = verifyUnity(undefined, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'FAIL');
  });

  it('3.3 handles null databaseCriteria gracefully returning WARNING verdict', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, null);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'WARNING');
  });

  it('3.4 handles empty criteria object {} without unhandled exceptions', () => {
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, {});
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'PASS');
  });

  it('3.5 handles completely empty criteria data (getEmptyCriteria()) without throwing', () => {
    const empty = getEmptyCriteria();
    const result = verifyUnity(empty, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
    assert.equal(result.overallVerdict, 'FAIL');
  });

  it('3.6 handles string numeric age coerces gracefully ("25" -> 25)', () => {
    const cand = createCustomCandidate({ age: '25' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('3.7 safely rejects NaN and negative age values in candidate profile', () => {
    const nanCand = createCustomCandidate({ age: NaN });
    const nanRes = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: nanCand });
    assert.equal(nanRes.candidateEligibility.isEligible, false);

    const negCand = createCustomCandidate({ age: -5 });
    const negRes = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: negCand });
    assert.equal(negRes.candidateEligibility.isEligible, false);
  });

  it('3.8 safely handles missing nested fields in extractedData', () => {
    const stripped = { examTitle: 'Test Exam' }; // No eligibility, dates, fee
    const result = verifyUnity(stripped, UPSC_BENCHMARK_CRITERIA);
    assertUnityVerdictContract(result);
  });

  it('3.9 safely handles unknown candidate category defaulting to General', () => {
    const cand = createCustomCandidate({ age: 34, category: 'UNKNOWN_CATEGORY_XYZ' });
    const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, { candidate: cand });
    // Age 34 > maxAge 32 and no relaxation => disqualified
    assert.equal(result.candidateEligibility.isEligible, false);
  });
});

// =============================================================================
// TIER 4: REAL-WORLD BENCHMARK SCENARIOS
// =============================================================================
describe('Tier 4: Real-World Benchmark Scenarios', () => {
  it('4.1 evaluates full candidate batch against UPSC CSE 2026 notification fixture', () => {
    const batchExpectations = [
      { candidate: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL, expectedEligible: true },
      { candidate: MOCK_CANDIDATES.UNDERAGE_CANDIDATE, expectedEligible: false },
      { candidate: MOCK_CANDIDATES.OVERAGE_GENERAL_CANDIDATE, expectedEligible: false },
      { candidate: MOCK_CANDIDATES.OVERAGE_SC_ELIGIBLE_WITH_RELAXATION, expectedEligible: true },
      { candidate: MOCK_CANDIDATES.OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION, expectedEligible: false },
      { candidate: MOCK_CANDIDATES.OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION, expectedEligible: true },
      { candidate: MOCK_CANDIDATES.OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION, expectedEligible: false },
      // Note: MOCK_NOTIFICATION_FIXTURE only has SC/ST and OBC relaxations. Without PwBD clause, PwBD candidate is disqualified.
      { candidate: MOCK_CANDIDATES.PWBD_ELIGIBLE_WITH_RELAXATION, expectedEligible: false },
      { candidate: MOCK_CANDIDATES.MISSING_MANDATORY_EDUCATION_DISQUALIFIED, expectedEligible: false },
      { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_MIN_AGE, expectedEligible: true },
      { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_MAX_AGE, expectedEligible: true },
      { candidate: MOCK_CANDIDATES.EXACT_BOUNDARY_RELAXED_MAX_AGE, expectedEligible: true }
    ];

    for (const item of batchExpectations) {
      const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, { candidate: item.candidate });
      const result = verifyUnity(MOCK_NOTIFICATION_FIXTURE, criteria);
      assert.equal(
        result.candidateEligibility.isEligible,
        item.expectedEligible,
        `Candidate ${item.candidate.name} (${item.candidate.category}, age ${item.candidate.age}) expected isEligible=${item.expectedEligible}`
      );
    }
  });

  it('4.2 evaluates PwBD candidate as ELIGIBLE when notification includes PwBD relaxation', () => {
    const noticeWithPwbd = JSON.parse(JSON.stringify(MOCK_NOTIFICATION_FIXTURE));
    noticeWithPwbd.eligibility.ageRelaxation.push({ category: 'PwBD', years: 10 });

    const criteria = Object.assign({}, UPSC_BENCHMARK_CRITERIA, {
      candidate: MOCK_CANDIDATES.PWBD_ELIGIBLE_WITH_RELAXATION
    });

    const result = verifyUnity(noticeWithPwbd, criteria);
    assert.equal(result.candidateEligibility.isEligible, true);
  });

  it('4.3 evaluates SSC CGL notification against graduate candidate', () => {
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
});
