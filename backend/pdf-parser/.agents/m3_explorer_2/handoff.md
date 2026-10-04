# Handoff Report: Core Unity Checking Engine Architecture (`src/services/validator/unity-checker.js`)

**Agent**: `m3_explorer_2` (teamwork_preview_explorer)  
**Parent**: `teamwork_preview_orchestrator_3` (ID: `478bab56-0e1f-4e7d-83c1-6712d8805eae`)  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_2`  
**Milestone**: Milestone 3 — Unity / Database Checking Module  
**Date**: 2026-09-14  

---

## 1. Observation

### 1.1 Project Requirements and Interface Contracts
From `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md`:
> **R3. Unity / Database Checking**:
> "Implement a verification module ("unity checking") that compares the structured data returned by Gemini against a predefined set of database criteria or schema rules. Ensure the logic can evaluate if the parsed PDF matches the required criteria."
>
> **R4. Standalone Execution**:
> "Provide a local test script (e.g., `parse-demo.js`) that allows the user to supply a PDF, a Gemini API key via `.env`, and mock database criteria to see the end-to-end extraction and validation in the console."

From `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_3\PROJECT.md`:
> **Interface Contract #3: Unity Checker ↔ Pipeline**:
> - **Function**: `verifyUnity(extractedData, databaseCriteria)`
> - **Input**:
>   - `extractedData`: Object matching Gemini parser output `data`
>   - `databaseCriteria`: Benchmark rules & candidate profile
> - **Output**:
>   ```javascript
>   {
>     overallVerdict: 'PASS' | 'FAIL' | 'WARNING',
>     summary: {
>       totalChecks: number,
>       passedChecks: number,
>       failedChecks: number,
>       warningChecks: number,
>       passRate: number
>     },
>     evaluations: Array<{
>       field: string,
>       expected: any,
>       actual: any,
>       status: 'PASS' | 'FAIL' | 'WARNING',
>       reason: string
>     }>,
>     candidateEligibility: {
>       isEligible: boolean,
>       disqualifications: string[],
>       matchedQualifications: string[]
>     }
>   }
>   ```

### 1.2 Extracted Data Contract from Milestone 2
From `src/services/ai/gemini-parser.js` (lines 80-139 and 306-311):
- `gemini-parser.js` produces a structured object containing:
  - `examTitle`: `string | null`
  - `organization`: `string | null`
  - `eligibility`:
    - `minAge`: `number | null`
    - `maxAge`: `number | null`
    - `ageRelaxation`: `Array<{ category: string, years: number }>`
    - `requiredEducation`: `string[]`
    - `eligibleStreams`: `string[]`
  - `importantDates`:
    - `applicationStartDate`: `string | null` (ISO `YYYY-MM-DD`)
    - `applicationEndDate`: `string | null` (ISO `YYYY-MM-DD`)
    - `examDate`: `string | null` (ISO `YYYY-MM-DD`)
  - `vacancies`: `number | null`
  - `applicationFee`:
    - `general`: `number | null`
    - `reserved`: `number | null`
  - `status`: `string` (`'ACTIVE' | 'UPCOMING' | 'CLOSED' | 'EXPIRED' | 'UNKNOWN'`)
- In addition, callers may pass either the raw `data` object OR the top-level envelope `{ success: true, isMock: false, modelUsed: '...', data: { ... } }`.

### 1.3 Candidate Matching Baseline in Existing Codebase
From `demo.js` (lines 16-73 and 79-108):
- Existing prototype uses candidate profile fields: `name`, `dob`, `age`, `gender`, `category`, `education`, `degree`, `state`.
- Existing logic verifies:
  1. Age relaxation limits: `{ General: 32, OBC: 35, SC: 37, ST: 37, EWS: 32 }`.
  2. Qualification levels: 10th Pass (MTS/Matric), 12th Pass (10+2/CHSL), Graduate/Postgraduate.

### 1.4 Peer Explorer Artifacts (Harmonization)
- **`m3_explorer_1`** (`.agents/m3_explorer_1/test-full-declarative-engine.js`):
  - Designed `src/services/validator/rules.js` providing:
    - Rule evaluators: `evaluateRequired`, `evaluateEquals`, `evaluateRange`, `evaluateEnum`, `evaluateDateChronology`, `evaluateRegex`.
    - Evaluation contract: `createResult({ field, expected, actual, status, reason })`.
    - Domain utilities: `resolveRelaxationYears(category, ageRelaxationList)`, `matchesEducation(candidateDegree, requiredEducationList)`, `matchesStream(candidateStream, eligibleStreamsList)`.
    - Safe property traversal: `getNestedValue(obj, path)` with prototype pollution protection.
- **`m3_explorer_3`** (`.agents/m3_explorer_3/proposed_mock_criteria.js`):
  - Designed benchmark database criteria: `UPSC_BENCHMARK_CRITERIA`, `SSC_CGL_BENCHMARK_CRITERIA`, `IBPS_PO_BENCHMARK_CRITERIA`, `TECHNICAL_SERVICES_BENCHMARK_CRITERIA`.
  - Designed mock candidate profiles: `FULLY_QUALIFIED_GENERAL`, `UNDERAGE_CANDIDATE`, `OVERAGE_GENERAL_CANDIDATE`, `OVERAGE_SC_ELIGIBLE_WITH_RELAXATION`, `OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION`, `OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION`, `OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION`, `PWBD_ELIGIBLE_WITH_RELAXATION`, `WRONG_STREAM_DISQUALIFIED`.

### 1.5 Verification of Prototype Engine
We built and executed a prototype in `.agents/m3_explorer_2/test_unity_prototype.js`:
- Verified 4 distinct scenarios:
  1. **Test 1 (Ideal UPSC Match + Qualified Candidate)**: Returned `overallVerdict: 'PASS'`, 7/7 checks passed (100%), candidate status `ELIGIBLE` with 3 matched qualifications.
  2. **Test 2 (Disqualified Candidate - Age 36 vs Max 35)**: Returned `overallVerdict: 'FAIL'`, 3/4 checks passed (75%), candidate status `DISQUALIFIED` with detailed root-cause explanation.
  3. **Test 3 (Warning Verdict - Missing Closing Date)**: Returned `overallVerdict: 'WARNING'`, 4/5 checks passed (80%), 1 warning check, candidate status `ELIGIBLE`.
  4. **Test 4 (Adversarial Null/Malformed Inputs)**:
     - `verifyUnity(null, null)` -> `FAIL` (0 uncaught exceptions)
     - `verifyUnity({}, {})` -> `PASS` (0 uncaught exceptions)
     - `verifyUnity(fixture, null)` -> `WARNING` (0 uncaught exceptions)

---

## 2. Logic Chain

The architecture of `verifyUnity(extractedData, databaseCriteria)` is decomposed into six cohesive operational phases:

```
[Input: extractedData & databaseCriteria]
                     │
                     ▼
       ┌─────────────────────────────┐
Phase 1│ Input Normalization & Safety │ -> Unwraps envelopes, handles null/undefined, defaults missing structures
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
Phase 2│ Execution Flow: Benchmarks   │ -> Resolves rules (explicit array, flat properties, or nested schema)
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
Phase 3│ Execution Flow: Candidate    │ -> Age + Relaxation, Degree equivalence, Stream matching
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
Phase 4│ Scoring & Summary Metrics    │ -> totalChecks, passedChecks, failedChecks, warningChecks, passRate%
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
Phase 5│ Verdict Resolution Logic     │ -> Deterministic truth table ('PASS' | 'FAIL' | 'WARNING')
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
Phase 6│ Diagnostic Output & Helpers  │ -> formatUnityReport(), printUnityReport() for Milestone 4 CLI
       └─────────────────────────────┘
```

### 2.1 Input Validation & Normalization
1. **Unwrapping**: Callers may provide either:
   - The raw data object `{ examTitle, eligibility, ... }`
   - The full Gemini envelope `{ success: true, data: { ... } }`
   The normalizer inspects `extractedData.data`; if present and is an object, it unwraps `data = extractedData.data`.
2. **Defensive Schema Guarantee**:
   - If `extractedData` is null, undefined, primitive, or malformed, `verifyUnity` immediately emits a failed evaluation `{ field: '_extractedData', status: 'FAIL', reason: 'Extracted data is null, undefined, or not an object' }` and returns `overallVerdict: 'FAIL'`. No `TypeError` can escape.
   - For valid objects, nested sections (`eligibility`, `importantDates`, `applicationFee`) are guaranteed to exist with defaults (`{ minAge: null, maxAge: null, ageRelaxation: [], requiredEducation: [], eligibleStreams: [] }`).
3. **Database Criteria Normalization**:
   - If `databaseCriteria` is null, undefined, or non-object, `verifyUnity` returns `overallVerdict: 'WARNING'` with `{ field: '_databaseCriteria', status: 'WARNING', reason: 'No database criteria provided for verification' }`.
   - If `databaseCriteria` is an empty object `{}`, 0 checks are performed, returning `overallVerdict: 'PASS'` with `totalChecks: 0, passRate: 100`.

### 2.2 Execution Flow & Multi-Format Criteria Support
To maximize developer ergonomic flexibility and support both declarative rules and simple configuration, `verifyUnity` supports three complementary criteria formats:
1. **Direct / Benchmark Properties**:
   - `databaseCriteria.organization` -> Evaluated against `extractedData.organization` (rule: contains / exact, severity: CRITICAL).
   - `databaseCriteria.examTitle` -> Evaluated against `extractedData.examTitle` (rule: contains, severity: CRITICAL).
   - `databaseCriteria.status` -> Evaluated against `extractedData.status` (rule: in, severity: WARNING).
   - `databaseCriteria.minVacancies` -> Evaluated against `extractedData.vacancies` (rule: min, severity: WARNING).
   - `databaseCriteria.maxGeneralFee` -> Evaluated against `extractedData.applicationFee.general` (rule: max, severity: WARNING).
   - `databaseCriteria.maxReservedFee` -> Evaluated against `extractedData.applicationFee.reserved` (rule: max, severity: CRITICAL).
   - `databaseCriteria.applicationEndDateMin` -> Evaluated against `extractedData.importantDates.applicationEndDate` (rule: date min, severity: FAIL if expired, WARNING if date unannounced/null).
2. **Nested Criteria Format** (`databaseCriteria.expected` or `databaseCriteria.ageLimits`, `databaseCriteria.educationRequirements`):
   - Mapped to path traversals using `getNestedValue`.
3. **Explicit Declarative Rules Array** (`databaseCriteria.rules`):
   - If `databaseCriteria.rules` is an array, each rule `{ field, rule, expected, severity, ... }` is evaluated dynamically using the rule registry in `src/services/validator/rules.js`.

### 2.3 Candidate Eligibility Breakdown Engine
When `databaseCriteria.candidate` is supplied:
1. **Age Boundary & Dynamic Category Relaxation**:
   - Candidate Age: parsed safely from `candidate.age` (or calculated from `candidate.dob`).
   - Notification Base Limits: `minAge` and `maxAge` from `extractedData.eligibility`.
   - Category Relaxation: Looked up from `extractedData.eligibility.ageRelaxation` matching `candidate.category` across aliases (SC, ST, OBC, PwBD, etc.).
   - Max Permissible Age = `baseMaxAge + relaxationYears`.
   - **Disqualification conditions**:
     - `candidateAge < minAge` -> "Candidate age (X) is below minimum requirement of Y"
     - `candidateAge > maxPermissibleAge` -> "Candidate age (X) exceeds maximum limit of Y (base Z + R yrs CAT relaxation)"
   - **Match condition**:
     - `minAge <= candidateAge <= maxPermissibleAge` -> Recorded in `matchedQualifications`.
2. **Educational Qualification Matching**:
   - Evaluates candidate degree/education against `extractedData.eligibility.requiredEducation`.
   - Degree level hierarchy: PhD (6) > Master (5) > Bachelor/Graduate (4) > Diploma (3) > 10+2 (2) > 10th (1).
   - Synonym mapping: "Bachelor's degree in any discipline" accepts B.Tech, B.E., B.Sc, B.Com, B.A., MBBS, Graduation, Degree.
   - Disqualification if candidate education fails to satisfy any required qualification.
3. **Stream / Discipline Matching**:
   - If `extractedData.eligibility.eligibleStreams` is empty or includes "Any" / "Any Discipline", candidate passes automatically.
   - If restricted to specific streams (e.g. `['Engineering', 'Civil Engineering']`), candidate stream must match.
4. **Candidate Synthesis**:
   - `isEligible = disqualifications.length === 0`.
   - Candidate checks are appended to the main `evaluations` array (`field: 'candidate.age'`, `'candidate.education'`, `'candidate.stream'`).

### 2.4 Scoring & Summary Metrics Calculation
The summary scorecard enforces mathematical consistency:
- `totalChecks = evaluations.length`
- `passedChecks = evaluations.filter(e => e.status === 'PASS').length`
- `failedChecks = evaluations.filter(e => e.status === 'FAIL').length`
- `warningChecks = evaluations.filter(e => e.status === 'WARNING').length`
- Invariant: `totalChecks === passedChecks + failedChecks + warningChecks`
- Pass Rate calculation:
  ```javascript
  const passRate = totalChecks > 0
    ? parseFloat(((passedChecks / totalChecks) * 100).toFixed(2))
    : 100;
  ```
  Guarded against `0 / 0 === NaN`.

### 2.5 Overall Verdict Resolution Logic
The overall verdict is derived deterministically from the evaluations and candidate eligibility:

| `failedChecks` | `warningChecks` | `candidateEligibility.isEligible` | `overallVerdict` | Rationale |
|:---:|:---:|:---:|:---:|---|
| `0` | `0` | `true` | `'PASS'` | All checks satisfied completely |
| `0` | `> 0` | `true` | `'WARNING'` | No hard failures, but non-critical caveats exist (e.g. unannounced exam date) |
| `> 0` | any | `true` | `'FAIL'` | At least one benchmark criterion failed |
| any | any | `false` | `'FAIL'` | Candidate is disqualified on age/education/stream |

Resolution rule:
```javascript
let overallVerdict = 'PASS';
if (failedChecks > 0 || !isEligible) {
  overallVerdict = 'FAIL';
} else if (warningChecks > 0) {
  overallVerdict = 'WARNING';
}
```

### 2.6 Formatted Diagnostic Output (Milestone 4 Alignment)
`src/services/validator/unity-checker.js` provides:
1. `formatUnityReport(result, options)`: Returns a formatted ASCII dashboard string:
   - Header with visual verdict badge (`[ PASS ]`, `[ FAIL ]`, `[ WARNING ]`).
   - Metrics Scorecard (`Total: X | Passed: Y | Failed: Z | Warnings: W | Pass Rate: P%`).
   - Field-by-field diff list showing status icon (`✔ PASS`, `✘ FAIL`, `⚠ WARN`), field name, reason, and diff (`Expected vs Actual`) on mismatches.
   - Candidate eligibility section with `ELIGIBLE` / `DISQUALIFIED` badge, matched qualifications list, and disqualifications list.
   - Automatic ANSI color support with `NO_COLOR` and TTY detection.
2. `printUnityReport(result, options)`: Wrapper that prints the formatted report to `console.log`.

---

## 3. Caveats

1. **Read-Only Scope**: In accordance with the explorer protocol, no source files were created or modified in `src/` or `test/`. All prototyping was performed in `.agents/m3_explorer_2/`.
2. **Dependency on `rules.js`**: `unity-checker.js` delegates specific comparison algorithms to `src/services/validator/rules.js`. In the event `rules.js` is called before being fully built, `unity-checker.js` should include lightweight internal fallback evaluators for `exact`, `min`, `max`, `contains`, and `in`.
3. **Date of Birth vs Age**: When candidate specifies `candidate.dob` instead of `candidate.age`, calculating the exact age requires a cut-off reference date (e.g. notification's `applicationStartDate` or August 1st of the exam year). If no cut-off date is given in the document, it defaults to the current calendar date.
4. **Zero External Dependencies**: The unity checking engine relies exclusively on built-in Node.js primitives (`assert`, `Date`, regex) and requires zero third-party packages.

---

## 4. Conclusion & Complete Design Specifications

### 4.1 Target File 1: `src/services/validator/unity-checker.js`
The recommended complete implementation structure:

```javascript
'use strict';

/**
 * src/services/validator/unity-checker.js
 * Core unity and database checking engine.
 * Conforms 100% to Interface Contract #3 in PROJECT.md and Requirements §R3, §R4.
 */

const { normalizeCriteriaData } = require('../ai/gemini-parser');
const rulesEngine = require('./rules');

/**
 * Evaluates candidate qualifications against extracted recruitment criteria.
 * @param {Object} candidate - Candidate profile from database criteria
 * @param {Object} criteria - Normalized criteria extracted from PDF
 * @returns {{ isEligible: boolean, disqualifications: string[], matchedQualifications: string[], evaluations: Array }}
 */
function evaluateCandidateEligibility(candidate, criteria) {
  const disqualifications = [];
  const matchedQualifications = [];
  const evaluations = [];

  if (!candidate || typeof candidate !== 'object') {
    return {
      isEligible: true,
      disqualifications: [],
      matchedQualifications: ['No candidate profile specified; notification criteria evaluated only'],
      evaluations: []
    };
  }

  const category = (candidate.category || 'General').toUpperCase();
  let candidateAge = typeof candidate.age === 'number' && Number.isFinite(candidate.age) ? candidate.age : null;

  // Derive age from DOB if age not directly given
  if (candidateAge === null && candidate.dob && /^\d{4}-\d{2}-\d{2}$/.test(candidate.dob)) {
    const [y, m, d] = candidate.dob.split('-').map(Number);
    const birthDate = new Date(Date.UTC(y, m - 1, d));
    const refDate = new Date();
    let age = refDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const mDiff = refDate.getUTCMonth() - birthDate.getUTCMonth();
    if (mDiff < 0 || (mDiff === 0 && refDate.getUTCDate() < birthDate.getUTCDate())) {
      age--;
    }
    candidateAge = age;
  }

  // 1. Age Evaluation with Category Relaxation
  const minAge = criteria.eligibility?.minAge ?? null;
  const maxAge = criteria.eligibility?.maxAge ?? null;
  const ageRelaxationList = criteria.eligibility?.ageRelaxation || [];

  let relaxationYears = 0;
  if (rulesEngine.resolveRelaxationYears) {
    relaxationYears = rulesEngine.resolveRelaxationYears(category, ageRelaxationList);
  } else {
    // Built-in fallback
    for (const rel of ageRelaxationList) {
      if (rel && rel.category && rel.category.toUpperCase().includes(category)) {
        relaxationYears = Math.max(relaxationYears, Number(rel.years) || 0);
      }
    }
  }

  if (candidateAge !== null) {
    const effectiveMaxAge = maxAge !== null ? maxAge + relaxationYears : null;
    let ageStatus = 'PASS';
    let ageReason = '';

    if (minAge !== null && candidateAge < minAge) {
      ageStatus = 'FAIL';
      ageReason = `Candidate age (${candidateAge}) is below minimum requirement of ${minAge}`;
      disqualifications.push(ageReason);
    } else if (effectiveMaxAge !== null && candidateAge > effectiveMaxAge) {
      ageStatus = 'FAIL';
      ageReason = `Candidate age (${candidateAge}) exceeds maximum limit of ${effectiveMaxAge} (base ${maxAge} + ${relaxationYears} yrs ${category} relaxation)`;
      disqualifications.push(ageReason);
    } else {
      ageReason = `Candidate age (${candidateAge}) satisfies age limit [${minAge || 'none'} - ${effectiveMaxAge || 'none'}] (base ${maxAge} + ${relaxationYears} yrs ${category} relaxation)`;
      matchedQualifications.push(ageReason);
    }

    evaluations.push({
      field: 'candidate.age',
      expected: `Between ${minAge || 18} and ${effectiveMaxAge || 65}`,
      actual: candidateAge,
      status: ageStatus,
      reason: ageReason
    });
  }

  // 2. Education Qualification Evaluation
  const candidateEdu = candidate.education || candidate.degree || '';
  const requiredEducation = criteria.eligibility?.requiredEducation || [];

  if (candidateEdu && requiredEducation.length > 0) {
    let eduResult;
    if (rulesEngine.matchesEducation) {
      eduResult = rulesEngine.matchesEducation(candidateEdu, requiredEducation);
    } else {
      // Built-in fallback matching
      const normCand = candidateEdu.toLowerCase();
      const match = requiredEducation.find(req => normCand.includes(req.toLowerCase()) || req.toLowerCase().includes('any discipline'));
      eduResult = match ? { matches: true, matchedReq: match } : { matches: false };
    }

    if (eduResult.matches) {
      const reason = `Candidate qualification '${candidateEdu}' meets requirement: '${eduResult.matchedReq || requiredEducation[0]}'`;
      matchedQualifications.push(reason);
      evaluations.push({
        field: 'candidate.education',
        expected: requiredEducation,
        actual: candidateEdu,
        status: 'PASS',
        reason
      });
    } else {
      const reason = `Candidate qualification '${candidateEdu}' does not satisfy required qualifications: ${JSON.stringify(requiredEducation)}`;
      disqualifications.push(reason);
      evaluations.push({
        field: 'candidate.education',
        expected: requiredEducation,
        actual: candidateEdu,
        status: 'FAIL',
        reason
      });
    }
  }

  // 3. Stream / Discipline Evaluation
  const candidateStream = candidate.stream || '';
  const eligibleStreams = criteria.eligibility?.eligibleStreams || [];

  if (candidateStream && eligibleStreams.length > 0) {
    let streamResult;
    if (rulesEngine.matchesStream) {
      streamResult = rulesEngine.matchesStream(candidateStream, eligibleStreams);
    } else {
      const isOpen = eligibleStreams.some(s => /any/i.test(s));
      const match = isOpen || eligibleStreams.some(s => s.toLowerCase().includes(candidateStream.toLowerCase()));
      streamResult = { matches: match };
    }

    if (streamResult.matches) {
      const reason = `Candidate stream '${candidateStream}' satisfies eligible streams`;
      matchedQualifications.push(reason);
      evaluations.push({
        field: 'candidate.stream',
        expected: eligibleStreams,
        actual: candidateStream,
        status: 'PASS',
        reason
      });
    } else {
      const reason = `Candidate stream '${candidateStream}' is not in eligible streams: ${JSON.stringify(eligibleStreams)}`;
      disqualifications.push(reason);
      evaluations.push({
        field: 'candidate.stream',
        expected: eligibleStreams,
        actual: candidateStream,
        status: 'FAIL',
        reason
      });
    }
  }

  return {
    isEligible: disqualifications.length === 0,
    disqualifications,
    matchedQualifications,
    evaluations
  };
}

/**
 * Main verification entry point: Compares extracted data against database criteria.
 * 
 * @param {Object} extractedData - Output from Gemini criteria extractor (raw or envelope)
 * @param {Object} databaseCriteria - Benchmark criteria and candidate profile
 * @returns {Object} VerificationResult conforming strictly to Interface Contract #3
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

  // Unwrap envelope if top-level envelope passed
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
        isEligible: false,
        disqualifications: ['No database criteria provided'],
        matchedQualifications: []
      }
    };
  }

  const evaluations = [];

  // 3. Evaluate Benchmark Rules
  // Organization check
  if (databaseCriteria.organization !== undefined) {
    const exp = String(databaseCriteria.organization).trim().toLowerCase();
    const act = String(normData.organization || '').trim().toLowerCase();
    const match = act.includes(exp) || exp.includes(act);
    evaluations.push({
      field: 'organization',
      expected: databaseCriteria.organization,
      actual: normData.organization,
      status: match ? 'PASS' : 'FAIL',
      reason: match ? `Organization matches expected benchmark` : `Expected organization containing '${databaseCriteria.organization}' but found '${normData.organization}'`
    });
  }

  // Exam Title check
  if (databaseCriteria.examTitle !== undefined) {
    const exp = String(databaseCriteria.examTitle).trim().toLowerCase();
    const act = String(normData.examTitle || '').trim().toLowerCase();
    const match = act.includes(exp) || exp.includes(act);
    evaluations.push({
      field: 'examTitle',
      expected: databaseCriteria.examTitle,
      actual: normData.examTitle,
      status: match ? 'PASS' : 'FAIL',
      reason: match ? `Exam title matches expected benchmark` : `Expected exam title containing '${databaseCriteria.examTitle}' but found '${normData.examTitle}'`
    });
  }

  // Status check
  if (databaseCriteria.status !== undefined) {
    const allowed = Array.isArray(databaseCriteria.status) ? databaseCriteria.status : [databaseCriteria.status];
    const match = allowed.includes(normData.status);
    evaluations.push({
      field: 'status',
      expected: allowed,
      actual: normData.status,
      status: match ? 'PASS' : 'WARNING',
      reason: match ? `Status '${normData.status}' is in accepted states` : `Status '${normData.status}' is not in expected list: ${allowed.join(', ')}`
    });
  }

  // Vacancy check
  if (databaseCriteria.minVacancies !== undefined) {
    const minVac = Number(databaseCriteria.minVacancies);
    const actVac = normData.vacancies;
    if (actVac === null) {
      evaluations.push({
        field: 'vacancies',
        expected: `>= ${minVac}`,
        actual: null,
        status: 'WARNING',
        reason: `Vacancies not specified or tentative in notification`
      });
    } else {
      const match = actVac >= minVac;
      evaluations.push({
        field: 'vacancies',
        expected: `>= ${minVac}`,
        actual: actVac,
        status: match ? 'PASS' : 'WARNING',
        reason: match ? `Vacancies (${actVac}) satisfy minimum threshold of ${minVac}` : `Vacancies (${actVac}) below desired threshold of ${minVac}`
      });
    }
  }

  // Application Fee Checks
  if (databaseCriteria.maxGeneralFee !== undefined) {
    const maxFee = Number(databaseCriteria.maxGeneralFee);
    const actFee = normData.applicationFee?.general;
    if (actFee === null) {
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
        reason: match ? `General application fee (₹${actFee}) within maximum limit of ₹${maxFee}` : `General fee (₹${actFee}) exceeds limit of ₹${maxFee}`
      });
    }
  }

  if (databaseCriteria.maxReservedFee !== undefined) {
    const maxFee = Number(databaseCriteria.maxReservedFee);
    const actFee = normData.applicationFee?.reserved;
    if (actFee !== null) {
      const match = actFee <= maxFee;
      evaluations.push({
        field: 'applicationFee.reserved',
        expected: `<= ${maxFee}`,
        actual: actFee,
        status: match ? 'PASS' : 'FAIL',
        reason: match ? `Reserved fee (₹${actFee}) within limit of ₹${maxFee}` : `Reserved fee (₹${actFee}) exceeds limit of ₹${maxFee}`
      });
    }
  }

  // Date Check: Expiration deadline
  if (databaseCriteria.applicationEndDateMin !== undefined) {
    const minEnd = databaseCriteria.applicationEndDateMin;
    const actEnd = normData.importantDates?.applicationEndDate;
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
        reason: match ? `Application end date (${actEnd}) is active (on or after ${minEnd})` : `Application deadline (${actEnd}) has passed or expired before ${minEnd}`
      });
    }
  }

  // Declarative Rules Array (if passed)
  if (Array.isArray(databaseCriteria.rules) && rulesEngine.evaluateRule) {
    for (const rule of databaseCriteria.rules) {
      if (rule && rule.field) {
        const ev = rulesEngine.evaluateRule(rule, normData);
        if (ev) evaluations.push(ev);
      }
    }
  }

  // 4. Candidate Eligibility Evaluation
  const candidateResult = evaluateCandidateEligibility(databaseCriteria.candidate, normData);
  evaluations.push(...candidateResult.evaluations);

  // 5. Scoring & Summary Metrics
  const totalChecks = evaluations.length;
  const passedChecks = evaluations.filter(e => e.status === 'PASS').length;
  const failedChecks = evaluations.filter(e => e.status === 'FAIL').length;
  const warningChecks = evaluations.filter(e => e.status === 'WARNING').length;
  const passRate = totalChecks > 0 ? parseFloat(((passedChecks / totalChecks) * 100).toFixed(2)) : 100;

  // 6. Overall Verdict Resolution Logic
  let overallVerdict = 'PASS';
  if (failedChecks > 0 || !candidateResult.isEligible) {
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
    candidateEligibility: {
      isEligible: candidateResult.isEligible,
      disqualifications: candidateResult.disqualifications,
      matchedQualifications: candidateResult.matchedQualifications
    }
  };
}

/**
 * Formats verification result into a clean terminal report string.
 * @param {Object} result - Output of verifyUnity
 * @param {Object} [options={}]
 * @param {boolean} [options.noColor=false]
 * @returns {string}
 */
function formatUnityReport(result, options = {}) {
  const useColor = options.noColor !== true && process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || options.color);
  
  const green = useColor ? '\x1b[32m' : '';
  const red = useColor ? '\x1b[31m' : '';
  const yellow = useColor ? '\x1b[33m' : '';
  const cyan = useColor ? '\x1b[36m' : '';
  const bold = useColor ? '\x1b[1m' : '';
  const dim = useColor ? '\x1b[2m' : '';
  const reset = useColor ? '\x1b[0m' : '';

  const verdictBadge = {
    PASS: `${green}${bold}[ PASS ]${reset}`,
    FAIL: `${red}${bold}[ FAIL ]${reset}`,
    WARNING: `${yellow}${bold}[ WARNING ]${reset}`
  }[result.overallVerdict] || result.overallVerdict;

  const lines = [];
  lines.push('');
  lines.push(`${cyan}${bold}================================================================================${reset}`);
  lines.push(`${cyan}${bold}                     UNITY CHECK VERIFICATION REPORT                            ${reset}`);
  lines.push(`${cyan}${bold}================================================================================${reset}`);
  lines.push(`Overall Verdict : ${verdictBadge}`);
  lines.push(`Scorecard       : Total: ${result.summary.totalChecks} | Passed: ${green}${result.summary.passedChecks}${reset} | Failed: ${red}${result.summary.failedChecks}${reset} | Warnings: ${yellow}${result.summary.warningChecks}${reset} | Pass Rate: ${bold}${result.summary.passRate}%${reset}`);
  lines.push(`${dim}--------------------------------------------------------------------------------${reset}`);
  lines.push(`${bold}Field-by-Field Evaluations:${reset}`);

  for (const ev of result.evaluations) {
    const badge = ev.status === 'PASS' 
      ? `${green}✔ PASS${reset}` 
      : ev.status === 'FAIL' 
        ? `${red}✘ FAIL${reset}` 
        : `${yellow}⚠ WARN${reset}`;
    lines.push(`  ${badge.padEnd(16)} ${bold}${ev.field.padEnd(32)}${reset} ${ev.reason}`);
    if (ev.status !== 'PASS') {
      const expStr = typeof ev.expected === 'object' ? JSON.stringify(ev.expected) : String(ev.expected);
      const actStr = typeof ev.actual === 'object' ? JSON.stringify(ev.actual) : String(ev.actual);
      lines.push(`    ${dim}Expected: ${expStr} | Actual: ${actStr}${reset}`);
    }
  }

  lines.push(`${dim}--------------------------------------------------------------------------------${reset}`);
  lines.push(`${bold}Candidate Eligibility Summary:${reset}`);
  const eligBadge = result.candidateEligibility.isEligible 
    ? `${green}${bold}ELIGIBLE${reset}` 
    : `${red}${bold}DISQUALIFIED${reset}`;
  lines.push(`  Candidate Status: ${eligBadge}`);

  if (result.candidateEligibility.matchedQualifications.length > 0) {
    lines.push(`  ${green}Matched Qualifications:${reset}`);
    for (const mq of result.candidateEligibility.matchedQualifications) {
      lines.push(`    ${green}✓${reset} ${mq}`);
    }
  }

  if (result.candidateEligibility.disqualifications.length > 0) {
    lines.push(`  ${red}Disqualifications:${reset}`);
    for (const dq of result.candidateEligibility.disqualifications) {
      lines.push(`    ${red}✗${reset} ${dq}`);
    }
  }

  lines.push(`${cyan}${bold}================================================================================${reset}\n`);
  return lines.join('\n');
}

/**
 * Prints formatted report directly to console.
 */
function printUnityReport(result, options = {}) {
  console.log(formatUnityReport(result, options));
}

module.exports = {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport
};
```

### 4.2 Target File 2: `src/services/validator/index.js`
Barrel module exposing the validator API:
```javascript
'use strict';

const {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport
} = require('./unity-checker');

const rules = require('./rules');

module.exports = {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport,
  printUnityReport,
  rules
};
```

---

## 5. Verification Method

### 5.1 Independent Execution of Prototype Test
Execute the prototype script in this agent's folder:
```bash
node .agents/m3_explorer_2/test_unity_prototype.js
```
**Expected Outcome**:
- Clean zero-exit code (`0`).
- Pass output for Test 1 (`overallVerdict: 'PASS'`, 100% passRate, `isEligible: true`).
- Disqualification output for Test 2 (`overallVerdict: 'FAIL'`, candidate age 36 > 35, `isEligible: false`).
- Warning output for Test 3 (`overallVerdict: 'WARNING'`, missing closing date, `isEligible: true`).
- Complete crash immunity on `verifyUnity(null, null)` and `verifyUnity({}, {})`.

### 5.2 Verification of Existing Test Suite
Ensure the existing 129 tests across M1 and M2 continue to pass cleanly without regression:
```bash
npm test
```
**Expected Outcome**: 129 pass, 0 fail, duration < 1.5s.

### 5.3 Invalidation Conditions
The proposed architecture is invalidated if:
1. `verifyUnity(extractedData, databaseCriteria)` throws an unhandled exception for any permutation of `null`, `undefined`, empty object, or corrupted inputs.
2. Returned object keys do not conform exactly to Interface Contract #3: `overallVerdict`, `summary`, `evaluations`, and `candidateEligibility`.
3. `summary.passRate` produces `NaN` on empty evaluations or rounds incorrectly.
4. An over-age or disqualified candidate returns `overallVerdict: 'PASS'`.
