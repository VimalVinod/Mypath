'use strict';

/**
 * .agents/m3_explorer_1/test-mock-unity-integration.js
 * Verifies end-to-end integration between rules engine and Interface Contract #3 return schema.
 */

const assert = require('assert');
const {
  defaultRegistry,
  evaluateCandidateEligibility,
  getNestedValue,
  canonicalNotification
} = require('./test-full-declarative-engine');

function mockVerifyUnity(extractedData, databaseCriteria) {
  const root = extractedData || {};
  const criteria = databaseCriteria || {};
  const rules = Array.isArray(criteria.rules) ? criteria.rules : [];
  const candidate = criteria.candidate || null;

  const evaluations = [];

  // 1. Evaluate declarative benchmark rules
  for (const rule of rules) {
    const actual = rule.field ? getNestedValue(root, rule.field) : null;
    const result = defaultRegistry.evaluate(rule, actual, { root, criteria });
    evaluations.push(result);
  }

  // 2. Evaluate candidate eligibility if candidate profile is provided
  let candidateEligibility = {
    isEligible: true,
    disqualifications: [],
    matchedQualifications: []
  };

  if (candidate) {
    const candResult = evaluateCandidateEligibility(root.eligibility, candidate);
    candidateEligibility = candResult.candidateEligibility;
    evaluations.push(...candResult.evaluations);
  }

  // 3. Summary metrics
  const totalChecks = evaluations.length;
  const passedChecks = evaluations.filter(e => e.status === 'PASS').length;
  const failedChecks = evaluations.filter(e => e.status === 'FAIL').length;
  const warningChecks = evaluations.filter(e => e.status === 'WARNING').length;
  const passRate = totalChecks > 0 ? Number(((passedChecks / totalChecks) * 100).toFixed(1)) : 100;

  // 4. Overall verdict resolution
  let overallVerdict = 'PASS';
  if (failedChecks > 0 || (candidate && !candidateEligibility.isEligible)) {
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

// Verification with canonical notification and valid candidate
const mockCriteria = {
  rules: [
    { field: 'organization', type: 'required' },
    { field: 'organization', type: 'equals', expected: 'UNION PUBLIC SERVICE COMMISSION', ignoreCase: true },
    { field: 'status', type: 'enum', allowed: ['ACTIVE', 'UPCOMING'] },
    { field: 'vacancies', type: 'range', min: 100, max: 2000 },
    { field: 'applicationFee.general', type: 'range', max: 500 },
    { type: 'dateOrder', beforeField: 'importantDates.applicationStartDate', afterField: 'importantDates.applicationEndDate' },
    { type: 'dateOrder', beforeField: 'importantDates.applicationEndDate', afterField: 'importantDates.examDate' }
  ],
  candidate: {
    age: 28,
    category: 'OBC',
    education: "Bachelor's degree in Computer Science",
    stream: 'Computer Science'
  }
};

const result = mockVerifyUnity(canonicalNotification, mockCriteria);
console.log('Contract Verification Result:');
console.log('Verdict:', result.overallVerdict);
console.log('Summary:', result.summary);
console.log('Total Evaluations:', result.evaluations.length);
console.log('Candidate Eligible:', result.candidateEligibility.isEligible);

assert.strictEqual(result.overallVerdict, 'PASS');
assert.strictEqual(result.summary.totalChecks, 10);
assert.strictEqual(result.summary.passedChecks, 10);
assert.strictEqual(result.summary.failedChecks, 0);
assert.strictEqual(result.summary.passRate, 100);
assert.strictEqual(result.candidateEligibility.isEligible, true);

console.log('\n✓ Interface Contract #3 compliance verified 100%!');
