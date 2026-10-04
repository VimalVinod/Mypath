'use strict';

/**
 * .agents/m3_challenger_1/adversarial_rules_harness.js
 * Adversarial Stress Test Harness for `src/services/validator/rules.js` and `unity-checker.js`.
 * 
 * Conducts empirical stress testing across 5 Focus Areas:
 *  Area 1: Boundary Age Conditions & Date of Birth Calculations
 *  Area 2: Statutory Relaxation Edge Cases & Substring Traps
 *  Area 3: Education Taxonomy Hierarchy Stress & Equivalence
 *  Area 4: Date Order & Calendar Anomaly Stress
 *  Area 5: Robustness, Prototype Inheritance & ReDoS Security
 */

const assert = require('assert');
const path = require('path');

const rulesEngine = require('../../src/services/validator/rules');
const unityChecker = require('../../src/services/validator/unity-checker');

const {
  getNestedValue,
  parseNumberSafely,
  parseIsoDateSafely,
  normalizeStr,
  getEducationLevel,
  resolveRelaxationYears,
  matchesEducation,
  matchesStream,
  evaluateCandidateEligibility,
  evaluateDateOrder,
  evaluateRegex,
  evaluateRule,
  RuleRegistry
} = rulesEngine;

const { verifyUnity } = unityChecker;

// Test Suite Infrastructure
const testReport = {
  total: 0,
  passed: 0,
  failed: 0,
  categories: {},
  findings: []
};

function recordResult(category, testName, passed, details = {}) {
  testReport.total++;
  if (!testReport.categories[category]) {
    testReport.categories[category] = { total: 0, passed: 0, failed: 0 };
  }
  testReport.categories[category].total++;

  if (passed) {
    testReport.passed++;
    testReport.categories[category].passed++;
    console.log(`  ✔ [PASS] [${category}] ${testName}`);
  } else {
    testReport.failed++;
    testReport.categories[category].failed++;
    console.log(`  ✘ [FAIL / VULNERABILITY CONFIRMED] [${category}] ${testName}`);
    console.log(`     Observation : ${details.observation}`);
    console.log(`     Expected    : ${details.expected}`);
    console.log(`     Actual      : ${details.actual}`);
    testReport.findings.push({
      category,
      testName,
      severity: details.severity || 'HIGH',
      observation: details.observation,
      expected: details.expected,
      actual: details.actual,
      file: details.file || 'src/services/validator/rules.js',
      line: details.line || 'TBD',
      blastRadius: details.blastRadius || 'TBD'
    });
  }
}

console.log('================================================================================');
console.log('       EMPIRICAL ADVERSARIAL CHALLENGER HARNESS (m3_challenger_1)              ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// BASE RECRUITMENT BENCHMARK FIXTURE
// -----------------------------------------------------------------------------
const baseEligibility = {
  minAge: 21,
  maxAge: 32,
  ageRelaxation: [
    { category: 'SC/ST', years: 5 },
    { category: 'OBC', years: 3 }
  ],
  requiredEducation: ["Bachelor's degree in any discipline"],
  eligibleStreams: ['Any Discipline']
};

// =============================================================================
// FOCUS AREA 1: BOUNDARY AGE CONDITIONS & DATE OF BIRTH CALCULATIONS
// =============================================================================
console.log('--- Focus Area 1: Boundary Age Conditions & Date of Birth ---');

// 1.1 Exact minAge (21)
{
  const cand = { age: 21, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === true && res.evaluations[0].status === 'PASS';
  recordResult('Area 1: Age Boundaries', '1.1 Exact minAge boundary (21) -> ELIGIBLE', ok, {
    observation: `Evaluated age 21 against minAge 21`,
    expected: 'isEligible = true, age status = PASS',
    actual: `isEligible = ${res.candidateEligibility.isEligible}, status = ${res.evaluations[0].status}`
  });
}

// 1.2 Exact maxAge (32)
{
  const cand = { age: 32, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === true && res.evaluations[0].status === 'PASS';
  recordResult('Area 1: Age Boundaries', '1.2 Exact maxAge boundary (32) -> ELIGIBLE', ok, {
    observation: `Evaluated age 32 against maxAge 32`,
    expected: 'isEligible = true, age status = PASS',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.3 Exact maxAge + relaxation (32 + 5 = 37 for SC)
{
  const cand = { age: 37, category: 'SC', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === true && res.evaluations[0].status === 'PASS';
  recordResult('Area 1: Age Boundaries', '1.3 Exact maxAge + relaxation boundary (37 for SC) -> ELIGIBLE', ok, {
    observation: `Evaluated age 37 for SC against base 32 + 5`,
    expected: 'isEligible = true, age status = PASS',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.4 Candidate younger by 1 day (via DOB: turns 21 tomorrow)
{
  const now = new Date();
  const birthYear = now.getUTCFullYear() - 21;
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dobStr = `${birthYear}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`;
  
  const cand = { dob: dobStr, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === false && res.evaluations[0].status === 'FAIL';
  recordResult('Area 1: Age Boundaries', '1.4 Candidate 1 day younger than minAge (turns 21 tomorrow) -> DISQUALIFIED', ok, {
    observation: `DOB ${dobStr} evaluated today (${now.toISOString().slice(0, 10)})`,
    expected: 'isEligible = false, age status = FAIL',
    actual: `isEligible = ${res.candidateEligibility.isEligible}, reason = ${res.evaluations[0].reason}`
  });
}

// 1.5 Candidate older by 1 day (via DOB: turned 21 yesterday)
{
  const now = new Date();
  const birthYear = now.getUTCFullYear() - 21;
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const dobStr = `${birthYear}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
  
  const cand = { dob: dobStr, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === true && res.evaluations[0].status === 'PASS';
  recordResult('Area 1: Age Boundaries', '1.5 Candidate 1 day older than minAge (turned 21 yesterday) -> ELIGIBLE', ok, {
    observation: `DOB ${dobStr} evaluated today`,
    expected: 'isEligible = true, age status = PASS',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.6 Candidate turning 33 today (exceeds maxAge 32 by 1 day)
{
  const now = new Date();
  const birthYear = now.getUTCFullYear() - 33;
  const dobStr = `${birthYear}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  
  const cand = { dob: dobStr, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === false && res.evaluations[0].status === 'FAIL';
  recordResult('Area 1: Age Boundaries', '1.6 Candidate turning 33 today (exceeds maxAge 32 by 1 day) -> DISQUALIFIED', ok, {
    observation: `DOB ${dobStr} evaluated today (age 33)`,
    expected: 'isEligible = false, age status = FAIL',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.7 Candidate turning 33 tomorrow (age 32 years 364 days today)
{
  const now = new Date();
  const birthYear = now.getUTCFullYear() - 33;
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dobStr = `${birthYear}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`;
  
  const cand = { dob: dobStr, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === true && res.evaluations[0].status === 'PASS';
  recordResult('Area 1: Age Boundaries', '1.7 Candidate turning 33 tomorrow (currently 32 yr 364 d) -> ELIGIBLE', ok, {
    observation: `DOB ${dobStr} evaluated today (age 32)`,
    expected: 'isEligible = true, age status = PASS',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.8 Negative age (-1)
{
  const cand = { age: -1, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === false;
  recordResult('Area 1: Age Boundaries', '1.8 Negative candidate age (-1) -> DISQUALIFIED', ok, {
    observation: 'Evaluated age: -1',
    expected: 'isEligible = false',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.9 Age 0 when minAge is specified (21)
{
  const cand = { age: 0, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === false;
  recordResult('Area 1: Age Boundaries', '1.9 Age 0 when minAge is 21 -> DISQUALIFIED', ok, {
    observation: 'Evaluated age: 0 with minAge: 21',
    expected: 'isEligible = false',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 1.10 [VULNERABILITY] Age 0 when minAge is null/unspecified
{
  const noMinElig = { minAge: null, maxAge: 35, requiredEducation: [], eligibleStreams: [] };
  const cand = { age: 0, category: 'General', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(noMinElig, cand);
  // Age 0 (infant) should NEVER be eligible for public employment
  const ok = res.candidateEligibility.isEligible === false;
  recordResult('Area 1: Age Boundaries', '1.10 [VULNERABILITY] Age 0 candidate when minAge is null -> Must NOT be eligible', ok, {
    severity: 'MEDIUM',
    observation: `rules.js:813-840: candAge < 0 check passes for age 0. If minAge is null, minAge check is skipped. 0 <= 35 passes maxAge check.`,
    expected: 'isEligible = false (age 0 rejected as invalid/infant)',
    actual: `isEligible = ${res.candidateEligibility.isEligible} (ageStatus = '${res.evaluations[0].status}')`,
    file: 'src/services/validator/rules.js',
    line: '813-840',
    blastRadius: 'Infant age 0 or uninitialized age 0 falsely declared ELIGIBLE whenever notification does not specify minAge.'
  });
}

// 1.11 Coercion of string numeric ages
{
  const ok = parseNumberSafely("25") === 25 && parseNumberSafely(" 32 ") === 32 && parseNumberSafely("0x15") === 21;
  recordResult('Area 1: Age Boundaries', '1.11 Safe numeric string coercion ("25", " 32 ", "0x15")', ok, {
    observation: 'Testing parseNumberSafely string numeric inputs',
    expected: '25, 32, 21',
    actual: `${parseNumberSafely("25")}, ${parseNumberSafely(" 32 ")}, ${parseNumberSafely("0x15")}`
  });
}

// 1.12 Rejection of invalid non-numeric strings
{
  const ok = parseNumberSafely("twenty") === null && parseNumberSafely("25 years") === null && parseNumberSafely(NaN) === null && parseNumberSafely(Infinity) === null;
  recordResult('Area 1: Age Boundaries', '1.12 Rejection of invalid strings ("twenty", "25 years", NaN, Infinity)', ok, {
    observation: 'Testing parseNumberSafely on non-numeric inputs',
    expected: 'null for all',
    actual: 'null'
  });
}

// =============================================================================
// FOCUS AREA 2: STATUTORY RELAXATION EDGE CASES & SUBSTRING TRAPS
// =============================================================================
console.log('\n--- Focus Area 2: Statutory Relaxation Edge Cases & Substring Traps ---');

// 2.1 Statutory Invariant: SC category does NOT reduce minAge
{
  const cand = { age: 19, category: 'SC', education: "Bachelor's degree" };
  const res = evaluateCandidateEligibility(baseEligibility, cand);
  const ok = res.candidateEligibility.isEligible === false && res.candidateEligibility.disqualifications[0].includes('below the minimum required age');
  recordResult('Area 2: Statutory Relaxation', '2.1 Statutory Invariant: SC relaxation (+5) NEVER reduces minAge (19 vs minAge 21)', ok, {
    observation: 'Evaluated SC candidate age 19 against minAge 21',
    expected: 'isEligible = false (underage)',
    actual: `isEligible = ${res.candidateEligibility.isEligible}`
  });
}

// 2.2 Legitimate OBC-NCL matches OBC relaxation (+3)
{
  const years = resolveRelaxationYears('OBC-NCL', baseEligibility.ageRelaxation);
  const ok = years === 3;
  recordResult('Area 2: Statutory Relaxation', '2.2 Legitimate OBC-NCL matches OBC relaxation (+3 years)', ok, {
    observation: 'resolveRelaxationYears("OBC-NCL", ...)',
    expected: '3',
    actual: String(years)
  });
}

// 2.3 [VULNERABILITY] Substring Trap: OBC-CL (Creamy Layer) must NOT receive OBC relaxation
{
  // Under Indian statutory rules, OBC Creamy Layer is legally Unreserved (General). Zero relaxation.
  const years = resolveRelaxationYears('OBC-CL', baseEligibility.ageRelaxation);
  const ok = years === 0;
  recordResult('Area 2: Statutory Relaxation', '2.3 [VULNERABILITY] OBC Creamy Layer (OBC-CL) must NOT receive OBC relaxation', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:660 uses 'candCatNorm.includes(ruleCatNorm)'. 'obc-cl'.includes('obc') is true.`,
    expected: '0 relaxation years (OBC-CL is legally General/Unreserved)',
    actual: `${years} relaxation years granted`,
    file: 'src/services/validator/rules.js',
    line: '660',
    blastRadius: 'Disqualified overage OBC Creamy Layer candidates are illegally approved for recruitment reservations.'
  });
}

// 2.4 [VULNERABILITY] Substring Trap: "Descendant of Freedom Fighter" matching "SC"
{
  const years = resolveRelaxationYears('Descendant of Freedom Fighter', [{ category: 'SC', years: 5 }]);
  const ok = years === 0;
  recordResult('Area 2: Statutory Relaxation', '2.4 [VULNERABILITY] Arbitrary category "Descendant of Freedom Fighter" must NOT match "SC"', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:660: 'descendant of freedom fighter'.includes('sc') is true (de-SC-endant).`,
    expected: '0 relaxation years',
    actual: `${years} relaxation years granted (matched SC!)`,
    file: 'src/services/validator/rules.js',
    line: '660',
    blastRadius: 'Any general candidate with words containing "sc" (descendant, school quota, science teacher, disciplinary) illicitly gains 5 years SC age relaxation.'
  });
}

// 2.5 [VULNERABILITY] Substring Trap: "Staff Candidate" matching "ST"
{
  const years = resolveRelaxationYears('Staff Candidate', [{ category: 'ST', years: 5 }]);
  const ok = years === 0;
  recordResult('Area 2: Statutory Relaxation', '2.5 [VULNERABILITY] Arbitrary category "Staff Candidate" must NOT match "ST"', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:660: 'staff candidate'.includes('st') is true (ST-aff).`,
    expected: '0 relaxation years',
    actual: `${years} relaxation years granted (matched ST!)`,
    file: 'src/services/validator/rules.js',
    line: '660',
    blastRadius: 'Any general candidate with words containing "st" (staff, state quota, first division) illicitly gains 5 years ST age relaxation.'
  });
}

// 2.6 [VULNERABILITY] Substring Trap: "Non-OBC" matching "OBC"
{
  const years = resolveRelaxationYears('Non-OBC', [{ category: 'OBC', years: 3 }]);
  const ok = years === 0;
  recordResult('Area 2: Statutory Relaxation', '2.6 [VULNERABILITY] Explicit "Non-OBC" category must NOT match "OBC"', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:660: 'non-obc'.includes('obc') is true.`,
    expected: '0 relaxation years',
    actual: `${years} relaxation years granted`,
    file: 'src/services/validator/rules.js',
    line: '660',
    blastRadius: 'Candidates explicitly declaring themselves Non-OBC receive OBC reservation benefits.'
  });
}

// 2.7 [VULNERABILITY] Cross-Category Leakage: SC candidate matching ST-only rule
{
  const stOnlyRules = [{ category: 'ST', years: 8 }];
  const years = resolveRelaxationYears('SC', stOnlyRules);
  const ok = years === 0;
  recordResult('Area 2: Statutory Relaxation', '2.7 [VULNERABILITY] SC candidate must NOT receive ST-specific relaxation (+8 yrs)', ok, {
    severity: 'HIGH',
    observation: `rules.js:118 & 665-673: CATEGORY_ALIASES['SC/ST'] lists both 'sc' and 'st'. SC candidate matches SC/ST alias, and ST rule matches SC/ST alias.`,
    expected: '0 relaxation years (candidate is SC, rule is ST-only)',
    actual: `${years} relaxation years granted`,
    file: 'src/services/validator/rules.js',
    line: '118, 665-673',
    blastRadius: 'Cross-reservation leakage between SC and ST when recruitment rules define different age relaxations for SC vs ST.'
  });
}

// 2.8 Composite category SC + PwBD resolution
{
  const eligWithPwbd = {
    ...baseEligibility,
    ageRelaxation: [
      { category: 'SC/ST', years: 5 },
      { category: 'OBC', years: 3 },
      { category: 'PwBD', years: 10 }
    ]
  };
  const years = resolveRelaxationYears('SC + PwBD', eligWithPwbd.ageRelaxation);
  const ok = years >= 10;
  recordResult('Area 2: Statutory Relaxation', '2.8 Composite category SC + PwBD receives at least PwBD (+10) relaxation', ok, {
    observation: 'resolveRelaxationYears("SC + PwBD", ...)',
    expected: '>= 10',
    actual: String(years)
  });
}

// 2.9 Ex-Servicemen (ESM) alias matching
{
  const eligWithEsm = {
    ...baseEligibility,
    ageRelaxation: [
      { category: 'SC/ST', years: 5 },
      { category: 'Ex-Servicemen', years: 5 }
    ]
  };
  const years = resolveRelaxationYears('ESM', eligWithEsm.ageRelaxation);
  const ok = years === 5;
  recordResult('Area 2: Statutory Relaxation', '2.9 Ex-Servicemen (ESM) matches "Ex-Servicemen" via alias', ok, {
    observation: 'resolveRelaxationYears("ESM", ...)',
    expected: '5',
    actual: String(years)
  });
}

// 2.10 Unknown, empty, or unreserved categories default to 0
{
  const ok = resolveRelaxationYears('', baseEligibility.ageRelaxation) === 0 &&
             resolveRelaxationYears(null, baseEligibility.ageRelaxation) === 0 &&
             resolveRelaxationYears('General', baseEligibility.ageRelaxation) === 0 &&
             resolveRelaxationYears('UR', baseEligibility.ageRelaxation) === 0 &&
             resolveRelaxationYears('Foreign National', baseEligibility.ageRelaxation) === 0;
  recordResult('Area 2: Statutory Relaxation', '2.10 Unknown / empty / unreserved categories default strictly to 0 relaxation', ok, {
    observation: 'Testing empty, null, General, UR, Foreign National',
    expected: '0 for all',
    actual: '0'
  });
}

// =============================================================================
// FOCUS AREA 3: EDUCATION TAXONOMY HIERARCHY STRESS & EQUIVALENCE
// =============================================================================
console.log('\n--- Focus Area 3: Education Taxonomy Hierarchy Stress ---');

// 3.1 Standard hierarchy levels
{
  const ok = getEducationLevel('PhD in Physics') === 6 &&
             getEducationLevel('Master of Science') === 5 &&
             getEducationLevel('Bachelor of Engineering') === 4 &&
             getEducationLevel('Diploma in Civil') === 3 &&
             getEducationLevel('10+2 Intermediate') === 2 &&
             getEducationLevel('10th Matriculation') === 1;
  recordResult('Area 3: Education Hierarchy', '3.1 Standard degrees mapped to correct numeric hierarchy levels 1-6', ok, {
    observation: 'Checking PhD(6), Master(5), Bachelor(4), Diploma(3), 10+2(2), 10th(1)',
    expected: '6, 5, 4, 3, 2, 1',
    actual: '6, 5, 4, 3, 2, 1'
  });
}

// 3.2 [VULNERABILITY] Missing "BE" (without dots) in education taxonomy
{
  const req = ['B.E.', 'B.Tech', 'Bachelor of Engineering'];
  const checkDot = matchesEducation('B.E. in Civil', req);
  const checkNoDot = matchesEducation('BE in Civil', req);
  const ok = checkDot.matches === true && checkNoDot.matches === true;
  recordResult('Area 3: Education Hierarchy', '3.2 [VULNERABILITY] Degree abbreviation "BE in Civil" MUST match B.E. / B.Tech', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:145 defines 'b.e': 4, but 'be' is MISSING from EDUCATION_LEVELS. getEducationLevel('BE in Civil') returns 0.`,
    expected: 'matches = true (BE is standard Bachelor of Engineering)',
    actual: `matches = ${checkNoDot.matches}, reason = ${checkNoDot.reason}`,
    file: 'src/services/validator/rules.js',
    line: '145, 697',
    blastRadius: 'All Indian engineering candidates writing "BE" (from VTU, Anna Univ, Mumbai Univ, BITS, etc.) are falsely DISQUALIFIED.'
  });
}

// 3.3 [VULNERABILITY] Substring Trap: "Embedded Systems Diploma" elevated to Level 4 (Bachelor)
{
  const level = getEducationLevel('Embedded Systems Diploma');
  // Diploma is level 3. It should NOT be level 4 (B.Ed)
  const ok = level === 3;
  recordResult('Area 3: Education Hierarchy', '3.3 [VULNERABILITY] "Embedded Systems Diploma" must NOT be elevated to Level 4 (B.Ed)', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:157 & 179: 'bed': 4. 'embedded systems diploma'.includes('bed') is true.`,
    expected: 'Level 3 (Diploma)',
    actual: `Level ${level} (Bachelor's / B.Ed)`,
    file: 'src/services/validator/rules.js',
    line: '157, 179',
    blastRadius: 'Diploma candidates holding "Embedded Systems" diplomas are falsely promoted to Bachelor\'s degree holders and qualified.'
  });
}

// 3.4 [VULNERABILITY] Substring Trap: "Ballroom Dance Certificate" elevated to Level 4 (Bachelor)
{
  const level = getEducationLevel('Ballroom Dance Certificate');
  const ok = level === 0;
  recordResult('Area 3: Education Hierarchy', '3.4 [VULNERABILITY] "Ballroom Dance Certificate" must NOT be elevated to Level 4 (B.A.)', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:151 & 179: 'ba': 4. 'ballroom dance certificate'.includes('ba') is true.`,
    expected: 'Level 0 (unrecognized certificate)',
    actual: `Level ${level} (Bachelor of Arts)`,
    file: 'src/services/validator/rules.js',
    line: '151, 179',
    blastRadius: 'Any certificate containing "ba" (ballroom, baking, basketball, global, urban) is promoted to Bachelor of Arts.'
  });
}

// 3.5 [VULNERABILITY] Substring Trap: "Upgrade Certificate" elevated to Level 5 (Postgraduate)
{
  const level = getEducationLevel('Upgrade Certificate');
  const ok = level === 0;
  recordResult('Area 3: Education Hierarchy', '3.5 [VULNERABILITY] "Upgrade Certificate" must NOT be elevated to Level 5 (Postgraduate)', ok, {
    severity: 'CRITICAL',
    observation: `rules.js:133 & 179: 'pg': 5. 'upgrade certificate'.includes('pg') is true.`,
    expected: 'Level 0',
    actual: `Level ${level} (Postgraduate / Master's)`,
    file: 'src/services/validator/rules.js',
    line: '133, 179',
    blastRadius: 'Any certificate containing "pg" (upgrade, campground, topography) is promoted to Master\'s / Postgraduate.'
  });
}

// 3.6 [VULNERABILITY] B.A. in History satisfies "Bachelor of Engineering in Civil Engineering"
{
  const res = matchesEducation('B.A. in History', ['Bachelor of Engineering in Civil Engineering']);
  // Candidate with B.A. in History should NOT satisfy specialized Bachelor of Engineering
  const ok = res.matches === false;
  recordResult('Area 3: Education Hierarchy', '3.6 [VULNERABILITY] B.A. in History must NOT satisfy "Bachelor of Engineering in Civil Engineering"', ok, {
    severity: 'HIGH',
    observation: `rules.js:704-708: 'bachelor of engineering in civil engineering'.includes('bachelor') is true. Any Level >= 4 matches.`,
    expected: 'matches = false (Arts graduate rejected for Civil Engineering post)',
    actual: `matches = ${res.matches} (reason: ${res.reason})`,
    file: 'src/services/validator/rules.js',
    line: '704-708',
    blastRadius: 'Candidates with arts/humanities degrees are declared qualified for specialized technical and engineering posts.'
  });
}

// 3.7 [VULNERABILITY] MBBS satisfies "B.Tech in Computer Science"
{
  const res = matchesEducation('MBBS', ['B.Tech in Computer Science']);
  // Medical doctor should NOT satisfy B.Tech in Computer Science
  const ok = res.matches === false;
  recordResult('Area 3: Education Hierarchy', '3.7 [VULNERABILITY] MBBS (Medicine) must NOT satisfy "B.Tech in Computer Science"', ok, {
    severity: 'HIGH',
    observation: `rules.js:726-728: candLevel (4) >= reqLevel (4) is true. Compares raw hierarchy level across incompatible domains.`,
    expected: 'matches = false (Medical degree does not satisfy Computer Science B.Tech)',
    actual: `matches = ${res.matches} (reason: ${res.reason})`,
    file: 'src/services/validator/rules.js',
    line: '726-728',
    blastRadius: 'Cross-domain degree equivalence without stream enforcement qualifies medical/law/arts graduates for technical jobs.'
  });
}

// 3.8 Legitimate higher degree (Master/PhD) satisfies general Bachelor requirement
{
  const req = ["Bachelor's degree in any discipline"];
  const resMaster = matchesEducation('M.Sc in Physics', req);
  const resPhd = matchesEducation('PhD in Chemistry', req);
  const ok = resMaster.matches === true && resPhd.matches === true;
  recordResult('Area 3: Education Hierarchy', '3.8 Higher degree (Master / PhD) satisfies general Bachelor requirement', ok, {
    observation: 'Evaluated M.Sc and PhD against Bachelor in any discipline',
    expected: 'matches = true for both',
    actual: `Master: ${resMaster.matches}, PhD: ${resPhd.matches}`
  });
}

// 3.9 Subordinate degree (10+2 / Diploma) fails Bachelor requirement
{
  const req = ["Bachelor's degree in any discipline"];
  const res12th = matchesEducation('10+2 Intermediate', req);
  const resDip = matchesEducation('Diploma in Mechanical', req);
  const ok = res12th.matches === false && resDip.matches === false;
  recordResult('Area 3: Education Hierarchy', '3.9 Subordinate qualifications (10+2, Diploma) disqualified for Bachelor post', ok, {
    observation: 'Evaluated 10+2 and Diploma against Bachelor requirement',
    expected: 'matches = false for both',
    actual: `12th: ${res12th.matches}, Diploma: ${resDip.matches}`
  });
}

// 3.10 Stream matching: open vs restricted
{
  const openRes = matchesStream('History', ['Any Discipline']);
  const restrictedRes = matchesStream('History', ['Civil Engineering', 'Mechanical Engineering']);
  const ok = openRes.matches === true && restrictedRes.matches === false;
  recordResult('Area 3: Education Hierarchy', '3.10 Stream matching permits open disciplines and rejects restricted mismatches', ok, {
    observation: 'Evaluated History stream on open vs restricted lists',
    expected: 'open: true, restricted: false',
    actual: `open: ${openRes.matches}, restricted: ${restrictedRes.matches}`
  });
}

// =============================================================================
// FOCUS AREA 4: DATE ORDER & CALENDAR ANOMALY STRESS
// =============================================================================
console.log('\n--- Focus Area 4: Date Order & Calendar Anomalies ---');

// 4.1 Leap year valid dates
{
  const d2024 = parseIsoDateSafely('2024-02-29');
  const d2028 = parseIsoDateSafely('2028-02-29');
  const d2000 = parseIsoDateSafely('2000-02-29'); // Century leap year
  const ok = d2024 !== null && d2028 !== null && d2000 !== null;
  recordResult('Area 4: Date & Calendar', '4.1 Valid leap year dates (2024-02-29, 2028-02-29, 2000-02-29) successfully parsed', ok, {
    observation: 'Parsing valid leap days',
    expected: 'non-null objects',
    actual: 'all non-null'
  });
}

// 4.2 Non-leap year invalid dates
{
  const d2025 = parseIsoDateSafely('2025-02-29');
  const d1900 = parseIsoDateSafely('1900-02-29'); // Century non-leap year
  const ok = d2025 === null && d1900 === null;
  recordResult('Area 4: Date & Calendar', '4.2 Invalid leap year dates (2025-02-29, 1900-02-29) strictly rejected', ok, {
    observation: 'Parsing non-leap year Feb 29s',
    expected: 'null for both',
    actual: `${d2025}, ${d1900}`
  });
}

// 4.3 Impossible calendar dates & month/day overflows
{
  const badDates = [
    '2026-02-30', '2026-02-31', '2026-04-31', '2026-06-31', '2026-09-31', '2026-11-31',
    '2026-13-01', '2026-00-10', '2026-01-00', 'not-a-date', '2026/05/20', '01-08-2026'
  ];
  const allRejected = badDates.every(d => parseIsoDateSafely(d) === null);
  recordResult('Area 4: Date & Calendar', '4.3 Impossible calendar days, month overflows, and bad formats rejected', allRejected, {
    observation: `Tested 12 malformed dates: ${badDates.join(', ')}`,
    expected: 'null for all',
    actual: allRejected ? 'all null' : 'some passed'
  });
}

// 4.4 Inverted date order (startDate > endDate)
{
  const rule = {
    beforeField: 'importantDates.applicationStartDate',
    afterField: 'importantDates.applicationEndDate',
    rule: 'dateOrder'
  };
  const root = {
    importantDates: {
      applicationStartDate: '2026-06-01',
      applicationEndDate: '2026-05-01'
    }
  };
  const res = evaluateDateOrder(rule, undefined, { root });
  const ok = res.status === 'FAIL' && res.reason.includes('Chronological violation');
  recordResult('Area 4: Date & Calendar', '4.4 Inverted application dates (startDate > endDate) flagged as Chronological FAIL', ok, {
    observation: 'evaluateDateOrder with startDate=2026-06-01, endDate=2026-05-01',
    expected: 'status: FAIL',
    actual: `status: ${res.status}, reason: ${res.reason}`
  });
}

// 4.5 Inverted exam date (endDate > examDate)
{
  const rule = {
    beforeField: 'importantDates.applicationEndDate',
    afterField: 'importantDates.examDate',
    rule: 'dateOrder'
  };
  const root = {
    importantDates: {
      applicationEndDate: '2026-09-01',
      examDate: '2026-08-15'
    }
  };
  const res = evaluateDateOrder(rule, undefined, { root });
  const ok = res.status === 'FAIL' && res.reason.includes('Chronological violation');
  recordResult('Area 4: Date & Calendar', '4.5 Inverted exam dates (endDate > examDate) flagged as Chronological FAIL', ok, {
    observation: 'evaluateDateOrder with endDate=2026-09-01, examDate=2026-08-15',
    expected: 'status: FAIL',
    actual: `status: ${res.status}`
  });
}

// 4.6 Same-day dates when allowEqual is true vs false
{
  const root = {
    importantDates: {
      applicationStartDate: '2026-06-01',
      applicationEndDate: '2026-06-01'
    }
  };
  const ruleAllow = { beforeField: 'importantDates.applicationStartDate', afterField: 'importantDates.applicationEndDate', rule: 'dateOrder', allowEqual: true };
  const ruleDisallow = { beforeField: 'importantDates.applicationStartDate', afterField: 'importantDates.applicationEndDate', rule: 'dateOrder', allowEqual: false };
  const resAllow = evaluateDateOrder(ruleAllow, undefined, { root });
  const resDisallow = evaluateDateOrder(ruleDisallow, undefined, { root });
  const ok = resAllow.status === 'PASS' && resDisallow.status === 'FAIL';
  recordResult('Area 4: Date & Calendar', '4.6 Same-day dates respect allowEqual flag (PASS when true, FAIL when false)', ok, {
    observation: 'Testing allowEqual on 2026-06-01 === 2026-06-01',
    expected: 'allowEqual=true -> PASS, allowEqual=false -> FAIL',
    actual: `allowEqual=true: ${resAllow.status}, allowEqual=false: ${resDisallow.status}`
  });
}

// =============================================================================
// FOCUS AREA 5: ROBUSTNESS, PROTOTYPE INHERITANCE & SECURITY
// =============================================================================
console.log('\n--- Focus Area 5: Robustness, Prototype Inheritance & Security ---');

// 5.1 Prototype pollution attack via __proto__
{
  const target = {};
  const res = getNestedValue(target, '__proto__.polluted');
  const ok = res === undefined && Object.prototype.polluted === undefined;
  recordResult('Area 5: Security & Robustness', '5.1 Prototype pollution blocked for __proto__ path traversal', ok, {
    observation: 'getNestedValue({}, "__proto__.polluted")',
    expected: 'undefined, Object.prototype unpolluted',
    actual: `${res}, Object.prototype.polluted = ${Object.prototype.polluted}`
  });
}

// 5.2 Prototype pollution attack via constructor.prototype
{
  const target = {};
  const res = getNestedValue(target, 'constructor.prototype.polluted');
  const ok = res === undefined && Object.prototype.polluted === undefined;
  recordResult('Area 5: Security & Robustness', '5.2 Prototype pollution blocked for constructor.prototype path traversal', ok, {
    observation: 'getNestedValue({}, "constructor.prototype.polluted")',
    expected: 'undefined',
    actual: `${res}`
  });
}

// 5.3 [VULNERABILITY] Object property inheritance trap: {}.toString returning function
{
  const target = {};
  const res = getNestedValue(target, 'toString');
  // An unpopulated object should return undefined for own properties, not the prototype method!
  const ok = res === undefined;
  recordResult('Area 5: Security & Robustness', '5.3 [VULNERABILITY] Prototype property traversal trap ({}.toString returns Function)', ok, {
    severity: 'MEDIUM',
    observation: `rules.js:33: 'current = current[part]'. Does not verify Object.prototype.hasOwnProperty. Returns [Function: toString].`,
    expected: 'undefined',
    actual: `${typeof res} (${res})`,
    file: 'src/services/validator/rules.js',
    line: '33',
    blastRadius: 'Declarative rule checking required on field "toString" or "valueOf" falsely passes on completely empty input datasets.'
  });
}

// 5.4 Malformed regex in evaluateRegex does NOT crash server
{
  const registry = new RuleRegistry();
  const rule = { field: 'code', type: 'regex', pattern: '[unclosed-regex' };
  const res = registry.evaluate(rule, 'test', {});
  const ok = res.status === 'FAIL' && res.reason.includes('Rule execution failed');
  recordResult('Area 5: Security & Robustness', '5.4 Malformed regex safely caught by registry without throwing unhandled exception', ok, {
    observation: 'RuleRegistry.evaluate with invalid regex pattern "[unclosed-regex"',
    expected: 'status: FAIL with descriptive reason',
    actual: `status: ${res.status}, reason: ${res.reason}`
  });
}

// 5.5 ReDoS pattern resilience
{
  const registry = new RuleRegistry();
  const rule = { field: 'text', type: 'regex', pattern: '^(a+)+$' };
  const evilInput = 'a'.repeat(25) + '!';
  const start = Date.now();
  const res = registry.evaluate(rule, evilInput, {});
  const elapsed = Date.now() - start;
  const ok = res.status === 'FAIL' && elapsed < 3000;
  recordResult('Area 5: Security & Robustness', '5.5 Catastrophic backtracking regex terminates within acceptable time bound (< 3000ms)', ok, {
    observation: `ReDoS pattern (a+)+$ on 25 chars executed in ${elapsed}ms`,
    expected: 'status: FAIL, elapsed < 3000ms',
    actual: `status: ${res.status}, elapsed: ${elapsed}ms`
  });
}

// 5.6 Extreme payload stress: 50,000 char candidate qualification string
{
  const giantString = 'Bachelor of Technology ' + 'A'.repeat(50000);
  const start = Date.now();
  const res = matchesEducation(giantString, ["Bachelor's degree in any discipline"]);
  const elapsed = Date.now() - start;
  const ok = res.matches === true && elapsed < 500;
  recordResult('Area 5: Security & Robustness', '5.6 Extreme payload (50,000 char qualification) matches within 500ms', ok, {
    observation: `50k character string evaluated in ${elapsed}ms`,
    expected: 'matches = true, elapsed < 500ms',
    actual: `matches = ${res.matches}, elapsed: ${elapsed}ms`
  });
}

// 5.7 Circular reference resilience
{
  const circularRoot = { field: 'test' };
  circularRoot.self = circularRoot;
  const val = getNestedValue(circularRoot, 'self.self.field');
  const ok = val === 'test';
  recordResult('Area 5: Security & Robustness', '5.7 Circular reference in root data handled safely by getNestedValue', ok, {
    observation: 'Traversed self.self.field on circular object',
    expected: 'test',
    actual: String(val)
  });
}

// =============================================================================
// EXECUTIVE SUMMARY & GATE VERDICT
// =============================================================================
console.log('\n================================================================================');
console.log(`TOTAL ADVERSARIAL CHECKS EXECUTED : ${testReport.total}`);
console.log(`PASSED (ROBUST BEHAVIOR)          : ${testReport.passed}`);
console.log(`FAILED / VULNERABILITIES FOUND    : ${testReport.failed}`);
console.log('================================================================================');

console.log('\nBREAKDOWN BY CATEGORY:');
for (const [cat, stats] of Object.entries(testReport.categories)) {
  console.log(`  - ${cat.padEnd(32)}: Total: ${stats.total} | Passed: ${stats.passed} | Vulnerabilities: ${stats.failed}`);
}

if (testReport.findings.length > 0) {
  console.log('\n--------------------------------------------------------------------------------');
  console.log('VULNERABILITIES & DEFECTS DISCOVERED (REQUIRING REMEDIATION):');
  console.log('--------------------------------------------------------------------------------');
  testReport.findings.forEach((f, idx) => {
    console.log(`\n[Vulnerability #${idx + 1}] [${f.severity}] ${f.category} > ${f.testName}`);
    console.log(`  File & Line   : ${f.file}:${f.line}`);
    console.log(`  Observation   : ${f.observation}`);
    console.log(`  Expected      : ${f.expected}`);
    console.log(`  Actual        : ${f.actual}`);
    console.log(`  Blast Radius  : ${f.blastRadius}`);
  });
}

// Overall Gate Verdict
const gateVerdict = testReport.failed > 0 ? 'REQUEST_CHANGES' : 'APPROVE';
console.log('\n================================================================================');
console.log(`FINAL CHALLENGER GATE VERDICT: [ ${gateVerdict} ]`);
console.log('================================================================================\n');

// Write machine-readable results json for reporting
const fs = require('fs');
fs.writeFileSync(
  path.join(__dirname, 'adversarial_results.json'),
  JSON.stringify({ ...testReport, gateVerdict }, null, 2),
  'utf8'
);
