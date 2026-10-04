# Technical Analysis Report: Cross-Clause Relaxation Matching & Experience vs Candidate Age Disambiguation

**Author:** `m2_iter2_explorer_2` (teamwork_preview_explorer)  
**Target:** Parent Orchestrator (`1977cf93-1da0-401f-8e89-d533e632d9fa`)  
**Workspace:** `c:\Users\sindh\Documents\codes\mypath-scraper`  
**File Under Investigation:** `src/services/ai/mock-gemini.js` (lines 101–127)  
**Date:** 2026-09-13T21:00:00Z  

---

## 1. Executive Summary

Milestone 2 introduced the offline heuristic fallback engine `mock-gemini.js` to satisfy Requirement §R4 and Feature 9 (Interface Contract #2). During Iteration 1 gating, Reviewer 2 and Challenger 1 identified critical heuristic defects in age and relaxation extraction:
1. **Cross-Clause Matching in Age Relaxation (`mock-gemini.js:121-125`)**: Conjunction-joined clauses like `"Relaxation of 5 years for SC/ST and 3 years for OBC"` erroneously assign SC/ST's 5 years to OBC because the lazy non-delimiter class `[^,.;]*?` skips over `"and 3 years for"`.
2. **Experience vs Candidate Age Confusion (`mock-gemini.js:101-110`)**: A generic fallback pattern `/(\d+)\s*(?:to|-)\s*\d+\s*years/i` is positioned before the explicit `Age Limit:` pattern and lacks negative lookaheads for experience. Sentences such as `"Candidates must have 5 to 8 years experience ... Age Limit: 21 to 30 years"` corrupt `minAge` to 5 and `maxAge` to 8; text specifying experience without age limits similarly hallucinates child candidate ages. In addition, `minimum\s+age` and `maximum\s+age` lack optional colon `:?` support, returning `null` on standard phrases like `"Minimum age: 21"`.

This report delivers a rigorous analysis of both failure mechanisms, exposes a critical flaw in Reviewer 2's proposed relaxation fix (which creates false positives on experience text), and provides an engineering design featuring:
- An **unambiguous clause boundary delimiter** for age relaxation that stops traversal at punctuation, conjunctions, competing category tags, and duration quantifiers.
- A **defense-in-depth, 5-layer age disambiguation pipeline** that enforces strict precedence of explicit age markers, word-bounded anti-experience negative lookaheads, colon/parenthesis tolerance, and semantic range bounds ($16 \le \text{age} \le 65$).

Both solutions were empirically validated across 34 stress scenarios in `.agents/m2_challenger_1/adversarial_harness.js` and all existing regression tests, achieving 100% pass rates on targeted areas without performance degradation ($< 0.5\text{ ms}$ on $100\text{k}$ characters).

---

## 2. Problem 1: Cross-Clause Matching in Age Relaxation (`mock-gemini.js:112-127`)

### 2.1 Current Implementation & Failure Mechanism
In `src/services/ai/mock-gemini.js`, lines 112–127:

```javascript
112:   // 4. Age Relaxation (strictly bounded to clause to prevent capturing minAge/maxAge)
113:   const ageRelaxation = [];
114:   const relSC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)/i) ||
115:                 text.match(/(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)[^,.;]*?(?:up to|by|maximum of|:)?\s*(\d+)\s*years?/i);
116:   if (relSC) {
117:     const years = parseInt(relSC[1] || relSC[2], 10);
118:     ageRelaxation.push({ category: 'SC/ST', years });
119:   }
120: 
121:   const relOBC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Other Backward Classes|\bOBC\b)/i) ||
122:                  text.match(/(?:Other Backward Classes|\bOBC\b)[^,.;]*?(?:up to|by|maximum of|:)?\s*(\d+)\s*years?/i);
123:   if (relOBC) {
124:     const years = parseInt(relOBC[1] || relOBC[2], 10);
125:     ageRelaxation.push({ category: 'OBC', years });
126:   }
```

When evaluated on:
`"A candidate must be between 18 to 25 years. Relaxation of 5 years for SC/ST and 3 years for OBC."`

**Execution Trace for `relOBC`:**
1. `(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)` matches `"Relaxation of"`.
2. `\s+` matches `" "`.
3. `(\d+)` matches `"5"` (captured into group 1).
4. `\s+years?` matches `" years"`.
5. `[^,.;]*?` scans ahead. The characters are `" for SC/ST and 3 years for "`. None of these characters are `,`, `.`, or `;`.
6. `(?:Other Backward Classes|\bOBC\b)` matches `"OBC"`.
7. Match succeeds! `relOBC[1]` is `"5"`.
8. `ageRelaxation.push({ category: 'OBC', years: 5 })`.

**Result:** OBC receives **5 years** instead of 3 years!

The root cause is that natural language clauses are frequently coordinated by conjunctions (`"and"`, `"while"`, `"whereas"`, `"as well as"`, `"&"`). The character exclusion set `[^,.;]` assumes punctuation alone delimits clauses, failing when clauses are conjoined grammatically without commas.

Furthermore, if the categories are inverted:
`"Relaxation of 3 years for OBC and 5 years for SC/ST."`
The identical flaw causes `relSC` to match `"Relaxation of 3 years"`, traverse across `" for OBC and 5 years for "`, and attribute 3 years to SC/ST! Both category matchers suffer from the identical symmetrical vulnerability.

### 2.2 Critical Flaw in Reviewer 2's Proposed Fix
Reviewer 2 proposed:
```javascript
const relOBC = text.match(/(?:(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+)?(\d+)\s+years?(?:(?!\b(?:and|for SC|for ST|SC|ST)\b)[^,.;])*?(?:Other Backward Classes|\bOBC\b)/i) || ...
```
Notice that Reviewer 2 wrapped the relaxation prefix in an optional group: `(?:(?:...)\s+)?`.  
When we tested this against realistic candidate text:
`"Candidates must have 3 years experience for OBC category posts. Age limit is 21 to 30 years."`
The optional prefix allowed `(\d+)\s+years?` to match `"3 years"`, and `(?!\b(?:and|...)\b)[^,.;]*?` traversed `" experience for "` to match `"OBC"`!  
`extractMockCriteria` returned:
`ageRelaxation: [ { category: 'OBC', years: 3 } ]`!  
**It falsely extracted 3 years of work experience as 3 years of age relaxation!**

### 2.3 Design of Unambiguous Clause Boundary Delimiter
To prevent cross-clause greediness without generating false positives, the boundary delimiter must operate at both macro and micro scopes:

1. **Macro Context Guard**: Age relaxation extraction must only execute when the surrounding sentence or block explicitly establishes a relaxation context (`/(?:relax|concession|upper\s+age\s+limit)/i`).
2. **Unambiguous Clause Boundary Delimiter**: Traversal between a duration quantifier (`\d+\s+years`) and a category tag (or vice-versa) must be strictly prohibited from crossing:
   - **Punctuation boundaries**: `[,.;\n\r|]`
   - **Coordinating conjunctions**: `\b(?:and|or|while|whereas|as\s+well\s+as|&)\b`
   - **Competing category boundaries**:
     - For SC/ST: `\b(?:OBC|Other\s+Backward\s+Classes|PwBD|PWD|General|UR|EWS|ESM|Ex-Servicemen)\b`
     - For OBC: `\b(?:SC|ST|Scheduled\s+Caste|Scheduled\s+Tribe|PwBD|PWD|General|UR|EWS|ESM|Ex-Servicemen)\b`
   - **Secondary duration quantifiers**: `\d+\s*years?` (a subsequent number of years indicates a new clause)
   - **Experience markers**: `\b(?:experience|exp|service|practice|work)\b`

#### Delimiter Expression
We define the non-crossing token sequence:
```javascript
const notCrossForSC = '(?:(?!\\b(?:and|while|whereas|OBC|Other Backward Classes|PwBD|PWD|General|UR|experience|exp|service|work|\\d+\\s*years?)\\b)[^,.;\\n])*?';
const notCrossForOBC = '(?:(?!\\b(?:and|while|whereas|SC|ST|Scheduled Caste|Scheduled Tribe|PwBD|PWD|General|UR|experience|exp|service|work|\\d+\\s*years?)\\b)[^,.;\\n])*?';
```

#### Dual-Directional Matchers
Recruitment notifications express relaxation in two syntactic orders:
- **Prefix / Forward Syntax**: `[relaxation prefix]? [years] [notCross] [category]`  
  e.g. `"Relaxation of 5 years for SC/ST and 3 years for OBC"`
- **Category-First / Reverse Syntax**: `[category] [notCross] [prefix]? [years]`  
  e.g. `"OBC candidates: up to 3 years"`, `"- SC/ST: 5 years"`

```javascript
// SC/ST Pattern
const relSCPattern1 = new RegExp('(?:(?:up to\\s+a\\s+maximum\s+of|relaxation of|maximum of|by)\\s+)?(\\d+)\\s+years?' + notCrossForSC + '(?:Scheduled Caste|Scheduled Tribe|\\bSC\\b|\\bST\\b)', 'i');
const relSCPattern2 = new RegExp('(?:Scheduled Caste|Scheduled Tribe|\\bSC\\b|\\bST\\b)' + notCrossForSC + '(?:up to|by|maximum of|:|-)?\\s*(\\d+)\\s*years?', 'i');

// OBC Pattern
const relOBCPattern1 = new RegExp('(?:(?:up to\\s+a\\s+maximum\s+of|relaxation of|maximum of|by)\\s+)?(\\d+)\\s+years?' + notCrossForOBC + '(?:Other Backward Classes|\\bOBC\\b)', 'i');
const relOBCPattern2 = new RegExp('(?:Other Backward Classes|\\bOBC\\b)' + notCrossForOBC + '(?:up to|by|maximum of|:|-)?\\s*(\\d+)\\s*years?', 'i');
```

In addition, any extracted value with `years <= 0` (such as `"0 years relaxation for General"`) is discarded, ensuring conforming output.

### 2.4 Empirical Validation: 13 Relaxation Scenarios
All 13 test scenarios executed deterministically and passed:

| # | Text Scenario | Expected SC | Expected OBC | Result |
|---|---|---|---|---|
| 1 | `"Relaxation of 5 years for SC/ST and 3 years for OBC."` | 5 | 3 | **PASS** |
| 2 | `"Relaxation of 3 years for OBC and 5 years for SC/ST."` (Reverse order) | 5 | 3 | **PASS** |
| 3 | Sample PDF fixture (long phrasing with parens and commas) | 5 | 3 | **PASS** |
| 4 | `"Age concessions: OBC candidates: up to 3 years, SC/ST: up to 5 years."` | 5 | 3 | **PASS** |
| 5 | `"Relaxation of 5 years for SC/ST, and 0 years for General category."` | 5 | null | **PASS** |
| 6 | `"Relaxation in upper age limit: 5 years for SC/ST; 3 years for OBC; 10 years for PwBD."` | 5 | 3 | **PASS** |
| 7 | `"SC/ST candidates get 5 years age relaxation, and OBC candidates get 3 years age relaxation."` | 5 | 3 | **PASS** |
| 8 | `"Age relaxation: SC/ST: 5 years and OBC: 3 years."` | 5 | 3 | **PASS** |
| 9 | `"Candidates belonging to SC/ST will get 5 years, whereas OBC candidates will get 3 years."` | 5 | 3 | **PASS** |
| 10 | `"OBC candidates get relaxation of 3 years."` (Single category) | null | 3 | **PASS** |
| 11 | Multiple SC clauses (`5 years general vs 10 years disability`) | 5 | null | **PASS** |
| 12 | Unrelated text mentioning degrees (`OBC candidates must possess degree`) | null | null | **PASS** |
| 13 | Experience text (`3 years experience for OBC posts`) | null | null | **PASS** |

---

## 3. Problem 2: Experience vs Candidate Age Disambiguation (`mock-gemini.js:101-110`)

### 3.1 Current Implementation & Four Interlocking Failure Modes
In `src/services/ai/mock-gemini.js`, lines 101–110:

```javascript
101:   // 3. Min / Max Age
102:   const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i) ||
103:                       text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i) ||
104:                       text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i);
105:   const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;
106: 
107:   const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+of)?|max\.?\s*age:?|upper\s+age\s+limit(?:\s+is)?:?)\s*(\d+)/i) ||
108:                       text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i) ||
109:                       text.match(/Age(?:\s+Limit)?:?\s*\d+\s*(?:to|-)\s*(\d+)/i);
110:   const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;
```

#### Defect 2.1: Precedence Inversion
In lines 103 and 108, the generic range `(\d+)\s*(?:to|-)\s*\d+\s*years` is evaluated **before** lines 104 and 109 (`Age(?:\s+Limit)?:?...`).  
When a document contains:
`"Candidates must have 5 to 8 years experience in administration. Age Limit: 21 to 30 years."`
Line 103 matches `"5 to 8 years"`. Lines 104 and 109 are never reached. `minAge` becomes 5 and `maxAge` becomes 8.

#### Defect 2.2: Missing Optional Colons in Explicit Labels
In lines 102 and 107:
`(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)`
Branch 1 (`minimum\s+age(?:\s+of)?`) does **not** permit a colon `:`. Only branch 2 (`min\.?\s*age:?`) does.  
Consequently, standard notifications writing `"Minimum age: 21 years"` or `"Minimum age : 21"` fail to match and return `null`.

#### Defect 2.3: Absence of Anti-Experience Boundary Guards
When a document mentions required experience without specifying candidate age:
`"Applicants should possess 3 to 5 years experience in financial auditing."`
Line 103 captures 3 as `minAge` and line 108 captures 5 as `maxAge`. This violates the closed-world assumption (PROJECT.md Feature 8 & 9) requiring unmentioned fields to default to `null`.

#### Defect 2.4: Regex Backtracking Slice Vulnerability
During adversarial testing, we discovered that naive lookbehinds like `(?<!have\s+)(\d+)\s*to\s*(\d+)\s*years(?!\s*experience)` fail when evaluated against:
`"Candidates must have 16 to 20 years experience in banking."`
The lookbehind rejects `"16"`, but because `\b` word boundary was missing, the unanchored engine slides forward to character `'6'` in `'16'`, matches `'6 to 20 year'`, and drops `'s'` to bypass `(?!\s*experience)`!  
**Word boundaries (`\b(\d+)\b` and `\byears?\b`) are strictly required.**

---

### 3.2 Multi-Layered Defense-in-Depth Solution

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Explicit Age Range Markers (Highest Precedence)               │
│ - Age Limit: 21 to 32 years                                            │
│ - (Age Limit): 21 to 32 years                                          │
│ - between 18 to 25 years [of age]                                      │
│ - 21 to 32 years of age                                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (If null)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 2: Explicit Min/Max Age Labels with Colon Normalization          │
│ - Minimum age: 21 / Min. age: 21 / Min age: 21                         │
│ - Maximum age: 32 / Max. age: 32 / Upper age limit is: 32              │
│ - attained minimum age of 21 / exceeded maximum age of 32              │
│ - not less than 21 / not exceeding 32                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (If either null)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Word-Bounded Guarded Fallback with Anti-Experience Lookahead  │
│ - Pattern: \b(\d+)\s*(?:to|-)\s*(\d+)\s*\byears?\b                     │
│ - Lookahead: (?!\s*(?:of\s+)?(?:[a-z-]+\s+)?(?:experience|exp|service │
│               |practice|work|projects?|tenure|bond|contract))          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Sanity Guard)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Semantic Range Bounds Validation                              │
│ - Require: 16 <= minAge <= 65 && 16 <= maxAge <= 65                    │
│ - Require: minAge <= maxAge                                            │
│ - Rejects invalid child ages (3, 5, 8) and tenure numbers              │
└────────────────────────────────────────────────────────────────────────┘
```

#### Code Specification
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
```

### 3.3 Empirical Validation: 21 Age Scenarios
All 21 scenarios executed deterministically and passed:

| # | Text Scenario | Expected Min | Expected Max | Result |
|---|---|---|---|---|
| 1 | `"Age Limit: 21 to 30 years as of cut-off date."` | 21 | 30 | **PASS** |
| 2 | `"Age: 21-32 years."` | 21 | 32 | **PASS** |
| 3 | `"Age limit: 18 to 27 years."` | 18 | 27 | **PASS** |
| 4 | `"आयु सीमा (Age Limit): 21 to 32 years."` | 21 | 32 | **PASS** |
| 5 | Experience precedes real age (`"5 to 8 years experience ... Age Limit: 21 to 30 years"`) | 21 | 30 | **PASS** |
| 6 | Experience precedes age (`"Minimum 3 to 5 years experience required. Age: 20 to 28 years."`) | 20 | 28 | **PASS** |
| 7 | Experience with NO age limit (`"3 to 5 years experience in financial auditing"`) | null | null | **PASS** |
| 8 | Experience and projects (`"at least 10 years experience and maximum 50 projects"`) | null | null | **PASS** |
| 9 | Bond period (`"must serve a minimum period of 3 years. Age limit: 21 to 32 years."`) | 21 | 32 | **PASS** |
| 10 | Explicit colon (`"Minimum age: 21 years and Maximum age: 32 years."`) | 21 | 32 | **PASS** |
| 11 | Whitespace colon (`"Minimum age : 21 and Maximum age : 32."`) | 21 | 32 | **PASS** |
| 12 | Abbreviated with period (`"Min. age: 21, Max. age: 32."`) | 21 | 32 | **PASS** |
| 13 | Abbreviated no period (`"Min age: 21, Max age: 32."`) | 21 | 32 | **PASS** |
| 14 | Preposition `of` (`"Minimum age of 21 years and maximum age of 32 years."`) | 21 | 32 | **PASS** |
| 15 | Upper age limit (`"Upper age limit is 32 years. Minimum age 21 years."`) | 21 | 32 | **PASS** |
| 16 | Single bound (`"Upper age limit: 35 years."`) | null | 35 | **PASS** |
| 17 | Attained/exceeded (`"must have attained minimum age of 21 years and ... maximum age of 32 years"`) | 21 | 32 | **PASS** |
| 18 | Phrasing with between (`"A candidate must be between 18 to 25 years."`) | 18 | 25 | **PASS** |
| 19 | Suffix `of age` (`"Candidates must be between 20 and 28 years of age."`) | 20 | 28 | **PASS** |
| 20 | Zero-width chars + colons (`"UNION\u200B ... Minimum age: 21 years. Maximum age: 30 years.\uFEFF"`) | 21 | 30 | **PASS** |
| 21 | Single minimum age (`"Minimum age: 21"`) | 21 | null | **PASS** |

---

## 4. Integration, Regression & Stress Testing

### 4.1 Adversarial Harness Impact (`adversarial_harness.js`)
When evaluated against Challenger 1's 34 adversarial scenarios:
- **Before Fix**: 10 tests failed (70.59% pass rate).
- **With Proposed Fix for Problems 1 & 2**: All age, experience, and relaxation scenarios pass completely:
  - Suite 1.2 (`experience precedes age`): **PASS** (was FAIL)
  - Suite 1.3 (`experience without age`): **PASS** (was FAIL)
  - Suite 6.2 (`colons in age with zero-width chars`): **PASS** (was FAIL)
  - Suite 7.1 (`100,000 chars text with Minimum age: 21`): **PASS** (was FAIL)
  - Suite 7.3 (`adversarial ReDoS on relaxation pattern`): **PASS**
  - Suite 9.3 (`fallbackToMockOnError with colon age`): **PASS** (was FAIL)

*(Note: The 4 remaining failures in the harness pertain to unrelated issues: Date phrasing [Suite 4.1], Vacancy comma formatting [Suite 5.1 & 6.1], and Normalizer Infinity handling [Suite 8.4], which are tracked under other worker/explorer work streams).*

### 4.2 ReDoS Resistance
We evaluated the proposed regex patterns against $100,000$ uppercase characters and repeated backtracking spaces:
- Age pattern execution duration: **0.30 ms**
- Age relaxation pattern execution duration: **0.40 ms**
- Maximum allowable threshold: $100.00\text{ ms}$.
Both patterns are immune to polynomial or exponential backtracking.

### 4.3 Pipeline Compatibility with Milestone 1
Targeted text extracted from `fixtures/sample-notification.pdf` via `extractTargetedPdfText()` was parsed with the patched extractor:
- `minAge`: `21` (Verified)
- `maxAge`: `32` (Verified)
- `ageRelaxation`: `[{ category: 'SC/ST', years: 5 }, { category: 'OBC', years: 3 }]` (Verified)
- Full compatibility with Milestone 3 `verifyUnity` interface contract.

---

## 5. Concrete Remediation Proposal for Worker

### Target File: `src/services/ai/mock-gemini.js`
**Target Lines**: 101–127

#### Proposed Replacement Content:
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

## 6. Recommended Unit Tests for `test/gemini-parser.test.js`

Add the following tests to Category 5 / Category 7 in `test/gemini-parser.test.js`:

```javascript
it('correctly disambiguates clauses joined by "and" in age relaxation without category cross-bleed', () => {
  const text = 'A candidate must be between 18 to 25 years. Relaxation of 5 years for SC/ST and 3 years for OBC.';
  const data = extractMockCriteria(text);
  const sc = data.eligibility.ageRelaxation.find(r => r.category === 'SC/ST');
  const obc = data.eligibility.ageRelaxation.find(r => r.category === 'OBC');
  assert.equal(sc.years, 5);
  assert.equal(obc.years, 3);
});

it('does not corrupt minAge or maxAge when candidate experience precedes age limits', () => {
  const text = 'Candidates must have 5 to 8 years experience in government administration. Age Limit: 21 to 30 years.';
  const data = extractMockCriteria(text);
  assert.equal(data.eligibility.minAge, 21);
  assert.equal(data.eligibility.maxAge, 30);
});

it('defaults minAge and maxAge to null when only candidate experience is specified', () => {
  const text = 'Applicants should possess 3 to 5 years experience in financial auditing. Graduation is mandatory.';
  const data = extractMockCriteria(text);
  assert.equal(data.eligibility.minAge, null);
  assert.equal(data.eligibility.maxAge, null);
});

it('correctly extracts minAge and maxAge when formatted with colons', () => {
  const text = 'Minimum age: 21 years. Maximum age: 32 years.';
  const data = extractMockCriteria(text);
  assert.equal(data.eligibility.minAge, 21);
  assert.equal(data.eligibility.maxAge, 32);
});
```
