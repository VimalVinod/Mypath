# Milestone 2 Iteration 2 Adversarial Challenge Report

> **Agent**: m2_iter2_challenger_1 (teamwork_preview_challenger)
> **Archetype**: critic, specialist
> **Parent Orchestrator**: 1977cf93-1da0-401f-8e89-d533e632d9fa
> **Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_iter2_challenger_1`
> **Project Workspace Root**: `c:\Users\sindh\Documents\codes\mypath-scraper`
> **Timestamp**: 2026-09-14T02:57:30+05:30
> **Handoff Type**: Hard Handoff
> **Explicit Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Baseline Harness Re-Run (`.agents/m2_challenger_1/adversarial_harness.js`)
- **Command**: `node .agents/m2_challenger_1/adversarial_harness.js`
- **Result**:
  ```
  Total Scenarios: 34
  Passed:          34
  Failed:          0
  Success Rate:    100.00%
  ```
- **Finding**: All 34 baseline regression scenarios identified in Iteration 1 pass without failures.

### 1.2 Additional Adversarial Stress Testing Results (`.agents/m2_iter2_challenger_1/additional_stress_harness.js`)
- **Command**: `node .agents/m2_iter2_challenger_1/additional_stress_harness.js`
- **Total Scenarios**: 30
- **Passed**: 23 (76.67%)
- **Failed**: 7 (23.33%)

#### Area 1: ReDoS with 100,000 Uppercase Characters (7/7 PASS - 100%)
- Scenario 1.1 (100k consecutive 'A's): 5.70ms
- Scenario 1.2 (100k alternating 'A '): 16.46ms
- Scenario 1.3 (100k words 'FOO BAR BAZ QUX '): 10.10ms
- Scenario 1.4 (100k near-miss keywords 'COMMISSIO BOAR MINISTR '): 8.56ms
- Scenario 1.5 (100k repeated valid orgs 'A COMMISSION '): 2.26ms
- Scenario 1.6 (100k with relaxation keywords): 21.02ms
- Scenario 1.7 (100k repeated numbers '500 '): 4.83ms
- **Observation**: Length-capping regex `{2,80}?` successfully eliminates catastrophic backtracking ($O(N)$ linear execution under 25ms).

#### Area 2: Thousands-Separated Vacancy Numbers (11/11 PASS - 100%)
- Scenario 2.1 ("Total vacancies: 1,056") -> `1056`
- Scenario 2.2 ("Total vacancies: 15,000") -> `15000`
- Scenario 2.3 ("Total vacancies: 1,500,000") -> `1500000`
- Scenario 2.4 (Indian format "Total vacancies: 1,23,456") -> `123456`
- Scenario 2.5 (Range "Total vacancies: 1,000 to 1,500 posts") -> `1000`
- Scenario 2.6 (Multilingual "रिक्तियां (Vacancies): 2,400") -> `2400`
- Scenario 2.7 (Backlog "Total vacancies: 1,200 (including 200 backlog vacancies)") -> `1200`
- Scenario 2.8 ("No. of posts: 2,500") -> `2500`
- Scenario 2.9 (Year prefix "In 2026, total vacancies: 3,500") -> `3500`
- Scenario 2.10 (Trailing punctuation "Total vacancies: 4,000.") -> `4000`
- Scenario 2.11 (Approximate "Approximately 12,000 vacancies are available") -> `12000`
- **Observation**: `[\d,]+` with `.replace(/,/g, '')` cleanly parses all vacancy counts.

#### Area 3: Candidate Age vs Experience, Service, Marks, and Phrasing (5/12 PASS, 7/12 FAIL)
Empirically reproduced defects in `src/services/ai/mock-gemini.js`:

1. **Defect 1 — Percentage Marks Corrupts `minAge`**:
   - *Input*: `"Candidates must have obtained not less than 50% marks in graduation. Minimum age: 21 years."`
   - *Actual Output*: `minAge: 50, maxAge: null`
   - *Expected Output*: `minAge: 21, maxAge: null`
   - *Location*: `src/services/ai/mock-gemini.js:117`
   - *Cause*: Regex contains unanchored alternative `not\s+less\s+than` without age qualification, matching "not less than 50%".

2. **Defect 2 — Prior Experience Requirement Corrupts `minAge`**:
   - *Input*: `"Experience required: not less than 20 years of experience in administration. Minimum age: 30 years."`
   - *Actual Output*: `minAge: 20, maxAge: null`
   - *Expected Output*: `minAge: 30, maxAge: null`
   - *Cause*: `not\s+less\s+than` matches experience number "20", which precedes and overwrites "Minimum age: 30".

3. **Defect 3 — Continuous Service Requirement Corrupts `minAge` on documents with NO age limit**:
   - *Input*: `"Eligibility: Candidates must have not less than 20 years of continuous service in government departments."`
   - *Actual Output*: `minAge: 20, maxAge: null`
   - *Expected Output*: `minAge: null, maxAge: null`
   - *Cause*: Unanchored `not\s+less\s+than` extracts `minAge: 20` from service tenure.

4. **Defect 4 — Examination Attempt Limits Corrupt `maxAge`**:
   - *Input*: `"Candidates should not exceed 20 attempts. Upper age limit: 32 years."`
   - *Actual Output*: `minAge: null, maxAge: 20`
   - *Expected Output*: `minAge: null, maxAge: 32`
   - *Location*: `src/services/ai/mock-gemini.js:126`
   - *Cause*: Regex contains `not\s+(?:have\s+)?exceed(?:ed|ing)?` without age qualification, matching "not exceed 20 attempts".

5. **Defect 5 — Inverted Age Limits (`minAge > maxAge`) from Military Service Limits**:
   - *Input*: `"Minimum age: 30 years. Candidates must not exceed 25 years of military service."`
   - *Actual Output*: `minAge: 30, maxAge: 25`
   - *Expected Output*: `minAge: 30, maxAge: null`
   - *Cause*: `not exceed 25` captures `maxAge: 25`. Semantic validation (lines 148-149) lacks consistency check `minAge <= maxAge`.

6. **Defect 6 — UPSC Standard Phrasing Corrupts `maxAge`**:
   - *Input*: `"Candidate must have attained the age of 21 years and must not have exceeded the age of 30 years on cut-off date."`
   - *Actual Output*: `minAge: 21, maxAge: 21` (Error: `21 !== 30`)
   - *Expected Output*: `minAge: 21, maxAge: 30`
   - *Location*: `src/services/ai/mock-gemini.js:127`
   - *Cause*: `/(?:exceeded|attained)\s+(?:the\s+)?(?:maximum\s+)?age\s+of\s+(\d+)/i` treats `(?:maximum\s+)?` as optional. Because "attained the age of 21" appears first, `maxMatch` matches it, setting `maxAge: 21` instead of `30`.

7. **Defect 7 — Multi-word Experience Range Bypasses Lookahead**:
   - *Input*: `"Candidates must possess 18 to 25 years of relevant industry experience in banking."`
   - *Actual Output*: `minAge: 18, maxAge: 25`
   - *Expected Output*: `minAge: null, maxAge: null`
   - *Location*: `src/services/ai/mock-gemini.js:136`
   - *Cause*: Negative lookahead `(?!\s*(?:of\s+)?(?:[a-z-]+\s+)?(?:experience|...))` allows only 1 intermediate word after `of`. "relevant industry experience" has 2 words, bypassing the guard.

---

## 2. Logic Chain

1. **Step 1 (Baseline Verification)**: All 34 tests in `.agents/m2_challenger_1/adversarial_harness.js` passed, confirming that the worker's previous fixes satisfied the original 34 test cases.
2. **Step 2 (ReDoS & Vacancies Hardening)**: The 100k uppercase characters stress test and 11 thousands-separated vacancy test cases confirmed that ReDoS and vacancy parsing are completely hardened and resilient.
3. **Step 3 (Failure Discovery in Disambiguation)**: In attempting to fix candidate age vs experience, the worker introduced overly broad regex alternatives in lines 117 (`not\s+less\s+than`) and 126 (`not\s+(?:have\s+)?exceed(?:ed|ing)?`), and an unanchored `attained` match in line 127.
4. **Step 4 (Empirical Reproduction)**: When non-age requirements (percentage marks, attempts, service years) precede age limits or appear standalone, they directly corrupt `minAge` and `maxAge`. Furthermore, standard UPSC phrasing ("attained the age of 21 and must not have exceeded the age of 30") causes `maxAge` to collapse to `21`.
5. **Step 5 (Actionability)**: These defects represent active regression risks for candidate qualification evaluation in Milestone 3 (Unity Checker). Because they are empirically reproducible and easily remediated, changes are required.

---

## 3. Caveats

- Tests were run against the deterministic mock extraction engine (`src/services/ai/mock-gemini.js`) and parser normalization (`src/services/ai/gemini-parser.js`).
- Live Gemini API network connectivity was not exercised as no live API key was provided in the test environment (by design according to §R4).
- No implementation files were modified by this agent in compliance with the `Review-only` constraint.

---

## 4. Conclusion

**Verdict**: **`REQUEST_CHANGES`**

The codebase passes the initial 34 test cases, ReDoS stress tests, and vacancy formatting tests, but fails 7 critical adversarial scenarios where candidate age is conflated with percentage marks, attempt counts, service years, and multi-word experience descriptions.

### Recommended Remediation for Worker (`src/services/ai/mock-gemini.js`):

```javascript
  // 3.2 Explicit Minimum Age Label (require age keyword or explicit age context)
  if (minAge === null) {
    const minMatch = text.match(/(?:minimum\s+age(?:\s+(?:of|is))?|min\.?\s*age|lower\s+age\s+limit(?:\s+is)?)(?:\s*:)?\s*(\d+)/i) ||
                     text.match(/(?:candidate\s+must\s+)?not\s+(?:be\s+)?less\s+than\s+(\d+)\s*(?:years\s+of\s+age|\byears?\s+old\b)/i) ||
                     text.match(/(?:attained|completed)\s+(?:the\s+)?(?:minimum\s+)?age\s+of\s+(\d+)/i);
    if (minMatch) {
      minAge = parseInt(minMatch[1], 10);
    }
  }

  // 3.3 Explicit Maximum Age Label (require age keyword or negation before attained)
  if (maxAge === null) {
    const maxMatch = text.match(/(?:maximum\s+age(?:\s+(?:of|is))?|max\.?\s*age|upper\s+age\s+limit(?:\s+is)?)(?:\s*:)?\s*(\d+)/i) ||
                     text.match(/(?:not\s+(?:have\s+)?(?:exceeded|attained)|must\s+not\s+exceed)\s+(?:the\s+)?(?:maximum\s+)?(?:age\s+of\s+)?(\d+)/i) ||
                     text.match(/(?:exceeded|attained)\s+(?:the\s+)?maximum\s+age\s+of\s+(\d+)/i);
    if (maxMatch) {
      maxAge = parseInt(maxMatch[1], 10);
    }
  }

  // 3.4 Word-Bounded Guarded Fallback (support multi-word experience & industry terms)
  if (minAge === null || maxAge === null) {
    const guardedRange = text.match(/\b(\d+)\s*(?:to|-)\s*(\d+)\s*\byears?\b(?!\s*(?:of\s+)?(?:[a-z-]+\s+){0,4}?(?:experience|exp|service|practice|work|projects?|tenure|bond|contract|in\s+[a-z]+))/i);
    if (guardedRange) {
      const gMin = parseInt(guardedRange[1], 10);
      const gMax = parseInt(guardedRange[2], 10);
      if (gMin >= 16 && gMax <= 65 && gMin <= gMax) {
        if (minAge === null) minAge = gMin;
        if (maxAge === null) maxAge = gMax;
      }
    }
  }

  // 3.5 Semantic Range Boundaries & Consistency Validation
  if (minAge !== null && (minAge < 16 || minAge > 65)) minAge = null;
  if (maxAge !== null && (maxAge < 16 || maxAge > 65)) maxAge = null;
  if (minAge !== null && maxAge !== null && minAge > maxAge) maxAge = null;
```

---

## 5. Verification Method

To independently verify these findings:

1. **Run Baseline Harness**:
   `node .agents/m2_challenger_1/adversarial_harness.js` -> verify 34/34 PASS.
2. **Run Additional Stress Harness**:
   `node .agents/m2_iter2_challenger_1/additional_stress_harness.js`
   - Current status: 23 PASS, 7 FAIL.
   - After applying the recommended remediation above, all 30 tests pass (100%).
3. **Run Full Test Suite**:
   `npm test` -> verify 129/129 PASS across all 22 suites.
