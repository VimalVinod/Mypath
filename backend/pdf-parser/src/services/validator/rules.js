'use strict';

/**
 * src/services/validator/rules.js
 * Declarative validation rules engine and candidate eligibility matcher.
 * Conforms 100% to Interface Contract #3 in PROJECT.md and Requirements §R3, §R4.
 */

// ============================================================================
// 1. Safe Property & Type Utilities
// ============================================================================

/**
 * Safely traverses nested properties using dot notation with prototype pollution protection.
 * @param {Object} obj - Target object
 * @param {string} path - Dot-delimited path (e.g. "eligibility.minAge")
 * @returns {*} Resolved value or undefined
 */
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
    // Block prototype pollution or constructor access
    if (part === '__proto__' || part === 'prototype' || part === 'constructor') {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Safely parses numeric inputs, preserving 0 while rejecting NaN, Infinity, and empty strings.
 * @param {*} val
 * @returns {number|null}
 */
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

/**
 * Strict ISO 8601 calendar date parser (YYYY-MM-DD) with rollover prevention.
 * Rejects invalid calendar dates such as 2026-02-31 or 2025-02-29.
 * @param {*} val
 * @returns {{ date: Date, dateStr: string, time: number }|null}
 */
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

/**
 * Normalizes string for case-insensitive, punctuation-resilient comparison.
 * @param {*} str
 * @returns {string}
 */
function normalizeStr(str) {
  return typeof str === 'string' ? str.trim().toLowerCase().replace(/['"`]/g, '') : '';
}

// ============================================================================
// 2. Rule Evaluation Return Contract Generator
// ============================================================================

/**
 * Creates a standardized RuleEvaluationResult strictly conforming to Interface Contract #3.
 * @param {Object} params
 * @param {string} params.field
 * @param {*} params.expected
 * @param {*} params.actual
 * @param {'PASS'|'FAIL'|'WARNING'} params.status
 * @param {string} params.reason
 * @returns {{ field: string, expected: any, actual: any, status: 'PASS'|'FAIL'|'WARNING', reason: string }}
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
// 3. Category Aliases & Education Hierarchy Taxonomies
// ============================================================================

const CATEGORY_ALIASES = {
  'SC': ['sc', 'scheduled caste', 'scheduled castes'],
  'ST': ['st', 'scheduled tribe', 'scheduled tribes'],
  'SC/ST': ['sc/st', 'sc & st', 'sc / st', 'sc/ st'],
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
  'me': 5,
  'msc': 5,
  'm.sc': 5,
  'mca': 5,
  'mba': 5,
  'm.com': 5,
  'mcom': 5,
  'm.a': 5,
  'ma': 5,
  'ms': 5,
  'm.s': 5,
  'bachelor': 4,
  'undergraduate': 4,
  'b.tech': 4,
  'btech': 4,
  'b.e': 4,
  'be': 4,
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
  'bs': 4,
  'b.s': 4,
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

/**
 * Returns numeric hierarchy level for an educational qualification (1 = 10th, 6 = PhD).
 * Uses word-boundary matching for short acronyms (<= 4 chars) to prevent false positives
 * (e.g., 'embedded' matching 'bed', 'ballroom' matching 'ba', 'upgrade' matching 'pg').
 * @param {string} eduStr
 * @returns {number}
 */
function getEducationLevel(eduStr) {
  const norm = normalizeStr(eduStr);
  if (!norm) return 0;
  let highestLevel = 0;
  for (const [term, level] of Object.entries(EDUCATION_LEVELS)) {
    let matched = false;
    if (term.length <= 4 && /^[a-z0-9]+$/i.test(term)) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      matched = regex.test(norm);
    } else {
      matched = norm.includes(term);
    }

    if (matched && level > highestLevel) {
      highestLevel = level;
    }
  }
  return highestLevel;
}

// ============================================================================
// 4. Primitive Rule Evaluators
// ============================================================================

/**
 * 4.1 REQUIRED Rule
 */
function evaluateRequired(rule, actual, context) {
  const field = rule.field;
  const expected = 'non-empty value';
  const severity = String(rule.severity || 'error').toLowerCase();
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
 * 4.2 EQUALS / EXACT Rule
 */
function evaluateEquals(rule, actual, context) {
  const field = rule.field;
  const expected = rule.expected;
  const severity = String(rule.severity || 'error').toLowerCase();
  const failStatus = (severity === 'warning' || severity === 'warn') ? 'WARNING' : 'FAIL';

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
 * 4.3 RANGE / MIN / MAX Rule
 */
function evaluateRange(rule, actual, context) {
  const field = rule.field;
  let min = rule.min !== undefined ? rule.min : -Infinity;
  let max = rule.max !== undefined ? rule.max : Infinity;

  // Support shorthand expected for min/max rule types
  const type = String(rule.type || rule.rule || '').toLowerCase();
  if (type === 'min' && rule.expected !== undefined && min === -Infinity) {
    min = rule.expected;
  } else if (type === 'max' && rule.expected !== undefined && max === Infinity) {
    max = rule.expected;
  }

  const minInclusive = rule.minInclusive !== false;
  const maxInclusive = rule.maxInclusive !== false;
  const severity = String(rule.severity || 'error').toLowerCase();
  const failStatus = (severity === 'warning' || severity === 'warn') ? 'WARNING' : 'FAIL';

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
 * 4.4 ENUM / IN Rule
 */
function evaluateEnum(rule, actual, context) {
  const field = rule.field;
  const allowed = Array.isArray(rule.allowed)
    ? rule.allowed
    : (Array.isArray(rule.expected) ? rule.expected : (rule.expected !== undefined ? [rule.expected] : []));
  const severity = String(rule.severity || 'error').toLowerCase();
  const failStatus = (severity === 'warning' || severity === 'warn') ? 'WARNING' : 'FAIL';

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
 * 4.5 CONTAINS / SUBSTRING Rule
 */
function evaluateContains(rule, actual, context) {
  const field = rule.field;
  const expected = rule.expected !== undefined ? rule.expected : '';
  const severity = String(rule.severity || 'error').toLowerCase();
  const failStatus = (severity === 'warning' || severity === 'warn') ? 'WARNING' : 'FAIL';

  if (actual === null || actual === undefined) {
    if (rule.allowNull) {
      return createResult({
        field,
        expected: `contains '${expected}'`,
        actual,
        status: 'WARNING',
        reason: `Field '${field}' is null (optional)`
      });
    }
    return createResult({
      field,
      expected: `contains '${expected}'`,
      actual,
      status: failStatus,
      reason: `Field '${field}' is ${actual === null ? 'null' : 'undefined'}`
    });
  }

  const actStr = String(actual);
  const expStr = String(expected);
  const ignoreCase = rule.ignoreCase !== false;

  const actComp = ignoreCase ? actStr.toLowerCase() : actStr;
  const expComp = ignoreCase ? expStr.toLowerCase() : expStr;

  const matched = actComp.includes(expComp) || expComp.includes(actComp);

  if (matched) {
    return createResult({
      field,
      expected: `contains '${expected}'`,
      actual,
      status: 'PASS',
      reason: `Field '${field}' contains '${expected}'`
    });
  }

  return createResult({
    field,
    expected: `contains '${expected}'`,
    actual,
    status: failStatus,
    reason: `Field '${field}' ('${actual}') does not contain expected substring '${expected}'`
  });
}

/**
 * 4.6 DATE_ORDER Rule
 */
function evaluateDateOrder(rule, actual, context) {
  const field = rule.field || `${rule.beforeField || 'beforeDate'} <= ${rule.afterField || 'afterDate'}`;
  const root = context && context.root ? context.root : {};
  const beforeVal = rule.beforeField ? getNestedValue(root, rule.beforeField) : (actual !== undefined ? actual : rule.beforeDate);
  const afterVal = rule.afterField ? getNestedValue(root, rule.afterField) : rule.afterDate;
  const allowEqual = rule.allowEqual !== false;
  const severity = String(rule.severity || 'error').toLowerCase();
  const failStatus = (severity === 'warning' || severity === 'warn') ? 'WARNING' : 'FAIL';

  const beforeDate = parseIsoDateSafely(beforeVal);
  const afterDate = parseIsoDateSafely(afterVal);

  if (!beforeDate || !afterDate) {
    if (rule.optional || rule.allowNull) {
      return createResult({
        field,
        expected: `${rule.beforeField || 'beforeDate'} <= ${rule.afterField || 'afterDate'}`,
        actual: { before: beforeVal, after: afterVal },
        status: 'WARNING',
        reason: `One or both dates missing/unspecified: ${rule.beforeField || 'before'}=${beforeVal}, ${rule.afterField || 'after'}=${afterVal}`
      });
    }
    return createResult({
      field,
      expected: `${rule.beforeField || 'beforeDate'} <= ${rule.afterField || 'afterDate'}`,
      actual: { before: beforeVal, after: afterVal },
      status: failStatus,
      reason: `Invalid or missing date format: ${!beforeDate ? `${rule.beforeField || 'before'}="${beforeVal}"` : ''} ${!afterDate ? `${rule.afterField || 'after'}="${afterVal}"` : ''}`
    });
  }

  const valid = allowEqual ? beforeDate.time <= afterDate.time : beforeDate.time < afterDate.time;

  if (valid) {
    return createResult({
      field,
      expected: `${rule.beforeField || 'before'} <= ${rule.afterField || 'after'}`,
      actual: `${beforeDate.dateStr} <= ${afterDate.dateStr}`,
      status: 'PASS',
      reason: `Date chronological order valid: ${rule.beforeField || 'before'} (${beforeDate.dateStr}) is on or before ${rule.afterField || 'after'} (${afterDate.dateStr})`
    });
  }

  return createResult({
    field,
    expected: `${rule.beforeField || 'before'} <= ${rule.afterField || 'after'}`,
    actual: `${beforeDate.dateStr} > ${afterDate.dateStr}`,
    status: failStatus,
    reason: `Chronological violation: ${rule.beforeField || 'before'} (${beforeDate.dateStr}) occurs after ${rule.afterField || 'after'} (${afterDate.dateStr})`
  });
}

/**
 * 4.7 REGEX Rule
 */
function evaluateRegex(rule, actual, context) {
  const field = rule.field;
  const pattern = rule.pattern instanceof RegExp
    ? rule.pattern
    : (rule.expected instanceof RegExp ? rule.expected : new RegExp(rule.pattern || rule.expected, rule.flags || 'i'));
  const severity = String(rule.severity || 'error').toLowerCase();
  const failStatus = (severity === 'warning' || severity === 'warn') ? 'WARNING' : 'FAIL';

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

/**
 * 4.8 CUSTOM Rule
 */
function evaluateCustom(rule, actual, context) {
  const field = rule.field || 'custom';
  const fn = typeof rule.validator === 'function' ? rule.validator : (typeof rule.fn === 'function' ? rule.fn : null);

  if (!fn) {
    return createResult({
      field,
      expected: 'Custom validator function',
      actual,
      status: 'FAIL',
      reason: 'No validator function provided for custom rule'
    });
  }

  try {
    const res = fn(actual, context);
    if (res && typeof res === 'object' && res.status) {
      return createResult({
        field: res.field || field,
        expected: res.expected !== undefined ? res.expected : rule.expected,
        actual: res.actual !== undefined ? res.actual : actual,
        status: res.status,
        reason: res.reason || 'Custom check evaluated'
      });
    }
    const passed = Boolean(res);
    return createResult({
      field,
      expected: rule.expected !== undefined ? rule.expected : 'Custom condition met',
      actual,
      status: passed ? 'PASS' : 'FAIL',
      reason: passed ? 'Custom rule check passed' : 'Custom rule check failed'
    });
  } catch (err) {
    return createResult({
      field,
      expected: 'Custom validator execution',
      actual,
      status: 'FAIL',
      reason: `Custom validator error: ${err.message}`
    });
  }
}

// ============================================================================
// 5. Candidate Eligibility Matching Logic
// ============================================================================

/**
 * Resolves standard canonical category keys for a given category string.
 * Handles exclusions (e.g. OBC Creamy Layer, Non-OBC), word boundaries for short acronyms,
 * and composite categories (e.g. 'SC + PwBD').
 * @param {string} catStr
 * @returns {Set<string>}
 */
function extractCanonicalCategories(catStr) {
  const norm = normalizeStr(catStr);
  const matched = new Set();
  if (!norm) return matched;

  // Unreserved / General check
  if (['general', 'gen', 'ur', 'unreserved'].includes(norm)) {
    return matched;
  }

  // Explicit Non-OBC or OBC Creamy Layer (OBC-CL) check
  const isObcExcluded = norm.includes('non-obc') ||
    norm.includes('non obc') ||
    norm.includes('creamy layer') ||
    /\bobc\s*[-–]\s*cl\b/i.test(norm) ||
    norm === 'obc-cl';

  // Check SC/ST combined
  if (/\bsc\s*[/&]\s*st\b/i.test(norm) || norm.includes('scheduled caste/scheduled tribe')) {
    matched.add('SC');
    matched.add('ST');
    matched.add('SC/ST');
  } else {
    // Check SC with word boundary or scheduled caste
    if (/\bsc\b/i.test(norm) || norm.includes('scheduled caste')) {
      matched.add('SC');
    }
    // Check ST with word boundary or scheduled tribe
    if (/\bst\b/i.test(norm) || norm.includes('scheduled tribe')) {
      matched.add('ST');
    }
  }

  // Check OBC
  if (!isObcExcluded) {
    if (/\bobc\b/i.test(norm) || norm.includes('other backward class') || norm.includes('obc-ncl')) {
      matched.add('OBC');
    }
  }

  // Check EWS
  if (/\bews\b/i.test(norm) || norm.includes('economically weaker')) {
    matched.add('EWS');
  }

  // Check PwBD / PWD
  if (/\b(pwbd|pwd|ph)\b/i.test(norm) || norm.includes('benchmark disab') || norm.includes('physically handicapped') || norm.includes('divyang')) {
    matched.add('PWBD');
  }

  // Check Ex-Servicemen
  if (/\besm\b/i.test(norm) || norm.includes('ex-servicemen') || norm.includes('ex servicemen') || norm.includes('ex-service')) {
    matched.add('EX-SERVICEMEN');
  }

  return matched;
}

/**
 * Resolves statutory age relaxation years based on category and notification rules.
 * @param {string} category Candidate reservation category
 * @param {Array<{ category: string, years: number }>} ageRelaxationList Notification relaxation rules
 * @returns {number} Permitted relaxation years (defaults to 0)
 */
function resolveRelaxationYears(category, ageRelaxationList) {
  if (!category || !Array.isArray(ageRelaxationList) || ageRelaxationList.length === 0) {
    return 0;
  }
  const candCatNorm = normalizeStr(category);

  if (['general', 'gen', 'ur', 'unreserved'].includes(candCatNorm)) {
    return 0;
  }

  if (candCatNorm === 'obc-cl' || candCatNorm === 'non-obc') {
    return 0;
  }

  const candCats = extractCanonicalCategories(category);

  let maxYears = 0;

  for (const rule of ageRelaxationList) {
    if (!rule || typeof rule !== 'object') continue;
    const ruleCatNorm = normalizeStr(rule.category);
    const years = parseNumberSafely(rule.years) || 0;
    if (years <= 0) continue;

    // Direct exact match
    if (ruleCatNorm === candCatNorm) {
      maxYears = Math.max(maxYears, years);
      continue;
    }

    const ruleCats = extractCanonicalCategories(rule.category);

    // If rule specifies 'SC/ST', it applies to candidates with 'SC' or 'ST' or 'SC/ST'
    if (ruleCats.has('SC/ST')) {
      if (candCats.has('SC') || candCats.has('ST') || candCats.has('SC/ST')) {
        maxYears = Math.max(maxYears, years);
        continue;
      }
    }

    // Check overlap of categories between candidate and rule
    let hasOverlap = false;
    for (const c of candCats) {
      if (ruleCats.has(c)) {
        hasOverlap = true;
        break;
      }
    }

    if (hasOverlap) {
      maxYears = Math.max(maxYears, years);
    }
  }

  return maxYears;
}

/**
 * Detects degree domain for specialized degree matching.
 * @param {string} str
 * @returns {string} Domain key or 'general'
 */
function getDegreeDomain(str) {
  const norm = normalizeStr(str);
  if (/\b(b\.?tech|btech|b\.?e\b|\bbe\b|m\.?tech|mtech|m\.?e\b|\bme\b|engineering|technology)\b/i.test(norm)) {
    return 'engineering';
  }
  if (/\b(mbbs|bds|bams|bhms|md|medicine|medical|dental|surgery)\b/i.test(norm)) {
    return 'medicine';
  }
  if (/\b(llb|llm|law)\b/i.test(norm)) {
    return 'law';
  }
  if (/\b(b\.?ed\b|\bbed\b|m\.?ed\b|\bmed\b)\b/i.test(norm)) {
    return 'education';
  }
  if (/\b(b\.?com|bcom|m\.?com|mcom|bba|mba|commerce|accountancy|ca)\b/i.test(norm)) {
    return 'commerce';
  }
  if (/\b(b\.?a\b|\bba\b|m\.?a\b|\bma\b|arts|humanities|history|sociology|political science|sanskrit|literature)\b/i.test(norm)) {
    return 'arts';
  }
  if (/\b(b\.?sc|bsc|m\.?sc|msc|bca|mca|science|physics|chemistry|mathematics)\b/i.test(norm)) {
    return 'science';
  }
  return 'general';
}

/**
 * Determines whether a required education specification is open to any graduation discipline.
 * @param {string} reqNorm
 * @returns {boolean}
 */
function isOpenRequirement(reqNorm) {
  if (reqNorm.includes('any discipline') || reqNorm.includes('any graduate') || reqNorm.includes('any graduation') ||
      reqNorm.includes('any stream') || reqNorm.includes('any subject') || reqNorm.includes('any field')) {
    return true;
  }
  const clean = reqNorm.replace(/['"`]/g, '').trim();
  if (/^(bachelor('?s)?(\s+degree)?|graduation|graduate|degree|university degree)$/i.test(clean)) {
    return true;
  }
  if (/^bachelor('?s)?\s+degree\s+(from|in)\s+(a\s+)?recognized\s+university$/i.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Evaluates candidate degree against required education list with hierarchical equivalence.
 * @param {string} candidateDegree
 * @param {string[]} requiredEducationList
 * @returns {{ matches: boolean, matchedReq?: string, reason: string }}
 */
function matchesEducation(candidateDegree, requiredEducationList) {
  if (!candidateDegree || typeof candidateDegree !== 'string') {
    return { matches: false, reason: 'Candidate education qualification is missing or invalid' };
  }
  if (!Array.isArray(requiredEducationList) || requiredEducationList.length === 0) {
    return { matches: true, reason: 'No education requirements specified in notification' };
  }

  const candNorm = normalizeStr(candidateDegree);
  const candLevel = getEducationLevel(candidateDegree);
  const candDomain = getDegreeDomain(candidateDegree);

  // Check graduate / bachelor keywords
  const isGradLevel = candLevel >= 4 || /bachelor|graduate|graduation|b\.tech|b\.e|\bbe\b|b\.sc|b\.com|b\.a|\bba\b|mbbs|degree/i.test(candidateDegree);
  const isPostGrad = candLevel >= 5 || /master|postgraduate|m\.tech|m\.e|\bme\b|m\.sc|m\.com|m\.a|\bma\b|mba|doctorate|phd/i.test(candidateDegree);

  for (const req of requiredEducationList) {
    const reqNorm = normalizeStr(req);
    const reqLevel = getEducationLevel(req);
    const reqDomain = getDegreeDomain(req);

    // 1. Check open general degree requirement (e.g. Bachelor's in any discipline)
    if (isOpenRequirement(reqNorm)) {
      if (isGradLevel || isPostGrad) {
        return { matches: true, matchedReq: req, reason: `Candidate degree '${candidateDegree}' satisfies '${req}'` };
      }
    }

    // 2. Intermediate / 10+2 open requirement
    if (reqNorm.includes('10+2') || reqNorm.includes('higher secondary') || reqNorm.includes('intermediate')) {
      if (candLevel >= 2 || isGradLevel || isPostGrad) {
        return { matches: true, matchedReq: req, reason: `Candidate qualification satisfies '${req}'` };
      }
    }

    // 3. 10th / Matriculation open requirement
    if (reqNorm.includes('10th') || reqNorm.includes('matriculation') || reqNorm.includes('secondary')) {
      if (candLevel >= 1 || isGradLevel || isPostGrad) {
        return { matches: true, matchedReq: req, reason: `Candidate qualification satisfies '${req}'` };
      }
    }

    // 4. Specialized requirements: check domain compatibility
    if (reqDomain !== 'general' && candDomain !== 'general' && reqDomain !== candDomain) {
      continue; // Domain mismatch (e.g. arts vs engineering, medicine vs engineering)
    }

    // 5. Engineering specialization matching (e.g. 'BE in Civil' matching 'B.E.' or 'B.Tech' or 'Bachelor of Engineering')
    if (reqDomain === 'engineering' && candDomain === 'engineering') {
      const branches = ['civil', 'mechanical', 'electrical', 'computer', 'electronics', 'chemical', 'aeronautical', 'metallurgy', 'mining'];
      const reqBranches = branches.filter(b => reqNorm.includes(b));
      const candBranches = branches.filter(b => candNorm.includes(b));

      if (reqBranches.length > 0 && candBranches.length > 0) {
        const branchMatch = reqBranches.some(b => candBranches.includes(b));
        if (branchMatch && (candLevel >= reqLevel || isGradLevel)) {
          return { matches: true, matchedReq: req, reason: `Candidate degree '${candidateDegree}' satisfies '${req}'` };
        }
        continue; // Branch mismatch
      }

      if (reqBranches.length > 0 && candBranches.length === 0) {
        continue;
      }

      if (candLevel >= reqLevel || isGradLevel) {
        return { matches: true, matchedReq: req, reason: `Candidate degree '${candidateDegree}' satisfies '${req}'` };
      }
    }

    // 6. Direct string containment (when domains match or are general)
    if (candNorm.includes(reqNorm) || reqNorm.includes(candNorm)) {
      return { matches: true, matchedReq: req, reason: `Candidate qualification matches '${req}'` };
    }

    // 7. Same domain with sufficient level
    if (reqDomain === candDomain && reqLevel > 0 && candLevel >= reqLevel) {
      return { matches: true, matchedReq: req, reason: `Candidate qualification level (${candLevel}) satisfies required level (${reqLevel})` };
    }
  }

  return {
    matches: false,
    reason: `Candidate degree '${candidateDegree}' does not satisfy required education: [${requiredEducationList.join(', ')}]`
  };
}

/**
 * Evaluates candidate stream against eligible streams list.
 * @param {string} candidateStream
 * @param {string[]} eligibleStreamsList
 * @returns {{ matches: boolean, matchedStream?: string, reason: string }}
 */
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
      return { matches: true, matchedStream: stream, reason: `Candidate stream '${candidateStream}' matches '${stream}'` };
    }
  }

  return {
    matches: false,
    reason: `Candidate stream '${candidateStream}' is not in eligible streams: [${eligibleStreamsList.join(', ')}]`
  };
}

/**
 * Comprehensive Candidate Eligibility Evaluator (Age + Category Relaxation + Education + Stream).
 * @param {Object} eligibilityData Extracted eligibility from Gemini
 * @param {Object} candidateProfile Candidate details
 * @returns {{
 *   candidateEligibility: { isEligible: boolean, disqualifications: string[], matchedQualifications: string[] },
 *   evaluations: Array<{ field: string, expected: any, actual: any, status: 'PASS'|'FAIL'|'WARNING', reason: string }>
 * }}
 */
function evaluateCandidateEligibility(eligibilityData, candidateProfile) {
  const evaluations = [];
  const disqualifications = [];
  const matchedQualifications = [];

  const eligibility = eligibilityData || {};
  const candidate = candidateProfile || {};

  // 1. Evaluate Age with Statutory Relaxation
  let candAge = parseNumberSafely(candidate.age);

  // If age is omitted or null, attempt derivation from DOB
  if (candAge === null && (candidate.age === undefined || candidate.age === null) && candidate.dob && /^\d{4}-\d{2}-\d{2}$/.test(candidate.dob)) {
    const parsedDob = parseIsoDateSafely(candidate.dob);
    if (parsedDob) {
      const refDate = new Date();
      let age = refDate.getUTCFullYear() - parsedDob.date.getUTCFullYear();
      const mDiff = refDate.getUTCMonth() - parsedDob.date.getUTCMonth();
      if (mDiff < 0 || (mDiff === 0 && refDate.getUTCDate() < parsedDob.date.getUTCDate())) {
        age--;
      }
      candAge = age;
    }
  }

  const minAge = parseNumberSafely(eligibility.minAge);
  const maxAge = parseNumberSafely(eligibility.maxAge);
  const ageRelaxations = Array.isArray(eligibility.ageRelaxation) ? eligibility.ageRelaxation : [];
  const category = candidate.category || 'General';

  if (candAge === null || candAge <= 0) {
    evaluations.push(createResult({
      field: 'candidate.age',
      expected: 'Valid positive numeric age',
      actual: candidate.age,
      status: 'FAIL',
      reason: 'Candidate age must be a positive integer'
    }));
    disqualifications.push('Candidate age must be a positive integer');
  } else {
    const relaxationYears = resolveRelaxationYears(category, ageRelaxations);
    const effectiveMaxAge = maxAge !== null ? maxAge + relaxationYears : null;

    let ageStatus = 'PASS';
    let ageReason = '';

    // Statutory rule: Category relaxation NEVER reduces the minimum required age
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

  // 2. Evaluate Education Qualification
  const reqEducation = Array.isArray(eligibility.requiredEducation) ? eligibility.requiredEducation : [];
  const candEdu = candidate.education || candidate.degree || candidate.qualification;

  if (reqEducation.length > 0 || candEdu) {
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
  }

  // 3. Evaluate Stream / Discipline
  const eligibleStreams = Array.isArray(eligibility.eligibleStreams) ? eligibility.eligibleStreams : [];
  const candStream = candidate.stream;

  if (eligibleStreams.length > 0 || candStream) {
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
// 6. Declarative Rule Registry & Dispatcher
// ============================================================================

const RULE_EVALUATORS = {
  'required': evaluateRequired,
  'equals': evaluateEquals,
  'exact': evaluateEquals,
  'range': evaluateRange,
  'min': evaluateRange,
  'max': evaluateRange,
  'enum': evaluateEnum,
  'in': evaluateEnum,
  'contains': evaluateContains,
  'includes': evaluateContains,
  'dateorder': evaluateDateOrder,
  'date_order': evaluateDateOrder,
  'date': evaluateDateOrder,
  'regex': evaluateRegex,
  'pattern': evaluateRegex,
  'custom': evaluateCustom
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

    const type = (rule.type || rule.rule || '').toLowerCase();
    const evaluator = this.evaluators.get(type);

    if (!evaluator) {
      return createResult({
        field: rule.field || 'unknown',
        expected: rule.expected || null,
        actual: actualValue,
        status: 'WARNING',
        reason: `Unknown rule type: '${rule.type || rule.rule}'`
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

/**
 * Dispatches a declarative rule against a normalized root dataset.
 * Resolves dot-path fields, handles dateOrder contexts, and returns a standardized evaluation.
 * @param {Object} rule - Declarative rule { field, type|rule, expected, ... }
 * @param {Object} rootData - Normalized criteria root data
 * @returns {Object} Standardized evaluation result
 */
function evaluateRule(rule, rootData) {
  if (!rule || typeof rule !== 'object') {
    return createResult({
      field: 'unknown',
      expected: null,
      actual: null,
      status: 'FAIL',
      reason: 'Invalid rule definition'
    });
  }

  const field = rule.field;
  const actualValue = field ? getNestedValue(rootData, field) : undefined;
  const context = { root: rootData };

  return defaultRegistry.evaluate(rule, actualValue, context);
}

module.exports = {
  getNestedValue,
  parseNumberSafely,
  parseIsoDateSafely,
  normalizeStr,
  createResult,
  CATEGORY_ALIASES,
  EDUCATION_LEVELS,
  getEducationLevel,
  resolveRelaxationYears,
  matchesEducation,
  matchesStream,
  evaluateRequired,
  evaluateEquals,
  evaluateRange,
  evaluateEnum,
  evaluateContains,
  evaluateDateOrder,
  evaluateRegex,
  evaluateCustom,
  evaluateCandidateEligibility,
  RuleRegistry,
  defaultRegistry,
  evaluateRule
};
