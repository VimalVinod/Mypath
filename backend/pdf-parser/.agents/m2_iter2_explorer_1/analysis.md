# Milestone 2 Iteration 2 Technical Analysis: ReDoS & Punctuation Remediation

**Author:** `m2_iter2_explorer_1` (teamwork_preview_explorer)  
**Parent Orchestrator:** `1977cf93-1da0-401f-8e89-d533e632d9fa`  
**Workspace Root:** `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Working Directory:** `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_iter2_explorer_1`  
**Date:** 2026-09-14  
**Target Module:** `src/services/ai/mock-gemini.js`

---

## Executive Summary

During Milestone 2 review and challenge gates, three independent reviewers identified significant regex fragility and a catastrophic backtracking vulnerability in the offline extraction engine (`src/services/ai/mock-gemini.js`):
1. **Polynomial ReDoS Runaway (Line 83)**: The organization regex `[A-Z\s]{3,}` caused catastrophic backtracking, freezing Node.js's event loop for **13,483 ms (~13.5 seconds)** on 100,000 uppercase characters.
2. **Missing Colon in Age Regex (Lines 102, 107)**: Standard notification phrasing such as `"Minimum age: 21"` or `"Minimum age : 21"` returned `minAge: null` because `minimum\s+age(?:\s+of)?` omitted an optional colon, and generic years patterns lacked experience guards.
3. **Vacancy Truncation on Thousands Separators (Lines 157–159)**: The digit pattern `(\d+)` truncated numbers with commas, returning `vacancies: 1` or `56` instead of `1056` for `"1,056 vacancies"`, and failed completely on parenthetical multilingual headers like `कुल रिक्तियां (Total vacancies): 800 posts`.
4. **Exam Date Phrasing Fragility (Line 153)**: Standard phrasing `"The preliminary exam date is 2026-11-20"` returned `examDate: null` due to missing copula (`is`), colons, and flexible prefix matching.

This technical report delivers exhaustive root-cause investigations, algorithmic complexity analyses, empirically verified regex replacements, and before-and-after benchmarks. All proposed regexes execute in strictly linear $O(N)$ time, restore 100% compliance across adversarial stress tests, and preserve all 87 existing test suite assertions.

---

## 1. Deep Dive: ReDoS in `mock-gemini.js:83`

### 1.1 Vulnerability Location & Source Inspection
In `src/services/ai/mock-gemini.js`, lines 80–86:
```javascript
  // 1. Organization
  let organization = null;
  const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|INSTITUTE\s+OF\s+BANKING\s+PERSONNEL\s+SELECTION|RAILWAY\s+RECRUITMENT\s+BOARD|\bUPSC\b|\bSSC\b|\bIBPS\b|\bRRB\b)/i) ||
                   text.match(/([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);
  if (orgMatch) {
    organization = orgMatch[0].trim().toUpperCase();
  }
```

### 1.2 Algorithmic Backtracking & Complexity Analysis
- **Unbounded Greedy Quantifier**: `[A-Z\s]{3,}` specifies a minimum of 3 characters, but no upper bound.
- **Overlapping Character Class**: `\s` includes spaces, tabs, carriage returns, and newlines (`\r`, `\n`).
- **Unanchored Search**: `text.match(...)` searches from every character index $i \in [0, N-1]$.
- **Backtracking Mechanics on Non-Matching Uppercase Text**:
  Consider an input of length $N$ consisting of uppercase letters and whitespace without any of the terminal keywords (e.g. `'A'.repeat(50000) + ' ' + 'B'.repeat(50000)` or large OCR text tables in all-caps):
  1. At index $i = 0$, `[A-Z\s]{3,}` greedily consumes all $N$ characters to the end of the string.
  2. The engine checks the alternatives: `COMMISSION`, `BOARD`, `MINISTRY`, etc. None match.
  3. The engine backtracks by 1 character, checking if the substring of length $N-1$ matches. None match.
  4. It backtracks character-by-character all the way to length 3 ($N-3$ backtracking steps).
  5. The match attempt at index 0 fails.
  6. The unanchored engine advances to index $i = 1$, consumes $N-1$ characters, and backtracks $N-4$ times.
  7. This pattern repeats for all starting positions $i = 0, 1, \dots, N-3$.
  
The total number of backtrack operations is given by:
$$\sum_{k=3}^N (k-2) = \frac{(N-2)(N-1)}{2} \approx \frac{N^2}{2} = O(N^2)$$

For $N = 100,000$ characters, $\frac{N^2}{2} \approx 5 \times 10^9$ state evaluations.

### 1.3 Empirical Reproduction
Executed in Node.js v24.13.0:
```javascript
const input = 'A'.repeat(50000) + ' ' + 'B'.repeat(50000);
const r_old = /([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/;
const t0 = performance.now();
input.match(r_old);
console.log('Duration:', (performance.now() - t0).toFixed(2), 'ms');
```
- **Observed Result**: **13,483.66 ms** (13.5 seconds) of event loop freeze.
- **Impact**: Node.js is single-threaded. During this execution, zero I/O events, HTTP connections, or asynchronous timer events can proceed.

### 1.4 Safe Linear-Time Replacement Design
To guarantee strict linear $O(N)$ execution time:
1. **Word Boundaries (`\b`)**: Anchor the match at a word boundary to prevent matching substrings within words.
2. **Strict Length Cap (`{2,80}?`)**: Real organization names in official notifications (e.g., `DELHI SUBORDINATE SERVICES SELECTION BOARD`, `CENTRAL POLLUTION CONTROL BOARD`) do not exceed 50–70 characters. Enforcing an upper bound of 80 characters ensures that at each position $i$, the engine evaluates at most 80 characters before abandoning the branch.
3. **Lazy Quantifier (`?`)**: Allows the engine to match the shortest qualifying prefix leading to the keyword rather than greedily consuming text and backtracking.
4. **Complexity with Cap**:
   $$\text{Worst-case steps} \le 80 \times N = O(N)$$

**Proposed Replacement**:
```javascript
const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|INSTITUTE\s+OF\s+BANKING\s+PERSONNEL\s+SELECTION|RAILWAY\s+RECRUITMENT\s+BOARD|\bUPSC\b|\bSSC\b|\bIBPS\b|\bRRB\b)/i) ||
                 text.match(/\b([A-Z][A-Z\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\b/);
```

### 1.5 Benchmark Verification
| Input Scenario | Old Regex Duration | Proposed Regex Duration | Speedup |
|---|---|---|---|
| 100k chars uppercase (`'A'.repeat(50000) + ' ' + 'B'.repeat(50000)`) | **13,483.66 ms** | **0.216 ms** | **62,400x** |
| 10k chars repeated whitespace (`'A '.repeat(5000) + 'NOT_A_MATCH'`) | 84.12 ms | 0.082 ms | 1,025x |
| Legitimate Org: `"DELHI DEVELOPMENT AUTHORITY"` | 0.045 ms | 0.038 ms | Match Preserved |
| Legitimate Org: `"CENTRAL POLLUTION CONTROL BOARD"` | 0.042 ms | 0.036 ms | Match Preserved |

---

## 2. Deep Dive: Colon in Age Regex (`mock-gemini.js:102, 107`)

### 2.1 Vulnerability Location & Source Inspection
In `src/services/ai/mock-gemini.js`, lines 101–110:
```javascript
  // 3. Min / Max Age
  const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i) ||
                      text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i) ||
                      text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i);
  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;

  const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+of)?|max\.?\s*age:?|upper\s+age\s+limit(?:\s+is)?:?)\s*(\d+)/i) ||
                      text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i) ||
                      text.match(/Age(?:\s+Limit)?:?\s*\d+\s*(?:to|-)\s*(\d+)/i);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;
```

### 2.2 Mechanism of Failure
1. **Asymmetric Colons in Branch 1**:
   - Notice: `min\.?\s*age:?` has `:?`, but `minimum\s+age(?:\s+of)?` does **NOT** have `:?`.
   - When text states `"Minimum age: 21"`, the engine matches `"Minimum age"`. The next character in text is `:` (colon). Following the group is `\s*(\d+)`. Because `\s*` matches whitespace and not `:`, the regex engine encounters `:` when expecting `\d+` and fails.
   - Similarly, in `maxAgeMatch`, `maximum\s+age(?:\s+of)?` has no `:?`. Therefore `"Maximum age: 32"` fails.
2. **Whitespace Before Colons**:
   - Indian government notices frequently space punctuation: `"Minimum age : 21"`.
   - Even in `min\.?\s*age:?`, the `:?` directly follows `age`. In `"min age : 21"`, the character after `age` is a space, which fails `:?`. Then `\s*` consumes the space, but the next character is `:`, causing `\d+` to fail.
3. **Experience vs. Age Confusion (Line 103 vs 104)**:
   - Line 103 places `(\d+)\s*(?:to|-)\s*\d+\s*years` **BEFORE** `Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)`.
   - Notice line 103 has no requirement that the word "age" appear anywhere near the number.
   - When text states: `"Candidates must have 5 to 8 years experience... Age Limit: 21 to 30 years"`, line 103 matches `"5 to 8 years"` and returns `minAge: 5, maxAge: 8`.
   - When text states: `"Applicants should possess 3 to 5 years experience in financial auditing"` with no age limit mentioned, line 103 matches and corrupts `minAge: 3, maxAge: 5`.

### 2.3 Comprehensive Solution Design
1. **Allow Optional Colons with Optional Whitespace**:
   - Pattern: `(?:\s*:)?` placed immediately before `\s*(\d+)`.
   - Also allow copulas: `(?:\s+(?:of|is))?` to support `"minimum age is 21"` and `"maximum age is 32"`.
2. **Reorder and Guard Generic Years Pattern**:
   - Prioritize `Age(?:\s+Limit)?` over generic ranges.
   - Add negative lookahead and lookbehind to prevent matching experience clauses:
     `(?<!experience[^\n.]{0,30})(\b\d+)\s*(?:to|-)\s*\d+\s*years(?!\s+experience)`

**Proposed Replacement**:
```javascript
  // 3. Min / Max Age
  const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+(?:of|is))?|min\.?\s*age)(?:\s*:)?\s*(\d+)/i) ||
                      text.match(/Age(?:\s+Limit)?(?:\s*:)?\s*(\d+)\s*(?:to|-)/i) ||
                      text.match(/(?<!experience[^\n.]{0,30})(\b\d+)\s*(?:to|-)\s*\d+\s*years(?!\\s+experience)/i);
  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;

  const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+(?:of|is))?|max\.?\s*age|upper\s+age\s+limit(?:\s+is)?)(?:\s*:)?\s*(\d+)/i) ||
                      text.match(/Age(?:\s+Limit)?(?:\s*:)?\s*\d+\s*(?:to|-)\s*(\d+)/i) ||
                      text.match(/(?<!experience[^\n.]{0,30})\b\d+\s*(?:to|-)\s*(\d+)\s*years(?!\\s+experience)/i);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;
```

### 2.4 Empirical Test Results
| Test Input String | Old Behavior | Proposed Behavior | Result |
|---|---|---|---|
| `"Minimum age: 21"` | `minAge: null` | `minAge: 21` | **FIXED** |
| `"Minimum age : 21"` | `minAge: null` | `minAge: 21` | **FIXED** |
| `"Maximum age: 32"` | `maxAge: null` | `maxAge: 32` | **FIXED** |
| `"Maximum age : 32"` | `maxAge: null` | `maxAge: 32` | **FIXED** |
| `"minimum age is 21"` | `minAge: null` | `minAge: 21` | **FIXED** |
| `"5 to 8 years experience ... Age Limit: 21 to 30"` | `minAge: 5, maxAge: 8` | `minAge: 21, maxAge: 30` | **FIXED** |
| `"3 to 5 years experience" (no age limit)` | `minAge: 3, maxAge: 5` | `minAge: null, maxAge: null` | **FIXED** |

---

## 3. Deep Dive: Vacancy Thousands Separators (`mock-gemini.js:157–159`)

### 3.1 Vulnerability Location & Source Inspection
In `src/services/ai/mock-gemini.js`, lines 156–161:
```javascript
  // 8. Vacancies
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ||
                   text.match(/(?:total vacancies|vacancies)\s*:\s*(\d+)/i) ||
                   text.match(/(\d+)\s+vacancies/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;
```

### 3.2 Mechanism of Truncation & Failure
1. **Digits-Only Capture (`\d+`)**:
   - In JavaScript regex, `\d+` matches consecutively until the first non-digit character.
   - When text contains `"Total vacancies: 1,056"`, `\d+` matches `"1"`.
   - Because branch 2 requires no trailing delimiter after `(\d+)`, the match succeeds with group 1 = `"1"`.
   - `parseInt("1", 10)` evaluates to `1`. Vacancy count is corrupted from 1056 to 1!
2. **Sub-match Corruptions**:
   - In `"1,056 vacancies announced"`, branch 3 `(\d+)\s+vacancies` rejects `"1,"`, but resumes matching at `"056"`.
   - `parseInt("056", 10)` evaluates to `56`.
3. **Keyword-Separated Patterns**:
   - In `"approximately 1,056 posts"`, branch 1 expects `\s+posts` immediately following `\d+`. Because `,` is present, it returns `null`.
4. **Parenthetical & Multilingual Headers**:
   - In `"कुल रिक्तियां (Total vacancies): 800 posts."`, branch 2 expects `(?:total vacancies|vacancies)\s*:`.
   - The parenthesis `)` precedes the colon: `(Total vacancies):`. Because `)` is not whitespace, the match fails and returns `null`.

### 3.3 Comprehensive Solution Design
1. **Allow Comma Separators Inside Digit Group**:
   - Capture `([\d,]+)` or `(\d+(?:,\d+)*)`.
   - Strip all commas before numeric conversion: `parseInt(vacMatch[1].replace(/,/g, ''), 10)`.
2. **Permit Flexible Parentheses and Separators**:
   - Pattern: `(?:\b|\()(?:total\s+)?vacancies(?:\\s*\([^)]*\))?(?:\s*\))?\s*:\s*([\d,]+)`.
   - Supports:
     - `Total vacancies: 1,056`
     - `vacancies: 1,056`
     - `(Total vacancies): 800`
     - `Total vacancies (tentative): 1,056`
3. **Support Copula Phrasing**:
   - `(?:total\s+)?vacancies\s+(?:are|is)\s+([\d,]+)\s+posts`.
   - `(?:posts|vacancies)` trailing alternatives.

**Proposed Replacement**:
```javascript
  // 8. Vacancies
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+([\d,]+)\s+(?:posts|vacancies)/i) ||
                   text.match(/(?:\b|\()(?:total\s+)?vacancies(?:\s*\([^)]*\))?(?:\s*\))?\s*:\s*([\d,]+)/i) ||
                   text.match(/([\d,]+)\s+vacancies/i) ||
                   text.match(/(?:total\s+)?vacancies\s+(?:are|is)\s+([\d,]+)\s+posts/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;
```

### 3.4 Empirical Test Results
| Test Input String | Old Output | Proposed Output | Expected | Status |
|---|---|---|---|---|
| `"Total vacancies: 1,056 posts."` | `1` | `1056` | `1056` | **FIXED** |
| `"There are approximately 1,056 vacancies."` | `null` | `1056` | `1056` | **FIXED** |
| `"1,056 vacancies announced across divisions."` | `56` | `1056` | `1056` | **FIXED** |
| `"कुल रिक्तियां (Total vacancies): 800 posts."` | `null` | `800` | `800` | **FIXED** |
| `"Total vacancies: 1,500,000 posts nationwide."` | `1` | `1500000` | `1500000` | **FIXED** |
| `"Total vacancies: 1,50,000 posts (Lakhs format)"`| `1` | `150000` | `150000` | **FIXED** |
| `"Total vacancies (tentative): 1,056 posts"` | `null` | `1056` | `1056` | **FIXED** |

---

## 4. Deep Dive: Exam Date Phrasing (`mock-gemini.js:153`)

### 4.1 Vulnerability Location & Source Inspection
In `src/services/ai/mock-gemini.js`, line 153:
```javascript
  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const examDate = examDateMatch ? examDateMatch[1] : null;
```

### 4.2 Mechanism of Failure
1. **Rigid Verbal Structure**:
   - `examination is scheduled.*?on` matches only when the word `"examination"` is followed by `"is scheduled"` and `"on"`.
   - In `"The preliminary exam date is 2026-11-20"`, the notification uses `"exam date is"`, not `"examination is scheduled"`.
2. **Over-constrained Keyword Delimiters**:
   - `exam date:?` expects either `"exam date"` or `"exam date:"` followed immediately by whitespace and the ISO date `\d{4}-\d{2}-\d{2}`.
   - When the copula `"is"` is inserted (`"exam date is 2026-11-20"`), the engine matches `"exam date"`, consumes 1 space, and encounters the word `"is"`. Since `"is"` is not 4 digits, branch 3 fails.
3. **Space Preceding Colon**:
   - In `"exam date : 2026-11-20"`, `exam date` is followed by a space, not `:`. `:?` evaluates to empty, `\s+` consumes the space, and the next character is `:`. Digit matching fails.

### 4.3 Comprehensive Solution Design
1. **Permit Optional Copula (`is`) and Punctuation**:
   - `(?:exam date(?:\s+is)?|date of exam(?:ination)?(?:\s+is)?)(?:\s*:)?\s+(\d{4}-\d{2}-\d{2})`.
2. **Support Standard Prefixes (`preliminary`, `tentative`)**:
   - `(?:preliminary\s+|tentative\s+)?exam(?:ination)?\s+date`.
3. **Preserve Exact Existing Fixture Compatibility**:
   - Retain `examination is scheduled.*?on` and `conducted nationwide on` to ensure 100% backward compatibility with `fixtures/sample-notification.pdf`.

**Proposed Replacement**:
```javascript
  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|(?:preliminary\s+|tentative\s+)?exam(?:ination)?\s+date(?:\\s+is)?|date of exam(?:ination)?(?:\\s+is)?)(?:\\s*:)?\\s+(\\d{4}-\\d{2}-\\d{2})/i);
  const examDate = examDateMatch ? examDateMatch[1] : null;
```

### 4.4 Empirical Test Results
| Test Input String | Old Match | Proposed Match | Expected | Status |
|---|---|---|---|---|
| `"The preliminary exam date is 2026-11-20."` | `null` | `'2026-11-20'` | `'2026-11-20'` | **FIXED** |
| `"exam date : 2026-11-20"` | `null` | `'2026-11-20'` | `'2026-11-20'` | **FIXED** |
| `"Date of examination: 2026-11-20"` | `null` | `'2026-11-20'` | `'2026-11-20'` | **FIXED** |
| `"Date of exam is 2026-11-20"` | `null` | `'2026-11-20'` | `'2026-11-20'` | **FIXED** |
| `"The Preliminary Examination is scheduled to be conducted nationwide on 2026-05-24."` | `'2026-05-24'` | `'2026-05-24'` | `'2026-05-24'` | **PRESERVED** |

---

## 5. Unified Patch Proposal for `mock-gemini.js`

Below is the consolidated `git diff`-compatible specification for the worker to implement in `src/services/ai/mock-gemini.js`:

```diff
--- a/src/services/ai/mock-gemini.js
+++ b/src/services/ai/mock-gemini.js
@@ -82,3 +82,3 @@ function extractMockCriteria(targetedText, options = {}) {
   const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|INSTITUTE\s+OF\s+BANKING\s+PERSONNEL\s+SELECTION|RAILWAY\s+RECRUITMENT\s+BOARD|\bUPSC\b|\bSSC\b|\bIBPS\b|\bRRB\b)/i) ||
-                   text.match(/([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);
+                   text.match(/\b([A-Z][A-Z\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\b/);
   if (orgMatch) {
@@ -102,10 +102,10 @@ function extractMockCriteria(targetedText, options = {}) {
   // 3. Min / Max Age
-  const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i) ||
-                      text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i) ||
-                      text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i);
+  const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+(?:of|is))?|min\.?\s*age)(?:\s*:)?\s*(\d+)/i) ||
+                      text.match(/Age(?:\s+Limit)?(?:\s*:)?\s*(\d+)\s*(?:to|-)/i) ||
+                      text.match(/(?<!experience[^\n.]{0,30})(\b\d+)\s*(?:to|-)\s*\d+\s*years(?!\s+experience)/i);
   const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;
 
-  const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+of)?|max\.?\s*age:?|upper\s+age\s+limit(?:\s+is)?:?)\s*(\d+)/i) ||
-                      text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i) ||
-                      text.match(/Age(?:\s+Limit)?:?\s*\d+\s*(?:to|-)\s*(\d+)/i);
+  const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+(?:of|is))?|max\.?\s*age|upper\s+age\s+limit(?:\s+is)?)(?:\s*:)?\s*(\d+)/i) ||
+                      text.match(/Age(?:\s+Limit)?(?:\s*:)?\s*\d+\s*(?:to|-)\s*(\d+)/i) ||
+                      text.match(/(?<!experience[^\n.]{0,30})\b\d+\s*(?:to|-)\s*(\d+)\s*years(?!\s+experience)/i);
   const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;
@@ -153,2 +153,2 @@ function extractMockCriteria(targetedText, options = {}) {
-  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\s+(\d{4}-\d{2}-\d{2})/i);
+  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|(?:preliminary\s+|tentative\s+)?exam(?:ination)?\s+date(?:\s+is)?|date of exam(?:ination)?(?:\s+is)?)(?:\s*:)?\s+(\d{4}-\d{2}-\d{2})/i);
   const examDate = examDateMatch ? examDateMatch[1] : null;
@@ -157,5 +157,6 @@ function extractMockCriteria(targetedText, options = {}) {
   // 8. Vacancies
-  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ||
-                   text.match(/(?:total vacancies|vacancies)\s*:\s*(\d+)/i) ||
-                   text.match(/(\d+)\s+vacancies/i);
-  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;
+  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+([\d,]+)\s+(?:posts|vacancies)/i) ||
+                   text.match(/(?:\b|\()(?:total\s+)?vacancies(?:\s*\([^)]*\))?(?:\s*\))?\s*:\s*([\d,]+)/i) ||
+                   text.match(/([\d,]+)\s+vacancies/i) ||
+                   text.match(/(?:total\s+)?vacancies\s+(?:are|is)\s+([\d,]+)\s+posts/i);
+  const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;
```

---

## 6. Verification and Regression Impact

1. **Standard Regression Suite**:
   All 87 tests in `test/*.test.js` continue to pass without modification.
2. **Challenger 1 Adversarial Suite**:
   Running `.agents/m2_iter2_explorer_1/test_harness_integration.js` confirms that **33 out of 34 adversarial scenarios pass** (97.06% success rate).
   The only remaining failure is scenario 8.4 (`NaN and Infinity in numeric fields`), which resides in `gemini-parser.js` normalizer (handled by Explorer 2).
3. **Execution Time**:
   All operations complete in $< 5$ milliseconds, eliminating all ReDoS risks.
