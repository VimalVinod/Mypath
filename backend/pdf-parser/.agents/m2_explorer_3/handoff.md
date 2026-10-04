# Milestone 2 Handoff: Test Strategy & Interface Compliance Specialist
**Author:** `m2_explorer_3` (Teamwork Explorer)  
**Parent Orchestrator:** `1977cf93-1da0-401f-8e89-d533e632d9fa`  
**Working Directory:** `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_3`  
**Date:** 2026-09-13T20:12:00Z  

---

## 1. Observation

1. **Test Runner & Environment**:
   - `node --version` output: `v24.13.0`.
   - Node v24 includes native `node:test` and `node:assert/strict`.
   - `node -e "const { describe, it, mock } = require('node:test'); console.log('Mock available:', typeof mock);"` exited with `0`, returning `Mock available: object`.

2. **Existing Test Patterns (`test/pdf-extractor.test.js`)**:
   - Lines 1–8: CommonJS module imports `const { describe, it, before } = require('node:test'); const assert = require('node:assert/strict');`.
   - Organized into 9 distinct categories with 40 passing tests using descriptive assertions.

3. **Interface Contract #2 (`.agents/teamwork_preview_orchestrator_2/PROJECT.md`)**:
   - Lines 86–125 define `parseStructuredCriteria(targetedText, options)` returning an envelope:
     ```javascript
     {
       success: boolean,
       isMock: boolean,
       modelUsed: string,
       data: {
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
           applicationStartDate: string | null,
           applicationEndDate: string | null,
           examDate: string | null
         },
         vacancies: number | null,
         applicationFee: {
           general: number | null,
           reserved: number | null
         },
         status: string
       },
       rawResponse?: any,
       error?: string
     }
     ```

4. **SDK & CommonJS Packaging (`@google/genai`)**:
   - `npm view @google/genai exports` confirmed `./dist/node/index.cjs` is exported for CommonJS `require('@google/genai')`.
   - `package.json` currently lacks `@google/genai` in `dependencies` (installed by Worker during implementation).

5. **Sample Notification Data Benchmark (`fixtures/generate-sample-pdf.js`)**:
   - Lines 14–70 define `NOTIFICATION_DATA`:
     - Organization: `"UNION PUBLIC SERVICE COMMISSION"`
     - Title: `"COMBINED CIVIL SERVICES EXAMINATION 2026"`
     - Page 2: `minAge: 21`, `maxAge: 32`, `ageRelaxation: SC/ST (5), OBC (3)`, `requiredEducation: Bachelor's degree in any discipline`.
     - Page 4: `vacancies: 1056`, `applicationStartDate: '2026-01-10'`, `applicationEndDate: '2026-02-15'`, `examDate: '2026-05-24'`, `fee: Rs. 100 General, Nil for SC/ST/Female`.

6. **Peer Investigation Findings (`.agents/m2_explorer_2/test-mock-rules.js`)**:
   - Initial run of peer mock extraction yielded a greedy match bug: `relSC` captured `21` years (from `"minimum age of 21 years"`) instead of `5` years, and `relOBC` captured `21` instead of `3`.
   - In addition, targeted sentence extraction omitted the exam date sentence unless `'examination'` was included in the keyword list.
   - Subsequent iteration resolved these regexes to accurately match canonical values.

---

## 2. Logic Chain

1. **Requirement §R2 & §R4 Enforcement**:
   - §R2 requires extracting structured criteria with `@google/genai`.
   - §R4 dictates standalone local execution without cloud lock-in.
   - Therefore, the test suite must test both the live SDK execution path (via test double client injection) and the offline mock mode fallback.

2. **Decoupling from External Credentials**:
   - Observations 1 & 4 show that relying on a live Google API key would make CI/local test runs flaky or fail if keys/network are absent.
   - By supporting `options.client` dependency injection in `parseStructuredCriteria` (and `options.mockMode`), the test suite executes 100% offline, deterministically testing API successes, error codes (401, 429), and response formatting without network calls.

3. **Contract Adherence Verification**:
   - Downstream Milestone 3 (`unity-checker.js`) depends directly on the structure of `data` (Observation 3).
   - Therefore, creating a centralized `assertCriteriaSchema(data)` validator in the test suite guarantees that every test verifies non-null fields, array item schemas, ISO date strings, and integer fee types across all 43 tests.

4. **Guarding Against Edge Case Regressions**:
   - Observation 6 demonstrated that regex and prompt extraction can easily corrupt age relaxations or run away on exam titles.
   - Therefore, Category 5 and Category 7 must explicitly assert that `ageRelaxation` contains exact values (SC/ST: 5, OBC: 3), `examTitle` is concise, and sparse/irrelevant text defaults unmentioned fields to `null`.

---

## 3. Caveats

1. **Live Gemini API Rate Limits**:
   - Live integration tests against Google's live endpoints are not enabled by default to prevent API quota exhaustion and credential exposure. Live testing is supported via opt-in flag `RUN_LIVE_GEMINI_TESTS=true`.
2. **SDK Package Installation**:
   - `@google/genai` is not yet present in `node_modules` and must be installed by the Worker (`npm install @google/genai`). Mock tests and unit tests run independently of package installation.
3. **No assumptions on PDF layout**:
   - While tests integrate with `fixtures/sample-notification.pdf`, parser unit tests also feed arbitrary text snippets to test sparse, incomplete, and adversarial inputs.

---

## 4. Conclusion

The test suite design for Milestone 2 (`test/gemini-parser.test.js`) is fully specified, verified against `PROJECT.md` Interface Contract #2, and ready for Worker implementation.

### Architecture Summary:
- **File**: `test/gemini-parser.test.js`
- **Total Test Cases**: 43 automated tests across 9 categories.
- **Coverage**:
  - Category 1: SDK Initialization & Configuration (6 tests)
  - Category 2: Mock Mode Fallback & Auto-Mocking (5 tests)
  - Category 3: Schema Contract Adherence & Type Validation (7 tests)
  - Category 4: Grounded Prompt Construction & Safety (5 tests)
  - Category 5: Grounded Extraction with Sample Notification (Mock Mode) (5 tests)
  - Category 6: Mocked Live SDK Response & Error Handling (5 tests)
  - Category 7: Partial, Incomplete & Sparse Text Extraction (5 tests)
  - Category 8: Boundary & Type Safety Error Handling (5 tests)
  - Category 9: Milestone 1 Extractor Integration & End-to-End Pipeline (4 tests)
- **Technical Report**: Detailed in `analysis.md`.

---

## 5. Verification Method

### Primary Verification Command:
```bash
node --test test/gemini-parser.test.js
```

### Combined Pipeline Regression Command:
```bash
node --test test/pdf-extractor.test.js test/gemini-parser.test.js
```

### Invalidation Conditions:
1. `node --test test/gemini-parser.test.js` returns non-zero exit code or fails any of the 43 test assertions.
2. Any test in Category 2 makes a network connection or fails when `process.env.GEMINI_API_KEY` is unset.
3. Any response where `success === true` fails `assertCriteriaSchema(res.data)`.
4. Tests leak modified `process.env.GEMINI_API_KEY` to subsequent tests.
