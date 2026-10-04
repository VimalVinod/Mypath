# Milestone 2 Technical Analysis: Test Strategy & Interface Compliance Specialist
**Author:** `m2_explorer_3` (Teamwork Explorer)  
**Parent Orchestrator:** `1977cf93-1da0-401f-8e89-d533e632d9fa`  
**Working Directory:** `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_3`  
**Project Root:** `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Date:** 2026-09-13T20:10:00Z  

---

## 1. Executive Summary

As the **Test Strategy & Interface Compliance Specialist** for Milestone 2 (Gemini API Integration Module), this investigation designs an exhaustive, deterministic, multi-tier unit and integration test suite to be implemented at `test/gemini-parser.test.js`. 

Milestone 2 bridges the output of Milestone 1 (`extractTargetedPdfText`) with structured information extraction via `@google/genai` (Interface Contract #2 in `PROJECT.md`), while honoring Requirement §R4 for completely offline standalone execution via deterministic mock mode fallback.

### Key Investigation Takeaways:
1. **Node.js Native Test Runner (`node:test` + `node:assert/strict`)**: Fully leverages Node v24.13.0 native test runner. Zero external test framework dependencies (no Jest or Mocha overhead).
2. **100% Offline Testability**: Live Google Gen AI API calls must be completely decoupled from standard test runs. Using dependency injection (`options.client`) and mock mode (`options.mockMode`), all 42+ tests execute in `< 3 seconds` without requiring an API key, credit card, or network connection.
3. **Strict Interface Compliance (Contract #2)**: Every parsed response must strictly adhere to the standardized envelope (`{ success, isMock, modelUsed, data, rawResponse, error }`) and conform to the full `data` schema with null fallbacks.
4. **Peer Insights & Regex Hardening**: Live testing of peer `m2_explorer_2`'s heuristic mock extractor revealed critical edge cases in regex matching (e.g. greedy cross-sentence matching confusing SC/ST relaxation years with minimum age, runaway exam title captures, and missing exam date keywords). The test suite includes explicit negative and boundary assertions to permanently prevent these regressions.

---

## 2. Interface Contract #2 Compliance Matrix

The `parseStructuredCriteria(targetedText, options)` function serves as the interface between the targeted PDF text extractor and downstream validation engines (Milestone 3 Unity Checker).

### 2.1 Function Signature
```typescript
async function parseStructuredCriteria(
  targetedText: string,
  options?: {
    apiKey?: string;
    model?: string;
    mockMode?: boolean;
    client?: object; // Injected SDK client or test double
  }
): Promise<CriteriaEnvelope>;
```

### 2.2 Envelope Specification
| Property | Type | Nullable | Description / Default |
|---|---|---|---|
| `success` | `boolean` | No | `true` if extraction/parsing succeeded; `false` on unrecoverable error |
| `isMock` | `boolean` | No | `true` if offline mock extractor was used; `false` if live Gemini API was invoked |
| `modelUsed` | `string` | No | Name of model (e.g. `'gemini-2.5-flash'`, custom model, or `'mock-rules-v1'`) |
| `data` | `object` | Yes (when `success: false`) | Extracted structured criteria conforming to Contract #2; `null` on failure |
| `rawResponse` | `any` | Yes (optional) | Raw text or payload returned by model/generator for auditability |
| `error` | `string` | Yes (optional) | Error description when `success: false` |

### 2.3 `data` Schema Property Specifications
| Path | Type | Constraints / Validation | Sample UPSC Value |
|---|---|---|---|
| `examTitle` | `string \| null` | Trimmed string, concise title (< 150 chars), or `null` | `"COMBINED CIVIL SERVICES EXAMINATION 2026"` |
| `organization` | `string \| null` | Formal agency name, or `null` | `"UNION PUBLIC SERVICE COMMISSION"` |
| `eligibility.minAge` | `number \| null` | Non-negative integer (typically 18-35), or `null` | `21` |
| `eligibility.maxAge` | `number \| null` | Non-negative integer, `maxAge >= minAge`, or `null` | `32` |
| `eligibility.ageRelaxation` | `Array<{category: string, years: number}>` | Array of relaxation objects; `years >= 0` | `[{category: 'SC/ST', years: 5}, {category: 'OBC', years: 3}]` |
| `eligibility.requiredEducation`| `string[]` | Array of degrees / certificates; never `null` (defaults to `[]`) | `["Bachelor's degree in any discipline"]` |
| `eligibility.eligibleStreams` | `string[]` | Array of streams/disciplines; never `null` (defaults to `[]`) | `["Any Discipline", "Engineering"]` |
| `importantDates.applicationStartDate` | `string \| null` | ISO 8601 date string `YYYY-MM-DD`, or `null` | `"2026-01-10"` |
| `importantDates.applicationEndDate` | `string \| null` | ISO 8601 date string `YYYY-MM-DD`, or `null` | `"2026-02-15"` |
| `importantDates.examDate` | `string \| null` | ISO 8601 date string `YYYY-MM-DD`, or `null` | `"2026-05-24"` |
| `vacancies` | `number \| null` | Non-negative integer count of posts, or `null` | `1056` |
| `applicationFee.general` | `number \| null` | Non-negative number (in INR/currency), or `null` | `100` |
| `applicationFee.reserved` | `number \| null` | Non-negative number (`0` for exemptions/Nil), or `null` | `0` |
| `status` | `string` | Lifecycle status (`'ACTIVE'`, `'PARSED'`, `'CLOSED'`, `'UNKNOWN'`) | `"ACTIVE"` |

---

## 3. Test Architecture & Design Principles

### 3.1 Test Framework & Runner
- **Runner**: Node.js native test runner via `node --test test/gemini-parser.test.js`.
- **Assertions**: `node:assert/strict`.
- **Hooks**: `describe`, `it`, `before`, `beforeEach`, `afterEach`.
- **Isolation**: Deterministic teardown of `process.env.GEMINI_API_KEY` across tests.

### 3.2 Offline Testing & Dependency Injection
To ensure 100% test reliability on local machines, CI environments, and network-isolated sandboxes:
1. **Mock Mode Testing**: Tests for Feature 9 run directly through `extractMockCriteria` in `src/services/ai/mock-gemini.js` with `mockMode: true`.
2. **SDK Client Double (`MockGeminiClient`)**: Live SDK interaction paths are tested using an in-memory client test double passed via `options.client`. This allows simulating:
   - Valid JSON output from Gemini.
   - Output wrapped in markdown code fences (` ```json ... ``` `).
   - HTTP 429 Quota Exceeded error.
   - HTTP 401 Invalid Key error.
   - Malformed / non-JSON responses.
3. **Opt-in Live Integration**: If `process.env.GEMINI_API_KEY` is present and `process.env.RUN_LIVE_GEMINI_TESTS === 'true'`, an optional live integration suite can execute against Google's API, skipped by default in regular test runs.

---

## 4. Comprehensive Test Suite Blueprint (`test/gemini-parser.test.js`)

The proposed test suite consists of **9 Categories** containing **43 automated test cases**, mapping directly to Features 6–9 and Tiers 1–5 in `TEST_INFRA.md`.

```
test/gemini-parser.test.js
├── Category 1: SDK Initialization & Configuration (Feature 6, Tier 1 & 2) [6 tests]
├── Category 2: Mock Mode Fallback & Auto-Mocking (Feature 9, Tier 1 & 2) [5 tests]
├── Category 3: Schema Adherence & Contract Verification (Feature 7, Tier 1 & 2) [7 tests]
├── Category 4: Grounded Prompt Construction & Safety (Feature 8, Tier 1 & 5) [5 tests]
├── Category 5: Grounded Extraction with Realistic Fixture (Mock Mode) (Feature 8 & 9, Tier 1 & 4) [5 tests]
├── Category 6: Mocked Live SDK Response & Error Handling (Feature 6 & 8, Tier 2 & 5) [5 tests]
├── Category 7: Partial, Incomplete & Sparse Text Extraction (Feature 8 & 9, Tier 2) [5 tests]
├── Category 8: Boundary & Type Safety Error Handling (Feature 8, Tier 2 & 5) [5 tests]
└── Category 9: Milestone 1 Extractor Integration & End-to-End Pipeline (Tier 3 & 4) [4 tests]
```

### Detailed Test Inventory

#### Category 1: SDK Initialization & Configuration (Feature 6)
- **1.1** Initializes client using explicit `options.apiKey` passed by caller.
- **1.2** Initializes client using `process.env.GEMINI_API_KEY` when `options.apiKey` is omitted.
- **1.3** Prioritizes `options.apiKey` over `process.env.GEMINI_API_KEY` when both are supplied.
- **1.4** Defaults model to `'gemini-2.5-flash'` when `options.model` is omitted.
- **1.5** Accepts custom model identifier (e.g. `'gemini-2.0-flash'`) via `options.model`.
- **1.6** Restores environment cleanly in `afterEach` without side-effects across test suites.

#### Category 2: Mock Mode Fallback & Auto-Mocking (Feature 9)
- **2.1** Explicit `mockMode: true` triggers offline mock extractor even if an API key is present (`isMock: true`, `modelUsed: 'mock-rules-v1'`).
- **2.2** Auto-mock fallback: Missing API key (both `options.apiKey` and `process.env.GEMINI_API_KEY` absent) defaults to `mockMode: true` without crashing.
- **2.3** Missing key error on `mockMode: false`: Explicitly passing `mockMode: false` without an API key returns `{ success: false, error: /GEMINI_API_KEY/i }`.
- **2.4** Mock mode executes 100% in-memory and offline with high performance (< 15ms per call).
- **2.5** Mock mode output conforms strictly to envelope format `{ success: true, isMock: true, modelUsed: 'mock-rules-v1', data: { ... } }`.

#### Category 3: Schema Adherence & Contract Verification (Feature 7)
- **3.1** `CRITERIA_SCHEMA` exported from `src/services/ai/schema.js` defines all required properties and valid `@google/genai` types.
- **3.2** `CRITERIA_SCHEMA` correctly specifies nested `eligibility` structure with age boundaries, relaxation arrays, and education lists.
- **3.3** `CRITERIA_SCHEMA` defines `importantDates` as date-formatted strings.
- **3.4** `CRITERIA_SCHEMA` defines `applicationFee` numeric general and reserved fields.
- **3.5** Nullable and optional fields are supported without SDK schema rejection.
- **3.6** Mock extractor output validates 100% against `assertCriteriaSchema` validator.
- **3.7** Live/Mocked SDK output validates 100% against `assertCriteriaSchema` validator.

#### Category 4: Grounded Prompt Construction & Safety (Feature 8)
- **4.1** `buildExtractionPrompt(targetedText)` encloses targeted text within unambiguous boundary delimiters (e.g. `--- BEGIN TARGETED TEXT ---`).
- **4.2** Prompt contains explicit anti-hallucination directives: extract ONLY from provided text and default missing fields to `null`.
- **4.3** `SYSTEM_INSTRUCTION` strictly enforces factual extraction and JSON adherence.
- **4.4** Prompt handles special characters, internal quotes, newlines, and markdown blocks in `targetedText` without corruption.
- **4.5** Prompt structure isolates user content to resist prompt injection attacks (e.g. `"Ignore previous instructions..."`).

#### Category 5: Grounded Extraction with Realistic Fixture (Mock Mode) (Feature 8 & 9)
- **5.1** Correctly extracts `examTitle: "COMBINED CIVIL SERVICES EXAMINATION 2026"` and `organization: "UNION PUBLIC SERVICE COMMISSION"`.
- **5.2** Correctly extracts age bounds (`minAge: 21`, `maxAge: 32`) and relaxation arrays (`SC/ST: 5`, `OBC: 3`).
- **5.3** Correctly extracts required education (`"Bachelor's degree in any discipline"`) and eligible streams (`"Any Discipline"`).
- **5.4** Correctly extracts vacancies count (`1056`) and application fee (`general: 100`, `reserved: 0` for fee exemption).
- **5.5** Correctly extracts ISO dates (`applicationStartDate: '2026-01-10'`, `applicationEndDate: '2026-02-15'`, `examDate: '2026-05-24'`) and sets `status: 'ACTIVE'`.

#### Category 6: Mocked Live SDK Response & Error Handling (Feature 6 & 8)
- **6.1** Parses standard JSON response returned by `client.models.generateContent`.
- **6.2** Robustly strips markdown code fences (` ```json ... ``` `) if returned by the model.
- **6.3** Gracefully handles API errors (HTTP 429 Quota Exceeded, HTTP 401 Unauthorized, Network timeout) returning `{ success: false, error: ... }`.
- **6.4** Gracefully handles malformed or non-JSON model responses returning `{ success: false, error: /JSON/i }`.
- **6.5** Populates `rawResponse` in the return envelope for debugging and audit trails.

#### Category 7: Partial, Incomplete & Sparse Text Extraction (Tier 2 & 5)
- **7.1** Text with ONLY age criteria populates age fields and sets all dates, fees, and vacancies to `null`.
- **7.2** Text with ONLY fee information populates fee fields and leaves age, education, and dates as `null`.
- **7.3** Text with ONLY vacancies count populates `vacancies` and leaves other criteria as `null`.
- **7.4** Text with ONLY important dates populates ISO dates and leaves other criteria as `null`.
- **7.5** Irrelevant / negative text (e.g. general instructions or poem) returns valid schema with all criteria fields set to `null`.

#### Category 8: Boundary & Type Safety Error Handling (Tier 2 & 5)
- **8.1** Empty string (`""`) returns valid schema with null fields without throwing.
- **8.2** Whitespace-only string (`"   \n\t  "`) returns valid schema with null fields without throwing.
- **8.3** Non-string input types (`null`, `undefined`, `12345`, `{}`) reject or return `{ success: false, error: ... }` with clear TypeError description.
- **8.4** Malformed or non-standard date text (e.g. "early autumn 2026") defaults to `null` without throwing invalid Date exceptions.
- **8.5** Fee exemption keywords ("Fee: Nil", "Exempted", "Free of cost") resolve `reserved: 0` rather than `null`.

#### Category 9: Milestone 1 Extractor Integration & End-to-End Pipeline (Tier 3 & 4)
- **9.1** Directly feeds `extractTargetedPdfText(SAMPLE_PDF_PATH)` output into `parseStructuredCriteria`.
- **9.2** Confirms full criteria extraction is achieved despite >= 70% token/character reduction achieved by Milestone 1.
- **9.3** Successfully processes targeted text containing section demarcations (`--- Page 2 ---`, `--- Page 4 ---`).
- **9.4** Validates that output `data` object is 100% compatible as input for Milestone 3's `verifyUnity(extractedData, databaseCriteria)`.

---

## 5. Reusable Test Doubles & Helpers

To maintain clean and DRY test code, the test file should include standard assertions and doubles:

### 5.1 Reusable Schema Validator (`assertCriteriaSchema`)
```javascript
function assertCriteriaSchema(data) {
  assert.ok(data !== null && typeof data === 'object', 'data must be a non-null object');

  // Top-level fields
  assert.ok(data.examTitle === null || typeof data.examTitle === 'string', 'examTitle must be string | null');
  assert.ok(data.organization === null || typeof data.organization === 'string', 'organization must be string | null');
  assert.ok(data.vacancies === null || (typeof data.vacancies === 'number' && Number.isInteger(data.vacancies) && data.vacancies >= 0), 'vacancies must be non-negative integer | null');
  assert.ok(typeof data.status === 'string', 'status must be a string');

  // Eligibility
  assert.ok(data.eligibility !== null && typeof data.eligibility === 'object', 'eligibility must be an object');
  assert.ok(data.eligibility.minAge === null || (typeof data.eligibility.minAge === 'number' && data.eligibility.minAge >= 0), 'minAge must be number | null');
  assert.ok(data.eligibility.maxAge === null || (typeof data.eligibility.maxAge === 'number' && data.eligibility.maxAge >= 0), 'maxAge must be number | null');
  assert.ok(Array.isArray(data.eligibility.ageRelaxation), 'ageRelaxation must be an array');
  for (const rel of data.eligibility.ageRelaxation) {
    assert.equal(typeof rel.category, 'string', 'relaxation category must be string');
    assert.equal(typeof rel.years, 'number', 'relaxation years must be number');
    assert.ok(rel.years >= 0, 'relaxation years must be non-negative');
  }
  assert.ok(Array.isArray(data.eligibility.requiredEducation), 'requiredEducation must be an array');
  for (const edu of data.eligibility.requiredEducation) {
    assert.equal(typeof edu, 'string', 'requiredEducation item must be string');
  }
  assert.ok(Array.isArray(data.eligibility.eligibleStreams), 'eligibleStreams must be an array');
  for (const str of data.eligibility.eligibleStreams) {
    assert.equal(typeof str, 'string', 'eligibleStreams item must be string');
  }

  // Important Dates
  assert.ok(data.importantDates !== null && typeof data.importantDates === 'object', 'importantDates must be an object');
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (data.importantDates.applicationStartDate !== null) {
    assert.equal(typeof data.importantDates.applicationStartDate, 'string');
    assert.match(data.importantDates.applicationStartDate, dateRegex, 'applicationStartDate must match YYYY-MM-DD format');
  }
  if (data.importantDates.applicationEndDate !== null) {
    assert.equal(typeof data.importantDates.applicationEndDate, 'string');
    assert.match(data.importantDates.applicationEndDate, dateRegex, 'applicationEndDate must match YYYY-MM-DD format');
  }
  if (data.importantDates.examDate !== null) {
    assert.equal(typeof data.importantDates.examDate, 'string');
    assert.match(data.importantDates.examDate, dateRegex, 'examDate must match YYYY-MM-DD format');
  }

  // Application Fee
  assert.ok(data.applicationFee !== null && typeof data.applicationFee === 'object', 'applicationFee must be an object');
  assert.ok(data.applicationFee.general === null || (typeof data.applicationFee.general === 'number' && data.applicationFee.general >= 0), 'applicationFee.general must be number | null');
  assert.ok(data.applicationFee.reserved === null || (typeof data.applicationFee.reserved === 'number' && data.applicationFee.reserved >= 0), 'applicationFee.reserved must be number | null');
}
```

### 5.2 Mock Gemini Client Test Double (`MockGeminiClient`)
```javascript
class MockGeminiClient {
  constructor(responsePayload, errorToThrow = null) {
    this.responsePayload = responsePayload;
    this.errorToThrow = errorToThrow;
    this.calls = [];
    this.models = {
      generateContent: async (request) => {
        this.calls.push(request);
        if (this.errorToThrow) {
          throw this.errorToThrow;
        }
        const text = typeof this.responsePayload === 'string'
          ? this.responsePayload
          : JSON.stringify(this.responsePayload);
        return { text };
      }
    };
  }
}
```

---

## 6. Implementation Guidance & Traps Discovered

### Trap 1: Greedy Regex Matching in Mock Extractor
During peer inspection of `test-mock-rules.js` (from `m2_explorer_2`), the SC/ST and OBC age relaxation regexes initially used `.*?` which spanned multiple sentences:
```javascript
// BAD: captures 21 (from "minimum age of 21 years") instead of 5
const relSC = text.match(/(?:maximum of\s+)?(\d+)\s+years?.*?(?:SC|Scheduled Caste)/i);
```
**Fix in Test Suite:** Tests 5.2 and 7.1 explicitly verify that `relSC.years === 5` and `relOBC.years === 3` and do not inadvertently capture minimum age (21) or maximum age (32).

### Trap 2: Keyword Selection for Exam Dates
Targeted sentence extraction with `contextBefore: 1, contextAfter: 1` might miss sentence 5 on Page 4 (`The Preliminary Examination is scheduled to be conducted nationwide on 2026-05-24`) if the keyword list only includes `['eligibility', 'fee', 'dates']`.
**Fix:** The standard keyword list in `PROJECT.md` and tests MUST include `'examination'` or `'preliminary examination'`.

### Trap 3: Distinction Between Auto-Mock and `mockMode: false`
- `mockMode: true` -> Forces mock mode.
- `mockMode` undefined + no API key -> Auto-mock fallback with `isMock: true`.
- `mockMode: false` + no API key -> Must NOT auto-mock! Must return `{ success: false, error: 'GEMINI_API_KEY is required when mockMode is false' }`.

---

## 7. Verification Commands & Pass/Fail Criteria

### Verification Commands
1. **Milestone 2 Test Suite**:
   ```bash
   node --test test/gemini-parser.test.js
   ```
2. **Full Pipeline Regression Suite**:
   ```bash
   node --test test/pdf-extractor.test.js test/gemini-parser.test.js
   ```
3. **Targeted Extractor ↔ Gemini Parser Integration One-Liner**:
   ```bash
   node -e "const { extractTargetedPdfText } = require('./src/services/pdf'); const { parseStructuredCriteria } = require('./src/services/ai'); (async () => { const t = await extractTargetedPdfText('./fixtures/sample-notification.pdf', { keywords: ['eligibility', 'age limits', 'qualification', 'vacancies', 'dates', 'fee', 'examination'] }); const res = await parseStructuredCriteria(t.targetedText, { mockMode: true }); console.log('Parsed successfully:', res.success, 'isMock:', res.isMock, 'vacancies:', res.data.vacancies, 'minAge:', res.data.eligibility.minAge, 'examDate:', res.data.importantDates.examDate); })();"
   ```

### Pass/Fail Criteria
- **Exit code**: `0` (Zero test failures or unhandled rejections).
- **Test count**: At least 40 passing tests in `test/gemini-parser.test.js`.
- **Schema compliance**: 100% of non-error outputs validate against `assertCriteriaSchema`.
- **Execution speed**: Test suite runs in `< 3.0 seconds` (100% offline).
- **No environment leakage**: `process.env.GEMINI_API_KEY` remains clean after test execution.
