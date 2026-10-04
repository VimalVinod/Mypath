'use strict';

/**
 * .agents/m3_explorer_1/test-rules-engine.js
 * Prototype exploration script to verify rule evaluators, safe navigation,
 * candidate eligibility matching, and return contract generation.
 */

const assert = require('assert');

// 1. Safe nested property resolver
function getNestedValue(obj, path) {
  if (obj === null || obj === undefined || typeof path !== 'string') {
    return undefined;
  }
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// 2. Safe number parser
function parseNumberSafely(val) {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val.trim());
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

// 3. Strict ISO Date Validator
function parseIsoDateSafely(val) {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return null;
  }
  const [year, month, day] = val.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  ) {
    return { date, dateStr: val, time: date.getTime() };
  }
  return null;
}

// 4. Normalized string comparison
function normalizeStr(str) {
  return typeof str === 'string' ? str.trim().toLowerCase().replace(/['"`]/g, '') : '';
}

// 5. Category Relaxation Resolver
const CATEGORY_ALIASES = {
  'SC': ['sc', 'scheduled caste', 'sc/st', 'sc & st'],
  'ST': ['st', 'scheduled tribe', 'sc/st', 'sc & st'],
  'SC/ST': ['sc/st', 'sc & st', 'sc', 'st', 'scheduled caste', 'scheduled tribe'],
  'OBC': ['obc', 'other backward class', 'other backward classes', 'obc-ncl', 'obc (non-creamy layer)'],
  'EWS': ['ews', 'economically weaker section', 'economically weaker sections'],
  'PWBD': ['pwbd', 'pwd', 'persons with benchmark disabilities', 'physically handicapped', 'ph', 'divyang'],
  'EX-SERVICEMEN': ['ex-servicemen', 'esm', 'ex servicemen', 'ex-service personnel']
};

function resolveRelaxationYears(category, ageRelaxationList) {
  if (!category || !Array.isArray(ageRelaxationList) || ageRelaxationList.length === 0) {
    return 0;
  }
  const candCatNorm = normalizeStr(category);

  // General or Unreserved has 0 relaxation
  if (['general', 'gen', 'ur', 'unreserved'].includes(candCatNorm)) {
    return 0;
  }

  for (const rule of ageRelaxationList) {
    if (!rule || typeof rule !== 'object') continue;
    const ruleCatNorm = normalizeStr(rule.category);
    const years = parseNumberSafely(rule.years) || 0;

    // Direct match
    if (ruleCatNorm === candCatNorm) {
      return years;
    }

    // Alias match: Check if candCatNorm matches any alias group of ruleCatNorm
    for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
      const canonicalNorm = canonical.toLowerCase();
      const candMatches = aliases.some(a => a === candCatNorm) || canonicalNorm === candCatNorm;
      const ruleMatches = aliases.some(a => a === ruleCatNorm) || canonicalNorm === ruleCatNorm;
      if (candMatches && ruleMatches) {
        return years;
      }
    }
  }

  return 0;
}

// 6. Education matching logic
const EDUCATION_LEVELS = {
  'phd': 6,
  'doctorate': 6,
  'master': 5,
  'post graduate': 5,
  'pg': 5,
  'm.tech': 5,
  'msc': 5,
  'm.sc': 5,
  'mba': 5,
  'bachelor': 4,
  'b.tech': 4,
  'b.e': 4,
  'bsc': 4,
  'b.sc': 4,
  'b.com': 4,
  'b.a': 4,
  'graduate': 4,
  'graduation': 4,
  'degree': 4,
  'diploma': 3,
  '10+2': 2,
  'higher secondary': 2,
  'intermediate': 2,
  '12th': 2,
  '10th': 1,
  'matriculation': 1,
  'secondary': 1
};

function getEducationLevel(eduStr) {
  const norm = normalizeStr(eduStr);
  let highestLevel = 0;
  for (const [term, level] of Object.entries(EDUCATION_LEVELS)) {
    if (norm.includes(term)) {
      if (level > highestLevel) {
        highestLevel = level;
      }
    }
  }
  return highestLevel;
}

function matchesEducation(candidateDegree, requiredEducationList) {
  if (!candidateDegree || typeof candidateDegree !== 'string') {
    return { matches: false, reason: 'Candidate education is missing or not a string' };
  }
  if (!Array.isArray(requiredEducationList) || requiredEducationList.length === 0) {
    return { matches: true, reason: 'No education requirements specified' };
  }

  const candNorm = normalizeStr(candidateDegree);
  const candLevel = getEducationLevel(candidateDegree);

  for (const req of requiredEducationList) {
    const reqNorm = normalizeStr(req);
    const reqLevel = getEducationLevel(req);

    // If requirement says "any discipline" or "graduation" or "bachelor's degree in any discipline"
    if (reqNorm.includes('any discipline') || reqNorm.includes('any graduate') || reqNorm.includes('graduation')) {
      if (candLevel >= 4) { // Bachelor's or higher
        return { matches: true, matchedReq: req };
      }
    }

    // Direct inclusion
    if (candNorm.includes(reqNorm) || reqNorm.includes(candNorm)) {
      return { matches: true, matchedReq: req };
    }

    // Level-based eligibility (higher degree covers lower requirement, e.g. Master's covers Bachelor's)
    if (reqLevel > 0 && candLevel >= reqLevel) {
      return { matches: true, matchedReq: req };
    }
  }

  return { matches: false, reason: `Candidate degree '${candidateDegree}' does not satisfy required education: [${requiredEducationList.join(', ')}]` };
}

// 7. Stream matching logic
function matchesStream(candidateStream, eligibleStreamsList) {
  if (!Array.isArray(eligibleStreamsList) || eligibleStreamsList.length === 0) {
    return { matches: true, reason: 'Open to all streams (no restriction specified)' };
  }

  // If streams list has 'any', 'any discipline', 'all', 'all disciplines'
  const isAllOpen = eligibleStreamsList.some(s => {
    const n = normalizeStr(s);
    return n.includes('any') || n.includes('all');
  });
  if (isAllOpen) {
    return { matches: true, reason: 'Open to all disciplines / streams' };
  }

  if (!candidateStream || typeof candidateStream !== 'string') {
    return { matches: false, reason: 'Candidate stream is missing while specific streams are required' };
  }

  const candStreamNorm = normalizeStr(candidateStream);
  for (const stream of eligibleStreamsList) {
    const streamNorm = normalizeStr(stream);
    if (candStreamNorm.includes(streamNorm) || streamNorm.includes(candStreamNorm)) {
      return { matches: true, matchedStream: stream };
    }
  }

  return { matches: false, reason: `Candidate stream '${candidateStream}' is not in eligible streams: [${eligibleStreamsList.join(', ')}]` };
}

// Test Runner
console.log('Testing prototype rule logic...');

// Test 1: getNestedValue
assert.strictEqual(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c'), 42);
assert.strictEqual(getNestedValue({ a: null }, 'a.b.c'), undefined);
assert.strictEqual(getNestedValue(null, 'a.b.c'), undefined);
assert.strictEqual(getNestedValue({ 'minAge': 21 }, 'minAge'), 21);
console.log('Test 1: getNestedValue passed');

// Test 2: parseIsoDateSafely
assert.ok(parseIsoDateSafely('2026-01-10'));
assert.strictEqual(parseIsoDateSafely('2026-02-31'), null); // Invalid date
assert.strictEqual(parseIsoDateSafely('not-a-date'), null);
assert.strictEqual(parseIsoDateSafely(null), null);
console.log('Test 2: parseIsoDateSafely passed');

// Test 3: resolveRelaxationYears
const relaxations = [
  { category: 'SC/ST', years: 5 },
  { category: 'OBC', years: 3 },
  { category: 'PwBD', years: 10 }
];
assert.strictEqual(resolveRelaxationYears('General', relaxations), 0);
assert.strictEqual(resolveRelaxationYears('OBC', relaxations), 3);
assert.strictEqual(resolveRelaxationYears('SC', relaxations), 5); // Alias resolution
assert.strictEqual(resolveRelaxationYears('ST', relaxations), 5); // Alias resolution
assert.strictEqual(resolveRelaxationYears('pwd', relaxations), 10); // Alias resolution
assert.strictEqual(resolveRelaxationYears('UnknownCategory', relaxations), 0);
console.log('Test 3: resolveRelaxationYears passed');

// Test 4: matchesEducation
assert.strictEqual(matchesEducation('B.Tech in Computer Science', ["Bachelor's degree in any discipline"]).matches, true);
assert.strictEqual(matchesEducation('M.Sc Mathematics', ["Bachelor's degree in any discipline"]).matches, true);
assert.strictEqual(matchesEducation('10+2 Intermediate', ["Bachelor's degree in any discipline"]).matches, false);
assert.strictEqual(matchesEducation('Graduation in Arts', ["Graduation"]).matches, true);
console.log('Test 4: matchesEducation passed');

// Test 5: matchesStream
assert.strictEqual(matchesStream('Civil Engineering', ['Any Discipline']).matches, true);
assert.strictEqual(matchesStream('Computer Science', ['Computer Science', 'Information Technology']).matches, true);
assert.strictEqual(matchesStream('Civil Engineering', ['Computer Science', 'Information Technology']).matches, false);
console.log('Test 5: matchesStream passed');

console.log('All prototype tests passed successfully!');
