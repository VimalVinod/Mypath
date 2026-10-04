# Handoff Report: Milestone 2 Grounded Prompt Engineering & Deterministic Mock Fallback

**Author:** `m2_explorer_2` (Teamwork Explorer)  
**Role:** Prompt Engineering & Mock Fallback Specialist  
**Recipient:** Orchestrator (`1977cf93-1da0-401f-8e89-d533e632d9fa`) & Milestone 2 Worker  
**Working Directory:** `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_2`  
**Date:** 2026-09-13T20:28:00Z  
**Handoff Type:** Hard (Task Complete)  

---

## 1. Observation

1. **Environment State & API Key Absence**:
   - Inspection of `.env` using PowerShell command `Get-Content .env` showed only `RESEND_API_KEY`, `NOTIFICATION_RECIPIENT_EMAIL`, and `SENDER_EMAIL`.
   - `process.env.GEMINI_API_KEY` is completely absent in the local development environment.
   - Requirement §R4 and Feature 9 mandate that the pipeline must function seamlessly and standalone without active cloud credentials.

2. **Upstream PDF Extraction Output & Keyword Boundary Behavior**:
   - Command: `node -e "const { extractTargetedPdfText } = require('./src/services/pdf'); extractTargetedPdfText('./fixtures/sample-notification.pdf', { keywords: ['eligibility', 'age limit', 'qualification', 'vacancies', 'dates', 'fee'] }).then(res => console.log(res.targetedText));"`
   - Result: Produced targeted text of 2452 characters with clear section demarcations `--- [Page 2] ---` and `--- [Page 4] ---`.
   - Critical Observation: Because `pdf-extractor.js:58` applies regex word boundaries `\b` (`wholeWord: true`), keyword `'exam'` did not match `'Examination'`, `'dates'` did not match `'date'`, and `'vacancy'` did not match `'vacancies'`. When expanded to `['eligibility', 'age', 'qualification', 'vacancies', 'vacancy', 'dates', 'date', 'fee', 'examination']`, all sentences including exam date (`2026-05-24`) and age limits (`21` and `32`) were captured cleanly.

3. **Interface Contract #2 Output Schema (`PROJECT.md:96-125`)**:
   - Envelope specification: `{ success: boolean, isMock: boolean, modelUsed: string, data: object | null, rawResponse?: any, error?: string }`.
   - Data structure requires:
     - `examTitle`: `string | null`
     - `organization`: `string | null`
     - `eligibility`: `{ minAge: number | null, maxAge: number | null, ageRelaxation: Array<{ category: string, years: number }>, requiredEducation: string[], eligibleStreams: string[] }`
     - `importantDates`: `{ applicationStartDate: string | null, applicationEndDate: string | null, examDate: string | null }`
     - `vacancies`: `number | null`
     - `applicationFee`: `{ general: number | null, reserved: number | null }`
     - `status`: `string`

4. **Regex Ambiguities Discovered in Live Prototype Testing**:
   - An unanchored regex `/(?:maximum of\s+)?(\d+)\s+years?.*?(?:SC|Scheduled Caste)/i` matched across paragraph boundaries back to "minimum age of 21 years", incorrectly assigning 21 years of relaxation instead of 5 years.
   - Similarly, title regex `Notice No: [^|]+ \|\s*([^\n]+)` bled into subsequent text because sentences were joined without newlines.
   - Restricting sentence clauses with `[^,.;]*?` and lookahead delimiters `(?=\s+SECTION|\s+\d+\.|\s+Notice|\n|$)` completely resolved both bugs.

5. **Test Double & Dependency Injection Alignment with Peer Explorer 3**:
   - `m2_explorer_3/analysis.md:36` specified that `parseStructuredCriteria` should accept an optional `options.client` parameter to enable passing in-memory test doubles (`MockGeminiClient`) to test HTTP 429 quota errors, markdown code-fence stripping, and invalid JSON responses without network access.

---

## 2. Logic Chain

1. **Premise 1 (Zero-Cloud Mandate)**: Requirement §R4 explicitly states: "This must be a standalone pipeline... without relying on active Firebase connections or email services." And Feature 9 mandates: "Offline Mock Mode when GEMINI_API_KEY absent or when mockMode = true."
   - *Direct inference from Observation 1*: In the absence of `GEMINI_API_KEY`, the pipeline must not throw or fail; it must deterministically extract structured data using offline heuristic rules.

2. **Premise 2 (Zero Hallucination Policy)**: Requirement §R2 and Feature 8 mandate extracting criteria strictly from the targeted PDF text, defaulting unmentioned fields to `null` or `[]`.
   - *Direct inference from Observation 3*: If a notification mentions minimum age 20 but no maximum age, `maxAge` must be `null`, not a fabricated number like 30 or 32.
   - *Prompt Design*: `SYSTEM_INSTRUCTION` in `prompt.js` must explicitly declare the "Closed-World Assumption", forbidding the model from using external knowledge and mandating strict `null` defaults for scalars and `[]` for arrays.

3. **Premise 3 (Regex Hardening & Schema Determinism)**:
   - *Direct inference from Observation 4*: For `mock-gemini.js` to serve as a reliable fallback, its regex rules must not bleed across sentences or confuse candidate age limits with category age relaxations.
   - Using bounded scans (`[^,.;]*?`) and positive lookaheads guarantees that UPSC sample extracts produce exact values (`minAge: 21`, `maxAge: 32`, `SC/ST: 5`, `OBC: 3`, `vacancies: 1056`, `fee: 100/0`), while partial/sparse texts default missing fields cleanly to `null`.

4. **Premise 4 (Envelope & Normalization Safety)**:
   - *Direct inference from Observation 3 and Observation 5*: Downstream modules (Milestone 3 Unity Checker) expect consistent object properties without risking `TypeError: Cannot read properties of undefined`.
   - `gemini-parser.js` must implement `normalizeCriteriaData(data)` to ensure that regardless of whether live Gemini, test doubles, or mock mode produced the payload, the output conforms 100% to Interface Contract #2.

---

## 3. Caveats

1. **CommonJS Requirement**: Node.js in CommonJS mode is used across the project (`require()`). Both `@google/genai` (v2.22.0) and internal services must use CommonJS exports (`module.exports = { ... }`).
2. **Live API Key Testing**: Live tests against Google's cloud API were not performed during this explorer turn because `GEMINI_API_KEY` is not present in `.env`. However, SDK exports and mock client injection (`options.client`) were 100% verified.
3. **Keyword Sensitivity in Upstream Extractor**: Callers of `extractTargetedPdfText` must use comprehensive keyword stems (`['eligibility', 'age', 'qualification', 'vacancies', 'vacancy', 'dates', 'date', 'fee', 'examination']`) to ensure all critical clauses are included in `targetedText`.

---

## 4. Conclusion

1. **Complete Blueprints Ready**: The full drop-in ready code for `src/services/ai/prompt.js`, `src/services/ai/mock-gemini.js`, and `src/services/ai/gemini-parser.js` is documented and validated in `analysis.md`.
2. **100% Schema & Boundary Compliance**: The deterministic mock extractor was verified across 8 automated boundary tests (Full UPSC fixture, Age-only, Fee-only, Vacancies-only, Dates-only, Negative text, Empty string, Whitespace), passing all assertions without exceptions.
3. **Seamless Multi-Tier Orchestration**: `parseStructuredCriteria` cleanly routes:
   - `options.mockMode === true` -> `mock-gemini.js`
   - No API key -> Auto-mock fallback to `mock-gemini.js`
   - No API key + `mockMode: false` -> Rejection with clean error
   - Injected `options.client` -> Unit test double execution with code fence stripping
   - `apiKey` provided -> Live `@google/genai` execution

---

## 5. Verification Method

To independently verify all claims made in this report:

1. **Inspect Technical Analysis**:
   - File: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_2\analysis.md`
   - Check Section 3 for `prompt.js`, Section 4 for `mock-gemini.js`, and Section 5 for `gemini-parser.js`.

2. **Execute Automated Verification Suite**:
   Run the reproduction script directly in the project root:
   ```powershell
   node .agents/m2_explorer_2/test-mock-rules.js
   ```
   **Expected Output**:
   ```
   [TEST 1] Full UPSC Notification Extraction... -> PASSED
   [TEST 2] Sparse Text: Only Age... -> PASSED
   [TEST 3] Sparse Text: Only Fee (with Nil exemption)... -> PASSED
   [TEST 4] Sparse Text: Only Vacancies... -> PASSED
   [TEST 5] Sparse Text: Only Dates... -> PASSED
   [TEST 6] Negative / Irrelevant Text... -> PASSED
   [TEST 7] Empty String... -> PASSED
   [TEST 8] Whitespace String... -> PASSED
   ALL 8 COMPREHENSIVE TESTS PASSED WITH 100% SCHEMA COMPLIANCE!
   ```

3. **Check Invalidation Conditions**:
   - If any test in `test-mock-rules.js` fails with an `AssertionError`, the schema or extraction rules are invalidated.
   - If `extractMockCriteria` returns non-null values for unmentioned fields on sparse inputs, zero-hallucination is violated.
