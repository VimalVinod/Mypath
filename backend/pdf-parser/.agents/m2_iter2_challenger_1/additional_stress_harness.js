'use strict';

/**
 * additional_stress_harness.js
 * Additional Adversarial Stress Testing for Milestone 2 Iteration 2
 * Author: m2_iter2_challenger_1 (critic, specialist)
 *
 * Focus Areas:
 *  1. ReDoS with 100k uppercase characters and near-misses
 *  2. Thousands-separated vacancy numbers and multi-format variants
 *  3. Candidate age vs experience, service years, percentage marks, and attempts
 */

const assert = require('node:assert/strict');
const { extractMockCriteria } = require('../../src/services/ai/mock-gemini');
const { parseStructuredCriteria, normalizeCriteriaData } = require('../../src/services/ai/gemini-parser');

let total = 0;
let passed = 0;
let failed = 0;
const results = [];

function run(category, name, fn) {
  total++;
  const start = performance.now();
  try {
    fn();
    const duration = performance.now() - start;
    passed++;
    results.push({ category, name, status: 'PASS', duration });
    console.log(`  ✓ [PASS] [${category}] ${name} (${duration.toFixed(2)}ms)`);
  } catch (err) {
    const duration = performance.now() - start;
    failed++;
    results.push({ category, name, status: 'FAIL', duration, error: err.message });
    console.log(`  ✗ [FAIL] [${category}] ${name} (${duration.toFixed(2)}ms)`);
    console.log(`     Error: ${err.message}`);
  }
}

console.log('======================================================================');
console.log('M2 ITERATION 2: ADDITIONAL ADVERSARIAL STRESS TEST HARNESS');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// SUITE 1: ReDoS with 100k Uppercase Characters
// ----------------------------------------------------------------------------
console.log('--- SUITE 1: ReDoS with 100k Uppercase Characters ---');

run('ReDoS', '1.1 100,000 consecutive uppercase "A"s', () => {
  const text = 'A'.repeat(100000);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
  assert.equal(res.organization, null);
});

run('ReDoS', '1.2 100,000 characters of uppercase letters separated by spaces ("A ")', () => {
  const text = 'A '.repeat(50000);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
  assert.equal(res.organization, null);
});

run('ReDoS', '1.3 100,000 characters of uppercase words not matching keywords ("FOO BAR BAZ QUX ")', () => {
  const text = 'FOO BAR BAZ QUX '.repeat(6250);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
  assert.equal(res.organization, null);
});

run('ReDoS', '1.4 100,000 characters of near-miss organization keywords ("COMMISSIO BOAR MINISTR ")', () => {
  const text = 'COMMISSIO BOAR MINISTR DEPARTMEN AUTHORIT INSTITUT BAN '.repeat(1800);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
  assert.equal(res.organization, null);
});

run('ReDoS', '1.5 100,000 characters with repeated valid organizations ("A COMMISSION ")', () => {
  const text = 'A COMMISSION '.repeat(7500);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
  assert.ok(res.organization !== null);
});

run('ReDoS', '1.6 100,000 characters with RELAXATION keywords and uppercase filler', () => {
  const text = 'RELAXATION OF 5 YEARS ' + 'A '.repeat(50000);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
});

run('ReDoS', '1.7 100,000 characters with repeated number patterns ("500 ")', () => {
  const text = '500 '.repeat(25000);
  const start = performance.now();
  const res = extractMockCriteria(text);
  const dur = performance.now() - start;
  assert.ok(dur < 200, `Took ${dur.toFixed(2)}ms, exceeding 200ms threshold`);
});

// ----------------------------------------------------------------------------
// SUITE 2: Thousands-Separated Vacancy Numbers
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 2: Thousands-Separated Vacancy Numbers ---');

run('Vacancies', '2.1 Standard 4-digit thousands-separated: "Total vacancies: 1,056"', () => {
  const text = 'Notice: UPSC Examination. Total vacancies: 1,056 posts.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 1056);
});

run('Vacancies', '2.2 Standard 5-digit thousands-separated: "Total vacancies: 15,000"', () => {
  const text = 'Staff Selection Notice. Total vacancies: 15,000 posts.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 15000);
});

run('Vacancies', '2.3 Large 7-digit thousands-separated: "Total vacancies: 1,500,000"', () => {
  const text = 'National Mission. Total vacancies: 1,500,000 posts.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 1500000);
});

run('Vacancies', '2.4 Indian grouping format: "Total vacancies: 1,23,456"', () => {
  const text = 'State Recruitment Board. Total vacancies: 1,23,456 posts across districts.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 123456);
});

run('Vacancies', '2.5 Vacancy range with thousands: "Total vacancies: 1,000 to 1,500 posts"', () => {
  const text = 'Recruitment Notice. Total vacancies: 1,000 to 1,500 posts.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 1000);
});

run('Vacancies', '2.6 Multilingual header: "रिक्तियां (Vacancies): 2,400"', () => {
  const text = 'कुल रिक्तियां (Vacancies): 2,400 पद.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 2400);
});

run('Vacancies', '2.7 Vacancies with backlog breakdown: "Total vacancies: 1,200 (including 200 backlog vacancies)"', () => {
  const text = 'Commission Notice. Total vacancies: 1,200 (including 200 backlog vacancies).';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 1200);
});

run('Vacancies', '2.8 "No. of posts: 2,500"', () => {
  const text = 'Recruitment details. No. of posts: 2,500.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 2500);
});

run('Vacancies', '2.9 Comma-separated year preceding vacancies: "In 2026, total vacancies: 3,500"', () => {
  const text = 'In 2026, total vacancies: 3,500 across departments.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 3500);
});

run('Vacancies', '2.10 Vacancy with trailing full stop: "Total vacancies: 4,000."', () => {
  const text = 'Total vacancies: 4,000. Eligible candidates may apply.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 4000);
});

run('Vacancies', '2.11 Approximate vacancies: "Approximately 12,000 vacancies are available"', () => {
  const text = 'Approximately 12,000 vacancies are notified.';
  const res = extractMockCriteria(text);
  assert.equal(res.vacancies, 12000);
});

// ----------------------------------------------------------------------------
// SUITE 3: Candidate Age vs Experience & Semantic Disambiguation
// ----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Candidate Age vs Experience Disambiguation ---');

run('AgeVsExp', '3.1 Experience range precedes explicit age limit: "5 to 8 years experience. Age Limit: 21 to 30 years"', () => {
  const text = 'Candidates must have 5 to 8 years experience in administration. Age Limit: 21 to 30 years.';
  const res = extractMockCriteria(text);
  assert.equal(res.eligibility.minAge, 21);
  assert.equal(res.eligibility.maxAge, 30);
});

run('AgeVsExp', '3.2 Experience range with NO age limit: "3 to 5 years experience"', () => {
  const text = 'Applicants should possess 3 to 5 years experience in accounting. Graduation is mandatory.';
  const res = extractMockCriteria(text);
  assert.equal(res.eligibility.minAge, null);
  assert.equal(res.eligibility.maxAge, null);
});

run('AgeVsExp', '3.3 Single experience requirement: "at least 10 years experience"', () => {
  const text = 'Candidates must have at least 10 years experience in senior software engineering.';
  const res = extractMockCriteria(text);
  assert.equal(res.eligibility.minAge, null);
  assert.equal(res.eligibility.maxAge, null);
});

run('AgeVsExp', '3.4 Service bond period: "must serve a minimum period of 3 years. Age limit: 21 to 32 years"', () => {
  const text = 'Candidates selected must serve a minimum period of 3 years. Age limit: 21 to 32 years.';
  const res = extractMockCriteria(text);
  assert.equal(res.eligibility.minAge, 21);
  assert.equal(res.eligibility.maxAge, 32);
});

run('AgeVsExp', '3.5 High experience range (20 to 25 years) precedes explicit age (35 to 45 years of age)', () => {
  const text = 'Applicants must have 20 to 25 years experience in judicial service. Candidates must be 35 to 45 years of age.';
  const res = extractMockCriteria(text);
  assert.equal(res.eligibility.minAge, 35);
  assert.equal(res.eligibility.maxAge, 45);
});

run('AgeVsExp', '3.6 Multi-word experience: "18 to 25 years of relevant industry experience in banking"', () => {
  const text = 'Candidates must possess 18 to 25 years of relevant industry experience in banking.';
  const res = extractMockCriteria(text);
  // Experience range must NOT be captured as age limit!
  assert.notEqual(res.eligibility.minAge, 18, 'minAge was corrupted to 18 by multi-word experience range');
  assert.notEqual(res.eligibility.maxAge, 25, 'maxAge was corrupted to 25 by multi-word experience range');
  assert.equal(res.eligibility.minAge, null);
  assert.equal(res.eligibility.maxAge, null);
});

run('AgeVsExp', '3.7 "not less than 20 years of experience" precedes "Minimum age: 30 years"', () => {
  const text = 'Experience required: not less than 20 years of experience in administration. Minimum age: 30 years.';
  const res = extractMockCriteria(text);
  assert.notEqual(res.eligibility.minAge, 20, 'minAge was corrupted to 20 by "not less than 20 years of experience"');
  assert.equal(res.eligibility.minAge, 30, `Expected minAge 30, got ${res.eligibility.minAge}`);
});

run('AgeVsExp', '3.8 "not less than 50% marks in degree" precedes "Minimum age: 21 years"', () => {
  const text = 'Candidates must have obtained not less than 50% marks in graduation. Minimum age: 21 years.';
  const res = extractMockCriteria(text);
  assert.notEqual(res.eligibility.minAge, 50, 'minAge was corrupted to 50 by graduation marks percentage');
  assert.equal(res.eligibility.minAge, 21, `Expected minAge 21, got ${res.eligibility.minAge}`);
});

run('AgeVsExp', '3.9 "not less than 20 years of continuous service" with NO age limit in text', () => {
  const text = 'Eligibility: Candidates must have not less than 20 years of continuous service in government departments.';
  const res = extractMockCriteria(text);
  assert.notEqual(res.eligibility.minAge, 20, 'minAge was corrupted to 20 by continuous service requirement');
  assert.equal(res.eligibility.minAge, null);
});

run('AgeVsExp', '3.10 "Minimum age: 30 years. Candidates must not exceed 25 years of military service"', () => {
  const text = 'Minimum age: 30 years. Candidates must not exceed 25 years of military service.';
  const res = extractMockCriteria(text);
  assert.notEqual(res.eligibility.maxAge, 25, 'maxAge was corrupted to 25 by military service limit');
  assert.equal(res.eligibility.minAge, 30);
  assert.equal(res.eligibility.maxAge, null);
});

run('AgeVsExp', '3.11 "Candidates should not exceed 20 attempts. Upper age limit: 32 years"', () => {
  const text = 'Candidates should not exceed 20 attempts. Upper age limit: 32 years.';
  const res = extractMockCriteria(text);
  assert.notEqual(res.eligibility.maxAge, 20, 'maxAge was corrupted to 20 by attempt limit');
  assert.equal(res.eligibility.maxAge, 32, `Expected maxAge 32, got ${res.eligibility.maxAge}`);
});

run('AgeVsExp', '3.12 Attained age phrasing: "attained the age of 21 years and must not have exceeded the age of 30 years"', () => {
  const text = 'Candidate must have attained the age of 21 years and must not have exceeded the age of 30 years on cut-off date.';
  const res = extractMockCriteria(text);
  assert.equal(res.eligibility.minAge, 21);
  assert.equal(res.eligibility.maxAge, 30);
});

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log('ADDITIONAL ADVERSARIAL STRESS TEST SUMMARY:');
console.log(`Total Scenarios: ${total}`);
console.log(`Passed:          ${passed}`);
console.log(`Failed:          ${failed}`);
console.log(`Success Rate:    ${((passed / total) * 100).toFixed(2)}%`);
console.log('======================================================================');

if (failed > 0) {
  console.log('\nFAILURES BREAKDOWN:');
  results.filter(r => r.status === 'FAIL').forEach((f, idx) => {
    console.log(`${idx + 1}. [${f.category}] ${f.name}`);
    console.log(`   Error: ${f.error}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
