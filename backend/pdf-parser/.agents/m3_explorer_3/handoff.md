# Milestone 3 Investigation Report: Database Criteria Schema, Mock Fixtures & Test Suite Architecture

**Author**: `m3_explorer_3` (teamwork_preview_explorer)  
**Parent Orchestrator**: `teamwork_preview_orchestrator_3`  
**Date**: 2026-09-14  
**Target Milestone**: Milestone 3 — Unity / Database Checking Module  
**Scope**: Schema definition, `fixtures/mock-criteria.js`, and `test/unity-checker.test.js` architecture (Tiers 1–4)  

---

## 1. Observation

### 1.1 Project Contracts and Codebase State
1. **Interface Contract #2 (`src/services/ai/schema.js:27-149`)**:
   Gemini extraction yields a normalized object with the following shape:
   ```javascript
   {
     examTitle: string | null,
     organization: string | null,
     eligibility: {
       minAge: number | null,
       maxAge: number | null,
       ageRelaxation: Array<{ category: string, years: number }>,
       requiredEducation: string[],
       eligibleStreams: string[]
     },
     importantDates: {
       applicationStartDate: string | null, // ISO YYYY-MM-DD
       applicationEndDate: string | null,   // ISO YYYY-MM-DD
       examDate: string | null              // ISO YYYY-MM-DD
     },
     vacancies: number | null,
     applicationFee: {
       general: number | null,
       reserved: number | null
     },
     status: 'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'EXPIRED' | 'UNKNOWN'
   }
   ```
2. **Interface Contract #3 (`PROJECT.md:127-150`)**:
   ```javascript
   verifyUnity(extractedData, databaseCriteria) => {
     overallVerdict: 'PASS' | 'FAIL' | 'WARNING',
     summary: { totalChecks: number, passedChecks: number, failedChecks: number, warningChecks: number, passRate: number },
     evaluations: Array<{
       field: string,
       expected: any,
       actual: any,
       status: 'PASS' | 'FAIL' | 'WARNING',
       reason: string
     }>,
     candidateEligibility: {
       isEligible: boolean,
       disqualifications: string[],
       matchedQualifications: string[]
     }
   }
   ```
3. **Canonical Notification Fixture (`fixtures/generate-sample-pdf.js:14-71`, `src/services/ai/mock-gemini.js:41-65`)**:
   `MOCK_NOTIFICATION_FIXTURE` models a 4-page UPSC Civil Services Notification:
   - Organization: `"UNION PUBLIC SERVICE COMMISSION"`
   - Exam Title: `"COMBINED CIVIL SERVICES EXAMINATION 2026"`
   - Age Limits: `minAge: 21`, `maxAge: 32`
   - Age Relaxation: `[{ category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 }]` *(Note: No PwBD clause in this specific PDF notice)*
   - Education: `["Bachelor's degree in any discipline"]`, Streams: `["Any Discipline"]`
   - Dates: `applicationStartDate: '2026-01-10'`, `applicationEndDate: '2026-02-15'`, `examDate: '2026-05-24'`
   - Vacancies: `1056`, Fees: `general: 100`, `reserved: 0`, Status: `'ACTIVE'`
4. **Current Test Infrastructure (`package.json:9`, `test/`)**:
   `npm test` runs `node --test test/*.test.js`. Existing suites (`gemini-parser.test.js`, `pdf-extractor.test.js`, `m2-challenger-deep-stress.test.js`) have **129/129 passing tests**. `test/unity-checker.test.js` and `fixtures/mock-criteria.js` do NOT yet exist.
5. **Peer Explorer Progress**:
   - `m3_explorer_1` developed prototype rule evaluators (`.agents/m3_explorer_1/test-rules-engine.js`) verifying safe property extraction, ISO date checking, educational hierarchy (PhD down to 10th), and category alias matching.
   - `m3_explorer_2` developed the core `verifyUnity` prototype engine (`.agents/m3_explorer_2/test_unity_prototype.js`) and terminal reporting dashboard (`formatUnityReport`).
6. **Empirical Prototype Run (`.agents/m3_explorer_3/proposed_unity_checker_test.js`)**:
   Created and ran a 31-test suite prototype verifying Tiers 1–4 against proposed fixtures. Command output:
   `✔ Tier 1 (10 tests) | ✔ Tier 2 (9 tests) | ✔ Tier 3 (9 tests) | ✔ Tier 4 (3 tests) | Total: 31 passed, 0 failed (124.9ms)`.

---

## 2. Logic Chain

1. **Dual Nature of Database Criteria**:
   From Contract §R3 and §R4, "unity checking" performs two related but distinct verifications:
   - **Document / Notice Benchmark Verification**: Ensures the parsed PDF corresponds to the intended recruitment (e.g. matching organization, exam title, active application window, acceptable fee cap, minimum vacancies).
   - **Candidate Qualification Matching**: Evaluates a specific applicant profile against the extracted recruitment criteria (age with reservation relaxation, education degree level, stream restriction).
   Therefore, `databaseCriteria` must cleanly support:
   - Benchmark criteria fields (`organization`, `examTitle`, `status`, `minVacancies`, `maxGeneralFee`, `maxReservedFee`, `applicationEndDateMin`, `rules`).
   - An optional `candidate` object (`name`, `dob`, `age`, `category`, `education`/`degree`, `stream`, `gender`).
   - If `candidate` is absent, the engine performs document benchmark verification only (`candidateEligibility.isEligible = true`, reason noting notice-only verification).
   - If `candidate` is present, it evaluates both document benchmarks and candidate qualifications.

2. **Benchmark Criteria Presets Needed in `fixtures/mock-criteria.js`**:
   To support automated tests, CLI demonstrations (`parse-demo.js`), and diverse validation rules:
   - `UPSC_BENCHMARK_CRITERIA` (matching `sample-notification.pdf`).
   - `SSC_CGL_BENCHMARK_CRITERIA` (age 18–30, minVacancies 5000, Bachelor's degree).
   - `IBPS_PO_BENCHMARK_CRITERIA` (age 20–30, fee 850/175, minVacancies 3000).
   - `TECHNICAL_SERVICES_BENCHMARK_CRITERIA` (Engineering degree only, stream restricted to Engineering/CS).

3. **Mock Candidate Profiles Taxonomy**:
   To guarantee exhaustive test coverage, we need 15 distinct candidate profiles covering all branches of eligibility logic:
   - Positive/Happy path: Fully qualified general candidate.
   - Age under-boundary: Underage (< 21).
   - Age over-boundary (unreserved): Overage General (> 32).
   - Age relaxation positive: Overage SC (35 <= 32 + 5 = 37), Overage OBC (34 <= 32 + 3 = 35), PwBD (40 <= 32 + 10 = 42).
   - Age relaxation negative: Overage SC exceeding limit (39 > 37), Overage OBC exceeding limit (36 > 35).
   - Non-relaxation of minAge: Underage SC candidate is still disqualified (relaxation never reduces minAge).
   - Education mismatch: High school (10+2) candidate applying for graduate post.
   - Stream mismatch: Arts/Humanities candidate applying for technical post.
   - Exact boundary: Exact minAge (21), exact maxAge (32), exact relaxed maxAge (37).
   - Fee exemption: Female/SC candidate (reserved fee 0 INR).
   - Corrupted/Robustness: Null age, negative age, string age `"25"`, unknown category `"XYZ"`.

4. **Test Suite Tiering (Tiers 1–4)**:
   Per `TEST_INFRA.md` and project standards:
   - **Tier 1 (Feature Coverage)**: Isolated checks for every contract field, organization matching, title matching, age range, relaxation rules, education matching, stream matching, scoring arithmetic, and verdict resolution.
   - **Tier 2 (Boundary & Corner Cases)**: Exact boundary ages (21, 32, 37), off-by-one errors (20, 33, 38), 0 INR fee, leap year dates (`2028-02-29`), vacancy thresholds, empty arrays.
   - **Tier 3 (Negative & Robustness)**: Null/undefined `extractedData`, null/undefined `databaseCriteria`, empty objects `{}`, missing nested fields, string numeric age coercion, NaN/Infinity/negative age handling, inverted date chronologies, invalid ISO dates.
   - **Tier 4 (Real-World Benchmark Scenarios)**: Full batch testing against UPSC CSE 2026, SSC CGL 2026, Technical Engineering Services, and end-to-end pipeline co-validation.

---

## 3. Detailed Design & Specifications

### 3.1 `databaseCriteria` Schema Specification

```typescript
interface DatabaseCriteria {
  id?: string;                           // e.g. "crit-upsc-cse-2026"
  organization?: string;                 // Substring / exact match (e.g. "UNION PUBLIC SERVICE COMMISSION")
  examTitle?: string;                    // Substring / exact match (e.g. "CIVIL SERVICES")
  status?: string | string[];            // Allowed statuses e.g. ['ACTIVE', 'UPCOMING']
  minVacancies?: number;                 // Minimum required advertised vacancies (e.g. 1000)
  maxGeneralFee?: number;                // Upper cap on general application fee (e.g. 100)
  maxReservedFee?: number;               // Upper cap on reserved application fee (e.g. 0)
  applicationEndDateMin?: string;        // Active deadline threshold (ISO YYYY-MM-DD, e.g. "2026-02-01")
  applicationStartDateMax?: string;      // Max allowed start date
  rules?: Array<{                        // Optional declarative rules array
    field: string;                       // Dot-delimited path (e.g. "eligibility.minAge", "vacancies")
    expected: any;
    rule: 'exact' | 'contains' | 'min' | 'max' | 'in';
    severity?: 'CRITICAL' | 'WARNING';   // CRITICAL failures trigger 'FAIL'; WARNING triggers 'WARNING'
  }>;
  candidate?: CandidateProfile;          // Optional candidate credentials for personal eligibility check
}

interface CandidateProfile {
  id?: string;                           // e.g. "cand-001"
  name: string;                          // Full name
  dob?: string;                          // ISO YYYY-MM-DD (e.g. "2001-05-15")
  age: number | string;                  // Age in years (number or numeric string)
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  category: 'General' | 'UR' | 'OBC' | 'SC' | 'ST' | 'PwBD' | 'EWS' | string;
  education: string | string[];          // Degree name (e.g. "B.Tech Computer Science")
  degree?: string;                       // Alias for education
  stream?: string;                       // Academic stream (e.g. "Engineering", "Arts", "Science")
  percentage?: number;                   // Academic score (e.g. 78.5)
}
```

---

### 3.2 Drop-In Specification for `fixtures/mock-criteria.js`

Below is the complete, drop-in code to be written by the worker to `fixtures/mock-criteria.js`:

```javascript
'use strict';

/**
 * fixtures/mock-criteria.js
 * Declarative benchmark database criteria and candidate profiles for unity checking.
 * Conforms to Interface Contract #3 in PROJECT.md and Requirements §R3, §R4.
 */

// =============================================================================
// 1. BENCHMARK DATABASE CRITERIA PRESETS
// =============================================================================

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

function createCustomCriteria(overrides = {}) {
  const base = JSON.parse(JSON.stringify(UPSC_BENCHMARK_CRITERIA));
  return Object.assign({}, base, overrides);
}

function createCustomCandidate(overrides = {}) {
  const base = JSON.parse(JSON.stringify(MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL));
  return Object.assign({}, base, overrides);
}

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
  BENCHMARK_CRITERIA: UPSC_BENCHMARK_CRITERIA,
  UPSC_BENCHMARK_CRITERIA,
  SSC_CGL_BENCHMARK_CRITERIA,
  IBPS_PO_BENCHMARK_CRITERIA,
  TECHNICAL_SERVICES_BENCHMARK_CRITERIA,
  MOCK_CANDIDATES,
  createCustomCriteria,
  createCustomCandidate,
  getBenchmarkCriteria
};
```

---

### 3.3 Test Suite Architecture for `test/unity-checker.test.js`

The test suite will reside in `test/unity-checker.test.js`, execute via `node --test`, and feature **40+ test cases across 4 Tiers**:

```
test/unity-checker.test.js
├── Tier 1: Feature Coverage (Rules in Isolation & Contract Compliance)
│   ├── 1.1 Interface Contract #3 output envelope structure conformance
│   ├── 1.2 Benchmark organization substring match (PASS)
│   ├── 1.3 Benchmark organization mismatch (FAIL)
│   ├── 1.4 Benchmark examTitle substring match (PASS)
│   ├── 1.5 Benchmark vacancy count threshold (PASS & WARNING)
│   ├── 1.6 Benchmark application fee caps (general & reserved)
│   ├── 1.7 Benchmark active application window deadline check
│   ├── 1.8 Candidate age within [minAge, maxAge] for General category (ELIGIBLE)
│   ├── 1.9 Candidate underage (< minAge) (DISQUALIFIED)
│   ├── 1.10 Candidate overage for General category (> maxAge) (DISQUALIFIED)
│   ├── 1.11 Candidate overage SC with 5-year relaxation (ELIGIBLE)
│   ├── 1.12 Candidate overage SC exceeding 5-year relaxation (DISQUALIFIED)
│   ├── 1.13 Candidate overage OBC with 3-year relaxation (ELIGIBLE)
│   ├── 1.14 Candidate overage OBC exceeding 3-year relaxation (DISQUALIFIED)
│   ├── 1.15 Category relaxation does NOT reduce minAge (underage SC candidate DISQUALIFIED)
│   ├── 1.16 Education qualification level matching (Graduate satisfies Bachelor requirement)
│   ├── 1.17 Higher degree satisfies lower requirement (Master's satisfies Bachelor's)
│   ├── 1.18 Education qualification deficit (10+2 fails Bachelor's requirement)
│   ├── 1.19 Stream matching when open to "Any Discipline"
│   ├── 1.20 Stream mismatch on restricted engineering post
│   ├── 1.21 Summary metrics calculation (totalChecks, passedChecks, failedChecks, passRate)
│   └── 1.22 Overall verdict resolution (PASS vs FAIL vs WARNING)
├── Tier 2: Boundary Conditions & Corner Cases
│   ├── 2.1 Exact minimum age boundary (candidate.age === minAge) -> ELIGIBLE
│   ├── 2.2 Exact maximum age boundary (candidate.age === maxAge) -> ELIGIBLE
│   ├── 2.3 Exact relaxed upper age boundary (candidate.age === maxAge + relaxation) -> ELIGIBLE
│   ├── 2.4 Off-by-one under minimum age (candidate.age === minAge - 1) -> DISQUALIFIED
│   ├── 2.5 Off-by-one over maximum age (candidate.age === maxAge + 1) -> DISQUALIFIED
│   ├── 2.6 Off-by-one over relaxed age (candidate.age === maxAge + relaxation + 1) -> DISQUALIFIED
│   ├── 2.7 Zero fee boundary (applicationFee === 0 INR)
│   ├── 2.8 Exact vacancy threshold equality (vacancies === minVacancies)
│   ├── 2.9 Vacancy off-by-one warning (vacancies === minVacancies - 1)
│   ├── 2.10 Leap year calendar boundary (applicationEndDate: '2028-02-29')
│   ├── 2.11 Same-day application window (applicationStartDate === applicationEndDate)
│   └── 2.12 Empty criteria lists (empty requiredEducation, empty eligibleStreams)
├── Tier 3: Negative, Corrupted & Robustness Testing
│   ├── 3.1 Null / undefined extractedData -> returns FAIL envelope without throwing
│   ├── 3.2 Non-object primitive extractedData -> returns FAIL envelope without throwing
│   ├── 3.3 Null / undefined databaseCriteria -> returns WARNING envelope without throwing
│   ├── 3.4 Empty databaseCriteria `{}` -> returns neutral PASS envelope
│   ├── 3.5 Completely blank extracted data (`getEmptyCriteria()`) -> handles safely
│   ├── 3.6 String numeric age coercion ("25" -> 25)
│   ├── 3.7 Non-numeric, NaN, Infinity, and negative candidate ages
│   ├── 3.8 Missing nested fields (missing eligibility, missing dates, missing fee)
│   ├── 3.9 Inverted timeline dates (endDate < startDate, examDate < endDate)
│   ├── 3.10 Malformed ISO date strings ("2026-13-45", "not-a-date")
│   └── 3.11 Unknown or null candidate reservation categories
└── Tier 4: Real-World Workload Scenarios
    ├── 4.1 Full batch candidate matrix evaluation (12 diverse candidates) against UPSC CSE
    ├── 4.2 PwBD candidate with 10-year relaxation in notice containing PwBD clause
    ├── 4.3 Staff Selection Commission (SSC CGL 2026) multi-tiered benchmark evaluation
    ├── 4.4 Technical Engineering recruitment stream filtering
    └── 4.5 End-to-end co-validation (sample-notification.pdf -> mock extraction -> verifyUnity)
```

---

## 4. Caveats

1. **Upper Age Relaxation vs Lower Age Restriction**: In Indian administrative recruitments, statutory age relaxations apply strictly to the *upper* age limit (`maxAge`). Relaxations never apply to the *minimum* age requirement (`minAge`). The test suite explicitly enforces this constraint (Test 1.15).
2. **PwBD Clause in Sample PDF**: The synthetic fixture `fixtures/sample-notification.pdf` contains reservation clauses for SC/ST (5 years) and OBC (3 years), but omits PwBD age relaxation from its text. Therefore, against `MOCK_NOTIFICATION_FIXTURE`, a 40-year-old PwBD candidate is correctly evaluated as disqualified. To test PwBD relaxation, tests must use a notification fixture containing the PwBD relaxation clause (verified in Test 4.2).
3. **Date Formats**: The Gemini parser schema standardizes dates to ISO `YYYY-MM-DD`. Any date comparisons in unity checker should compare standard ISO strings (`s1 >= s2`) or parse via `Date.UTC`.

---

## 5. Conclusion

1. The declarative criteria schema cleanly separates **Document Benchmark Rules** from **Candidate Profile Qualifications**, satisfying Interface Contract #3 and allowing both recruitment validation and personalized eligibility matching.
2. `fixtures/mock-criteria.js` provides 4 standard benchmark presets (`UPSC`, `SSC_CGL`, `IBPS_PO`, `TECHNICAL_SERVICES`) and 15 distinct candidate profiles covering all boundary, demographic, relaxation, and malformed scenarios.
3. The 4-Tier test architecture for `test/unity-checker.test.js` spans 40+ tests across Feature Coverage, Boundaries, Robustness, and Real-World Scenarios.
4. The prototype implementation verified 31/31 passing tests with zero failures in 125ms.
5. The implementation worker can directly apply `fixtures/mock-criteria.js` and build `test/unity-checker.test.js` using the blueprints provided in this report.

---

## 6. Verification Method

To verify the deliverables and test architecture:
1. Inspect the prototype fixture and test files created in `.agents/m3_explorer_3/`:
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_3\proposed_mock_criteria.js`
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_3\proposed_unity_checker_test.js`
2. Run the prototype test suite directly:
   ```powershell
   node --test .agents/m3_explorer_3/proposed_unity_checker_test.js
   ```
   *Expected result*: All 31 tests pass across Tiers 1–4 with exit code 0.
3. Run existing project regression tests to confirm zero regressions:
   ```powershell
   npm test
   ```
   *Expected result*: 129/129 tests pass with exit code 0.
