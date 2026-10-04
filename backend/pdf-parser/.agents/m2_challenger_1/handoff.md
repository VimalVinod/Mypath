# Milestone 2 Challenger 1 Report: Adversarial Mock Extraction & Heuristic Hardening

**Agent:** `m2_challenger_1` (teamwork_preview_challenger)  
**Parent Orchestrator:** `1977cf93-1da0-401f-8e89-d533e632d9fa`  
**Working Directory:** `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_challenger_1`  
**Workspace Root:** `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Timestamp:** 2026-09-13T20:44:00Z  
**Handoff Type:** Hard (Task Complete)  
**Verdict:** **REQUEST_CHANGES**

---

## Challenge Summary

- **Target Modules**: `src/services/ai/mock-gemini.js`, `src/services/ai/gemini-parser.js`
- **Overall Risk Assessment**: **HIGH**
- **Test Harness**: `.agents/m2_challenger_1/adversarial_harness.js`
- **Test Execution Results**:
  - Total Scenarios: 34
  - Passed: 25
  - Failed: 9
  - Success Rate: 73.53%
- **Root Cause**: Over-fitted regular expressions in `mock-gemini.js` that fail under standard punctuation (colons in age limits, commas in vacancy counts, parentheses in labels), overly greedy fallback patterns that mistake candidate experience ranges for candidate age boundaries, and missing `Number.isFinite` guards for `Infinity` in `gemini-parser.js`.

---

## 1. Observation

### Observation 1: Age Regex Fails on Colon Separators (`mock-gemini.js:102-110`)
In `src/services/ai/mock-gemini.js`:
```javascript
102: const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i) ||
103:                     text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i) ||
104:                     text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i);
105: const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;
106:
107: const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+of)?|max\.?\s*age:?|upper\s+age\s+limit(?:\s+is)?:?)\s*(\d+)/i) ||
108:                     text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i) ||
109:                     text.match(/Age(?:\s+Limit)?:?\s*\d+\s*(?:to|-)\s*(\d+)/i);
```
- In line 102, `minimum\s+age(?:\s+of)?` does NOT permit an optional colon `:?`. Only `min\.?\s*age:?` does.
- When text contains standard phrasing `"Minimum age: 21 years"` or `"Minimum age : 21"`, the regex match returns `null`.
- Verbatim execution in Node:
  ```
  > 'minimum age: 21'.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i)
  null
  ```
- Result: Test 6.2, 7.1, and 9.3 all failed with `minAge: null` because they used `"Minimum age: 21 years"`.

### Observation 2: Experience Range Corrupts Candidate Age Limits (`mock-gemini.js:103, 108`)
- Line 103 defines fallback: `text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i)`.
- Notice this regex has NO prefix requiring the word "age", and is placed BEFORE `Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)`.
- When text states:
  `"Candidates must have 5 to 8 years experience in government administration. Age Limit: 21 to 30 years."`
  `extractMockCriteria` returns `minAge: 5, maxAge: 8`!
- When text states:
  `"Applicants should possess 3 to 5 years experience in financial auditing."` (with no age limit mentioned in the document),
  `extractMockCriteria` returns `minAge: 3, maxAge: 5`!
- Verbatim harness failure:
  ```
  ✗ FAIL: 1.2 experience range "5 to 8 years experience" precedes real age "Age Limit: 21 to 30 years"
    Error: Expected minAge 21, got 5
  ✗ FAIL: 1.3 experience range "3 to 5 years experience" with NO age limit in text
    Error: minAge was corrupted by experience range "3 to 5 years"
  ```

### Observation 3: Vacancy Truncation on Thousands Separators (`mock-gemini.js:157-159`)
In `src/services/ai/mock-gemini.js`:
```javascript
157: const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ||
158:                  text.match(/(?:total vacancies|vacancies)\s*:\s*(\d+)/i) ||
159:                  text.match(/(\d+)\s+vacancies/i);
```
- In line 158, `(\d+)` matches digits up to the first non-digit.
- In text `"Total vacancies: 1,056 posts"`, `\d+` matches only `"1"`, ignoring `",056"`.
- `parseInt("1", 10)` yields `1` instead of `1056`.
- Verbatim harness failure:
  ```
  ✗ FAIL: 5.1 vacancies formatted with commas: "Total vacancies: 1,056"
    Error: Vacancies was truncated! Got: 1 instead of 1056
  ```

### Observation 4: Date Matching Fragility (`mock-gemini.js:153`)
In `src/services/ai/mock-gemini.js`:
```javascript
153: const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\s+(\d{4}-\d{2}-\d{2})/i);
```
- The branch `exam date:?` expects an immediate ISO date after `exam date` or `exam date:`.
- When text states: `"The preliminary exam date is 2026-11-20."`, the word `"is"` is encountered between `"date"` and the date, causing the match to fail and returning `examDate: null`.
- Verbatim harness failure:
  ```
  ✗ FAIL: 4.1 dates in reverse order in document text
    Error: Expected values to be strictly equal:
  + actual - expected
  + null
  - '2026-11-20'
  ```

### Observation 5: Parentheses Around Keywords Break Vacancies (`mock-gemini.js:158`)
- When text has Devanagari headers with English parenthetical translations:
  `कुल रिक्तियां (Total vacancies): 800 posts.`
- Line 158 has `(?:total vacancies|vacancies)\s*:\s*(\d+)`.
- The closing parenthesis `)` after `vacancies` is not whitespace `\s*`, so it fails to match, leaving `vacancies: null`.
- Verbatim harness failure:
  ```
  ✗ FAIL: 6.1 text with Devanagari Unicode and Emoji headers
    Error: Expected values to be strictly equal:
  null !== 800
  ```

### Observation 6: Infinity Bypass in Data Normalization (`gemini-parser.js:56`)
In `src/services/ai/gemini-parser.js`:
```javascript
55: minAge: typeof eligibility.minAge === 'number' && eligibility.minAge >= 0 ? eligibility.minAge : null,
56: maxAge: typeof eligibility.maxAge === 'number' && eligibility.maxAge >= 0 ? eligibility.maxAge : null,
```
- In JavaScript, `typeof Infinity === 'number'` evaluates to `true`, and `Infinity >= 0` evaluates to `true`.
- If an adversarial or malformed payload contains `{ eligibility: { maxAge: Infinity } }`, `normalizeCriteriaData` allows `Infinity` through.
- Because `Infinity` is not a finite integer, it violates JSON schema (`Type.INTEGER`) and cannot be serialized to valid JSON.
- Verbatim harness failure:
  ```
  ✗ FAIL: 8.4 NaN and Infinity in numeric fields are safely neutralized
    Error: maxAge must not be Infinity
  ```

---

## 2. Logic Chain

1. **Premise 1 (Contract & Offline Fallback Reliability)**:
   Per `PROJECT.md` Requirement §R4 and Feature 9, `mock-gemini.js` is the designated fallback engine for offline execution and CI pipelines without Gemini API keys. It must accurately extract criteria from realistic notification text.

2. **Premise 2 (Empirical Demonstration of Extraction Failures)**:
   - As proven in Observation 1, any text writing `"Minimum age: 21"` or `"Maximum age: 32"` fails to extract age limits. This is standard formatting in almost all recruitment notifications.
   - As proven in Observation 2, notifications that specify experience requirements (e.g., `"5 to 8 years experience"`) corrupt `minAge` and `maxAge` to child ages (5 and 8 years old).
   - As proven in Observation 3, notifications using commas in large vacancy numbers (e.g., `"1,056"`) report `1` vacancy.
   - As proven in Observation 6, `normalizeCriteriaData` fails to verify finiteness on numbers, allowing `Infinity` through.

3. **Inference (Impact on Milestone 3 Unity Checker)**:
   - When Milestone 3 runs unity verification against candidate criteria, a candidate aged 28 will be evaluated against `minAge: 5, maxAge: 8` or `minAge: null, maxAge: null`, causing catastrophic false rejections or rule evaluation failures.
   - A vacancy rule expecting > 1000 vacancies will fail because the parser extracted `1` vacancy instead of `1056`.

4. **Conclusion**:
   Milestone 2 cannot be approved in its current state. Concrete regular expression and normalization hardening changes must be implemented by the worker before Milestone 3 begins.

---

## 3. Caveats

- **Live Gemini Model**: These tests evaluated the offline mock extraction engine (`mock-gemini.js`), the extraction prompt (`prompt.js`), and the unified envelope normalizer (`gemini-parser.js`). Live API network calls against Google Cloud were not executed as no live `GEMINI_API_KEY` was configured, which is expected per Requirement §R4.
- **Performance / ReDoS**: All adversarial ReDoS patterns tested (100,000 characters and repeated backtracking spaces) completed in under 2ms. No catastrophic backtracking was observed. The regex engine itself is fast, but the patterns are brittle.

---

## 4. Conclusion & Recommended Action Plan

**Verdict:** **REQUEST_CHANGES**

### Required Remediations for Worker:

1. **Fix Min/Max Age Regex in `src/services/ai/mock-gemini.js` (lines 102-110)**:
   - Add optional colons to all branches:
     ```javascript
     const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age):?\s*(\d+)/i) ||
                         text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i) ||
                         text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years(?:\s+of\s+age)?/i);
     ```
   - Prioritize `Age Limit` before the generic `\d+ to \d+ years` pattern.
   - Ensure `\d+ to \d+ years` checks for negative lookahead or word boundary ensuring it is not followed by `experience` (e.g. `(?!.*?experience)`).

2. **Fix Vacancies Comma Handling in `src/services/ai/mock-gemini.js` (lines 157-160)**:
   - Allow commas inside the vacancy number match and strip them before parsing:
     ```javascript
     const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+([\d,]+)\s+posts/i) ||
                      text.match(/(?:total vacancies|vacancies)\s*\)?\s*:\s*([\d,]+)/i) ||
                      text.match(/([\d,]+)\s+vacancies/i);
     const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;
     ```

3. **Fix Date Phrasing in `src/services/ai/mock-gemini.js` (lines 147-154)**:
   - Allow optional `"is"` or `":"` between `"exam date"` and the date:
     ```javascript
     const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date(?:\s+is)?:?)\s+(\d{4}-\d{2}-\d{2})/i);
     ```

4. **Harden `normalizeCriteriaData` in `src/services/ai/gemini-parser.js` (lines 55-56, 83, 87-88)**:
   - Use `Number.isFinite(...)` and `Number.isInteger(...)` instead of just `typeof x === 'number'`:
     ```javascript
     minAge: typeof eligibility.minAge === 'number' && Number.isFinite(eligibility.minAge) && eligibility.minAge >= 0 ? eligibility.minAge : null,
     maxAge: typeof eligibility.maxAge === 'number' && Number.isFinite(eligibility.maxAge) && eligibility.maxAge >= 0 ? eligibility.maxAge : null,
     ```

---

## 5. Verification Method

1. **Run Adversarial Test Harness**:
   ```bash
   node .agents/m2_challenger_1/adversarial_harness.js
   ```
   *Expected Result after fixes*: 34 passed, 0 failed (100% success rate).

2. **Run Standard Test Suite**:
   ```bash
   npm test
   ```
   *Expected Result*: All 87 existing tests pass with 0 regressions.

3. **Invalidation Condition**:
   If `adversarial_harness.js` still reports failures on experience range corruption or comma vacancies, this handoff verdict remains `REQUEST_CHANGES`.

---

## Stress Test Results Matrix

| # | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| 1.1 | "at least 10 years experience and max 50 projects" | minAge: null, maxAge: null | minAge: null, maxAge: null | **PASS** |
| 1.2 | "5 to 8 years experience ... Age Limit: 21 to 30 years" | minAge: 21, maxAge: 30 | minAge: 5, maxAge: 8 | **FAIL** |
| 1.3 | "3 to 5 years experience" with NO age limit | minAge: null, maxAge: null | minAge: 3, maxAge: 5 | **FAIL** |
| 1.4 | "must serve minimum period of 3 years" | minAge: 21, maxAge: 32 | minAge: 21, maxAge: 32 | **PASS** |
| 2.1 | Multiple SC/ST clauses (5 yrs vs 10 yrs) | Extracts valid relaxation | Extracts 5 years | **PASS** |
| 2.2 | 0 years relaxation for General | Ignored / 5 yrs for SC | Extracted 5 yrs SC | **PASS** |
| 2.3 | Non-standard OBC phrasing | OBC: 3 years | OBC: 3 years | **PASS** |
| 3.1 | Explicit "Application fee: Rs. 0" | general: 0 | general: 0 | **PASS** |
| 3.2 | Fee unmentioned | general: null, reserved: null | general: null, reserved: null | **PASS** |
| 3.3 | "Free of cost" / "No fee" | reserved: 0 | reserved: 0 | **PASS** |
| 3.4 | Negative fee in text | general: null or >= 0 | general: null | **PASS** |
| 4.1 | Dates in reverse order with "exam date is YYYY-MM-DD" | examDate: 2026-11-20 | examDate: null | **FAIL** |
| 4.2 | Non-ISO dates (DD/MM/YYYY) | Neutralized to null | Neutralized to null | **PASS** |
| 4.3 | Unrelated dates (e.g. 1950-01-26) | Not picked as app start | Not picked as app start | **PASS** |
| 5.1 | Vacancies with commas ("1,056") | vacancies: 1056 | vacancies: 1 | **FAIL** |
| 5.2 | Large vacancies > 1M ("1500000") | vacancies: 1500000 | vacancies: 1500000 | **PASS** |
| 5.3 | Floating point vacancies | Integer or null | 500 (Integer) | **PASS** |
| 5.4 | Negative vacancies | null or >= 0 | null | **PASS** |
| 6.1 | Devanagari + Emoji header with `(Total vacancies): 800` | vacancies: 800 | vacancies: null | **FAIL** |
| 6.2 | Zero-width chars with `"Minimum age: 21 years"` | minAge: 21 | minAge: null | **FAIL** |
| 6.3 | Non-Latin numbers | Does not crash | Handled gracefully | **PASS** |
| 7.1 | Extremely long text (100k chars) with `"Minimum age: 21"` | minAge: 21 in < 100ms | minAge: null | **FAIL** |
| 7.2 | ReDoS pattern on org regex (5000 chars) | Finishes in < 100ms | 0.28ms | **PASS** |
| 7.3 | ReDoS pattern on age relaxation regex | Finishes in < 100ms | 0.16ms | **PASS** |
| 8.1 | Prototype pollution injection in JSON | No prototype pollution | No pollution | **PASS** |
| 8.2 | Type poisoning on nested objects | Cleanly normalized | Cleanly normalized | **PASS** |
| 8.3 | Negative numbers in raw JSON | Neutralized to null | Neutralized to null | **PASS** |
| 8.4 | NaN and Infinity in numeric fields | Infinity neutralized to null | maxAge was Infinity | **FAIL** |
| 8.5 | Non-conforming date formats in JSON | Neutralized to null | Neutralized to null | **PASS** |
| 8.6 | Null/malformed relaxation array items | Sanitized safely | Sanitized safely | **PASS** |
| 9.1 | Null bytes and control characters in text | Does not crash | Does not crash | **PASS** |
| 9.2 | Client returning empty markdown fence | Rejects gracefully with success: false | Rejects gracefully | **PASS** |
| 9.3 | Client failure with fallbackToMockOnError=true | Falls back to mock | minAge: null (due to colon) | **FAIL** |
| 9.4 | Circular / frozen options object | Does not crash | Does not crash | **PASS** |

---

## Unchallenged Areas

- **Live Gemini API Quota Limits (HTTP 429 backoff)**: Mock client double verified graceful failure; live rate-limiting against Google's endpoints was out of scope due to missing API key in environment.
- **Multilingual OCR Engine**: The pipeline relies on text extracted from PDFs; actual OCR of non-Latin image PDFs is outside the scope of Milestone 2.
