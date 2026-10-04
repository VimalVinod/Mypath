'use strict';

/**
 * .agents/m3_explorer_1/test-full-declarative-engine.js
 * Comprehensive architectural prototype of src/services/validator/rules.js
 */

const assert = require('assert');

// ============================================================================
// 1. Safe Property & Type Utilities
// ============================================================================

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
    // Prevent prototype pollution or constructor access
    if (part === '__proto__' || part === 'prototype' || part === 'constructor') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

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

function normalizeStr(str) {
  return typeof str === 'string' ? str.trim().toLowerCase().replace(/['"`]/g, '') : '';
}

// ============================================================================
// 2. Rule Evaluation Return Contract
// ============================================================================

/**
 * Creates a standardized RuleEvaluationResult.
 * @param {Object} params
 * @param {string} params.field
 * @param {*} params.expected
 * @param {*} params.actual
 * @param {'PASS'|'FAIL'|'WARNING'} params.status
 * @param {string} params.reason
 * @returns {{ field: string, expected: any, actual: any, status: string, reason: string }}
 */
function createResult({ field, expected, actual, status, reason }) {
  return {
    field: field || 'unknown',
    expected: expected !== undefined ? expected : null,
    actual: actual !== undefined ? actual : null,
    status: status === 'PASS' || status === 'FAIL' || status === 'WARNING' ? status : 'FAIL',
    reason: typeof reason === 'string' ? reason : ''
  };
}

// ============================================================================
// 3. Category Aliases & Education Levels
// ============================================================================

const CATEGORY_ALIASES = {
  'SC': ['sc', 'scheduled caste', 'sc/st', 'sc & st', 'scheduled castes'],
  'ST': ['st', 'scheduled tribe', 'sc/st', 'sc & st', 'scheduled tribes'],
  'SC/ST': ['sc/st', 'sc & st', 'sc', 'st', 'scheduled caste', 'scheduled tribe'],
  'OBC': ['obc', 'other backward class', 'other backward classes', 'obc-ncl', 'obc (non-creamy layer)'],
  'EWS': ['ews', 'economically weaker section', 'economically weaker sections'],
  'PWBD': ['pwbd', 'pwd', 'persons with benchmark disabilities', 'physically handicapped', 'ph', 'divyang'],
  'EX-SERVICEMEN': ['ex-servicemen', 'esm', 'ex servicemen', 'ex-service personnel']
};

const EDUCATION_LEVELS = {
  'phd': 6,
  'ph.d': 6,
  'doctor': 6,
  'doctorate': 6,
  'master': 5,
  'post graduate': 5,
  'postgraduate': 5,
  'pg': 5,
  'm.tech': 5,
  'mtech': 5,
  'm.e': 5,
  'msc': 5,
  'm.sc': 5,
  'mca': 5,
  'mba': 5,
  'bachelor': 4,
  'undergraduate': 4,
  'b.tech': 4,
  'btech': 4,
  'b.e': 4,
  'bsc': 4,
  'b.sc': 4,
  'b.com': 4,
  'bcom': 4,
  'b.a': 4,
  'ba': 4,
  'bca': 4,
  'bba': 4,
  'mbbs': 4,
  'llb': 4,
  'b.ed': 4,
  'bed': 4,
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

// ============================================================================
// 4. Declarative Rule Evaluators
// ============================================================================

/**
 * 4.1 REQUIRED Rule
 */
function evaluateRequired(rule, actual, context) {
  const field = rule.field;
  const expected = 'non-empty value';
  const severity = rule.severity || 'error';
  const failStatus = severity === 'warning' ? 'WARNING' : 'FAIL';

  if (actual === null || actual === undefined) {
    return createResult({
      field,
      expected,
      actual,
      status: failStatus,
      reason: `Field '${field}' is required but was ${actual === null ? 'null' : 'undefined'}`
    });
  }

  if (typeof actual === 'string' && actual.trim() === '') {
    return createResult({
      field,
      expected,
      actual,
      status: failStatus,
      reason: `Field '${field}' is required but was empty string`
    });
  }

  if (Array.isArray(actual) && actual.length === 0 && !rule.allowEmptyArray) {
    return createResult({
      field,
      expected,
      actual,
      status: failStatus,
      reason: `Field '${field}' is required but was an empty array`
    });
  }

  return createResult({
    field,
    expected,
    actual,
    status: 'PASS',
    reason: `Field '${field}' is present and non-empty`
  });
}

/**
 * 4.2 EQUALS Rule
 */
function evaluateEquals(rule, actual, context) {
  const field = rule.field;
  const expected = rule.expected;
  const severity = rule.severity || 'error';
  const failStatus = severity === 'warning' ? 'WARNING' : 'FAIL';

  if (actual === null || actual === undefined) {
    if (rule.allowNull) {
      return createResult({
        field,
        expected,
        actual,
        status: 'WARNING',
        reason: `Field '${field}' is null (optional)`
      });
    }
    return createResult({
      field,
      expected,
      actual,
      status: failStatus,
      reason: `Field '${field}' is ${actual === null ? 'null' : 'undefined'}, expected '${expected}'`
    });
  }

  if (typeof expected === 'string' && typeof actual === 'string') {
    const actNorm = rule.ignoreCase !== false ? actual.trim().toLowerCase() : actual;
    const expNorm = rule.ignoreCase !== false ? expected.trim().toLowerCase() : expected;
    if (actNorm === expNorm) {
      return createResult({
        field,
        expected,
        actual,
        status: 'PASS',
        reason: `Field '${field}' matches expected value '${expected}'`
      });
    }
  } else if (actual === expected) {
    return createResult({
      field,
      expected,
      actual,
      status: 'PASS',
      reason: `Field '${field}' equals expected value`
    });
  }

  return createResult({
    field,
    expected,
    actual,
    status: failStatus,
    reason: `Field '${field}' value '${actual}' does not match expected '${expected}'`
  });
}

/**
 * 4.3 RANGE Rule
 */
function evaluateRange(rule, actual, context) {
  const field = rule.field;
  const min = rule.min !== undefined ? rule.min : -Infinity;
  const max = rule.max !== undefined ? rule.max : Infinity;
  const minInclusive = rule.minInclusive !== false;
  const maxInclusive = rule.maxInclusive !== false;
  const severity = rule.severity || 'error';
  const failStatus = severity === 'warning' ? 'WARNING' : 'FAIL';

  const expectedStr = `${min !== -Infinity ? (minInclusive ? '>=' : '>') + ' ' + min : ''}${min !== -Infinity && max !== Infinity ? ' and ' : ''}${max !== Infinity ? (maxInclusive ? '<=' : '<') + ' ' + max : ''}`;

  const num = parseNumberSafely(actual);
  if (num === null) {
    if (rule.allowNull && actual === null) {
      return createResult({
        field,
        expected: expectedStr,
        actual,
        status: 'WARNING',
        reason: `Field '${field}' is null (not specified in document)`
      });
    }
    return createResult({
      field,
      expected: expectedStr,
      actual,
      status: failStatus,
      reason: `Field '${field}' is not a valid number (received ${typeof actual === 'string' ? `"${actual}"` : actual})`
    });
  }

  const minPass = minInclusive ? num >= min : num > min;
  const maxPass = maxInclusive ? num <= max : num < max;

  if (!minPass) {
    return createResult({
      field,
      expected: expectedStr,
      actual: num,
      status: failStatus,
      reason: `Field '${field}' value ${num} is below minimum threshold ${min}`
    });
  }

  if (!maxPass) {
    return createResult({
      field,
      expected: expectedStr,
      actual: num,
      status: failStatus,
      reason: `Field '${field}' value ${num} exceeds maximum threshold ${max}`
    });
  }

  return createResult({
    field,
    expected: expectedStr,
    actual: num,
    status: 'PASS',
    reason: `Field '${field}' value ${num} is within expected range [${min !== -Infinity ? min : '-∞'}, ${max !== Infinity ? max : '+∞'}]`
  });
}

/**
 * 4.4 ENUM Rule
 */
function evaluateEnum(rule, actual, context) {
  const field = rule.field;
  const allowed = Array.isArray(rule.allowed) ? rule.allowed : [];
  const severity = rule.severity || 'error';
  const failStatus = severity === 'warning' ? 'WARNING' : 'FAIL';

  if (actual === null || actual === undefined) {
    if (rule.allowNull) {
      return createResult({
        field,
        expected: allowed,
        actual,
        status: 'WARNING',
        reason: `Field '${field}' is null (optional)`
      });
    }
    return createResult({
      field,
      expected: allowed,
      actual,
      status: failStatus,
      reason: `Field '${field}' is ${actual === null ? 'null' : 'undefined'}, expected one of [${allowed.join(', ')}]`
    });
  }

  const ignoreCase = rule.ignoreCase !== false;
  const actualStr = String(actual);

  const matched = allowed.some(val => {
    if (ignoreCase && typeof val === 'string') {
      return val.trim().toLowerCase() === actualStr.trim().toLowerCase();
    }
    return val === actual;
  });

  if (matched) {
    return createResult({
      field,
      expected: allowed,
      actual,
      status: 'PASS',
      reason: `Field '${field}' ('${actual}') is one of permitted values: [${allowed.join(', ')}]`
    });
  }

  return createResult({
    field,
    expected: allowed,
    actual,
    status: failStatus,
    reason: `Field '${field}' value '${actual}' is not in permitted set [${allowed.join(', ')}]`
  });
}

/**
 * 4.5 DATE_ORDER Rule
 */
function evaluateDateOrder(rule, actual, context) {
  const field = rule.field || `${rule.beforeField} <= ${rule.afterField}`;
  const root = context && context.root ? context.root : {};
  const beforeVal = rule.beforeField ? getNestedValue(root, rule.beforeField) : actual;
  const afterVal = rule.afterField ? getNestedValue(root, rule.afterField) : rule.afterDate;
  const allowEqual = rule.allowEqual !== false;
  const severity = rule.severity || 'error';
  const failStatus = severity === 'warning' ? 'WARNING' : 'FAIL';

  const beforeDate = parseIsoDateSafely(beforeVal);
  const afterDate = parseIsoDateSafely(afterVal);

  if (!beforeDate || !afterDate) {
    // If dates are null/missing
    if (rule.optional) {
      return createResult({
        field,
        expected: `${rule.beforeField} <= ${rule.afterField}`,
        actual: { before: beforeVal, after: afterVal },
        status: 'WARNING',
        reason: `One or both dates missing/unspecified: ${rule.beforeField}=${beforeVal}, ${rule.afterField}=${afterVal}`
      });
    }
    return createResult({
      field,
      expected: `${rule.beforeField} <= ${rule.afterField}`,
      actual: { before: beforeVal, after: afterVal },
      status: failStatus,
      reason: `Invalid or missing date format: ${!beforeDate ? `${rule.beforeField}="${beforeVal}"` : ''} ${!afterDate ? `${rule.afterField}="${afterVal}"` : ''}`
    });
  }

  const valid = allowEqual ? beforeDate.time <= afterDate.time : beforeDate.time < afterDate.time;

  if (valid) {
    return createResult({
      field,
      expected: `${rule.beforeField} <= ${rule.afterField}`,
      actual: `${beforeDate.dateStr} <= ${afterDate.dateStr}`,
      status: 'PASS',
      reason: `Date chronological order valid: ${rule.beforeField} (${beforeDate.dateStr}) is on or before ${rule.afterField} (${afterDate.dateStr})`
    });
  }

  return createResult({
    field,
    expected: `${rule.beforeField} <= ${rule.afterField}`,
    actual: `${beforeDate.dateStr} > ${afterDate.dateStr}`,
    status: failStatus,
    reason: `Chronological violation: ${rule.beforeField} (${beforeDate.dateStr}) occurs after ${rule.afterField} (${afterDate.dateStr})`
  });
}

/**
 * 4.6 REGEX Rule
 */
function evaluateRegex(rule, actual, context) {
  const field = rule.field;
  const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, rule.flags || 'i');
  const severity = rule.severity || 'error';
  const failStatus = severity === 'warning' ? 'WARNING' : 'FAIL';

  if (typeof actual !== 'string') {
    return createResult({
      field,
      expected: String(pattern),
      actual,
      status: failStatus,
      reason: `Field '${field}' is not a string (cannot test regex)`
    });
  }

  if (pattern.test(actual)) {
    return createResult({
      field,
      expected: String(pattern),
      actual,
      status: 'PASS',
      reason: `Field '${field}' matches pattern ${pattern}`
    });
  }

  return createResult({
    field,
    expected: String(pattern),
    actual,
    status: failStatus,
    reason: `Field '${field}' ("${actual}") does not match pattern ${pattern}`
  });
}

// ============================================================================
// 5. Candidate Eligibility Evaluator (Age + Relaxation + Education + Stream)
// ============================================================================

function resolveRelaxationYears(category, ageRelaxationList) {
  if (!category || !Array.isArray(ageRelaxationList) || ageRelaxationList.length === 0) {
    return 0;
  }
  const candCatNorm = normalizeStr(category);

  if (['general', 'gen', 'ur', 'unreserved'].includes(candCatNorm)) {
    return 0;
  }

  for (const rule of ageRelaxationList) {
    if (!rule || typeof rule !== 'object') continue;
    const ruleCatNorm = normalizeStr(rule.category);
    const years = parseNumberSafely(rule.years) || 0;

    if (ruleCatNorm === candCatNorm) {
      return years;
    }

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

function matchesEducation(candidateDegree, requiredEducationList) {
  if (!candidateDegree || typeof candidateDegree !== 'string') {
    return { matches: false, reason: 'Candidate education is missing or not a string' };
  }
  if (!Array.isArray(requiredEducationList) || requiredEducationList.length === 0) {
    return { matches: true, reason: 'No education requirements specified in notification' };
  }

  const candNorm = normalizeStr(candidateDegree);
  const candLevel = getEducationLevel(candidateDegree);

  for (const req of requiredEducationList) {
    const reqNorm = normalizeStr(req);
    const reqLevel = getEducationLevel(req);

    if (reqNorm.includes('any discipline') || reqNorm.includes('any graduate') || reqNorm.includes('graduation')) {
      if (candLevel >= 4) {
        return { matches: true, matchedReq: req };
      }
    }

    if (candNorm.includes(reqNorm) || reqNorm.includes(candNorm)) {
      return { matches: true, matchedReq: req };
    }

    if (reqLevel > 0 && candLevel >= reqLevel) {
      return { matches: true, matchedReq: req };
    }
  }

  return {
    matches: false,
    reason: `Candidate degree '${candidateDegree}' does not satisfy required education: [${requiredEducationList.join(', ')}]`
  };
}

function matchesStream(candidateStream, eligibleStreamsList) {
  if (!Array.isArray(eligibleStreamsList) || eligibleStreamsList.length === 0) {
    return { matches: true, reason: 'Open to all streams (no restriction specified)' };
  }

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

  return {
    matches: false,
    reason: `Candidate stream '${candidateStream}' is not in eligible streams: [${eligibleStreamsList.join(', ')}]`
  };
}

/**
 * Comprehensive Candidate Eligibility Evaluator.
 * @param {Object} eligibilityData Extracted eligibility from Gemini/Mock
 * @param {Object} candidateProfile Candidate details { age, category, education, stream }
 * @returns {{
 *   candidateEligibility: { isEligible: boolean, disqualifications: string[], matchedQualifications: string[] },
 *   evaluations: Array<{ field: string, expected: any, actual: any, status: string, reason: string }>
 * }}
 */
function evaluateCandidateEligibility(eligibilityData, candidateProfile) {
  const evaluations = [];
  const disqualifications = [];
  const matchedQualifications = [];

  const eligibility = eligibilityData || {};
  const candidate = candidateProfile || {};

  // 1. Evaluate Age
  const candAge = parseNumberSafely(candidate.age);
  const minAge = parseNumberSafely(eligibility.minAge);
  const maxAge = parseNumberSafely(eligibility.maxAge);
  const ageRelaxations = Array.isArray(eligibility.ageRelaxation) ? eligibility.ageRelaxation : [];
  const category = candidate.category || 'General';

  if (candAge === null) {
    evaluations.push(createResult({
      field: 'candidate.age',
      expected: 'numeric age',
      actual: candidate.age,
      status: 'FAIL',
      reason: 'Candidate age is missing or not a valid number'
    }));
    disqualifications.push('Candidate age is missing or invalid');
  } else {
    const relaxationYears = resolveRelaxationYears(category, ageRelaxations);
    const effectiveMaxAge = maxAge !== null ? maxAge + relaxationYears : null;

    let ageStatus = 'PASS';
    let ageReason = '';

    if (minAge !== null && candAge < minAge) {
      ageStatus = 'FAIL';
      ageReason = `Candidate age (${candAge}) is below the minimum required age of ${minAge}`;
      disqualifications.push(ageReason);
    } else if (effectiveMaxAge !== null && candAge > effectiveMaxAge) {
      ageStatus = 'FAIL';
      ageReason = `Candidate age (${candAge}) exceeds maximum permitted age of ${effectiveMaxAge} (base: ${maxAge} + ${relaxationYears} yrs ${category} relaxation)`;
      disqualifications.push(ageReason);
    } else {
      ageStatus = 'PASS';
      ageReason = `Candidate age (${candAge}) satisfies age criteria [${minAge !== null ? minAge : 'unspecified'}, ${effectiveMaxAge !== null ? effectiveMaxAge : 'unspecified'}] (category: ${category}, relaxation: +${relaxationYears} yrs)`;
      matchedQualifications.push(ageReason);
    }

    evaluations.push(createResult({
      field: 'candidate.age',
      expected: `min: ${minAge !== null ? minAge : 'none'}, max: ${effectiveMaxAge !== null ? effectiveMaxAge : 'none'} (base: ${maxAge !== null ? maxAge : 'none'} + ${relaxationYears} yrs for ${category})`,
      actual: candAge,
      status: ageStatus,
      reason: ageReason
    }));
  }

  // 2. Evaluate Education
  const reqEducation = Array.isArray(eligibility.requiredEducation) ? eligibility.requiredEducation : [];
  const candEdu = candidate.education || candidate.qualification;

  const eduCheck = matchesEducation(candEdu, reqEducation);
  if (eduCheck.matches) {
    const successReason = eduCheck.matchedReq
      ? `Candidate qualification '${candEdu}' satisfies required education '${eduCheck.matchedReq}'`
      : eduCheck.reason;
    evaluations.push(createResult({
      field: 'candidate.education',
      expected: reqEducation.length > 0 ? reqEducation : 'any education',
      actual: candEdu || null,
      status: 'PASS',
      reason: successReason
    }));
    matchedQualifications.push(successReason);
  } else {
    evaluations.push(createResult({
      field: 'candidate.education',
      expected: reqEducation,
      actual: candEdu || null,
      status: 'FAIL',
      reason: eduCheck.reason
    }));
    disqualifications.push(eduCheck.reason);
  }

  // 3. Evaluate Stream
  const eligibleStreams = Array.isArray(eligibility.eligibleStreams) ? eligibility.eligibleStreams : [];
  const candStream = candidate.stream;

  const streamCheck = matchesStream(candStream, eligibleStreams);
  if (streamCheck.matches) {
    const successReason = streamCheck.matchedStream
      ? `Candidate stream '${candStream}' matches eligible stream '${streamCheck.matchedStream}'`
      : streamCheck.reason;
    evaluations.push(createResult({
      field: 'candidate.stream',
      expected: eligibleStreams.length > 0 ? eligibleStreams : 'open to all',
      actual: candStream || 'unspecified',
      status: 'PASS',
      reason: successReason
    }));
    matchedQualifications.push(successReason);
  } else {
    evaluations.push(createResult({
      field: 'candidate.stream',
      expected: eligibleStreams,
      actual: candStream || 'unspecified',
      status: 'FAIL',
      reason: streamCheck.reason
    }));
    disqualifications.push(streamCheck.reason);
  }

  return {
    candidateEligibility: {
      isEligible: disqualifications.length === 0,
      disqualifications,
      matchedQualifications
    },
    evaluations
  };
}

// ============================================================================
// 6. Declarative Rule Registry
// ============================================================================

const RULE_EVALUATORS = {
  'required': evaluateRequired,
  'equals': evaluateEquals,
  'exact': evaluateEquals,
  'range': evaluateRange,
  'enum': evaluateEnum,
  'dateOrder': evaluateDateOrder,
  'regex': evaluateRegex
};

class RuleRegistry {
  constructor() {
    this.evaluators = new Map();
    for (const [key, fn] of Object.entries(RULE_EVALUATORS)) {
      this.register(key, fn);
    }
  }

  register(ruleType, evaluatorFn) {
    if (typeof ruleType !== 'string' || typeof evaluatorFn !== 'function') {
      throw new Error('Invalid arguments to register: ruleType must be string, evaluatorFn must be function');
    }
    this.evaluators.set(ruleType.toLowerCase(), evaluatorFn);
  }

  has(ruleType) {
    return typeof ruleType === 'string' && this.evaluators.has(ruleType.toLowerCase());
  }

  get(ruleType) {
    return typeof ruleType === 'string' ? this.evaluators.get(ruleType.toLowerCase()) : undefined;
  }

  evaluate(rule, actualValue, context) {
    if (!rule || typeof rule !== 'object') {
      return createResult({
        field: 'unknown',
        expected: null,
        actual: actualValue,
        status: 'FAIL',
        reason: 'Rule definition is invalid or null'
      });
    }

    const type = (rule.type || '').toLowerCase();
    const evaluator = this.evaluators.get(type);

    if (!evaluator) {
      return createResult({
        field: rule.field || 'unknown',
        expected: rule.expected || null,
        actual: actualValue,
        status: 'WARNING',
        reason: `Unknown rule type: '${rule.type}'`
      });
    }

    try {
      return evaluator(rule, actualValue, context);
    } catch (err) {
      return createResult({
        field: rule.field || 'unknown',
        expected: rule.expected || null,
        actual: actualValue,
        status: 'FAIL',
        reason: `Rule execution failed with error: ${err.message}`
      });
    }
  }
}

const defaultRegistry = new RuleRegistry();

// ============================================================================
// 7. Testing Suite
// ============================================================================

console.log('Running comprehensive rule engine tests...');

// Canonical benchmark fixture data
const canonicalNotification = {
  examTitle: 'COMBINED CIVIL SERVICES EXAMINATION 2026',
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  eligibility: {
    minAge: 21,
    maxAge: 32,
    ageRelaxation: [
      { category: 'SC/ST', years: 5 },
      { category: 'OBC', years: 3 }
    ],
    requiredEducation: ["Bachelor's degree in any discipline"],
    eligibleStreams: ['Any Discipline']
  },
  importantDates: {
    applicationStartDate: '2026-01-10',
    applicationEndDate: '2026-02-15',
    examDate: '2026-05-24'
  },
  vacancies: 1056,
  applicationFee: {
    general: 100,
    reserved: 0
  },
  status: 'ACTIVE'
};

// Test Suite 1: Rule Registry & Primitives
const resReq = defaultRegistry.evaluate(
  { type: 'required', field: 'organization' },
  canonicalNotification.organization
);
assert.strictEqual(resReq.status, 'PASS');

const resEnum = defaultRegistry.evaluate(
  { type: 'enum', field: 'status', allowed: ['ACTIVE', 'UPCOMING'] },
  canonicalNotification.status
);
assert.strictEqual(resEnum.status, 'PASS');

const resRange = defaultRegistry.evaluate(
  { type: 'range', field: 'vacancies', min: 500, max: 2000 },
  canonicalNotification.vacancies
);
assert.strictEqual(resRange.status, 'PASS');

const resDate = defaultRegistry.evaluate(
  { type: 'dateOrder', beforeField: 'importantDates.applicationStartDate', afterField: 'importantDates.applicationEndDate' },
  null,
  { root: canonicalNotification }
);
assert.strictEqual(resDate.status, 'PASS');
console.log('✓ Suite 1: Primitive rule evaluations passed');

// Test Suite 2: Candidate Eligibility Scenarios
// Scenario A: General candidate, age 28, B.Tech -> Eligible
const candA = { age: 28, category: 'General', education: "Bachelor of Technology in Computer Science", stream: "Computer Science" };
const resCandA = evaluateCandidateEligibility(canonicalNotification.eligibility, candA);
assert.strictEqual(resCandA.candidateEligibility.isEligible, true);
assert.strictEqual(resCandA.candidateEligibility.disqualifications.length, 0);
console.log('✓ Suite 2A: General eligible candidate passed');

// Scenario B: OBC candidate, age 34 (exceeds maxAge 32, but 32 + 3 = 35) -> Eligible!
const candB = { age: 34, category: 'OBC', education: "Bachelor of Commerce", stream: "Commerce" };
const resCandB = evaluateCandidateEligibility(canonicalNotification.eligibility, candB);
assert.strictEqual(resCandB.candidateEligibility.isEligible, true);
assert.strictEqual(resCandB.candidateEligibility.disqualifications.length, 0);
console.log('✓ Suite 2B: OBC relaxed eligible candidate passed');

// Scenario C: SC candidate, age 38 (exceeds maxAge 32 + 5 = 37) -> Disqualified (overage)
const candC = { age: 38, category: 'SC', education: "Bachelor of Arts", stream: "Arts" };
const resCandC = evaluateCandidateEligibility(canonicalNotification.eligibility, candC);
assert.strictEqual(resCandC.candidateEligibility.isEligible, false);
assert.ok(resCandC.candidateEligibility.disqualifications.some(d => d.includes('exceeds maximum permitted age')));
console.log('✓ Suite 2C: SC overage candidate correctly disqualified');

// Scenario D: Underage candidate (age 20 < minAge 21) -> Disqualified (underage)
const candD = { age: 20, category: 'General', education: "Bachelor of Science", stream: "Science" };
const resCandD = evaluateCandidateEligibility(canonicalNotification.eligibility, candD);
assert.strictEqual(resCandD.candidateEligibility.isEligible, false);
assert.ok(resCandD.candidateEligibility.disqualifications.some(d => d.includes('below the minimum required age')));
console.log('✓ Suite 2D: Underage candidate correctly disqualified');

// Scenario E: Ineligible Education (10+2 when Bachelor's required) -> Disqualified
const candE = { age: 25, category: 'General', education: "10+2 Intermediate", stream: "Science" };
const resCandE = evaluateCandidateEligibility(canonicalNotification.eligibility, candE);
assert.strictEqual(resCandE.candidateEligibility.isEligible, false);
assert.ok(resCandE.candidateEligibility.disqualifications.some(d => d.includes('does not satisfy required education')));
console.log('✓ Suite 2E: Ineligible education correctly disqualified');

// Test Suite 3: Safe Evaluation & Null Resilience
const emptyRes = evaluateCandidateEligibility(null, null);
assert.strictEqual(emptyRes.candidateEligibility.isEligible, false);
assert.ok(emptyRes.evaluations.length > 0);

const corruptDateRes = defaultRegistry.evaluate(
  { type: 'dateOrder', beforeField: 'startDate', afterField: 'endDate' },
  null,
  { root: { startDate: '2026-02-31', endDate: '2026-01-01' } }
);
assert.strictEqual(corruptDateRes.status, 'FAIL');
console.log('✓ Suite 3: Null resilience and date corruption handled cleanly');

console.log('\nAll comprehensive tests passed with 100% success!');

module.exports = {
  getNestedValue,
  parseNumberSafely,
  parseIsoDateSafely,
  normalizeStr,
  createResult,
  resolveRelaxationYears,
  getEducationLevel,
  matchesEducation,
  matchesStream,
  evaluateRequired,
  evaluateEquals,
  evaluateRange,
  evaluateEnum,
  evaluateDateOrder,
  evaluateRegex,
  evaluateCandidateEligibility,
  RuleRegistry,
  defaultRegistry,
  canonicalNotification
};
