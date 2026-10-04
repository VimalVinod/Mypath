# Milestone 2 Iteration 2 Handoff Report: Cross-Clause & Experience Disambiguation

**Author:** `m2_iter2_explorer_2` (teamwork_preview_explorer)  
**Target:** `teamwork_preview_orchestrator_2` (conversation ID: `1977cf93-1da0-401f-8e89-d533e632d9fa`)  
**Workspace:** `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Handoff Type:** Hard Handoff (Task Complete)  
**Timestamp:** 2026-09-13T21:05:00Z  

---

## 1. Observation

### 1.1 Verbatim Cross-Clause Matching Defect (`mock-gemini.js:121-125`)
In `src/services/ai/mock-gemini.js`:
```javascript
121: const relOBC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Other Backward Classes|\bOBC\b)/i) ||
122:                text.match(/(?:Other Backward Classes|\bOBC\b)[^,.;]*?(?:up to|by|maximum of|:)?\s*(\d+)\s*years?/i);
```
Direct reproduction command:
```bash
node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('A candidate must be between 18 to 25 years. Relaxation of 5 years for SC/ST and 3 years for OBC.'); console.log(res.eligibility.ageRelaxation);"
```
Verbatim observed output:
```javascript
[ { category: 'SC/ST', years: 5 }, { category: 'OBC', years: 5 } ]
```
`OBC` received **5 years** instead of 3 years because `[^,.;]*?` traverses across `" for SC/ST and 3 years for "`.

### 1.2 Verbatim Experience vs Age Limit Corruption (`mock-gemini.js:103, 108`)
In `src/services/ai/mock-gemini.js`:
```javascript
102: const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i) ||
103:                     text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i) ||
104:                     text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i);
107: const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+of)?|max\.?\s*age:?|upper\s+age\s+limit(?:\s+is)?:?)\s*(\d+)/i) ||
108:                     text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i) ||
109:                     text.match(/Age(?:\s+Limit)?:?\s*\d+\s*(?:to|-)\s*(\d+)/i);
```
Direct reproduction commands:
1. Experience precedes real age:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('Candidates must have 5 to 8 years experience in administration. Age Limit: 21 to 30 years.'); console.log('minAge:', res.eligibility.minAge, 'maxAge:', res.eligibility.maxAge);"
   ```
   Output: `minAge: 5 maxAge: 8` (Age limit 21 to 30 was ignored).
2. Experience with no age limit:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('Applicants should possess 3 to 5 years experience in financial auditing. Graduation is mandatory.'); console.log('minAge:', res.eligibility.minAge, 'maxAge:', res.eligibility.maxAge);"
   ```
   Output: `minAge: 3 maxAge: 5` (Corrupted; violates closed-world null defaults).
3. Missing colon in `minimum\s+age`:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('Minimum age: 21 years and Maximum age: 32 years.'); console.log('minAge:', res.eligibility.minAge, 'maxAge:', res.eligibility.maxAge);"
   ```
   Output: `minAge: null maxAge: null` (Failed to match due to lack of `:?` on `minimum\s+age` and `maximum\s+age`).

### 1.3 Vulnerability in Reviewer 2 Proposed Fix
Reviewer 2 proposed making the relaxation prefix optional: `(?:(?:...)\s+)?`.
Direct testing revealed that on:
`"Candidates must have 3 years experience for OBC category posts. Age limit is 21 to 30 years."`
Reviewer 2's pattern extracted `ageRelaxation: [{ category: 'OBC', years: 3 }]`, falsely categorizing 3 years of work experience as 3 years of age relaxation.

---

## 2. Logic Chain

1. **Failure of `[^,.;]*?` Boundary**: The regex engine performs greedy or lazy non-greedy expansions up to the next required token (`\bOBC\b`). When two clauses are conjoined with `"and"`, punctuation characters `,`, `.`, `;` are absent. The engine successfully bridges the entire coordinate clause and duration marker, resulting in cross-clause misattribution (Observation 1.1).
2. **Inversion of Heuristic Specificity**: In lines 103 and 108, the generic range pattern `/(\d+)\s*(?:to|-)\s*\d+\s*years/i` lacks any semantic anchor indicating age (such as `"age"`, `"age limit"`, `"years of age"`). Because it is positioned before line 104 (`Age(?:\s+Limit)?`), any earlier occurrence of experience ranges matches first. When candidate age is absent, it matches child numbers (3, 5) that violate legal employment boundaries (Observation 1.2).
3. **Punctuation Blindness in Explicit Labels**: Line 102 (`minimum\s+age(?:\s+of)?`) and line 107 (`maximum\s+age(?:\s+of)?`) omitted optional colons `:?`, which are ubiquitous in recruitment circulars (Observation 1.2).
4. **Resolution via Defense-in-Depth**:
   - For Age Relaxation: Require a macro relaxation context (`/(?:relax|concession|upper\s+age\s+limit)/i`) and an unambiguous clause boundary delimiter (`(?:(?!\b(?:and|while|whereas|SC|ST|OBC|experience|\d+\s*years?)\b)[^,.;\n])*?`) preventing traversal across conjunctions, competing categories, and duration quantifiers.
   - For Candidate Age: Enforce strict precedence of explicit `Age Limit:` and `(Age Limit):` patterns, add optional colons to explicit labels, guard range fallbacks with word-bounded anti-experience negative lookaheads (`\b(\d+)\s*(?:to|-)\s*(\d+)\s*\byears?\b(?!\s*(?:of\s+)?(?:[a-z-]+\s+)?(?:experience|exp|service|work|projects|tenure|bond))`), and validate semantic employment bounds ($16 \le \text{age} \le 65$).

---

## 3. Caveats

- **Scope Boundary**: This report focuses exclusively on Cross-Clause Matching in Age Relaxation and Experience vs Candidate Age Disambiguation (`mock-gemini.js:101-127`). Other defects identified in `GATE_STATUS.md` (date phrasing, vacancy commas/parentheses, and `Number.isFinite` in `gemini-parser.js`) are handled by peer agents.
- **Read-Only Constraint**: In strict adherence to system instructions, no source files were modified. Complete, machine-applicable replacement snippets are provided below.

---

## 4. Conclusion & Actionable Replacement

### Exact Drop-in Replacement for `src/services/ai/mock-gemini.js` (Lines 101–127)

```javascript
  // 3. Min / Max Age & Experience Disambiguation
  let minAge = null;
  let maxAge = null;

  // 3.1 Explicit Age Range with 'Age' marker (highest precedence)
  const ageRangeMatch = text.match(/\bAge(?:\s+Limit)?\s*\)?\s*:?\s*(\d{2})\s*(?:to|-)\s*(\d{2})\s*\byears?\b/i) ||
                        text.match(/(?:candidate\s+must\s+be\s+)?between\s+(\d{2})\s*(?:to|and|-)\s*(\d{2})\s*\byears?\b(?:\s+of\s+age)?/i) ||
                        text.match(/\b(\d{2})\s*(?:to|-)\s*(\d{2})\s*\byears\s+of\s+age\b/i);

  if (ageRangeMatch) {
    minAge = parseInt(ageRangeMatch[1], 10);
    maxAge = parseInt(ageRangeMatch[2], 10);
  }

  // 3.2 Explicit Minimum Age Label (with optional colon and alternate phrasing)
  if (minAge === null) {
    const minMatch = text.match(/(?:minimum\s+age|min\.?\s*age|not\s+less\s+than)(?:\s+of)?\s*:?\s*(\d+)/i) ||
                     text.match(/attained\s+(?:the\s+)?(?:minimum\s+)?age\s+of\s+(\d+)/i) ||
                     text.match(/lower\s+age\s+limit(?:\s+is)?\s*:?\s*(\d+)/i);
    if (minMatch) {
      minAge = parseInt(minMatch[1], 10);
    }
  }

  // 3.3 Explicit Maximum Age Label (with optional colon and alternate phrasing)
  if (maxAge === null) {
    const maxMatch = text.match(/(?:maximum\s+age|max\.?\s*age|upper\s+age\s+limit|not\s+exceed(?:ing)?)(?:\s+of|\s+is)?\s*:?\s*(\d+)/i) ||
                     text.match(/(?:exceeded|attained)\s+(?:the\s+)?(?:maximum\s+)?age\s+of\s+(\d+)/i);
    if (maxMatch) {
      maxAge = parseInt(maxMatch[1], 10);
    }
  }

  // 3.4 Word-Bounded Guarded Fallback for Range WITHOUT explicit 'Age' word
  // Strictly blocked if followed by experience, exp, service, projects, tenure, or bond
  if (minAge === null || maxAge === null) {
    const guardedRange = text.match(/\b(\d+)\s*(?:to|-)\s*(\d+)\s*\byears?\b(?!\s*(?:of\s+)?(?:[a-z-]+\s+)?(?:experience|exp|service|practice|work|projects?|tenure|bond|contract))/i);
    if (guardedRange) {
      const gMin = parseInt(guardedRange[1], 10);
      const gMax = parseInt(guardedRange[2], 10);
      if (gMin >= 16 && gMax <= 65 && gMin <= gMax) {
        if (minAge === null) minAge = gMin;
        if (maxAge === null) maxAge = gMax;
      }
    }
  }

  // 3.5 Semantic Range Boundaries Validation
  if (minAge !== null && (minAge < 16 || minAge > 65)) minAge = null;
  if (maxAge !== null && (maxAge < 16 || maxAge > 65)) maxAge = null;

  // 4. Age Relaxation (Cross-Clause & Category Disambiguation)
  const ageRelaxation = [];
  const hasRelaxationContext = /(?:relax|concession|upper\s+age\s+limit)/i.test(text);

  if (hasRelaxationContext) {
    // Unambiguous Clause Boundary Delimiters:
    // Does not cross: conjunctions ('and', 'while', 'whereas'), other categories, experience, or another '\d+ years'
    const notCrossForSC = '(?:(?!\\b(?:and|while|whereas|OBC|Other Backward Classes|PwBD|PWD|General|UR|experience|exp|service|work|\\d+\\s*years?)\\b)[^,.;\\n])*?';
    const notCrossForOBC = '(?:(?!\\b(?:and|while|whereas|SC|ST|Scheduled Caste|Scheduled Tribe|PwBD|PWD|General|UR|experience|exp|service|work|\\d+\\s*years?)\\b)[^,.;\\n])*?';

    // SC/ST matching
    const relSCPattern1 = new RegExp('(?:(?:up to\\s+a\\s+maximum\\s+of|relaxation of|maximum of|by)\\s+)?(\\d+)\\s+years?' + notCrossForSC + '(?:Scheduled Caste|Scheduled Tribe|\\bSC\\b|\\bST\\b)', 'i');
    const relSCPattern2 = new RegExp('(?:Scheduled Caste|Scheduled Tribe|\\bSC\\b|\\bST\\b)' + notCrossForSC + '(?:up to|by|maximum of|:|-)?\\s*(\\d+)\\s*years?', 'i');

    const relSC = text.match(relSCPattern1) || text.match(relSCPattern2);
    if (relSC) {
      const years = parseInt(relSC[1] || relSC[2], 10);
      if (years > 0) {
        ageRelaxation.push({ category: 'SC/ST', years });
      }
    }

    // OBC matching
    const relOBCPattern1 = new RegExp('(?:(?:up to\\s+a\\s+maximum\\s+of|relaxation of|maximum of|by)\\s+)?(\\d+)\\s+years?' + notCrossForOBC + '(?:Other Backward Classes|\\bOBC\\b)', 'i');
    const relOBCPattern2 = new RegExp('(?:Other Backward Classes|\\bOBC\\b)' + notCrossForOBC + '(?:up to|by|maximum of|:|-)?\\s*(\\d+)\\s*years?', 'i');

    const relOBC = text.match(relOBCPattern1) || text.match(relOBCPattern2);
    if (relOBC) {
      const years = parseInt(relOBC[1] || relOBC[2], 10);
      if (years > 0) {
        ageRelaxation.push({ category: 'OBC', years });
      }
    }
  }
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Verify Age Relaxation Disambiguation**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('A candidate must be between 18 to 25 years. Relaxation of 5 years for SC/ST and 3 years for OBC.'); console.log(res.eligibility.ageRelaxation);"
   ```
   *Expected Output*: `[ { category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 } ]`

2. **Verify Experience vs Age Disambiguation**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('Candidates must have 5 to 8 years experience in administration. Age Limit: 21 to 30 years.'); console.log('minAge:', res.eligibility.minAge, 'maxAge:', res.eligibility.maxAge);"
   ```
   *Expected Output*: `minAge: 21 maxAge: 30`

3. **Verify Null Age on Experience-Only Text**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('Applicants should possess 3 to 5 years experience in financial auditing.'); console.log('minAge:', res.eligibility.minAge, 'maxAge:', res.eligibility.maxAge);"
   ```
   *Expected Output*: `minAge: null maxAge: null`

4. **Verify Colon Support in Minimum Age**:
   ```bash
   node -e "const { extractMockCriteria } = require('./src/services/ai/mock-gemini'); const res = extractMockCriteria('Minimum age: 21 years. Maximum age: 32 years.'); console.log('minAge:', res.eligibility.minAge, 'maxAge:', res.eligibility.maxAge);"
   ```
   *Expected Output*: `minAge: 21 maxAge: 32`

5. **Run Adversarial Harness**:
   ```bash
   node .agents/m2_challenger_1/adversarial_harness.js
   ```
   *Verification Target*: Suites 1.2, 1.3, 6.2, 7.1, 7.3, and 9.3 all pass.

6. **Run Regression Suite**:
   ```bash
   npm test
   ```
   *Expected Target*: All 87 tests pass synchronously.

### 5.2 Invalidation Conditions
- If OBC relaxation is reported as 5 years when given `"Relaxation of 5 years for SC/ST and 3 years for OBC"`.
- If `minAge` or `maxAge` is corrupted to child numbers (e.g. 5 or 8) when given experience text.
- If execution time on $100\text{k}$ characters exceeds $10\text{ ms}$.
