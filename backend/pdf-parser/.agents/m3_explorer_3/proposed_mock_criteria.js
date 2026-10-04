'use strict';

/**
 * fixtures/mock-criteria.js
 * Declarative benchmark database criteria and candidate profiles for unity checking.
 * Conforms to Interface Contract #3 in PROJECT.md and Requirements §R3, §R4.
 *
 * This module exports:
 * 1. Benchmark recruitment criteria presets (UPSC, SSC CGL, IBPS PO, Technical Gate).
 * 2. Diverse candidate profiles (fully qualified, underage, overage, relaxed, mismatched stream, boundary).
 * 3. Factory helpers for deterministic dynamic test generation.
 */

// =============================================================================
// 1. BENCHMARK DATABASE CRITERIA PRESETS
// =============================================================================

/**
 * Canonical UPSC Civil Services Examination benchmark criteria.
 * Matches fixtures/sample-notification.pdf and MOCK_NOTIFICATION_FIXTURE.
 */
const UPSC_BENCHMARK_CRITERIA = {
  id: 'crit-upsc-cse-2026',
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  examTitle: 'COMBINED CIVIL SERVICES EXAMINATION',
  status: ['ACTIVE', 'UPCOMING'],
  minVacancies: 1000,
  maxGeneralFee: 100,
  maxReservedFee: 0,
  applicationEndDateMin: '2026-02-01',
  ageLimits: {
    expectedMinAge: 21,
    expectedMaxAge: 32,
    requiredRelaxationCategories: ['SC/ST', 'OBC']
  },
  educationRequirements: {
    acceptedQualifications: ["Bachelor's degree in any discipline", "Graduation", "Degree"],
    acceptedStreams: ['Any Discipline', 'Any']
  },
  rules: [
    { field: 'organization', expected: 'UNION PUBLIC SERVICE COMMISSION', rule: 'contains', severity: 'CRITICAL' },
    { field: 'examTitle', expected: 'CIVIL SERVICES', rule: 'contains', severity: 'CRITICAL' },
    { field: 'vacancies', expected: 1000, rule: 'min', severity: 'WARNING' },
    { field: 'applicationFee.general', expected: 100, rule: 'max', severity: 'WARNING' },
    { field: 'applicationFee.reserved', expected: 0, rule: 'max', severity: 'CRITICAL' }
  ]
};

/**
 * Staff Selection Commission - Combined Graduate Level (SSC CGL) benchmark.
 */
const SSC_CGL_BENCHMARK_CRITERIA = {
  id: 'crit-ssc-cgl-2026',
  organization: 'STAFF SELECTION COMMISSION',
  examTitle: 'COMBINED GRADUATE LEVEL EXAMINATION',
  status: ['ACTIVE', 'UPCOMING'],
  minVacancies: 5000,
  maxGeneralFee: 100,
  maxReservedFee: 0,
  applicationEndDateMin: '2026-01-01',
  ageLimits: {
    expectedMinAge: 18,
    expectedMaxAge: 30,
    requiredRelaxationCategories: ['SC/ST', 'OBC', 'PwBD']
  },
  educationRequirements: {
    acceptedQualifications: ["Bachelor's Degree from a recognized University", "Graduation"],
    acceptedStreams: ['Any Discipline', 'Any']
  }
};

/**
 * Banking Sector - IBPS Probationary Officer (IBPS PO) benchmark.
 */
const IBPS_PO_BENCHMARK_CRITERIA = {
  id: 'crit-ibps-po-2026',
  organization: 'INSTITUTE OF BANKING PERSONNEL SELECTION',
  examTitle: 'PROBATIONARY OFFICERS / MANAGEMENT TRAINEES',
  status: ['ACTIVE'],
  minVacancies: 3000,
  maxGeneralFee: 850,
  maxReservedFee: 175,
  applicationEndDateMin: '2026-08-01',
  ageLimits: {
    expectedMinAge: 20,
    expectedMaxAge: 30,
    requiredRelaxationCategories: ['SC/ST', 'OBC']
  },
  educationRequirements: {
    acceptedQualifications: ['Graduation in any discipline', "Bachelor's degree"],
    acceptedStreams: ['Any Discipline']
  }
};

/**
 * Specialized Technical / Engineering Service benchmark (Restricted Stream).
 * Requires engineering degree and restricts stream to Engineering/Technology.
 */
const TECHNICAL_SERVICES_BENCHMARK_CRITERIA = {
  id: 'crit-tech-ies-2026',
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  examTitle: 'ENGINEERING SERVICES EXAMINATION',
  status: ['ACTIVE'],
  minVacancies: 200,
  maxGeneralFee: 200,
  maxReservedFee: 0,
  ageLimits: {
    expectedMinAge: 21,
    expectedMaxAge: 30
  },
  educationRequirements: {
    acceptedQualifications: ['B.Tech', 'B.E.', 'Bachelor of Engineering', 'Bachelor of Technology'],
    acceptedStreams: ['Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Electronics & Telecommunication', 'Computer Science']
  }
};

// =============================================================================
// 2. MOCK CANDIDATE PROFILES
// =============================================================================

const MOCK_CANDIDATES = {
  // 1. Fully Qualified General Candidate
  FULLY_QUALIFIED_GENERAL: {
    id: 'cand-001',
    name: 'Aarav Sharma',
    dob: '2001-05-15',
    age: 25,
    gender: 'MALE',
    category: 'General',
    education: 'Bachelor of Technology in Computer Science',
    degree: 'B.Tech Computer Science',
    stream: 'Engineering',
    percentage: 82.5,
    expectedVerdict: 'ELIGIBLE'
  },

  // 2. Underage Candidate (Age < minAge of 21)
  UNDERAGE_CANDIDATE: {
    id: 'cand-002',
    name: 'Rohan Gupta',
    dob: '2007-01-10',
    age: 19,
    gender: 'MALE',
    category: 'General',
    education: "Bachelor's degree in Progress",
    degree: 'B.Sc 1st Year',
    stream: 'Science',
    percentage: 75.0,
    expectedVerdict: 'DISQUALIFIED',
    expectedReason: 'below minimum requirement'
  },

  // 3. Overage General / Unreserved Candidate (Age 34 > maxAge 32, no relaxation)
  OVERAGE_GENERAL_CANDIDATE: {
    id: 'cand-003',
    name: 'Vikram Malhotra',
    dob: '1992-03-20',
    age: 34,
    gender: 'MALE',
    category: 'General',
    education: 'Bachelor of Arts in Economics',
    degree: 'B.A. Economics',
    stream: 'Arts',
    percentage: 68.0,
    expectedVerdict: 'DISQUALIFIED',
    expectedReason: 'exceeds maximum limit'
  },

  // 4. Overage SC Candidate within Relaxation (Age 35: base 32 + 5 = 37 => ELIGIBLE)
  OVERAGE_SC_ELIGIBLE_WITH_RELAXATION: {
    id: 'cand-004',
    name: 'Pooja Rani',
    dob: '1991-08-14',
    age: 35,
    gender: 'FEMALE',
    category: 'SC',
    education: "Bachelor's degree in Commerce",
    degree: 'B.Com',
    stream: 'Commerce',
    percentage: 71.0,
    expectedVerdict: 'ELIGIBLE',
    expectedReason: 'relaxation'
  },

  // 5. Overage SC Candidate Exceeding Relaxation (Age 39 > 32 + 5 = 37 => DISQUALIFIED)
  OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION: {
    id: 'cand-005',
    name: 'Suresh Kumar',
    dob: '1987-02-11',
    age: 39,
    gender: 'MALE',
    category: 'SC',
    education: 'Graduation in History',
    degree: 'B.A. History',
    stream: 'Arts',
    percentage: 60.0,
    expectedVerdict: 'DISQUALIFIED',
    expectedReason: 'exceeds maximum limit'
  },

  // 6. Overage OBC Candidate within Relaxation (Age 34: base 32 + 3 = 35 => ELIGIBLE)
  OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION: {
    id: 'cand-006',
    name: 'Ananya Patel',
    dob: '1992-11-05',
    age: 34,
    gender: 'FEMALE',
    category: 'OBC',
    education: 'Bachelor of Science in Chemistry',
    degree: 'B.Sc Chemistry',
    stream: 'Science',
    percentage: 79.5,
    expectedVerdict: 'ELIGIBLE',
    expectedReason: 'relaxation'
  },

  // 7. Overage OBC Candidate Exceeding Relaxation (Age 36 > 32 + 3 = 35 => DISQUALIFIED)
  OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION: {
    id: 'cand-007',
    name: 'Dinesh Yadav',
    dob: '1990-06-12',
    age: 36,
    gender: 'MALE',
    category: 'OBC',
    education: "Bachelor's degree in any discipline",
    degree: 'B.A. Political Science',
    stream: 'Arts',
    percentage: 64.0,
    expectedVerdict: 'DISQUALIFIED',
    expectedReason: 'exceeds maximum limit'
  },

  // 8. PwBD Candidate with 10-Year Relaxation (Age 40: base 32 + 10 = 42 => ELIGIBLE)
  PWBD_ELIGIBLE_WITH_RELAXATION: {
    id: 'cand-008',
    name: 'Kavita Verma',
    dob: '1986-04-18',
    age: 40,
    gender: 'FEMALE',
    category: 'PwBD',
    education: "Master's degree in Public Administration",
    degree: 'M.A. Public Administration',
    stream: 'Social Sciences',
    percentage: 84.0,
    expectedVerdict: 'ELIGIBLE',
    expectedReason: 'relaxation'
  },

  // 9. Wrong Stream Candidate (Arts degree applying for Engineering/Tech post)
  WRONG_STREAM_DISQUALIFIED: {
    id: 'cand-009',
    name: 'Meera Sen',
    dob: '1999-07-22',
    age: 27,
    gender: 'FEMALE',
    category: 'General',
    education: 'Bachelor of Arts in Literature',
    degree: 'B.A. English',
    stream: 'Humanities',
    percentage: 72.0,
    expectedVerdict: 'DISQUALIFIED',
    expectedReason: 'stream'
  },

  // 10. Missing Mandatory Education (10+2 / High School applying for Graduate exam)
  MISSING_MANDATORY_EDUCATION_DISQUALIFIED: {
    id: 'cand-010',
    name: 'Rajesh Bind',
    dob: '2003-09-15',
    age: 23,
    gender: 'MALE',
    category: 'General',
    education: '10+2 / Higher Secondary School Certificate',
    degree: '12th Standard Science',
    stream: 'Science',
    percentage: 88.0,
    expectedVerdict: 'DISQUALIFIED',
    expectedReason: 'education'
  },

  // 11. Boundary: Exact Minimum Age (Age exactly 21)
  EXACT_BOUNDARY_MIN_AGE: {
    id: 'cand-011',
    name: 'Isha Nair',
    dob: '2005-08-01',
    age: 21,
    gender: 'FEMALE',
    category: 'General',
    education: "Bachelor's degree in Commerce",
    degree: 'B.Com',
    stream: 'Commerce',
    percentage: 76.0,
    expectedVerdict: 'ELIGIBLE'
  },

  // 12. Boundary: Exact Maximum Age (Age exactly 32 for General)
  EXACT_BOUNDARY_MAX_AGE: {
    id: 'cand-012',
    name: 'Karthik Raja',
    dob: '1994-08-01',
    age: 32,
    gender: 'MALE',
    category: 'General',
    education: 'Bachelor of Engineering in Electronics',
    degree: 'B.E. Electronics',
    stream: 'Engineering',
    percentage: 70.5,
    expectedVerdict: 'ELIGIBLE'
  },

  // 13. Boundary: Exact Relaxed Max Age (Age exactly 37 for SC: 32 + 5)
  EXACT_BOUNDARY_RELAXED_MAX_AGE: {
    id: 'cand-013',
    name: 'Sunita Das',
    dob: '1989-08-01',
    age: 37,
    gender: 'FEMALE',
    category: 'SC',
    education: 'Graduation in Science',
    degree: 'B.Sc Mathematics',
    stream: 'Science',
    percentage: 69.0,
    expectedVerdict: 'ELIGIBLE'
  },

  // 14. Female Candidate (Reserved fee exemption verification, 0 INR fee)
  FEMALE_EXEMPT_FEE_CANDIDATE: {
    id: 'cand-014',
    name: 'Sneha Bose',
    dob: '2000-12-10',
    age: 26,
    gender: 'FEMALE',
    category: 'General',
    education: "Bachelor's degree in Economics",
    degree: 'B.A. Economics',
    stream: 'Economics',
    percentage: 85.0,
    expectedVerdict: 'ELIGIBLE'
  },

  // 15. Incomplete / Corrupted Profile (Missing age, education)
  MALFORMED_CANDIDATE_PROFILE: {
    id: 'cand-015',
    name: 'Corrupt Profile',
    age: null,
    dob: null,
    category: 'INVALID_CATEGORY',
    education: null,
    stream: null,
    expectedVerdict: 'DISQUALIFIED'
  }
};

// =============================================================================
// 3. FACTORY HELPERS
// =============================================================================

/**
 * Creates custom criteria overriding default benchmark criteria.
 * @param {Object} [overrides={}]
 * @returns {Object} Deep-merged criteria object
 */
function createCustomCriteria(overrides = {}) {
  const base = JSON.parse(JSON.stringify(UPSC_BENCHMARK_CRITERIA));
  return Object.assign({}, base, overrides);
}

/**
 * Creates custom candidate profile overriding base candidate profile.
 * @param {Object} [overrides={}]
 * @returns {Object} Deep-merged candidate object
 */
function createCustomCandidate(overrides = {}) {
  const base = JSON.parse(JSON.stringify(MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL));
  return Object.assign({}, base, overrides);
}

/**
 * Resolves criteria preset by key name.
 * @param {string} presetName 
 * @returns {Object}
 */
function getBenchmarkCriteria(presetName = 'UPSC') {
  switch (presetName.toUpperCase()) {
    case 'SSC':
    case 'SSC_CGL':
      return JSON.parse(JSON.stringify(SSC_CGL_BENCHMARK_CRITERIA));
    case 'IBPS':
    case 'IBPS_PO':
    case 'BANK':
      return JSON.parse(JSON.stringify(IBPS_PO_BENCHMARK_CRITERIA));
    case 'TECH':
    case 'TECHNICAL':
      return JSON.parse(JSON.stringify(TECHNICAL_SERVICES_BENCHMARK_CRITERIA));
    case 'UPSC':
    case 'CSE':
    default:
      return JSON.parse(JSON.stringify(UPSC_BENCHMARK_CRITERIA));
  }
}

module.exports = {
  // Benchmark criteria presets
  BENCHMARK_CRITERIA: UPSC_BENCHMARK_CRITERIA,
  UPSC_BENCHMARK_CRITERIA,
  SSC_CGL_BENCHMARK_CRITERIA,
  IBPS_PO_BENCHMARK_CRITERIA,
  TECHNICAL_SERVICES_BENCHMARK_CRITERIA,

  // Candidate profiles
  MOCK_CANDIDATES,

  // Factory helpers
  createCustomCriteria,
  createCustomCandidate,
  getBenchmarkCriteria
};
