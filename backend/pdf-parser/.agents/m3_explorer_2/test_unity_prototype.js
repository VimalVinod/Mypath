'use strict';

/**
 * .agents/m3_explorer_2/test_unity_prototype.js
 * Prototype testing of verifyUnity engine architecture and edge cases.
 */

const { normalizeCriteriaData } = require('../../src/services/ai/gemini-parser');
const { MOCK_NOTIFICATION_FIXTURE } = require('../../src/services/ai/mock-gemini');

// Mock rules implementation to test unity-checker interaction
function evaluateRule(field, expected, actual, ruleType, options = {}) {
  const severity = options.severity || 'CRITICAL';
  
  if (expected === undefined) {
    return null; // No expectation specified
  }

  // Exact match
  if (ruleType === 'exact') {
    const match = expected === actual;
    return {
      field,
      expected,
      actual,
      status: match ? 'PASS' : (severity === 'CRITICAL' ? 'FAIL' : 'WARNING'),
      reason: match ? `Field matches expected value` : `Expected '${expected}' but found '${actual}'`
    };
  }

  // Min numeric
  if (ruleType === 'min') {
    if (actual === null || actual === undefined) {
      return {
        field,
        expected: `>= ${expected}`,
        actual,
        status: severity === 'CRITICAL' ? 'FAIL' : 'WARNING',
        reason: `Value is missing or null (expected >= ${expected})`
      };
    }
    const match = actual >= expected;
    return {
      field,
      expected: `>= ${expected}`,
      actual,
      status: match ? 'PASS' : (severity === 'CRITICAL' ? 'FAIL' : 'WARNING'),
      reason: match ? `Value ${actual} satisfies minimum threshold ${expected}` : `Value ${actual} is below minimum required ${expected}`
    };
  }

  // Max numeric
  if (ruleType === 'max') {
    if (actual === null || actual === undefined) {
      return {
        field,
        expected: `<= ${expected}`,
        actual,
        status: severity === 'CRITICAL' ? 'FAIL' : 'WARNING',
        reason: `Value is missing or null (expected <= ${expected})`
      };
    }
    const match = actual <= expected;
    return {
      field,
      expected: `<= ${expected}`,
      actual,
      status: match ? 'PASS' : (severity === 'CRITICAL' ? 'FAIL' : 'WARNING'),
      reason: match ? `Value ${actual} satisfies maximum limit ${expected}` : `Value ${actual} exceeds maximum limit ${expected}`
    };
  }

  // Substring / regex contains
  if (ruleType === 'contains') {
    if (typeof actual !== 'string') {
      return {
        field,
        expected: `contains '${expected}'`,
        actual,
        status: severity === 'CRITICAL' ? 'FAIL' : 'WARNING',
        reason: `Actual value is not a string`
      };
    }
    const match = actual.toLowerCase().includes(String(expected).toLowerCase());
    return {
      field,
      expected: `contains '${expected}'`,
      actual,
      status: match ? 'PASS' : (severity === 'CRITICAL' ? 'FAIL' : 'WARNING'),
      reason: match ? `Value contains '${expected}'` : `Value '${actual}' does not contain expected substring '${expected}'`
    };
  }

  // Set / Enum inclusion
  if (ruleType === 'in') {
    const allowed = Array.isArray(expected) ? expected : [expected];
    const match = allowed.includes(actual);
    return {
      field,
      expected: allowed,
      actual,
      status: match ? 'PASS' : (severity === 'CRITICAL' ? 'FAIL' : 'WARNING'),
      reason: match ? `Value '${actual}' is among accepted values` : `Value '${actual}' is not in allowed list: ${JSON.stringify(allowed)}`
    };
  }

  return null;
}

/**
 * Prototype verifyUnity implementation
 */
function verifyUnity(extractedData, databaseCriteria) {
  // 1. Input Normalization & Null Safety
  if (!extractedData || typeof extractedData !== 'object') {
    return {
      overallVerdict: 'FAIL',
      summary: { totalChecks: 1, passedChecks: 0, failedChecks: 1, warningChecks: 0, passRate: 0 },
      evaluations: [{
        field: '_extractedData',
        expected: 'Valid object conforming to Interface Contract #2',
        actual: extractedData,
        status: 'FAIL',
        reason: 'Extracted data is null, undefined, or not an object'
      }],
      candidateEligibility: {
        isEligible: false,
        disqualifications: ['No extracted data available to evaluate candidate eligibility'],
        matchedQualifications: []
      }
    };
  }

  // Unwrap envelope if passed directly
  let data = extractedData;
  if (data.data && typeof data.data === 'object' && !data.examTitle && !data.eligibility) {
    data = data.data;
  }
  const normData = normalizeCriteriaData(data);

  if (!databaseCriteria || typeof databaseCriteria !== 'object') {
    return {
      overallVerdict: 'WARNING',
      summary: { totalChecks: 1, passedChecks: 0, failedChecks: 0, warningChecks: 1, passRate: 0 },
      evaluations: [{
        field: '_databaseCriteria',
        expected: 'Object with benchmark rules or candidate profile',
        actual: databaseCriteria,
        status: 'WARNING',
        reason: 'No database criteria supplied for verification'
      }],
      candidateEligibility: {
        isEligible: false,
        disqualifications: ['No candidate criteria provided for eligibility evaluation'],
        matchedQualifications: []
      }
    };
  }

  const evaluations = [];

  // 2. Benchmark Rules Evaluation
  // Organization
  if (databaseCriteria.organization !== undefined) {
    evaluations.push(evaluateRule('organization', databaseCriteria.organization, normData.organization, 'contains', { severity: 'CRITICAL' }));
  }

  // Exam Title
  if (databaseCriteria.examTitle !== undefined) {
    evaluations.push(evaluateRule('examTitle', databaseCriteria.examTitle, normData.examTitle, 'contains', { severity: 'CRITICAL' }));
  }

  // Status
  if (databaseCriteria.status !== undefined) {
    const expectedStatus = Array.isArray(databaseCriteria.status) ? databaseCriteria.status : [databaseCriteria.status];
    evaluations.push(evaluateRule('status', expectedStatus, normData.status, 'in', { severity: 'WARNING' }));
  }

  // Vacancies
  if (databaseCriteria.minVacancies !== undefined) {
    evaluations.push(evaluateRule('vacancies', databaseCriteria.minVacancies, normData.vacancies, 'min', { severity: 'WARNING' }));
  }

  // Fees
  if (databaseCriteria.maxGeneralFee !== undefined) {
    evaluations.push(evaluateRule('applicationFee.general', databaseCriteria.maxGeneralFee, normData.applicationFee.general, 'max', { severity: 'WARNING' }));
  }
  if (databaseCriteria.maxReservedFee !== undefined) {
    evaluations.push(evaluateRule('applicationFee.reserved', databaseCriteria.maxReservedFee, normData.applicationFee.reserved, 'max', { severity: 'WARNING' }));
  }

  // Application End Date (check not expired)
  if (databaseCriteria.applicationEndDateMin !== undefined) {
    const endStr = normData.importantDates.applicationEndDate;
    if (!endStr) {
      evaluations.push({
        field: 'importantDates.applicationEndDate',
        expected: `>= ${databaseCriteria.applicationEndDateMin}`,
        actual: null,
        status: 'WARNING',
        reason: 'Application closing date is missing or not specified'
      });
    } else {
      const match = endStr >= databaseCriteria.applicationEndDateMin;
      evaluations.push({
        field: 'importantDates.applicationEndDate',
        expected: `>= ${databaseCriteria.applicationEndDateMin}`,
        actual: endStr,
        status: match ? 'PASS' : 'FAIL',
        reason: match ? `Application end date ${endStr} is on or after ${databaseCriteria.applicationEndDateMin}` : `Application closing deadline ${endStr} has expired or is before ${databaseCriteria.applicationEndDateMin}`
      });
    }
  }

  // Explicit rules array if provided
  if (Array.isArray(databaseCriteria.rules)) {
    for (const rule of databaseCriteria.rules) {
      if (rule && rule.field) {
        // Resolve field path e.g. "eligibility.minAge"
        const parts = rule.field.split('.');
        let val = normData;
        for (const p of parts) {
          val = val && val[p] !== undefined ? val[p] : undefined;
        }
        const ev = evaluateRule(rule.field, rule.expected, val, rule.rule || 'exact', { severity: rule.severity });
        if (ev) evaluations.push(ev);
      }
    }
  }

  // 3. Candidate Eligibility Breakdown
  const candidate = databaseCriteria.candidate;
  const disqualifications = [];
  const matchedQualifications = [];
  let candidateEvaluated = false;

  if (candidate && typeof candidate === 'object') {
    candidateEvaluated = true;
    const cat = (candidate.category || 'General').toUpperCase();
    const candidateAge = typeof candidate.age === 'number' ? candidate.age : null;

    // Age Check
    const minAge = normData.eligibility.minAge;
    const maxAge = normData.eligibility.maxAge;
    
    // Calculate relaxation
    let relaxationYears = 0;
    if (Array.isArray(normData.eligibility.ageRelaxation)) {
      for (const rel of normData.eligibility.ageRelaxation) {
        const relCat = (rel.category || '').toUpperCase();
        if (relCat.includes(cat) || (cat === 'SC' && relCat.includes('SC')) || (cat === 'ST' && relCat.includes('ST')) || (cat === 'OBC' && relCat.includes('OBC'))) {
          relaxationYears = Math.max(relaxationYears, rel.years || 0);
        }
      }
    }

    if (candidateAge !== null) {
      const effectiveMaxAge = maxAge !== null ? maxAge + relaxationYears : null;
      let ageStatus = 'PASS';
      let ageReason = '';

      if (minAge !== null && candidateAge < minAge) {
        ageStatus = 'FAIL';
        ageReason = `Candidate age (${candidateAge}) is below minimum requirement of ${minAge}`;
        disqualifications.push(ageReason);
      } else if (effectiveMaxAge !== null && candidateAge > effectiveMaxAge) {
        ageStatus = 'FAIL';
        ageReason = `Candidate age (${candidateAge}) exceeds maximum limit of ${effectiveMaxAge} (base ${maxAge} + ${relaxationYears} yrs ${cat} relaxation)`;
        disqualifications.push(ageReason);
      } else {
        ageReason = `Candidate age (${candidateAge}) satisfies age limit [${minAge || 'none'} - ${effectiveMaxAge || 'none'}] (base ${maxAge} + ${relaxationYears} yrs ${cat} relaxation)`;
        matchedQualifications.push(ageReason);
      }

      evaluations.push({
        field: 'candidate.age',
        expected: `Between ${minAge || 18} and ${effectiveMaxAge || 65}`,
        actual: candidateAge,
        status: ageStatus,
        reason: ageReason
      });
    }

    // Education Check
    const reqEdu = normData.eligibility.requiredEducation;
    const candEdu = (candidate.education || candidate.degree || '').toLowerCase();
    if (reqEdu.length > 0 && candEdu) {
      let eduMatched = false;
      let matchedReq = '';

      // Check graduate / bachelor synonyms
      const isGradLevel = /bachelor|graduate|graduation|b\.tech|b\.e|b\.sc|b\.com|b\.a|mbbs|degree/i.test(candEdu);
      const isPostGrad = /master|postgraduate|m\.tech|m\.e|m\.sc|m\.com|m\.a|mba/i.test(candEdu);

      for (const r of reqEdu) {
        const rLower = r.toLowerCase();
        if (rLower.includes('bachelor') || rLower.includes('graduation') || rLower.includes('degree')) {
          if (isGradLevel || isPostGrad) {
            eduMatched = true;
            matchedReq = r;
            break;
          }
        } else if (rLower.includes('10+2') || rLower.includes('higher secondary')) {
          if (isGradLevel || isPostGrad || /10\+2|12th|higher secondary/i.test(candEdu)) {
            eduMatched = true;
            matchedReq = r;
            break;
          }
        } else if (rLower.includes('10th') || rLower.includes('matriculation')) {
          eduMatched = true;
          matchedReq = r;
          break;
        }
      }

      if (eduMatched) {
        const msg = `Candidate education '${candidate.education || candidate.degree}' meets requirement: '${matchedReq}'`;
        matchedQualifications.push(msg);
        evaluations.push({
          field: 'candidate.education',
          expected: reqEdu,
          actual: candidate.education || candidate.degree,
          status: 'PASS',
          reason: msg
        });
      } else {
        const msg = `Candidate education '${candidate.education || candidate.degree}' does not satisfy required qualifications: ${JSON.stringify(reqEdu)}`;
        disqualifications.push(msg);
        evaluations.push({
          field: 'candidate.education',
          expected: reqEdu,
          actual: candidate.education || candidate.degree,
          status: 'FAIL',
          reason: msg
        });
      }
    }

    // Stream Check
    const eligibleStreams = normData.eligibility.eligibleStreams;
    const candStream = candidate.stream;
    if (eligibleStreams.length > 0 && candStream) {
      const isOpen = eligibleStreams.some(s => /any discipline|any stream|all disciplines/i.test(s));
      if (isOpen) {
        const msg = `Candidate stream '${candStream}' accepted (open to Any Discipline)`;
        matchedQualifications.push(msg);
        evaluations.push({
          field: 'candidate.stream',
          expected: eligibleStreams,
          actual: candStream,
          status: 'PASS',
          reason: msg
        });
      } else {
        const streamMatch = eligibleStreams.some(s => s.toLowerCase().includes(candStream.toLowerCase()) || candStream.toLowerCase().includes(s.toLowerCase()));
        if (streamMatch) {
          const msg = `Candidate stream '${candStream}' matches eligible streams`;
          matchedQualifications.push(msg);
          evaluations.push({
            field: 'candidate.stream',
            expected: eligibleStreams,
            actual: candStream,
            status: 'PASS',
            reason: msg
          });
        } else {
          const msg = `Candidate stream '${candStream}' is not in eligible streams: ${JSON.stringify(eligibleStreams)}`;
          disqualifications.push(msg);
          evaluations.push({
            field: 'candidate.stream',
            expected: eligibleStreams,
            actual: candStream,
            status: 'FAIL',
            reason: msg
          });
        }
      }
    }
  }

  // 4. Scoring & Summary Metrics
  const totalChecks = evaluations.length;
  const passedChecks = evaluations.filter(e => e.status === 'PASS').length;
  const failedChecks = evaluations.filter(e => e.status === 'FAIL').length;
  const warningChecks = evaluations.filter(e => e.status === 'WARNING').length;
  const passRate = totalChecks > 0 ? parseFloat(((passedChecks / totalChecks) * 100).toFixed(2)) : 100;

  // 5. Candidate Eligibility Resolution
  const isEligible = candidateEvaluated ? disqualifications.length === 0 : true;
  if (!candidateEvaluated) {
    matchedQualifications.push('No candidate profile specified; notification criteria evaluated only');
  }

  // 6. Overall Verdict Resolution Logic
  let overallVerdict = 'PASS';
  if (failedChecks > 0 || !isEligible) {
    overallVerdict = 'FAIL';
  } else if (warningChecks > 0) {
    overallVerdict = 'WARNING';
  }

  return {
    overallVerdict,
    summary: {
      totalChecks,
      passedChecks,
      failedChecks,
      warningChecks,
      passRate
    },
    evaluations,
    candidateEligibility: {
      isEligible,
      disqualifications,
      matchedQualifications
    }
  };
}

// =============================================================================
// Run Prototype Validations
// =============================================================================
/**
 * Formats unity verification result into terminal dashboard display.
 */
function formatUnityReport(result, options = {}) {
  const useColor = options.noColor !== true && process.env.NO_COLOR === undefined;
  
  // Color codes
  const green = useColor ? '\x1b[32m' : '';
  const red = useColor ? '\x1b[31m' : '';
  const yellow = useColor ? '\x1b[33m' : '';
  const cyan = useColor ? '\x1b[36m' : '';
  const bold = useColor ? '\x1b[1m' : '';
  const dim = useColor ? '\x1b[2m' : '';
  const reset = useColor ? '\x1b[0m' : '';

  const verdictBadge = {
    PASS: `${green}${bold}[ PASS ]${reset}`,
    FAIL: `${red}${bold}[ FAIL ]${reset}`,
    WARNING: `${yellow}${bold}[ WARNING ]${reset}`
  }[result.overallVerdict] || result.overallVerdict;

  const lines = [];
  lines.push('');
  lines.push(`${cyan}${bold}================================================================================${reset}`);
  lines.push(`${cyan}${bold}                     UNITY CHECK VERIFICATION REPORT                            ${reset}`);
  lines.push(`${cyan}${bold}================================================================================${reset}`);
  lines.push(`Overall Verdict : ${verdictBadge}`);
  lines.push(`Scorecard       : Total: ${result.summary.totalChecks} | Passed: ${green}${result.summary.passedChecks}${reset} | Failed: ${red}${result.summary.failedChecks}${reset} | Warnings: ${yellow}${result.summary.warningChecks}${reset} | Pass Rate: ${bold}${result.summary.passRate}%${reset}`);
  lines.push(`${dim}--------------------------------------------------------------------------------${reset}`);
  lines.push(`${bold}Field-by-Field Evaluations:${reset}`);
  
  for (const ev of result.evaluations) {
    const badge = ev.status === 'PASS' 
      ? `${green}✔ PASS${reset}` 
      : ev.status === 'FAIL' 
        ? `${red}✘ FAIL${reset}` 
        : `${yellow}⚠ WARN${reset}`;
    const expectedStr = typeof ev.expected === 'object' ? JSON.stringify(ev.expected) : String(ev.expected);
    const actualStr = typeof ev.actual === 'object' ? JSON.stringify(ev.actual) : String(ev.actual);
    lines.push(`  ${badge.padEnd(16)} ${bold}${ev.field.padEnd(30)}${reset} ${ev.reason}`);
    if (ev.status !== 'PASS') {
      lines.push(`    ${dim}Expected: ${expectedStr} | Actual: ${actualStr}${reset}`);
    }
  }

  lines.push(`${dim}--------------------------------------------------------------------------------${reset}`);
  lines.push(`${bold}Candidate Eligibility Summary:${reset}`);
  const eligBadge = result.candidateEligibility.isEligible 
    ? `${green}${bold}ELIGIBLE${reset}` 
    : `${red}${bold}DISQUALIFIED${reset}`;
  lines.push(`  Candidate Status: ${eligBadge}`);
  
  if (result.candidateEligibility.matchedQualifications.length > 0) {
    lines.push(`  ${green}Matched Qualifications:${reset}`);
    for (const mq of result.candidateEligibility.matchedQualifications) {
      lines.push(`    ${green}✓${reset} ${mq}`);
    }
  }

  if (result.candidateEligibility.disqualifications.length > 0) {
    lines.push(`  ${red}Disqualifications:${reset}`);
    for (const dq of result.candidateEligibility.disqualifications) {
      lines.push(`    ${red}✗${reset} ${dq}`);
    }
  }

  lines.push(`${cyan}${bold}================================================================================${reset}\n`);
  return lines.join('\n');
}

const res1 = verifyUnity(MOCK_NOTIFICATION_FIXTURE, {
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  minVacancies: 1000,
  maxGeneralFee: 100,
  applicationEndDateMin: '2026-02-01',
  candidate: {
    age: 33, // Base max is 32, OBC relaxation +3 => max 35. Eligible!
    category: 'OBC',
    education: 'B.Tech Computer Science',
    stream: 'Computer Science'
  }
});

const res2 = verifyUnity(MOCK_NOTIFICATION_FIXTURE, {
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  candidate: {
    age: 36, // Base 32 + OBC 3 = 35. 36 > 35 => FAIL!
    category: 'OBC',
    education: "Bachelor's degree",
    stream: 'Any'
  }
});

const res3 = verifyUnity({
  ...MOCK_NOTIFICATION_FIXTURE,
  importantDates: { ...MOCK_NOTIFICATION_FIXTURE.importantDates, applicationEndDate: null }
}, {
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  applicationEndDateMin: '2026-01-01',
  candidate: {
    age: 25,
    category: 'General',
    education: 'Graduation',
    stream: 'Any'
  }
});

console.log('\n--- Formatted Dashboard Output for Test 1 (Pass) ---');
console.log(formatUnityReport(res1));

console.log('\n--- Formatted Dashboard Output for Test 2 (Fail) ---');
console.log(formatUnityReport(res2));

console.log('\n--- Formatted Dashboard Output for Test 3 (Warning) ---');
console.log(formatUnityReport(res3));

console.log('\n--- Test 4: Extreme Null/Malformed Input Safety ---');
console.log('verifyUnity(null, null):', verifyUnity(null, null).overallVerdict);
console.log('verifyUnity({}, {}):', verifyUnity({}, {}).overallVerdict);
console.log('verifyUnity(MOCK_NOTIFICATION_FIXTURE, null):', verifyUnity(MOCK_NOTIFICATION_FIXTURE, null).overallVerdict);


