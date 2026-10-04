# Milestone 4 Adversarial Challenge Report: Standalone CLI Runner (`parse-demo.js`)

**Agent**: `m4_challenger` (teamwork_preview_challenger)  
**Parent Orchestrator**: `teamwork_preview_orchestrator_3` (`478bab56-0e1f-4e7d-83c1-6712d8805eae`)  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_challenger`  
**Date**: 2026-09-14  
**Gate Verdict**: `REQUEST_CHANGES`

---

## 1. Observation

### 1.1 Test Harness Execution
The adversarial test suite `adversarial_cli_harness.js` was written and executed directly via `node .agents/m4_challenger/adversarial_cli_harness.js`.

Command executed:
```powershell
node .agents/m4_challenger/adversarial_cli_harness.js
```
Harness output:
```
================================================================================
FINAL HARNESS RESULTS: 34 PASSED / 2 FAILED (TOTAL 36)
================================================================================

Summary of Failed Tests:
- [2.3] CHALLENGE FOCUS 2 CONTRACT CHECK: Presence of pdfExtraction and geminiCriteria
  Error: Challenge requirement specifies object must contain pdfExtraction, geminiCriteria, unityVerification. Missing: pdfExtraction (only found "pdf"), geminiCriteria (only found "extractedCriteria")

- [2.7] Corrupted PDF file with --json produces valid JSON error envelope instead of plain text fatal error
  Error: When PDF extraction fails on corrupted PDF with --json, stdout was not valid JSON! Stdout: "", Stderr: "Warning: Indexing all PDF objects

[FATAL ERROR] Unexpected execution error: Invalid or corrupted PDF structure: Invalid PDF structure."
```

### 1.2 Observation on Focus Area 1: Process Exit Codes (11/11 Passed)
- `--help` and `-h` exit with code `0` and print complete CLI manuals.
- `--mock` exits with code `0` and prints 4-phase dashboard.
- `--mock --json` exits with code `0`.
- `--mock --preset SSC_CGL --candidate underage` evaluates candidate as `DISQUALIFIED`, overall verdict `[ FAIL ]`, and exits with code `0` (business qualification failure does not trigger process exit code 1).
- Non-existent PDF file (`--pdf fixtures/non-existent-file-xyz.pdf`) exits with code `1`.
- Invalid preset (`--preset INVALID_PRESET_TEST`) exits with code `1`.
- Invalid candidate profile (`--candidate INVALID_CANDIDATE_TEST`) exits with code `1`.
- Unknown CLI flags (`--unknown-unsupported-flag`) exit with code `1`.
- Directory supplied as PDF (`--pdf src`) exits with code `1`.
- 0-byte empty file supplied as PDF exits with code `1`.

### 1.3 Observation on Focus Area 2: JSON Output Integrity (6/8 Passed, 2 Failed)
1. **JSON Parseability**:
   `JSON.parse(stdout)` succeeds with 0 syntax errors for valid runs. No ANSI escape sequences or text banners pollute the JSON stream.
2. **Defect 1 — Missing Specified JSON Schema Keys**:
   In `parse-demo.js` (lines 567–580):
   ```javascript
   if (flags.json) {
     const jsonOutput = {
       success: true,
       executionMode: pipelineRes.executionMode,
       timingMs: pipelineRes.timingMs,
       pdf: {
         path: path.relative(process.cwd(), pipelineRes.meta.pdfPath),
         rawStats: pipelineRes.pdfResult.rawStats,
         extractedStats: pipelineRes.pdfResult.extractedStats
       },
       extractedCriteria: pipelineRes.aiResult.data,
       unityVerification: pipelineRes.unityResult
     };
     console.log(JSON.stringify(jsonOutput, null, 2));
   ```
   **Finding**: The orchestrator dispatch specification explicitly demands:
   > "2. JSON Output Integrity: When `--json` is passed, `JSON.parse(stdout)` MUST succeed with 0 syntax errors, and the resulting object must contain `pdfExtraction`, `geminiCriteria`, and `unityVerification`."
   
   However, `jsonOutput` defines `pdf` (not `pdfExtraction`) and `extractedCriteria` (not `geminiCriteria`). Any automated client or test asserting `res.pdfExtraction` or `res.geminiCriteria` evaluates to `undefined`.

3. **Defect 2 — Corrupted PDF in JSON Mode Bypasses JSON Error Envelope**:
   In `parse-demo.js` (lines 480–484 & lines 597–602):
   ```javascript
   // Step 1: Targeted PDF Extraction
   const pdfResult = await extractTargetedPdfText(resolvedPdfPath, {
     keywords: keywordList,
     contextBefore: 1,
     contextAfter: 1
   });
   ```
   ```javascript
   if (require.main === module) {
     main().catch((err) => {
       console.error(`\n[FATAL ERROR] Unexpected execution error: ${err.message}\n`);
       process.exit(1);
     });
   }
   ```
   When a corrupted PDF or non-PDF file (>0 bytes) is passed to `parse-demo.js --pdf corrupt.pdf --mock --json`:
   `extractTargetedPdfText` throws an exception (`Invalid or corrupted PDF structure: Invalid PDF structure`). Because `runPipeline` does not wrap `extractTargetedPdfText` in a `try/catch`, the promise rejects and bubbles to the top-level `main().catch()`. This catch handler does not format errors into a JSON envelope, printing plain text to stderr and exiting with code 1, leaving stdout completely empty.

### 1.4 Observation on Focus Area 3: Standalone Independence (4/4 Passed)
- Source code analysis confirmed **zero** imports or requires of `firebase`, `@google-cloud/firestore`, `firestore`, `resend`, or `nodemailer`.
- Tested auto-mock fallback when `GEMINI_API_KEY=""` and when `GEMINI_API_KEY` was deleted from environment: full pipeline executed offline with mock engine, exit code 0.
- Silent dotenv loading: corrupted or missing `.env` paths did not pollute stdout or throw errors.

### 1.5 Observation on Focus Area 4: Substring & Keyword Edge Cases (6/6 Passed)
- Non-existent keywords (`--keywords "xyz123,nonexistent"`):
  - Extracted 0 sentences, 0 characters, 100% reduction.
  - Unity check completed without throwing, evaluated criteria as null, and rendered scorecard with overall verdict `[ FAIL ]` and exit code 0.
- Extreme keywords: 102 keywords executed in 118ms (well within the 5000ms budget).
- Regex characters in keywords (`fee (in rs.)?,[0-9]+,age*`): regex escaping correctly handled without syntax errors.
- Whitespace and empty comma tokens (`"  ,  eligibility , ,  age  , "`): cleanly sanitized and extracted matching sentences.

### 1.6 Observation on Focus Area 5: Output Format Resilience (7/7 Passed)
- `--no-color` and `NO_COLOR=1` completely strip ANSI escape sequences.
- Custom inline candidate JSON (`--candidate '{"name":"Tester","age":26,"category":"General"}'`) parsed and evaluated correctly.
- Boundary candidates (`min_age_boundary` 21, `max_age_boundary` 32) evaluated as `ELIGIBLE`.
- Overage candidate (35) evaluated as `DISQUALIFIED`.
- Malformed inputs do not print unhandled Node stack traces.

### 1.7 Existing Repository Test Suite
```powershell
npm test
```
Result: 211 tests pass across 34 suites in 5.0s, 0 failures.

---

## 2. Logic Chain

1. **Focus Area 2 Schema Contract**:
   - The challenge prompt explicitly mandates that the JSON object produced by `--json` must contain `pdfExtraction`, `geminiCriteria`, and `unityVerification`.
   - Inspection of `parse-demo.js` line 568 reveals the object keys are `pdf`, `extractedCriteria`, and `unityVerification`.
   - Testing `res.pdfExtraction !== undefined` and `res.geminiCriteria !== undefined` on stdout from `node parse-demo.js --mock --json` fails.
   - Therefore, `parse-demo.js` is non-compliant with the required JSON property naming.

2. **JSON Error Envelope Consistency**:
   - For missing files (`--pdf missing.pdf --json`) or invalid presets (`--preset BAD --json`), `parse-demo.js` outputs a structured JSON envelope `{ "success": false, "error": "..." }` on exit code 1.
   - However, when a file exists but is corrupted (e.g. invalid PDF header), `validatePdfPath` passes.
   - Execution proceeds to `extractTargetedPdfText`, which throws an unhandled rejection inside `runPipeline`.
   - The rejection is caught by `main().catch()`, which unconditionally logs plain text `[FATAL ERROR] Unexpected execution error: ...` to stderr.
   - This breaks machine-readability when consumers invoke `node parse-demo.js --json` on corrupted files.

---

## 3. Caveats

- In the existing `test/parse-demo.test.js`, the tests written by `m4_worker` tested for `json.pdf` and `json.extractedCriteria` (matching Explorer 3's proposed draft), which is why `npm test` passes. However, to guarantee contract compatibility with the orchestrator dispatch, aliasing or adding `pdfExtraction` and `geminiCriteria` is necessary.
- Live network calls against the official Gemini API were not run with real billable API credentials; mock mode and API key absence fallback were verified extensively.

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

While `parse-demo.js` is robust across exit codes, zero-dependency standalone execution, and keyword edge cases (34/36 adversarial tests pass, and all 211 repository tests pass), two specific defects must be addressed by `m4_worker`:

1. **Remediate JSON Key Names**:
   In `parse-demo.js`, include `pdfExtraction` and `geminiCriteria` in `jsonOutput` alongside `pdf` and `extractedCriteria` to support both naming contracts:
   ```javascript
   const jsonOutput = {
     success: true,
     executionMode: pipelineRes.executionMode,
     timingMs: pipelineRes.timingMs,
     pdf: { ... },
     pdfExtraction: {
       path: path.relative(process.cwd(), pipelineRes.meta.pdfPath),
       rawStats: pipelineRes.pdfResult.rawStats,
       extractedStats: pipelineRes.pdfResult.extractedStats
     },
     extractedCriteria: pipelineRes.aiResult.data,
     geminiCriteria: pipelineRes.aiResult.data,
     unityVerification: pipelineRes.unityResult
   };
   ```

2. **Guard PDF Extraction in `runPipeline`**:
   Wrap `extractTargetedPdfText` in a `try/catch` inside `runPipeline` so that corrupted PDF exceptions return `{ success: false, error: "PDF extraction failed: " + err.message }`. This ensures `main()` outputs a clean JSON error envelope `{ "success": false, "error": "..." }` when `--json` is active, instead of dumping plain text to stderr.

---

## 5. Verification Method

### 5.1 Commands to Reproduce Deficiencies
1. **Reproduce Missing JSON Keys**:
   ```powershell
   node -e "const { execSync } = require('child_process'); const out = JSON.parse(execSync('node parse-demo.js --mock --json').toString()); console.log('pdfExtraction:', out.pdfExtraction, 'geminiCriteria:', out.geminiCriteria);"
   ```
   *Actual Output*: `pdfExtraction: undefined geminiCriteria: undefined`  
   *Expected Output*: Both properties should be defined objects.

2. **Reproduce Corrupted PDF JSON Error Envelope Bypassing**:
   ```powershell
   node -e "const fs = require('fs'); fs.writeFileSync('temp_corrupt.pdf', 'corrupt_stream');" ; node parse-demo.js --pdf temp_corrupt.pdf --mock --json ; node -e "const fs = require('fs'); fs.unlinkSync('temp_corrupt.pdf');"
   ```
   *Actual Output*: Plain text `[FATAL ERROR] Unexpected execution error: ...` to stderr, stdout empty.  
   *Expected Output*: Valid JSON `{ "success": false, "error": "..." }` to stdout with exit code 1.

3. **Run Adversarial Harness**:
   ```powershell
   node .agents/m4_challenger/adversarial_cli_harness.js
   ```
   *Expected Output after fix*: 36 PASSED / 0 FAILED.

4. **Run Standard Repository Test Suite**:
   ```powershell
   npm test
   ```
   *Expected Output*: 211+ tests pass, 0 failures.
