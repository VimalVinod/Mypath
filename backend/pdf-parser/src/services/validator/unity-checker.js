'use strict';

/**
 * src/services/validator/unity-checker.js
 * Core unity and database checking engine.
 * Conforms 100% to Interface Contract #3 in PROJECT.md and Requirements §R3, §R4.
 */

const { normalizeCriteriaData } = require('../ai/gemini-parser');
const rulesEngine = require('./rules');
const { parseNumberSafely } = rulesEngine;

/**
 * Evaluates candidate qualifications against recruitment criteria.
 * @param {Object} eligibilityData - Extracted eligibility criteria (minAge, maxAge, ageRelaxation, requiredEducation, eligibleStreams)
 * @param {Object} candidateProfile - Candidate credentials (age, category, education, stream)
 * @returns {{
 *   candidateEligibility: { isEligible: boolean, disqualifications: string[], matchedQualifications: string[] },
 *   evaluations: Array<{ field: string, expected: any, actual: any, status: 'PASS'|'FAIL'|'WARNING', reason: string }>
 * }}
 */
function evaluateCandidateEligibility(eligibilityData, candidateProfile) {
  if (!candidateProfile || typeof candidateProfile !== 'object') {
    return {
      candidateEligibility: {
        isEligible: true,
        disqualifications: [],
        matchedQualifications: ['No candidate profile specified; notification criteria evaluated only']
      },
      evaluations: []
    };
  }

  return rulesEngine.evaluateCandidateEligibility(eligibilityData, candidateProfile);
}

/**
 * Main verification entry point: Compares extracted data against database criteria.
 * Strictly adheres to Interface Contract #3 in PROJECT.md.
 * 
 * @param {Object} extractedData - Output from Gemini criteria extractor (raw data or envelope)
 * @param {Object} databaseCriteria - Benchmark criteria rules and optional candidate profile
 * @returns {{
 *   overallVerdict: 'PASS' | 'FAIL' | 'WARNING',
 *   summary: { totalChecks: number, passedChecks: number, failedChecks: number, warningChecks: number, passRate: number },
 *   evaluations: Array<{ field: string, expected: any, actual: any, status: 'PASS'|'FAIL'|'WARNING', reason: string }>,
 *   candidateEligibility: { isEligible: boolean, disqualifications: string[], matchedQualifications: string[] }
 * }}
 */
function verifyUnity(extractedData, databaseCriteria) {
  // 1. Guard against non-object or null extractedData
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
        disqualifications: ['No extracted data available to evaluate criteria'],
        matchedQualifications: []
      }
    };
  }

  // Unwrap envelope if top-level envelope was passed
  let rawData = extractedData;
  if (rawData.data && typeof rawData.data === 'object' && !rawData.examTitle && !rawData.eligibility) {
    rawData = rawData.data;
  }
  const normData = normalizeCriteriaData ? normalizeCriteriaData(rawData) : rawData;

  // 2. Guard against missing database criteria
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
        isEligible: true,
        disqualifications: [],
        matchedQualifications: ['No candidate criteria provided for eligibility evaluation']
      }
    };
  }

  const evaluations = [];

  // 3. Evaluate Benchmark Document Criteria
  // 3.1 Organization
  if (databaseCriteria.organization !== undefined) {
    const expRaw = databaseCriteria.organization;
    const expDisplay = typeof expRaw === 'symbol' ? expRaw.toString() : String(expRaw);
    const exp = typeof expRaw === 'symbol' ? expRaw.toString().toLowerCase() : String(expRaw).trim().toLowerCase();
    const actRaw = normData.organization;

    if (!actRaw || typeof actRaw !== 'string' || actRaw.trim() === '') {
      evaluations.push({
        field: 'organization',
        expected: databaseCriteria.organization,
        actual: actRaw || null,
        status: 'FAIL',
        reason: `Expected organization '${expDisplay}' but found '${actRaw || 'null'}'`
      });
    } else if (!exp) {
      evaluations.push({
        field: 'organization',
        expected: databaseCriteria.organization,
        actual: actRaw,
        status: 'FAIL',
        reason: 'Expected organization criteria is empty or invalid'
      });
    } else {
      const act = actRaw.trim().toLowerCase();
      let match = act.includes(exp) || exp.includes(act);
      if (!match && exp.includes('/')) {
        const parts = exp.split('/').map(p => p.trim().toLowerCase()).filter(Boolean);
        match = parts.some(p => p && act.includes(p));
      }
      if (!match && act.includes('/')) {
        const parts = act.split('/').map(p => p.trim().toLowerCase()).filter(Boolean);
        match = parts.some(p => p && exp.includes(p));
      }
      evaluations.push({
        field: 'organization',
        expected: databaseCriteria.organization,
        actual: actRaw,
        status: match ? 'PASS' : 'FAIL',
        reason: match
          ? `Organization matches '${expDisplay}'`
          : `Expected organization containing '${expDisplay}' but found '${actRaw}'`
      });
    }
  }

  // 3.2 Exam Title
  if (databaseCriteria.examTitle !== undefined) {
    const expRaw = databaseCriteria.examTitle;
    const expDisplay = typeof expRaw === 'symbol' ? expRaw.toString() : String(expRaw);
    const exp = typeof expRaw === 'symbol' ? expRaw.toString().toLowerCase() : String(expRaw).trim().toLowerCase();
    const actRaw = normData.examTitle;

    if (!actRaw || typeof actRaw !== 'string' || actRaw.trim() === '') {
      evaluations.push({
        field: 'examTitle',
        expected: databaseCriteria.examTitle,
        actual: actRaw || null,
        status: 'FAIL',
        reason: `Expected exam title '${expDisplay}' but found '${actRaw || 'null'}'`
      });
    } else if (!exp) {
      evaluations.push({
        field: 'examTitle',
        expected: databaseCriteria.examTitle,
        actual: actRaw,
        status: 'FAIL',
        reason: 'Expected exam title criteria is empty or invalid'
      });
    } else {
      const act = actRaw.trim().toLowerCase();
      let match = act.includes(exp) || exp.includes(act);
      if (!match && exp.includes('/')) {
        const parts = exp.split('/').map(p => p.trim().toLowerCase()).filter(Boolean);
        match = parts.some(p => p && act.includes(p));
      }
      if (!match && act.includes('/')) {
        const parts = act.split('/').map(p => p.trim().toLowerCase()).filter(Boolean);
        match = parts.some(p => p && exp.includes(p));
      }
      evaluations.push({
        field: 'examTitle',
        expected: databaseCriteria.examTitle,
        actual: actRaw,
        status: match ? 'PASS' : 'FAIL',
        reason: match
          ? `Exam title matches '${expDisplay}'`
          : `Expected exam title containing '${expDisplay}' but found '${actRaw}'`
      });
    }
  }

  // 3.3 Status
  if (databaseCriteria.status !== undefined) {
    const allowed = Array.isArray(databaseCriteria.status) ? databaseCriteria.status : [databaseCriteria.status];
    const match = allowed.some(s => String(s).toUpperCase() === String(normData.status).toUpperCase());
    evaluations.push({
      field: 'status',
      expected: allowed,
      actual: normData.status,
      status: match ? 'PASS' : 'WARNING',
      reason: match
        ? `Status '${normData.status}' is among permitted statuses: [${allowed.join(', ')}]`
        : `Status '${normData.status}' is not in expected list: [${allowed.join(', ')}]`
    });
  }

  // 3.4 Vacancies
  if (databaseCriteria.minVacancies !== undefined) {
    const minVac = parseNumberSafely(databaseCriteria.minVacancies);
    const actVac = parseNumberSafely(normData.vacancies);
    if (minVac === null) {
      evaluations.push({
        field: 'vacancies',
        expected: 'Valid numeric vacancies threshold',
        actual: actVac,
        status: 'WARNING',
        reason: 'Invalid or non-numeric minVacancies criteria'
      });
    } else if (actVac === null) {
      evaluations.push({
        field: 'vacancies',
        expected: `>= ${minVac}`,
        actual: null,
        status: 'WARNING',
        reason: 'Vacancies not specified or tentative in notification'
      });
    } else {
      const match = actVac >= minVac;
      evaluations.push({
        field: 'vacancies',
        expected: `>= ${minVac}`,
        actual: actVac,
        status: match ? 'PASS' : 'WARNING',
        reason: match
          ? `Vacancies (${actVac}) meet or exceed minimum threshold of ${minVac}`
          : `Vacancies (${actVac}) below desired threshold of ${minVac}`
      });
    }
  }

  // 3.5 General Fee Cap
  if (databaseCriteria.maxGeneralFee !== undefined) {
    const maxFee = parseNumberSafely(databaseCriteria.maxGeneralFee);
    const actFee = normData.applicationFee ? parseNumberSafely(normData.applicationFee.general) : null;
    if (maxFee === null) {
      evaluations.push({
        field: 'applicationFee.general',
        expected: 'Valid numeric fee cap',
        actual: actFee,
        status: 'WARNING',
        reason: 'Invalid or non-numeric maxGeneralFee criteria'
      });
    } else if (actFee === null) {
      evaluations.push({
        field: 'applicationFee.general',
        expected: `<= ${maxFee}`,
        actual: null,
        status: 'WARNING',
        reason: 'General fee amount not specified in notification'
      });
    } else {
      const match = actFee <= maxFee;
      evaluations.push({
        field: 'applicationFee.general',
        expected: `<= ${maxFee}`,
        actual: actFee,
        status: match ? 'PASS' : 'WARNING',
        reason: match
          ? `General application fee (₹${actFee}) is within maximum limit of ₹${maxFee}`
          : `General application fee (₹${actFee}) exceeds maximum limit of ₹${maxFee}`
      });
    }
  }

  // 3.6 Reserved Fee Cap
  if (databaseCriteria.maxReservedFee !== undefined) {
    const maxFee = parseNumberSafely(databaseCriteria.maxReservedFee);
    const actFee = normData.applicationFee ? parseNumberSafely(normData.applicationFee.reserved) : null;
    if (maxFee === null) {
      evaluations.push({
        field: 'applicationFee.reserved',
        expected: 'Valid numeric fee cap',
        actual: actFee,
        status: 'WARNING',
        reason: 'Invalid or non-numeric maxReservedFee criteria'
      });
    } else if (actFee === null) {
      evaluations.push({
        field: 'applicationFee.reserved',
        expected: `<= ${maxFee}`,
        actual: null,
        status: 'WARNING',
        reason: 'Reserved fee amount not specified in notification'
      });
    } else {
      const match = actFee <= maxFee;
      evaluations.push({
        field: 'applicationFee.reserved',
        expected: `<= ${maxFee}`,
        actual: actFee,
        status: match ? 'PASS' : 'FAIL',
        reason: match
          ? `Reserved application fee (₹${actFee}) is within maximum limit of ₹${maxFee}`
          : `Reserved application fee (₹${actFee}) exceeds maximum limit of ₹${maxFee}`
      });
    }
  }

  // 3.7 Application End Date (Active application window deadline check)
  if (databaseCriteria.applicationEndDateMin !== undefined) {
    const minEnd = databaseCriteria.applicationEndDateMin;
    const actEnd = normData.importantDates ? normData.importantDates.applicationEndDate : null;
    if (!actEnd) {
      evaluations.push({
        field: 'importantDates.applicationEndDate',
        expected: `>= ${minEnd}`,
        actual: null,
        status: 'WARNING',
        reason: 'Application deadline is missing or unannounced'
      });
    } else {
      const match = actEnd >= minEnd;
      evaluations.push({
        field: 'importantDates.applicationEndDate',
        expected: `>= ${minEnd}`,
        actual: actEnd,
        status: match ? 'PASS' : 'FAIL',
        reason: match
          ? `Application deadline (${actEnd}) is active (on or after ${minEnd})`
          : `Application deadline (${actEnd}) has passed or expired before ${minEnd}`
      });
    }
  }

  // 3.8 Declarative Rules Array (if passed in criteria)
  if (Array.isArray(databaseCriteria.rules) && rulesEngine.evaluateRule) {
    for (const rule of databaseCriteria.rules) {
      if (rule && (rule.field || rule.type || rule.rule)) {
        const ev = rulesEngine.evaluateRule(rule, normData);
        if (ev) evaluations.push(ev);
      }
    }
  }

  // 4. Candidate Qualification & Eligibility Breakdown
  let candidateEligibility = {
    isEligible: true,
    disqualifications: [],
    matchedQualifications: ['No candidate profile specified; notification criteria evaluated only']
  };

  if (databaseCriteria.candidate && typeof databaseCriteria.candidate === 'object') {
    const candResult = evaluateCandidateEligibility(normData.eligibility, databaseCriteria.candidate);
    candidateEligibility = candResult.candidateEligibility;
    evaluations.push(...candResult.evaluations);
  }

  // 5. Summary Metrics & Scorecard Calculation
  const totalChecks = evaluations.length;
  const passedChecks = evaluations.filter(e => e.status === 'PASS').length;
  const failedChecks = evaluations.filter(e => e.status === 'FAIL').length;
  const warningChecks = evaluations.filter(e => e.status === 'WARNING').length;
  const passRate = totalChecks > 0 ? parseFloat(((passedChecks / totalChecks) * 100).toFixed(2)) : 100;

  // 6. Overall Verdict Resolution Logic
  let overallVerdict = 'PASS';
  if (failedChecks > 0 || !candidateEligibility.isEligible) {
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
    candidateEligibility
  };
}

/**
 * Safe stringifier helper that never throws on null, undefined, symbol, bigint, or circular objects.
 * @param {*} val
 * @returns {string}
 */
function safeStringify(val) {
  if (val === null || val === undefined) return String(val);
  if (typeof val === 'symbol') return val.toString();
  if (typeof val === 'bigint') return val.toString() + 'n';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      try {
        return String(val);
      } catch {
        return '[Unstringifiable Object]';
      }
    }
  }
  return String(val);
}

/**
 * Formats verification result into a clean, legible terminal report dashboard string.
 * Guarded against null, undefined, primitives, missing summary, and corrupt evaluations.
 * @param {Object} result - Output of verifyUnity
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.noColor=false] - Disable ANSI color codes
 * @returns {string}
 */
function formatUnityReport(result, options = {}) {
  const opts = (options && typeof options === 'object') ? options : {};
  const useColor = opts.noColor !== true &&
    process.env.NO_COLOR === undefined &&
    Boolean(process.stdout.isTTY || opts.color);

  const green = useColor ? '\x1b[32m' : '';
  const red = useColor ? '\x1b[31m' : '';
  const yellow = useColor ? '\x1b[33m' : '';
  const cyan = useColor ? '\x1b[36m' : '';
  const bold = useColor ? '\x1b[1m' : '';
  const dim = useColor ? '\x1b[2m' : '';
  const reset = useColor ? '\x1b[0m' : '';

  if (!result || typeof result !== 'object') {
    return `\n${cyan}${bold}================================================================================${reset}\n` +
      `${cyan}${bold}                     UNITY CHECK VERIFICATION REPORT                            ${reset}\n` +
      `${cyan}${bold}================================================================================${reset}\n` +
      `Overall Verdict : ${red}${bold}[ INVALID / NULL RESULT ]${reset}\n` +
      `Scorecard       : Total: 0 | Passed: 0 | Failed: 0 | Warnings: 0 | Pass Rate: 0%\n` +
      `${dim}(Invalid or null verification result provided)${reset}\n` +
      `${cyan}${bold}================================================================================${reset}\n`;
  }

  const rawVerdict = result.overallVerdict || 'UNKNOWN';
  const verdictBadge = {
    PASS: `${green}${bold}[ PASS ]${reset}`,
    FAIL: `${red}${bold}[ FAIL ]${reset}`,
    WARNING: `${yellow}${bold}[ WARNING ]${reset}`
  }[rawVerdict] || safeStringify(rawVerdict);

  const rawSummary = result.summary && typeof result.summary === 'object' ? result.summary : {};
  const summary = {
    totalChecks: typeof rawSummary.totalChecks === 'number' ? rawSummary.totalChecks : 0,
    passedChecks: typeof rawSummary.passedChecks === 'number' ? rawSummary.passedChecks : 0,
    failedChecks: typeof rawSummary.failedChecks === 'number' ? rawSummary.failedChecks : 0,
    warningChecks: typeof rawSummary.warningChecks === 'number' ? rawSummary.warningChecks : 0,
    passRate: typeof rawSummary.passRate === 'number' ? rawSummary.passRate : 0
  };

  const evaluations = Array.isArray(result.evaluations) ? result.evaluations : [];
  const rawCand = result.candidateEligibility && typeof result.candidateEligibility === 'object'
    ? result.candidateEligibility
    : {};
  const candidateEligibility = {
    isEligible: Boolean(rawCand.isEligible),
    disqualifications: Array.isArray(rawCand.disqualifications) ? rawCand.disqualifications : [],
    matchedQualifications: Array.isArray(rawCand.matchedQualifications) ? rawCand.matchedQualifications : []
  };

  const lines = [];
  lines.push('');
  lines.push(`${cyan}${bold}================================================================================${reset}`);
  lines.push(`${cyan}${bold}                     UNITY CHECK VERIFICATION REPORT                            ${reset}`);
  lines.push(`${cyan}${bold}================================================================================${reset}`);
  lines.push(`Overall Verdict : ${verdictBadge}`);
  lines.push(`Scorecard       : Total: ${summary.totalChecks} | Passed: ${green}${summary.passedChecks}${reset} | Failed: ${red}${summary.failedChecks}${reset} | Warnings: ${yellow}${summary.warningChecks}${reset} | Pass Rate: ${bold}${summary.passRate}%${reset}`);
  lines.push(`${dim}--------------------------------------------------------------------------------${reset}`);
  lines.push(`${bold}Field-by-Field Evaluations:${reset}`);

  if (evaluations.length === 0) {
    lines.push(`  ${dim}(No evaluation checks configured)${reset}`);
  } else {
    for (const ev of evaluations) {
      if (!ev || typeof ev !== 'object') {
        lines.push(`  ${dim}(Invalid evaluation entry)${reset}`);
        continue;
      }
      const field = typeof ev.field === 'string' ? ev.field : safeStringify(ev.field || 'unknown');
      const status = ['PASS', 'FAIL', 'WARNING'].includes(ev.status) ? ev.status : 'FAIL';
      const reason = typeof ev.reason === 'string' ? ev.reason : safeStringify(ev.reason || '');

      const badge = status === 'PASS'
        ? `${green}✔ PASS${reset}`
        : status === 'FAIL'
          ? `${red}✘ FAIL${reset}`
          : `${yellow}⚠ WARN${reset}`;
      lines.push(`  ${badge.padEnd(useColor ? 16 : 8)} ${bold}${field.padEnd(30)}${reset} ${reason}`);
      if (status !== 'PASS') {
        const expStr = safeStringify(ev.expected);
        const actStr = safeStringify(ev.actual);
        lines.push(`    ${dim}Expected: ${expStr} | Actual: ${actStr}${reset}`);
      }
    }
  }

  lines.push(`${dim}--------------------------------------------------------------------------------${reset}`);
  lines.push(`${bold}Candidate Eligibility Summary:${reset}`);
  const eligBadge = candidateEligibility.isEligible
    ? `${green}${bold}ELIGIBLE${reset}`
    : `${red}${bold}DISQUALIFIED${reset}`;
  lines.push(`  Candidate Status: ${eligBadge}`);

  if (candidateEligibility.matchedQualifications.length > 0) {
    lines.push(`  ${green}Matched Qualifications:${reset}`);
    for (const mq of candidateEligibility.matchedQualifications) {
      lines.push(`    ${green}✓${reset} ${safeStringify(mq)}`);
    }
  }

  if (candidateEligibility.disqualifications.length > 0) {
    lines.push(`  ${red}Disqualifications:${reset}`);
    for (const dq of candidateEligibility.disqualifications) {
      lines.push(`    ${red}✗${reset} ${safeStringify(dq)}`);
    }
  }

  lines.push(`${cyan}${bold}================================================================================${reset}\n`);
  return lines.join('\n');
}

/**
 * Prints formatted report directly to console with error protection.
 * @param {Object} result
 * @param {Object} [options={}]
 */
function printUnityReport(result, options = {}) {
  try {
    console.log(formatUnityReport(result, options));
  } catch (err) {
    console.log(`[UNITY CHECK REPORT] Error formatting report: ${err.message}`);
  }
}

module.exports = {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport
};
