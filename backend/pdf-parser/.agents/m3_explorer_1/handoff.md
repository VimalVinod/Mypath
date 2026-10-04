# Milestone 3 Handoff Report: Declarative Validation Rules Engine (`src/services/validator/rules.js`)

**Agent**: `m3_explorer_1` (teamwork_preview_explorer)  
**Parent**: `teamwork_preview_orchestrator_3` (`478bab56-0e1f-4e7d-83c1-6712d8805eae`)  
**Date**: 2026-09-14  
**Target Module**: `src/services/validator/rules.js`  

---

## 1. Observation

### 1.1 Interface Contracts and Schema Specifications
- **Interface Contract #2** (`PROJECT.md:86-125`) establishes the Gemini extraction schema:
  - Top-level keys: `examTitle` (`string|null`), `organization` (`string|null`), `eligibility` (`object`), `importantDates` (`object`), `vacancies` (`number|null`), `applicationFee` (`object`), `status` (`string`).
  - `eligibility`: `minAge` (`number|null`), `maxAge` (`number|null`), `ageRelaxation` (`Array<{ category: string, years: number }>`), `requiredEducation` (`string[]`), `eligibleStreams` (`string[]`).
  - `importantDates`: `applicationStartDate` (`string|null`), `applicationEndDate` (`string|null`), `examDate` (`string|null`) formatted as ISO `YYYY-MM-DD`.
  - `applicationFee`: `general` (`number|null`), `reserved` (`number|null`).
  - `status`: enum `['ACTIVE', 'UPCOMING', 'CLOSED', 'EXPIRED', 'UNKNOWN']`.
- **Interface Contract #3** (`PROJECT.md:127-150`) establishes the Unity Checker contract:
  - Input: `verifyUnity(extractedData, databaseCriteria)`.
  - Return shape:
    ```javascript
    {
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
- **Gemini Normalization Behavior** (`src/services/ai/gemini-parser.js:80-139`):
  `normalizeCriteriaData` guarantees that fields default to `null` if missing, arrays default to `[]`, and invalid numbers default to `null`. However, `verifyUnity` must safely accept raw, partial, un-normalized, or malformed data objects from callers and adversarial tests without throwing exceptions.

### 1.2 Canonical Fixture Data
- `fixtures/generate-sample-pdf.js:14-71` and `src/services/ai/mock-gemini.js:41-65`:
  - `organization`: `'UNION PUBLIC SERVICE COMMISSION'`
  - `examTitle`: `'COMBINED CIVIL SERVICES EXAMINATION 2026'`
  - `minAge`: 21, `maxAge`: 32
  - `ageRelaxation`: `[{ category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 }]`
  - `requiredEducation`: `["Bachelor's degree in any discipline"]`
  - `eligibleStreams`: `['Any Discipline']`
  - `applicationStartDate`: `'2026-01-10'`, `applicationEndDate`: `'2026-02-15'`, `examDate`: `'2026-05-24'`
  - `vacancies`: 1056
  - `applicationFee`: `{ general: 100, reserved: 0 }`
  - `status`: `'ACTIVE'`

### 1.3 Explorer Peer Separation
- `m3_explorer_1` (this agent): Declarative rules engine (`src/services/validator/rules.js`), rule registry, primitive evaluators, candidate eligibility matcher, safe evaluation semantics, and return contract format.
- `m3_explorer_2`: Unity checker orchestration (`src/services/validator/unity-checker.js`), summary metrics calculation, diagnostic report formatting, and CLI runner integration.
- `m3_explorer_3`: Mock database criteria fixture (`fixtures/mock-criteria.js`) and test suite architecture (`test/unity-checker.test.js`).

---

## 2. Logic Chain

### 2.1 Rule Representation & Declarative Architecture
1. **Rule Structure**: A validation check in `databaseCriteria` is defined declaratively:
   ```javascript
   {
     field: string,             // Dot-path e.g. "eligibility.minAge", "status", "applicationFee.general"
     type: string,              // "required" | "equals" | "range" | "enum" | "dateOrder" | "regex" | "custom"
     expected?: any,            // Expected literal value (for equals)
     min?: number,              // Minimum boundary (for range)
     max?: number,              // Maximum boundary (for range)
     allowed?: any[],           // Permitted values array (for enum)
     beforeField?: string,      // Preceding date field path (for dateOrder)
     afterField?: string,       // Succeeding date field path (for dateOrder)
     pattern?: RegExp | string, // Regex pattern (for regex)
     severity?: 'error' | 'warning', // Severity on failure (defaults to 'error' -> 'FAIL')
     allowNull?: boolean,       // If true, null actual value returns 'WARNING' instead of 'FAIL'
     ignoreCase?: boolean       // Case-insensitive matching for strings (defaults to true)
   }
   ```
2. **Extensible Registry**: A `RuleRegistry` maps rule types to pure evaluator functions `(rule, actualValue, context) => RuleEvaluationResult`.
   Case-insensitive lookup ensures `{ type: 'dateOrder' }` and `{ type: 'dateorder' }` execute identically.
3. **Pure Functional Evaluators**: In addition to registry dispatch, exporting individual evaluators (`evaluateRequired`, `evaluateEquals`, `evaluateRange`, `evaluateEnum`, `evaluateDateOrder`, `evaluateRegex`, `evaluateCandidateEligibility`) allows direct unit testing and flexible composition.

### 2.2 Precise Return Contract
Every rule evaluator must strictly return an object conforming to Interface Contract #3:
```javascript
{
  field: string,               // Exact field evaluated (e.g. "vacancies" or "candidate.age")
  expected: any,               // Canonical expectation description
  actual: any,                 // Extracted actual value or normalized form
  status: 'PASS' | 'FAIL' | 'WARNING',
  reason: string               // Clear, human-readable explanation
}
```
Status resolution rules:
- `PASS`: Condition is completely satisfied.
- `FAIL`: Mandatory rule violated (field missing, number out of range, unlisted enum value, chronological date order violated, or candidate ineligible).
- `WARNING`: Rule failed with `severity: 'warning'`, or non-mandatory field is null (`allowNull: true` or `optional: true`), or unknown rule type encountered.

### 2.3 Safe Evaluation Semantics & Boundary Protection
1. **Safe Property Access (`getNestedValue`)**:
   Deep path traversal (`a.b.c`) must safely handle `null`, `undefined`, or non-object primitives at any level. It must block prototype pollution attempts (`__proto__`, `prototype`, `constructor`).
2. **Number Coercion Safety (`parseNumberSafely`)**:
   Must handle numbers, valid numeric strings (`"1056"` -> `1056`), and reject `NaN`, `Infinity`, empty strings, and non-numeric strings without throwing or silently evaluating comparisons to `false`. Crucially, `0` must return `0` (not fall through falsy checks).
3. **Strict ISO Date Validation (`parseIsoDateSafely`)**:
   JavaScript's native `new Date('2026-02-31')` rolls over to March 3rd instead of throwing. The parser must validate `/^\d{4}-\d{2}-\d{2}$/` and verify that `UTCYear`, `UTCMonth + 1`, and `UTCDate` match the input components, catching non-leap years (`2025-02-29`) and calendar rollovers.
4. **Resilient Defaults**:
   Evaluating against `null` or `undefined` root objects returns diagnostic evaluations with `status: 'FAIL'`, never unhandled exceptions.

### 2.4 Candidate Eligibility Matching Engine
Evaluating a candidate against recruitment criteria requires 3 specialized sub-evaluations:
1. **Candidate Age vs Min/Max Age with Relaxation**:
   - `effectiveMaxAge = maxAge + relaxationYears`.
   - Category alias resolution (`resolveRelaxationYears`):
     Candidate category `'SC'` or `'ST'` matches criteria category `'SC/ST'` and receives 5 years.
     Candidate category `'Persons with Benchmark Disabilities'` or `'PWD'` matches `'PwBD'` and receives 10 years.
     General / UR candidate receives 0 years.
     Unknown category receives 0 years.
   - If `candidate.age < minAge`: candidate is **underage** (`FAIL`).
   - If `candidate.age > effectiveMaxAge`: candidate is **overage** (`FAIL`).
   - If `minAge <= candidate.age <= effectiveMaxAge`: candidate satisfies age criteria (`PASS`).
2. **Candidate Degree vs Required Education**:
   - Degree taxonomy hierarchy (`EDUCATION_LEVELS`):
     Level 6: PhD / Doctorate / Doctor of Philosophy.
     Level 5: Master's / M.Tech / M.E. / M.Sc. / MCA / MBA / Post Graduate.
     Level 4: Bachelor's / B.Tech / B.E. / B.Sc. / B.Com / B.A. / BCA / BBA / MBBS / LLB / Graduation / Degree.
     Level 3: Diploma.
     Level 2: 10+2 / Higher Secondary / Intermediate / 12th.
     Level 1: 10th / Matriculation / Secondary.
   - When criteria requires "Bachelor's degree in any discipline" or "Graduation", any candidate holding Level >= 4 qualifies. Candidates with higher degrees (e.g. Master's, PhD) automatically satisfy a Bachelor's requirement.
   - Candidates holding Level < 4 (e.g. 10+2, Diploma) are disqualified (`FAIL`).
3. **Candidate Stream vs Eligible Streams**:
   - If `eligibleStreams` is empty or contains `"Any"`, `"Any Discipline"`, or `"All"`, any candidate stream qualifies.
   - Otherwise, the candidate's stream must match one of the permitted streams (case-insensitive substring match).
4. **Eligibility Aggregation**:
   `candidateEligibility.isEligible` is `true` if and only if `disqualifications.length === 0`.
   All checks generate individual entries in `evaluations` under `candidate.age`, `candidate.education`, and `candidate.stream`.

---

## 3. Caveats

1. **Date Cut-Off Reference**: Government recruitment notifications often specify an exact cut-off date for age calculation (e.g. "as on 1st August 2026"). In candidate profiles where only `age: 28` is provided, the rule engine evaluates the integer age directly. If a full `dob: '1998-05-15'` is provided in future iterations, an age calculator helper can compute exact age relative to the cut-off date.
2. **Complex Tiered Experience**: Some specialized technical roles require combinations of education and years of experience (e.g. "Degree + 3 years experience OR Diploma + 5 years experience"). The current design handles standard civil service / recruitment criteria (age, category relaxation, education level, stream). Tiered OR-clauses can be supported via the `custom` rule evaluator.
3. **Stream Synonyms**: While standard disciplines (Computer Science, Mechanical, Civil, Electrical, Commerce, Arts) are covered, exotic or interdisciplinary streams can be handled via case-insensitive matching or expanded synonyms.

---

## 4. Conclusion & Concrete Design for `src/services/validator/rules.js`

### 4.1 Recommended Implementation Blueprint
The module `src/services/validator/rules.js` should be implemented with the following architecture:

```javascript
'use strict';

/**
 * src/services/validator/rules.js
 * Declarative validation rules engine and candidate eligibility matcher.
 * Conforms 100% to Interface Contract #3 in PROJECT.md.
 */

// 1. Safe Property Navigation
function getNestedValue(obj, path) {
  if (obj === null || obj === undefined || typeof path !== 'string') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    if (part === '__proto__' || part === 'prototype' || part === 'constructor') return undefined;
    current = current[part];
  }
  return current;
}

// 2. Safe Parsing Utilities
function parseNumberSafely(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val.trim());
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function parseIsoDateSafely(val) {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
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

// 3. Return Contract Generator
function createResult({ field, expected, actual, status, reason }) {
  return {
    field: field || 'unknown',
    expected: expected !== undefined ? expected : null,
    actual: actual !== undefined ? actual : null,
    status: status === 'PASS' || status === 'FAIL' || status === 'WARNING' ? status : 'FAIL',
    reason: typeof reason === 'string' ? reason : ''
  };
}

// 4. Dictionaries & Taxonomies
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
  'phd': 6, 'ph.d': 6, 'doctor': 6, 'doctorate': 6,
  'master': 5, 'post graduate': 5, 'postgraduate': 5, 'pg': 5, 'm.tech': 5, 'mtech': 5, 'm.e': 5, 'msc': 5, 'm.sc': 5, 'mca': 5, 'mba': 5,
  'bachelor': 4, 'undergraduate': 4, 'b.tech': 4, 'btech': 4, 'b.e': 4, 'bsc': 4, 'b.sc': 4, 'b.com': 4, 'bcom': 4, 'b.a': 4, 'ba': 4, 'bca': 4, 'bba': 4, 'mbbs': 4, 'llb': 4, 'b.ed': 4, 'bed': 4, 'graduate': 4, 'graduation': 4, 'degree': 4,
  'diploma': 3,
  '10+2': 2, 'higher secondary': 2, 'intermediate': 2, '12th': 2,
  '10th': 1, 'matriculation': 1, 'secondary': 1
};

// 5. Primitive Rule Evaluators
// evaluateRequired, evaluateEquals, evaluateRange, evaluateEnum, evaluateDateOrder, evaluateRegex, evaluateCustom...

// 6. Candidate Eligibility Evaluator
// evaluateCandidateEligibility(eligibilityData, candidateProfile)...

// 7. Declarative Rule Registry & Dispatcher
// RuleRegistry class, evaluateRule(rule, actualValue, context), registerRule(name, fn)...
```

---

## 5. Verification Method

To independently verify this design:
1. Run the prototype verification script:
   ```bash
   node .agents/m3_explorer_1/test-full-declarative-engine.js
   ```
   Expected output: `All comprehensive tests passed with 100% success!`
2. Run the adversarial edge-case test suite:
   ```bash
   node .agents/m3_explorer_1/test-edge-cases.js
   ```
   Expected output: `All adversarial edge case tests passed successfully!`
3. Run the complete Interface Contract #3 integration test:
   ```bash
   node .agents/m3_explorer_1/test-mock-unity-integration.js
   ```
   Expected output: `Contract Verification Result: Verdict: PASS, Total Evaluations: 10, Candidate Eligible: true`.

### Invalidation Conditions
- An unhandled `TypeError` thrown when `actualValue`, `extractedData`, or `databaseCriteria` is `null` or `undefined`.
- Failure to grant age relaxation when candidate category is `'SC'` and criteria lists `'SC/ST'`.
- Rejection of a candidate with a higher degree (e.g. Master's / PhD) when criteria requires a Bachelor's degree.
- Any evaluation result that deviates from the schema `{ field, expected, actual, status, reason }`.
