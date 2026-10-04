# Milestone 2 Review Handoff Report: Prompt Engineering, Mock Fallback Safety & Full Regression

> **Author**: `m2_reviewer_2` (teamwork_preview_reviewer / critic)  
> **Target**: `teamwork_preview_orchestrator_2` (conversation ID: `1977cf93-1da0-401f-8e89-d533e632d9fa`)  
> **Workspace**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
> **Date**: 2026-09-13T20:41:00Z  
> **Verdict**: **REQUEST_CHANGES**  
> **Handoff Type**: Hard Handoff  

---

## Executive Summary

As Reviewer 2, my assigned mission was to evaluate:
1. `src/services/ai/prompt.js` and `src/services/ai/mock-gemini.js`.
2. Closed-world assumption adherence (zero-hallucination, null defaults for unmentioned scalars, empty arrays for lists).
3. Mock fallback safety under edge cases, specifically verifying **absence of regex runaway (ReDoS)** and **absence of greedy cross-clause matches**.
4. Combined regression test suite (`npm test`).
5. Absence of integrity violations (hardcoded test answers, dummy facades, simulated shortcuts).

**Key Findings:**
- **Integrity**: Verified 100% clean. No hardcoded fixtures in source code; dynamic parsing responds correctly to varying arbitrary inputs.
- **Closed-World Assumption & Prompt Quality**: `prompt.js` enforces strict grounding, explicit null defaults, and system instruction constraints with high quality.
- **Full Regression**: `npm test` successfully executes 87 tests across 18 test suites with 0 failures and 0 regressions.
- **Mock Fallback Safety (Adversarial Challenge)**: **FAILED condition 3**. Independent adversarial stress tests revealed two reproducible Major failure modes in `src/services/ai/mock-gemini.js`:
  1. **Polynomial ReDoS / Regex Runaway** at line 83 (`[A-Z\s]{3,}`) stalling Node's event loop for **14.75 seconds** on a 100k uppercase text block.
  2. **Greedy Cross-Clause Matching** at line 121 (`[^,.;]*?`) misattributing SC/ST's 5-year relaxation to OBC when clauses are joined with "and" (`"Relaxation of 5 years for SC/ST and 3 years for OBC"` gives OBC 5 years instead of 3).
  3. **Vacancy Comma Failure** at line 157 (`(\d+)\s+posts`) failing to parse standard thousands-delimited vacancies like `"1,056 posts"`.

Because Mission Requirement #3 specifically mandated verifying that `mock-gemini.js` handles edge cases cleanly without regex runaway or greedy cross-clause matches, and both were proven to fail under reproducible execution, the explicit verdict is **REQUEST_CHANGES**. Exact copy-paste patches and test cases are provided below.

---

## 1. Observation

### 1.1 Source Code and Interface Contract Inspections
1. **`src/services/ai/prompt.js`**:
   - Lines 9–23: `SYSTEM_INSTRUCTION` sets 5 critical zero-hallucination rules: strict grounding, null defaults for unmentioned scalars, empty array defaults for unmentioned lists, exact value normalization (integers, ISO YYYY-MM-DD, INR fees with exemption to 0, status enums), and explicit instruction to ignore structural artifacts (`--- [Page X] ---`).
   - Lines 31–52: `buildExtractionPrompt(targetedText, options)` encloses document text inside `--- BEGIN TARGETED TEXT ---` and `--- END TARGETED TEXT ---` blocks. Handles empty/whitespace strings by returning an explicit empty-document instruction.
   - Lines 62–67: `DEFAULT_EXTRACTION_CONFIG` enforces deterministic extraction via `temperature: 0.0`, `topP: 0.95`, `maxOutputTokens: 2048`, and `responseMimeType: 'application/json'`.
2. **`src/services/ai/mock-gemini.js`**:
   - Lines 13–36: `getEmptyCriteria()` returns a zero-filled baseline object with all scalar fields set to `null`, arrays set to `[]`, and `status: 'UNKNOWN'`.
   - Lines 73–199: `extractMockCriteria(targetedText, options)` implements heuristic regex extractors for organization, exam title, min/max age, age relaxation, education, streams, dates, vacancies, fees, and status.
   - Lines 207–219: `generateMockResponse` wraps extracted data in envelope `{ success: true, isMock: true, modelUsed: 'mock-rules-v1', data, rawResponse }`.

### 1.2 Integrity Inspection
- Inspected `src/services/ai/` for hardcoded conditional returns or dummy facades.
- Evaluated `extractMockCriteria` on arbitrary dynamic strings:
  - Custom age: `"minimum age 20 and maximum age 28 years"` -> yielded `minAge: 20, maxAge: 28` (not fixture values 21/32).
  - Custom fee: `"Application fee of Rs. 250 for General"` -> yielded `general: 250` (not fixture value 100).
  - Custom vacancies: `"approximately 450 posts"` -> yielded `vacancies: 450` (not fixture value 1056).
  - Poetry / irrelevant text: `"The woods are lovely, dark and deep..."` -> yielded all `null`s and empty arrays `[]`.
- **Verdict on Integrity**: **PASS**. No integrity violations detected.

### 1.3 Test Suite Execution
- Executed `npm test` (`node --test test/*.test.js`):
  ```
  ℹ tests 87
  ℹ suites 18
  ℹ pass 87
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 964.1596
  ```
  All 40 Milestone 1 tests and all 47 Milestone 2 tests passed synchronously.

### 1.4 Adversarial Stress Testing Results
Conducted stress-testing targeting regex runaway, greedy matching, and boundary conditions:

#### Finding 1: Polynomial ReDoS / Regex Runaway in `mock-gemini.js` (Major)
- **Location**: `src/services/ai/mock-gemini.js:83`:
  ```javascript
  const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|...)/i) ||
                   text.match(/([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);
  ```
- **Reproduction**:
  ```bash
  node -e "
  const { extractMockCriteria } = require('./src/services/ai');
  const t0 = performance.now();
  const input = 'A'.repeat(50000) + ' ' + 'B'.repeat(50000);
  extractMockCriteria(input);
  console.log('Duration:', (performance.now() - t0).toFixed(2), 'ms');
  "
  ```
- **Observed Result**: **14,753.11 ms (~14.75 seconds)**.
- **Cause**: The regex is unanchored and contains an unbounded greedy repetition `[A-Z\s]{3,}` followed by keyword alternatives. When evaluated against non-matching uppercase text (typical in multi-page OCR document headers or tabular caps text), the regex engine matches to the end, backtracks linearly for each starting character position `i`, leading to an $O(N^2)$ polynomial explosion.

#### Finding 2: Greedy Cross-Clause Match in Age Relaxation (Major)
- **Location**: `src/services/ai/mock-gemini.js:121-125`:
  ```javascript
  const relOBC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Other Backward Classes|\bOBC\b)/i) || ...
  ```
- **Reproduction**:
  ```bash
  node -e "
  const { extractMockCriteria } = require('./src/services/ai');
  const text = 'A candidate must be between 18 to 25 years. Relaxation of 5 years for SC/ST and 3 years for OBC.';
  const res = extractMockCriteria(text);
  console.log(res.eligibility.ageRelaxation);
  "
  ```
- **Observed Result**:
  ```javascript
  [ { category: 'SC/ST', years: 5 }, { category: 'OBC', years: 5 } ]
  ```
  `OBC` was assigned **5 years** instead of **3 years**.
- **Cause**: The exclusion set `[^,.;]*?` stops only at commas, semicolons, and periods. When relaxation clauses are joined by conjunctions like `"and"` without internal commas, the pattern matches `"Relaxation of 5 years"`, traverses across `" for SC/ST and 3 years for "`, and matches `"OBC"`, capturing `5` instead of `3`.

#### Finding 3: Number Formatting with Commas in Vacancies (Minor)
- **Location**: `src/services/ai/mock-gemini.js:157`:
  ```javascript
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ...
  ```
- **Reproduction**:
  ```bash
  node -e "
  const { extractMockCriteria } = require('./src/services/ai');
  const res = extractMockCriteria('There are approximately 1,056 posts.');
  console.log('Vacancies:', res.vacancies);
  "
  ```
- **Observed Result**: `null`.
- **Cause**: Standard Indian government circulars frequently format vacancy counts over 999 with commas (e.g. `1,056 posts`). The pattern expects digits immediately followed by whitespace (`\s+posts`), failing when a comma is present.

#### Finding 4: Delimiter Injection Collision in `prompt.js` (Minor)
- **Location**: `src/services/ai/prompt.js:38-50`:
  `buildExtractionPrompt(targetedText)` interpolates raw text directly between `--- BEGIN TARGETED TEXT ---` and `--- END TARGETED TEXT ---` without neutralizing embedded occurrences of the closing boundary tag.

---

## 2. Logic Chain

1. **Requirement §R2 & §R4 Compliance**:
   - Observation 1.1 and 1.3 confirm that `@google/genai` (v2.22.0) is integrated, `CRITERIA_SCHEMA` defines valid `Type` mappings, `prompt.js` enforces zero-hallucination rules, and `npm test` runs 87 tests without regression.
2. **Adversarial Safety Evaluation (Mission Item 3)**:
   - Mission Item 3 explicitly mandates: *"Verify that `mock-gemini.js` handles edge cases cleanly without regex runaway or greedy cross-clause matches."*
   - Observation 1.4 (Finding 1) demonstrates that `mock-gemini.js` hangs for 14.75 seconds on 100k uppercase text due to an unbounded, unanchored regex.
   - Observation 1.4 (Finding 2) demonstrates that `mock-gemini.js` matches greedily across conjunction-joined clauses, assigning 5 years to OBC instead of 3 years.
3. **Conclusion**:
   - Because Mission Item 3's verification criteria failed under empirical testing, the review cannot issue an unqualified approval. A prompt, targeted fix must be applied to `mock-gemini.js` to eliminate the ReDoS and cross-clause matching bugs before Milestone 3 commences.

---

## 3. Caveats

- **Mock vs. Live API**: In live mode with a valid `GEMINI_API_KEY`, `mock-gemini.js` is not invoked. However, per Feature 9, Milestone 2 Interface Contract #2, and dispatch requirement #3, `mock-gemini.js` serves as the primary offline test double and fallback engine across all downstream modules (Milestone 3 validator, Milestone 4 CLI, and Milestone 5 tests). Its robustness is critical.
- No other caveats.

---

## 4. Conclusion & Actionable Fixes

**Verdict: REQUEST_CHANGES**

### Actionable Remediation Plan for `src/services/ai/mock-gemini.js`:

#### Fix 1: Remediate ReDoS at Line 83
Replace:
```javascript
  const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|INSTITUTE\s+OF\s+BANKING\s+PERSONNEL\s+SELECTION|RAILWAY\s+RECRUITMENT\s+BOARD|\bUPSC\b|\bSSC\b|\bIBPS\b|\bRRB\b)/i) ||
                   text.match(/([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);
```
With a length-bounded, word-boundary pattern:
```javascript
  const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|INSTITUTE\s+OF\s+BANKING\s+PERSONNEL\s+SELECTION|RAILWAY\s+RECRUITMENT\s+BOARD|\bUPSC\b|\bSSC\b|\bIBPS\b|\bRRB\b)/i) ||
                   text.match(/\b([A-Z][A-Z\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\b/);
```
*(Verified: Reduces execution time on 100k characters from 14,753 ms to 0.21 ms).*

#### Fix 2: Remediate Cross-Clause Greediness at Lines 114–126
Update `relSC` and `relOBC` so that the pattern cannot traverse across conjunctions (`and`), category boundaries (`SC/ST`, `OBC`), or other numbers:
```javascript
  // 4. Age Relaxation
  const ageRelaxation = [];
  const relSC = text.match(/(?:(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+)?(\d+)\s+years?(?:(?!\b(?:and|for OBC|OBC)\b)[^,.;])*?(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)/i) ||
                text.match(/(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)[^,.;]*?(?:up to|by|maximum of|:)?\s*(\d+)\s*years?/i);
  if (relSC) {
    const years = parseInt(relSC[1] || relSC[2], 10);
    ageRelaxation.push({ category: 'SC/ST', years });
  }

  const relOBC = text.match(/(?:(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+)?(\d+)\s+years?(?:(?!\b(?:and|for SC|for ST|SC|ST)\b)[^,.;])*?(?:Other Backward Classes|\bOBC\b)/i) ||
                 text.match(/(?:Other Backward Classes|\bOBC\b)[^,.;]*?(?:up to|by|maximum of|:)?\s*(\d+)\s*years?/i);
  if (relOBC) {
    const years = parseInt(relOBC[1] || relOBC[2], 10);
    ageRelaxation.push({ category: 'OBC', years });
  }
```

#### Fix 3: Support Commas in Vacancies at Line 157
Replace:
```javascript
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ||
                   text.match(/(?:total vacancies|vacancies)\s*:\s*(\d+)/i) ||
                   text.match(/(\d+)\s+vacancies/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;
```
With:
```javascript
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+([\d,]+)\s+posts/i) ||
                   text.match(/(?:total vacancies|vacancies)\s*:\s*([\d,]+)/i) ||
                   text.match(/([\d,]+)\s+vacancies/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;
```

#### Fix 4: Neutralize Delimiter Collisions in `src/services/ai/prompt.js`
In `buildExtractionPrompt`:
```javascript
  const sanitizedText = cleanText.replace(/---\s*END TARGETED TEXT\s*---/gi, '[END TARGETED TEXT]');
```

---

## 5. Verification Method

To independently verify the reported issues and validate the fixes:

1. **Verify Regression Suite**:
   ```bash
   npm test
   ```
   *Expected*: 87 passed, 0 failed.

2. **Verify Finding 1 (ReDoS Reproduction)**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai'); const t0 = performance.now(); extractMockCriteria('A'.repeat(50000) + ' ' + 'B'.repeat(50000)); console.log('ReDoS Duration:', (performance.now() - t0).toFixed(2), 'ms');"
   ```
   *Invalidation condition*: Duration must be < 50 ms (currently ~14,750 ms).

3. **Verify Finding 2 (Cross-Clause Greediness Reproduction)**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai'); const res = extractMockCriteria('Relaxation of 5 years for SC/ST and 3 years for OBC.'); console.log(res.eligibility.ageRelaxation);"
   ```
   *Invalidation condition*: OBC must be 3 years (currently 5 years).

4. **Verify Finding 3 (Vacancy Comma Reproduction)**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai'); const res = extractMockCriteria('There are approximately 1,056 posts.'); console.log('Vacancies:', res.vacancies);"
   ```
   *Invalidation condition*: Vacancies must be 1056 (currently `null`).
