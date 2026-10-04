# Milestone 4 Gate Review: Standalone Execution CLI Runner (parse-demo.js)

**Reviewer**: `m4_reviewer` (teamwork_preview_reviewer / critic)  
**Parent Orchestrator**: `teamwork_preview_orchestrator_3` (`478bab56-0e1f-4e7d-83c1-6712d8805eae`)  
**Target Files Reviewed**: `parse-demo.js`, `test/parse-demo.test.js`  
**Workspace Root**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Review Date**: 2026-09-14  
**Gate Verdict**: **APPROVE**

---

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Audit**: **PASS** (Zero integrity violations; no hardcoded facades, fake mocks, or shortcut cheating detected).  
**Risk Level**: **LOW**  
**Test Suite**: **211 / 211 tests pass across 34 suites (0 failures)** in 5.02s.

---

## 1. Observation

### 1.1 Dependency Isolation & §R4 Compliance
Direct inspection of `parse-demo.js` (lines 13-30) shows the following imports:
```javascript
15:   require('dotenv').config({ quiet: true });
20: const fs = require('node:fs');
21: const path = require('node:path');
22: const { parseArgs } = require('node:util');
26: const { extractTargetedPdfText } = require(path.join(ROOT_DIR, 'src', 'services', 'pdf'));
27: const { parseStructuredCriteria } = require(path.join(ROOT_DIR, 'src', 'services', 'ai'));
28: const { verifyUnity, formatUnityReport } = require(path.join(ROOT_DIR, 'src', 'services', 'validator'));
29: const { getBenchmarkCriteria, MOCK_CANDIDATES } = require(path.join(ROOT_DIR, 'fixtures', 'mock-criteria'));
```
- A regex scan across `parse-demo.js` and all submodules in `src/services/pdf`, `src/services/ai`, and `src/services/validator` confirmed **zero imports** or references to `firebase`, `firestore`, or `resend`.
- No database connections, cloud listeners, or email transports are initialized anywhere in the execution path.

### 1.2 CLI Flags Implementation
`parse-demo.js` configures native `node:util.parseArgs` (lines 35-44):
```javascript
const CLI_OPTIONS = {
  pdf: { type: 'string', short: 'p', default: DEFAULT_PDF_PATH },
  keywords: { type: 'string', short: 'k', default: DEFAULT_KEYWORDS },
  mock: { type: 'boolean', short: 'm', default: false },
  preset: { type: 'string', default: 'UPSC' },
  candidate: { type: 'string', short: 'c', default: 'FULLY_QUALIFIED_GENERAL' },
  json: { type: 'boolean', short: 'j', default: false },
  'no-color': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};
```
- Supported shorthand flags: `-p`, `-k`, `-m`, `-c`, `-j`, `-h`.
- Supports positional arguments: `node parse-demo.js <pdf-path>` seamlessly overrides `values.pdf`.
- Canon preset mapping (lines 46-57) supports `UPSC`, `CSE`, `SSC`, `SSC_CGL`, `IBPS`, `IBPS_PO`, `BANK`, `TECH`, `TECHNICAL`, and `TECHNICAL_SERVICES`.
- Candidate resolution (lines 59-108, 233-297) supports 12+ standard aliases, raw dictionary keys, inline JSON string, external JSON file path, and `none`/`null`.

### 1.3 4-Phase Console Dashboard
Direct verification of `renderDashboard` (lines 327-437) confirmed the complete 4-phase dashboard structure:
- **Header Banner**: Execution mode badge (`[ OFFLINE MOCK MODE ]` vs `[ LIVE GEMINI API MODE ]`), target document path, benchmark preset, candidate summary, execution duration in ms, and standalone assertion.
- **Phase 1**: Targeted PDF Parsing & Token Reduction Summary (Total pages, scanned pages, raw chars/words/tokens, targeted chars/words/tokens, token reduction %, compression ratio, matched keywords).
- **Phase 2**: Gemini Structured Criteria Extraction (Exam title, organization, status, vacancies, age criteria, relaxations, education, streams, application window, fees).
- **Phase 3**: Unity Verification Matrix using validator service's `formatUnityReport` (overall verdict, scorecard pass rate, field-by-field evaluations, candidate status and matched/disqualified breakdown).
- **Phase 4**: Executive Pipeline Summary (Pipeline status badge, candidate status badge, token efficiency percentage, and external services confirmation).

### 1.4 Pure JSON Mode Verification
- Command executed: `node parse-demo.js --mock --json`
- Stdout verified via programmatic child process parsing:
  - Result: `Success: true`. Zero non-JSON characters, banner lines, or dotenv messages on stdout.
- Error path with `--json` verified via `node parse-demo.js --pdf nonexistent.pdf --json`:
  - Exited with code 1; output was 100% valid JSON: `{"success": false, "error": "PDF file not found: \"...\""}`.

### 1.5 Clean Error Handling & Exit Codes
- Command: `node parse-demo.js --pdf nonexistent.pdf`
  - Exit code: `1`
  - Output on stderr: `[ERROR] PDF file not found: "C:\Users\sindh\Documents\codes\mypath-scraper\nonexistent.pdf"`
  - Stack traces: **0** (no unhandled rejections or stack dumps).
- Command: `node parse-demo.js --pdf fixtures` (Directory input)
  - Exit code: `1`
  - Output on stderr: `[ERROR] Expected a PDF file, but path is a directory: "C:\Users\sindh\Documents\codes\mypath-scraper\fixtures"`
- Command: `node parse-demo.js --pdf test_zero_byte.pdf` (0-byte file input)
  - Exit code: `1`
  - Output on stderr: `[ERROR] PDF file is empty (0 bytes): "C:\Users\sindh\Documents\codes\mypath-scraper\test_zero_byte.pdf"`
- Command: `node parse-demo.js --preset INVALID`
  - Exit code: `1`
  - Output on stderr: `[ERROR] Invalid preset "INVALID". Supported presets: UPSC, SSC_CGL, IBPS_PO, TECHNICAL_SERVICES`
- Command: `node parse-demo.js --unknown-flag`
  - Exit code: `1`
  - Output on stderr: `[ERROR] Invalid CLI argument: Unknown option '--unknown-flag'. ... Use --help to view available options.`

### 1.6 Test Suite Execution
- Command executed: `npm test`
  - Output: 211 tests passed across 34 suites (0 failures).
- Dedicated test suite `test/parse-demo.test.js`:
  - 22 automated test cases across 7 categories (all passing in 4.62s).

---

## 2. Logic Chain

1. **Standalone Architecture & Absence of Forbidden Dependencies**:
   - Observations in §1.1 demonstrate that `parse-demo.js` imports only built-in modules (`fs`, `path`, `util`), `dotenv`, and internal services under `src/services/` and `fixtures/`.
   - Grep verification confirms zero imports of `firebase`, `firestore`, or `resend`.
   - Therefore, Requirement §R4 is strictly satisfied.

2. **CLI Parameter Interface**:
   - Observations in §1.2 demonstrate that all required flags (`--pdf`, `--keywords`, `--mock`, `--preset`, `--candidate`, `--json`, `--help`) are implemented, validated, and documented.
   - Positional arguments and short flags function as expected.

3. **Output Formatting Quality**:
   - Observations in §1.3 confirm that the console presentation contains all 4 phases with clear alignment, token reduction metrics, structured criteria, and unity evaluation matrices.

4. **JSON Output Guarantee**:
   - Observations in §1.4 confirm that `dotenv.config({ quiet: true })` and guarded logging ensure stdout contains exclusively valid JSON when `--json` is enabled.
   - Both successful execution and error conditions output structured JSON envelopes.

5. **Fault Tolerance and Error UX**:
   - Observations in §1.5 demonstrate that validation guards (`validatePdfPath`, `resolvePreset`, `resolveCandidate`, `parseCliArgs`) prevent uncaught runtime exceptions and emit clean, single-line error messages with exit code 1.

6. **Regression Invariance**:
   - Observations in §1.6 confirm that the entire test suite of 211 tests across 34 suites passes cleanly without regressions to M1, M2, or M3 deliverables.

---

## 3. Findings

### 3.1 [Minor] UTF-8 BOM Handling in JSON Candidate Files
- **What**: When reading candidate profiles from external `.json` files via `--candidate <path>`, `fs.readFileSync(..., 'utf8')` passes the raw string to `JSON.parse`. On Windows systems where files are created by PowerShell 5.1 (`Set-Content -Encoding utf8`) or Windows Notepad, files often prepend a Byte Order Mark (`\uFEFF`). `JSON.parse` does not strip the BOM, throwing `Unexpected token '﻿'`.
- **Where**: `parse-demo.js`, line 264.
- **Why**: While `parse-demo.js` cleanly catches this error and outputs a clean exit code 1 message without crashing, it would improve Windows DX to strip the BOM automatically.
- **Suggestion**: In a future non-blocking polish, update line 264 to:
  ```javascript
  const content = fs.readFileSync(resolvedJsonPath, 'utf8').replace(/^\uFEFF/, '');
  ```

---

## 4. Adversarial Review & Stress Test Results

| # | Stress Scenario / Hypothesis | Predicted / Expected Behavior | Actual Behavior | Result |
|---|------------------------------|-------------------------------|-----------------|:------:|
| 1 | Non-existent PDF path | Exit code 1, clean error on stderr | Exit code 1, `[ERROR] PDF file not found` | **PASS** |
| 2 | 0-byte empty file as PDF | Exit code 1, clean error on stderr | Exit code 1, `[ERROR] PDF file is empty (0 bytes)` | **PASS** |
| 3 | Directory path passed as PDF | Exit code 1, clean error on stderr | Exit code 1, `[ERROR] Expected a PDF file, but path is a directory` | **PASS** |
| 4 | Unknown CLI options (e.g. `--invalid-flag`) | Exit code 1, clean message from parseArgs | Exit code 1, clean message advising `--help` | **PASS** |
| 5 | `--json` mode on missing PDF | Exit code 1, pure JSON error envelope on stdout | Exit code 1, parseable JSON `{ success: false, error: ... }` | **PASS** |
| 6 | `--json` mode on invalid preset | Exit code 1, pure JSON error envelope on stdout | Exit code 1, parseable JSON `{ success: false, error: ... }` | **PASS** |
| 7 | Custom inline JSON candidate profile | Parses profile, verifies eligibility against criteria | Evaluated candidate accurately (e.g., General age 29 -> ELIGIBLE) | **PASS** |
| 8 | `--keywords ""` (empty string) | Caught by parseArgs as ambiguous option argument | Exit code 1, clean user error | **PASS** |
| 9 | Unmatched keywords (`xyz123foobar`) | 0 sentences extracted; graceful empty criteria; overall verdict FAIL (20% pass rate); no crash | Handled gracefully in all 4 dashboard phases and JSON mode | **PASS** |
| 10 | Terminal styling suppression (`--no-color` / `NO_COLOR=1`) | Zero ANSI escape codes in output | `/\x1b\[[0-9;]*m/.test(out) === false` | **PASS** |

---

## 5. Caveats

- **Live Gemini Execution**: Verification was conducted in offline mock mode (`--mock` and automatic fallback when `GEMINI_API_KEY` is not provided). Live API tests require an active internet connection and a paid/valid Google Gemini API key. Unit tests for live client initialization and schema compliance in M2 have already been verified.
- **BOM Ingestion on Windows**: Candidate JSON files created on Windows PowerShell 5.1 must be UTF-8 without BOM or passed via inline JSON string / alias keys.

---

## 6. Conclusion

The implementation of `parse-demo.js` and `test/parse-demo.test.js` meets all criteria specified in §R4 and the M4 Milestone Plan:
1. Complete standalone execution without Firestore or email/Resend dependencies.
2. Full CLI flag ergonomics with `node:util.parseArgs`.
3. 4-phase dashboard with token reduction statistics, extracted Gemini criteria, and Unity verification matrix.
4. 100% pure parseable JSON output in `--json` mode.
5. Zero unhandled stack traces across all error scenarios.
6. Clean 211 / 211 test suite pass.

**Gate Verdict**: **APPROVE**

---

## 7. Verification Method

To independently verify this milestone gate:

1. **Verify Full Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: 211 passed across 34 suites, 0 failures.

2. **Verify Dedicated CLI Test Suite**:
   ```powershell
   node --test test/parse-demo.test.js
   ```
   *Expected*: 22 passed across 7 categories, 0 failures.

3. **Verify Pure JSON Output**:
   ```powershell
   node parse-demo.js --mock --json
   ```
   *Expected*: Output parses cleanly with `JSON.parse`.

4. **Verify Error Handling**:
   ```powershell
   node parse-demo.js --pdf non_existent.pdf
   ```
   *Expected*: Exits with code 1, outputs clean single-line error message on stderr, zero stack traces.
