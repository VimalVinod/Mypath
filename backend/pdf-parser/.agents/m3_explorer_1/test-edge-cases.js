'use strict';

/**
 * .agents/m3_explorer_1/test-edge-cases.js
 * Adversarial stress and boundary tests for the rules engine.
 */

const assert = require('assert');
const {
  defaultRegistry,
  evaluateCandidateEligibility,
  evaluateRequired,
  evaluateEquals,
  evaluateRange,
  evaluateEnum,
  evaluateDateOrder,
  parseNumberSafely,
  parseIsoDateSafely,
  matchesEducation,
  matchesStream,
  resolveRelaxationYears
} = require('./test-full-declarative-engine');

console.log('Testing adversarial edge cases...');

// 1. Number parsing edge cases
assert.strictEqual(parseNumberSafely(0), 0, 'Zero should parse as 0, not null');
assert.strictEqual(parseNumberSafely('0'), 0, '"0" should parse as 0, not null');
assert.strictEqual(parseNumberSafely(NaN), null, 'NaN should parse as null');
assert.strictEqual(parseNumberSafely(Infinity), null, 'Infinity should parse as null');
assert.strictEqual(parseNumberSafely(''), null, 'Empty string should parse as null');
assert.strictEqual(parseNumberSafely('   '), null, 'Whitespace string should parse as null');
assert.strictEqual(parseNumberSafely('1056'), 1056, 'Numeric string should parse as 1056');
assert.strictEqual(parseNumberSafely('1,056'), null, 'Comma formatted string requires sanitation');
console.log('✓ Edge Case 1: parseNumberSafely verified');

// 2. Leap year and date parsing edge cases
assert.ok(parseIsoDateSafely('2024-02-29') !== null, 'Leap year 2024-02-29 should be valid');
assert.strictEqual(parseIsoDateSafely('2025-02-29'), null, 'Non-leap year 2025-02-29 must be invalid');
assert.strictEqual(parseIsoDateSafely('2026-04-31'), null, 'April 31st must be invalid');
assert.strictEqual(parseIsoDateSafely('2026-00-10'), null, 'Month 00 must be invalid');
assert.strictEqual(parseIsoDateSafely('2026-13-10'), null, 'Month 13 must be invalid');
console.log('✓ Edge Case 2: parseIsoDateSafely leap years and invalid dates verified');

// 3. Candidate age 0 or negative
const zeroAgeCand = { age: 0, category: 'General', education: "Bachelor's" };
const zeroAgeRes = evaluateCandidateEligibility({ minAge: 21, maxAge: 32 }, zeroAgeCand);
assert.strictEqual(zeroAgeRes.candidateEligibility.isEligible, false);
assert.strictEqual(zeroAgeRes.evaluations[0].status, 'FAIL');
console.log('✓ Edge Case 3: Zero age handled without falsy confusion');

// 4. Inverted min/max in criteria: minAge 35, maxAge 25
const invertedAgeRes = evaluateCandidateEligibility({ minAge: 35, maxAge: 25 }, { age: 30, category: 'General', education: "Bachelor's" });
// Candidate age 30 is < minAge 35 (below min) AND > maxAge 25 (above max)
assert.strictEqual(invertedAgeRes.candidateEligibility.isEligible, false);
console.log('✓ Edge Case 4: Inverted min/max handled gracefully');

// 5. Educational degree variations
assert.strictEqual(matchesEducation('B.E. in Electrical Engineering', ["Bachelor's degree in any discipline"]).matches, true);
assert.strictEqual(matchesEducation('B.Sc. in Physics', ["Bachelor's degree in any discipline"]).matches, true);
assert.strictEqual(matchesEducation('Master of Computer Applications (MCA)', ["Bachelor's degree in any discipline"]).matches, true);
assert.strictEqual(matchesEducation('Doctor of Philosophy in History', ["Bachelor's degree in any discipline"]).matches, true);
assert.strictEqual(matchesEducation('Diploma in Mechanical Engineering', ["Bachelor's degree in any discipline"]).matches, false);
console.log('✓ Edge Case 5: Educational degree hierarchy verified');

// 6. Category relaxation edge cases
// PwBD candidate with 10 years relaxation: base 32 + 10 = 42. Candidate age 40 -> Eligible
const pwbdCand = { age: 40, category: 'Persons with Benchmark Disabilities', education: "Graduation" };
const pwbdRes = evaluateCandidateEligibility({ minAge: 21, maxAge: 32, ageRelaxation: [{ category: 'PwBD', years: 10 }] }, pwbdCand);
assert.strictEqual(pwbdRes.candidateEligibility.isEligible, true);

// EWS candidate: typically has 0 years age relaxation in UPSC Civil Services
const ewsCand = { age: 34, category: 'EWS', education: "Graduation" };
const ewsRes = evaluateCandidateEligibility({ minAge: 21, maxAge: 32, ageRelaxation: [{ category: 'SC/ST', years: 5 }] }, ewsCand);
assert.strictEqual(ewsRes.candidateEligibility.isEligible, false);
console.log('✓ Edge Case 6: Category relaxation boundary and unlisted category verified');

// 7. Missing/null databaseCriteria or candidate
const nullRes = evaluateCandidateEligibility(null, null);
assert.strictEqual(nullRes.candidateEligibility.isEligible, false);
assert.ok(nullRes.candidateEligibility.disqualifications.length > 0);
console.log('✓ Edge Case 7: Complete null inputs handled safely');

console.log('\nAll adversarial edge case tests passed successfully!');
