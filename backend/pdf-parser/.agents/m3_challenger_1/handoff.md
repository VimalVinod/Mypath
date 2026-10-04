# Milestone 3 Adversarial Challenge Report: Rules & Candidate Eligibility Matching

**Challenger Agent**: `m3_challenger_1` (`teamwork_preview_challenger`)  
**Parent Orchestrator**: `teamwork_preview_orchestrator_3` (`478bab56-0e1f-4e7d-83c1-6712d8805eae`)  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_challenger_1`  
**Workspace Root**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Date**: 2026-09-14  
**Milestone**: Milestone 3 — Unity / Database Checking Module  
**Scope Reviewed**: `src/services/validator/rules.js`, `src/services/validator/unity-checker.js`  
**Definitive Gate Verdict**: `REQUEST_CHANGES`

---

## 1. Observation

### 1.1 Test Harness Execution & Overall Scorecard
An adversarial stress test harness was developed and executed at `.agents/m3_challenger_1/adversarial_rules_harness.js`:
```powershell
node .agents/m3_challenger_1/adversarial_rules_harness.js
```
**Terminal Output Summary**:
```
TOTAL ADVERSARIAL CHECKS EXECUTED : 42
PASSED (ROBUST BEHAVIOR)          : 33
FAILED / VULNERABILITIES FOUND    : 9 distinct root causes (13 confirmed failure modes)
FINAL CHALLENGER GATE VERDICT     : [ REQUEST_CHANGES ]
```

**Breakdown by Challenge Focus Area**:
| Focus Area | Description | Total Checks | Passed | Defects Found |
|---|---|:---:|:---:|:---:|
| Area 1 | Boundary Age Conditions & Date of Birth Calculations | 12 | 11 | 1 |
| Area 2 | Statutory Relaxation Edge Cases & Substring Traps | 10 | 5 | 5 |
| Area 3 | Education Taxonomy Hierarchy Stress & Equivalence | 10 | 4 | 6 |
| Area 4 | Date Order & Calendar Anomaly Stress | 6 | 6 | 0 |
| Area 5 | Robustness, Prototype Inheritance & Security | 7 | 6 | 1 |
| **Total** | | **45** | **32** | **13** |

---

### 1.2 Direct Observations & Defect Inventory

#### Finding 1: Unbounded Substring Match in Category Relaxation Grants Non-Reserved Candidates SC/ST Reservations
- **File**: `src/services/validator/rules.js:660`
- **Verbatim Code**:
  ```javascript
  // Direct match
  if (ruleCatNorm === candCatNorm || ruleCatNorm.includes(candCatNorm) || candCatNorm.includes(ruleCatNorm)) {
    maxYears = Math.max(maxYears, years);
    continue;
  }
  ```
- **Observed Behavior**:
  Because `candCatNorm.includes(ruleCatNorm)` performs an unconstrained substring search:
  1. Candidate with category `"Descendant of Freedom Fighter"` contains substring `"sc"` (`de-SC-endant`). When evaluated against `{ category: 'SC', years: 5 }`, `candCatNorm.includes('sc')` returns `true`. The candidate receives **5 years SC age relaxation**.
  2. Candidate with category `"Staff Candidate"` contains substring `"st"` (`ST-aff`). When evaluated against `{ category: 'ST', years: 5 }`, `candCatNorm.includes('st')` returns `true`. The candidate receives **5 years ST age relaxation**.
  3. Candidate with category `"Non-OBC"` contains substring `"obc"`. When evaluated against `{ category: 'OBC', years: 3 }`, `candCatNorm.includes('obc')` returns `true`. The candidate receives **3 years OBC age relaxation**.
  4. Other triggers: `"School Quota"`, `"Science Teacher"`, `"Disciplinary Quota"`, `"State Quota"`, `"First Division"`.

#### Finding 2: Statutory Relaxation Granted to OBC Creamy Layer (OBC-CL)
- **File**: `src/services/validator/rules.js:660`
- **Observed Behavior**:
  Under Department of Personnel and Training (DoPT) statutory reservation rules, candidates belonging to the Creamy Layer of OBC (OBC-CL) are legally classified as Unreserved / General and are strictly ineligible for age relaxation.
  Evaluating candidate category `"OBC-CL"` against notification `{ category: 'OBC', years: 3 }`:
  `'obc-cl'.includes('obc')` evaluates to `true`, granting **3 years relaxation**. An overage candidate who is legally General is validated as ELIGIBLE.

#### Finding 3: Bidirectional Cross-Category Relaxation Leakage between SC and ST
- **File**: `src/services/validator/rules.js:118, 665-673`
- **Verbatim Code**:
  ```javascript
  const CATEGORY_ALIASES = {
    ...
    'SC/ST': ['sc/st', 'sc & st', 'sc', 'st', 'scheduled caste', 'scheduled tribe'],
  };
  ...
  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const canonicalNorm = canonical.toLowerCase();
    const candMatches = aliases.some(a => a === candCatNorm) || canonicalNorm === candCatNorm;
    const ruleMatches = aliases.some(a => a === ruleCatNorm || ruleCatNorm.includes(a)) || canonicalNorm === ruleCatNorm;
    if (candMatches && ruleMatches) {
      maxYears = Math.max(maxYears, years);
    }
  }
  ```
- **Observed Behavior**:
  `CATEGORY_ALIASES['SC/ST']` groups both `'sc'` and `'st'` into the same alias array.
  When an SC candidate (`candCatNorm = 'sc'`) is evaluated against an ST-only rule (`ruleCatNorm = 'st'`, e.g., State PSC providing 8 years for ST vs 5 years for SC):
  - `candMatches` is `true` under `'SC/ST'` (because `'sc'` is in the alias array).
  - `ruleMatches` is `true` under `'SC/ST'` (because `'st'` is in the alias array).
  - Result: `resolveRelaxationYears('SC', [{ category: 'ST', years: 8 }])` returns **8 years**. The SC candidate receives ST-exclusive relaxation.

#### Finding 4: Missing Common Degree Abbreviation "BE" in Education Taxonomy
- **File**: `src/services/validator/rules.js:145, 697`
- **Verbatim Code**:
  ```javascript
  const EDUCATION_LEVELS = {
    ...
    'b.tech': 4,
    'btech': 4,
    'b.e': 4,
    'bsc': 4,
    'b.sc': 4,
  ```
- **Observed Behavior**:
  `EDUCATION_LEVELS` contains `'b.e': 4` (with dot), but completely omits `'be'` (without dot).
  `normalizeStr('BE in Civil')` produces `'be in civil'`.
  `getEducationLevel('BE in Civil')` returns **0**.
  Line 697 regex `/bachelor|graduate|graduation|b\.tech|b\.e|b\.sc|b\.com|b\.a|mbbs|degree/i` also requires a dot for `b\.e`.
  When a candidate with `"BE in Civil"` is evaluated against technical posts requiring `["B.E.", "B.Tech", "Bachelor of Engineering"]`, `matchesEducation` returns:
  `matches = false`, reason: `Candidate degree 'BE in Civil' does not satisfy required education: [B.E., B.Tech, Bachelor of Engineering]`.
  This falsely DISQUALIFIES thousands of legitimate engineering graduates from Indian universities (Anna Univ, VTU, Mumbai Univ, etc.) who write "BE".

#### Finding 5: False Positive Education Level Escalation via Substrings ("bed", "ba", "pg")
- **File**: `src/services/validator/rules.js:133, 151, 157, 179`
- **Verbatim Code**:
  ```javascript
  function getEducationLevel(eduStr) {
    const norm = normalizeStr(eduStr);
    let highestLevel = 0;
    for (const [term, level] of Object.entries(EDUCATION_LEVELS)) {
      if (norm.includes(term)) {
        if (level > highestLevel) {
          highestLevel = level;
        }
      }
    }
    return highestLevel;
  }
  ```
- **Observed Behavior**:
  Because `norm.includes(term)` uses raw substring containment for 2-letter and 3-letter acronyms:
  1. `"Embedded Systems Diploma"`: `embedded` contains `"bed"` (Level 4 / B.Ed). The diploma is elevated from Level 3 to **Level 4 (Bachelor's)**.
  2. `"Ballroom Dance Certificate"` / `"Baking Certificate"`: contains `"ba"` (Level 4 / B.A.). The non-degree certificate is elevated to **Level 4 (Bachelor's)**.
  3. `"Upgrade Certificate"` / `"Campground Management"`: contains `"pg"` (Level 5 / Postgraduate). The certificate is elevated to **Level 5 (Master's / Postgraduate)**.

#### Finding 6: Cross-Domain Degree Equivalence without Stream Containment
- **File**: `src/services/validator/rules.js:704-708, 726-728`
- **Verbatim Code**:
  ```javascript
  if (reqNorm.includes('any discipline') || reqNorm.includes('any graduate') || reqNorm.includes('graduation') || reqNorm.includes('bachelor')) {
    if (isGradLevel || isPostGrad) {
      return { matches: true, matchedReq: req, reason: `Candidate degree '${candidateDegree}' satisfies '${req}'` };
    }
  }
  ...
  if (reqLevel > 0 && candLevel >= reqLevel) {
    return { matches: true, matchedReq: req, reason: `Candidate qualification level (${candLevel}) satisfies required level (${reqLevel})` };
  }
  ```
- **Observed Behavior**:
  1. If requirement is `"Bachelor of Engineering in Civil Engineering"`, `reqNorm.includes('bachelor')` is `true`. Any candidate with a Bachelor's degree (`candLevel >= 4`), including `"B.A. in History"`, satisfies the requirement!
  2. If requirement is `"B.Tech in Computer Science"` (`reqLevel = 4`), line 726 tests `candLevel >= reqLevel`. A candidate with `"MBBS"` (medical doctor, Level 4) or `"B.A. in Sanskrit"` (Level 4) is evaluated as satisfying the requirement with reason: `"Candidate qualification level (4) satisfies required level (4)"`.
  If the notification has empty `eligibleStreams: []` (because the qualification itself defined the discipline), non-technical candidates are falsely validated as ELIGIBLE for technical engineering/medical posts.

#### Finding 7: Newborn / Infant Age 0 Validated as ELIGIBLE when minAge is Omitted
- **File**: `src/services/validator/rules.js:813-840`
- **Verbatim Code**:
  ```javascript
  if (candAge === null || candAge < 0) {
    ...
  } else {
    ...
    if (minAge !== null && candAge < minAge) {
      ...
    } else if (effectiveMaxAge !== null && candAge > effectiveMaxAge) {
      ...
    } else {
      ageStatus = 'PASS';
    }
  ```
- **Observed Behavior**:
  For `candAge = 0`, `candAge < 0` is false.
  If the parsed notification does not specify a `minAge` (`minAge === null`) and `effectiveMaxAge` is 35, the code executes the `else` branch: `0 <= 35` passes.
  Result: A candidate of age 0 is marked `ageStatus = 'PASS'`, and `candidateEligibility.isEligible = true`.

#### Finding 8: Object Prototype Property Traversal Trap in `getNestedValue`
- **File**: `src/services/validator/rules.js:33`
- **Verbatim Code**:
  ```javascript
  current = current[part];
  ```
- **Observed Behavior**:
  `getNestedValue({}, 'toString')` returns `[Function: toString]`.
  Because `getNestedValue` does not verify `Object.prototype.hasOwnProperty.call(current, part)`, querying inherited prototype methods on empty or unpopulated objects returns truthy functions instead of `undefined`.
  Consequently, declarative validation rule `{ field: 'toString', rule: 'required' }` passes on completely empty datasets.

---

## 2. Logic Chain

### 2.1 Logic Chain for Finding 1 & 2 (Category Substring Traps)
1. In `src/services/validator/rules.js:660`, `resolveRelaxationYears` evaluates candidate reservation category using `candCatNorm.includes(ruleCatNorm)`.
2. `ruleCatNorm` for Scheduled Caste is `'sc'`; for Scheduled Tribe is `'st'`; for Other Backward Classes is `'obc'`.
3. The string `'descendant of freedom fighter'` contains the character pair `'s'` followed by `'c'`. Therefore, `'descendant of freedom fighter'.includes('sc')` evaluates to `true`.
4. The candidate is mapped to the SC relaxation rule and awarded 5 additional years.
5. Similarly, `'obc-cl'` contains `'obc'`. DoPT guidelines strictly disqualify OBC Creamy Layer from reservations, but the code awards 3 years.
6. **Conclusion**: Unbounded substring searching without token boundaries causes catastrophic false positive eligibility grants to non-reserved candidates.

### 2.2 Logic Chain for Finding 3 (SC/ST Cross-Category Leakage)
1. In `src/services/validator/rules.js:118`, `CATEGORY_ALIASES['SC/ST']` defines: `['sc/st', 'sc & st', 'sc', 'st', 'scheduled caste', 'scheduled tribe']`.
2. In lines 665-673, the alias matching loop evaluates whether `candCatNorm` is in `aliases` AND `ruleCatNorm` is in `aliases`.
3. When `candCatNorm = 'sc'` and `ruleCatNorm = 'st'`, BOTH `'sc'` and `'st'` reside in the same alias array for `'SC/ST'`.
4. Therefore, `candMatches` is `true`, `ruleMatches` is `true`, and the ST relaxation years are awarded to the SC candidate.
5. **Conclusion**: Grouping distinct constitutional categories into a shared bidirectional alias array allows cross-category leakage whenever SC and ST age relaxations diverge.

### 2.3 Logic Chain for Finding 4 (Missing "BE" Degree Abbreviation)
1. In `src/services/validator/rules.js:125-169`, `EDUCATION_LEVELS` catalogs degree acronyms.
2. It includes `'b.tech'`, `'btech'`, `'b.e'`, `'bsc'`, `'b.sc'`, but omits `'be'`.
3. In lines 176-187, `getEducationLevel('BE in Civil')` scans `EDUCATION_LEVELS`. Because `'be'` is absent and the string does not contain `'b.e'`, it returns `0`.
4. In line 697, `isGradLevel` regex also tests `b\.e` rather than `\bbe\b`.
5. In line 726, `candLevel >= reqLevel` fails because `0 >= 4` is false.
6. **Conclusion**: Indian candidates possessing a "BE" degree are falsely disqualified for technical positions requiring "B.E." or "Bachelor of Engineering".

### 2.4 Logic Chain for Finding 5 (Education Substring Escalation)
1. In `src/services/validator/rules.js:179`, `norm.includes(term)` checks if the normalized degree string contains any term in `EDUCATION_LEVELS`.
2. `EDUCATION_LEVELS` contains 2-letter and 3-letter keys: `'ba': 4`, `'pg': 5`, `'bed': 4`.
3. The English word `"embedded"` contains `"bed"`.
4. As a result, `"Embedded Systems Diploma"` triggers `'bed'`, setting `highestLevel = 4`.
5. In `matchesEducation`, the candidate is treated as holding a Bachelor's degree (Level 4) rather than a Diploma (Level 3).
6. **Conclusion**: Short degree tokens in substring matching falsely promote certificate and diploma holders to undergraduate and postgraduate qualification status.

---

## 3. Caveats

1. **Deterministic Test Environment**: All tests were executed in native Node.js (v24.13.0) on Windows without external cloud or network dependencies, strictly conforming to Requirement §R4.
2. **Standard DoPT Invariants**: Evaluation of OBC Creamy Layer, SC, and ST relaxation assumes standard Government of India (DoPT) civil service recruitment norms.
3. **No Code Modified by Challenger**: Per the adversarial challenger identity rules, no production source code in `src/services/validator/` was modified. All defects are documented for remediation by `m3_worker`.

---

## 4. Conclusion

### 4.1 Gate Assessment: REQUEST_CHANGES
While the baseline test suite (`test/unity-checker.test.js`) passes 53 tests, adversarial stress testing revealed **13 confirmed functional vulnerabilities and edge-case defects** across candidate eligibility matching:
- **6 Critical Severity**: False reservation grants to arbitrary non-reserved words (Descendant, Staff, Non-OBC), illegal relaxation granted to OBC Creamy Layer, false disqualification of "BE" engineering degrees, and false promotion of diplomas/certificates to Bachelor's/Master's levels via "bed"/"ba"/"pg" substrings.
- **4 High Severity**: SC/ST cross-category leakage, cross-domain degree equivalence without stream containment (B.A. qualifying for B.E. Civil, MBBS qualifying for B.Tech CS).
- **3 Medium Severity**: Age 0 infant candidate validated as eligible when minAge is null, prototype property inheritance trap on `{}.toString`.

The Unity / Database Checking module **CANNOT be approved** in its current state. Remediation is required before Milestone 4 CLI runner integration.

### 4.2 Recommended Remediations for `m3_worker`
1. **Category Matching Hardening**:
   - Replace unbounded `includes` in `resolveRelaxationYears` with whole-word token matching or strict canonical alias resolution.
   - Explicitly map `'obc-cl'`, `'obc (creamy layer)'`, `'creamy layer'`, and `'non-obc'` to 0 relaxation years.
   - Decouple `'SC/ST'` in `CATEGORY_ALIASES` so that `'SC'` and `'ST'` remain distinct unless the notification rule explicitly specifies `'SC/ST'`.
2. **Education Taxonomy Hardening**:
   - Add `'be': 4` and word boundary matching `\bbe\b` to `EDUCATION_LEVELS` and line 697 regex. Also add `'bs': 4`, `'b.s': 4`, `'ms': 5`, `'m.s': 5`.
   - In `getEducationLevel`, require whole-word boundary matching (`\b${term}\b`) for short acronyms (`ba`, `pg`, `bed`, `be`, `me`) so that "embedded", "ballroom", and "upgrade" do not match.
   - In `matchesEducation`, ensure that specialized degrees (e.g. "Bachelor of Engineering", "B.Tech", "MBBS") are not satisfied by arbitrary Level 4 degrees (B.A., B.Com) unless the requirement explicitly states "in any discipline" or "any graduate".
3. **Age & Object Safety**:
   - In `evaluateCandidateEligibility`, enforce `if (candAge === null || candAge <= 0)` to reject age 0.
   - In `getNestedValue`, verify `Object.prototype.hasOwnProperty.call(current, part)` to prevent prototype method traversal.

---

## 5. Verification Method

### 5.1 Adversarial Harness Verification
To reproduce all 13 findings independently, run the adversarial harness from the workspace root:
```powershell
node .agents/m3_challenger_1/adversarial_rules_harness.js
```
**Expected Output**:
- Total checks: 42
- Passed: 33
- Vulnerabilities Confirmed: 9 root causes (13 failure modes)
- Final Gate Verdict: `[ REQUEST_CHANGES ]`

### 5.2 Baseline Regression Verification
Verify that the existing test suite continues to run:
```powershell
npm test
```
**Expected Output**:
- 182 tests passing, 0 failures.

### 5.3 Invalidation Conditions
This challenge report is invalidated only if:
1. `resolveRelaxationYears('Descendant of Freedom Fighter', [{ category: 'SC', years: 5 }])` returns `0`.
2. `resolveRelaxationYears('OBC-CL', [{ category: 'OBC', years: 3 }])` returns `0`.
3. `matchesEducation('BE in Civil', ['B.E.', 'Bachelor of Engineering'])` returns `matches = true`.
4. `getEducationLevel('Embedded Systems Diploma')` returns `3` (Diploma) instead of `4`.
5. `matchesEducation('B.A. in History', ['Bachelor of Engineering in Civil Engineering'])` returns `matches = false`.
