# Milestone 4 Forensic Integrity Audit Report

**Work Product**: `parse-demo.js` and `test/parse-demo.test.js`  
**Profile**: General Project (Integrity Forensics)  
**Integrity Mode**: Development (§R4 Standalone Execution)  
**Verdict**: **CLEAN** (No Integrity Violations Detected)  

---

## Executive Summary

| Forensic Check | Requirement | Result | Evidence Summary |
|---|---|---|---|
| **1. Static Analysis & Service Orchestration** | Genuine orchestration of `src/services/{pdf, ai, validator}` | **PASS** | Imports and invokes `extractTargetedPdfText`, `parseStructuredCriteria`, `verifyUnity`, `formatUnityReport`. No hardcoded outputs, fake bypasses, or facade implementations. |
| **2. Zero Forbidden Cloud Services** | §R4 & dispatch: Zero references to Firestore, Firebase, Resend, Nodemailer | **PASS** | AST and static scan confirms `parse-demo.js` imports only Node standard built-ins (`fs`, `path`, `util`), `dotenv`, and local services (`pdf`, `ai`, `validator`, `mock-criteria`). Zero remote database or email dependencies. |
| **3. Execution Attestation** | Runtime verification of CLI runner and test suite | **PASS** | Full test suite: **211/211 passing tests across 34 suites** (0 failures, duration 4.96s). CLI unit & integration suite: **22/22 passing tests** (0 failures). `node parse-demo.js --mock` and `node parse-demo.js --mock --json` run cleanly with exit code 0. |
| **4. Adversarial Stress & Hardening** | Clean error handling, no stack traces, resilient to invalid inputs | **PASS** | Non-existent PDF, 0-byte PDF, directory passed as file, invalid presets, invalid candidate profiles, and missing flags all exit cleanly with code 1 and user-friendly error messages. Zero unhandled exceptions or stack dumps. |

---

## 1. Observation

### 1.1 Source Code & AST Analysis (`parse-demo.js`)
Direct inspection of `c:\Users\sindh\Documents\codes\mypath-scraper\parse-demo.js`:
- **Imports (Lines 20–29)**:
  ```javascript
  const fs = require('node:fs');
  const path = require('node:path');
  const { parseArgs } = require('node:util');

  const ROOT_DIR = __dirname;

  const { extractTargetedPdfText } = require(path.join(ROOT_DIR, 'src', 'services', 'pdf'));
  const { parseStructuredCriteria } = require(path.join(ROOT_DIR, 'src', 'services', 'ai'));
  const { verifyUnity, formatUnityReport } = require(path.join(ROOT_DIR, 'src', 'services', 'validator'));
  const { getBenchmarkCriteria, MOCK_CANDIDATES } = require(path.join(ROOT_DIR, 'fixtures', 'mock-criteria'));
  ```
  *Finding*: No imports of `@google-cloud/firestore`, `firebase`, `resend`, `nodemailer`, or any external HTTP/cloud transport.
- **Genuine Service Orchestration in `runPipeline` (Lines 479–512)**:
  - Line 480: `const pdfResult = await extractTargetedPdfText(resolvedPdfPath, { keywords: keywordList, contextBefore: 1, contextAfter: 1 });`
  - Line 492: `const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { apiKey, mockMode, model: options.model || 'gemini-2.5-flash', fallbackToMockOnError: true });`
  - Line 511: `const unityResult = verifyUnity(aiResult.data, dbCriteria);`
  - Line 412: `lines.push(formatUnityReport(unityResult, { color: colors.useColor }));`
  *Finding*: The pipeline dynamically threads the raw PDF -> extracted text -> AI structured criteria -> unity verification engine. Results are calculated on the fly; no pre-baked or stubbed data is returned.
- **Environment & Cheat Check**:
  - A comprehensive search for `process.env` in `parse-demo.js` revealed only two usages:
    - Line 487: `const apiKey = options.apiKey || process.env.GEMINI_API_KEY;`
    - Line 582: `const useColor = !flags['no-color'] && process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);`
  - Zero checks for `NODE_ENV === 'test'`, test-runner detection, or bypass shortcuts.

### 1.2 Zero Forbidden Cloud Services Scan
Ripgrep audit across the workspace:
- `grep_search` for `firestore`: Only appeared as assertions in `parse-demo.js` banner logs (`"Zero Firestore / Zero Resend"`).
- `grep_search` for `firebase`: 0 results found in codebase.
- `grep_search` for `resend`: Present only in legacy base scripts (`src/services/email/email-service.js`, `src/scripts/pipeline.js`, `demo.js`), which are completely unreferenced and unimported by `parse-demo.js`, `test/parse-demo.test.js`, and `src/services/{pdf, ai, validator}`.
- `parse-demo.js` dependency graph is 100% self-contained and local.

### 1.3 Execution Attestation
1. **Full Repository Test Suite (`npm test`)**:
   ```
   ▶ Tier 1: Feature Coverage (Rules in Isolation & Contract Compliance)
   ✔ Tier 1: Feature Coverage (Rules in Isolation & Contract Compliance) (33.8224ms)
   ▶ Tier 2: Boundary Conditions & Corner Cases
   ✔ Tier 2: Boundary Conditions & Corner Cases (5.1113ms)
   ▶ Tier 3: Negative, Corrupted & Robustness Testing
   ✔ Tier 3: Negative, Corrupted & Robustness Testing (5.7227ms)
   ▶ Tier 4: Real-World Workload Scenarios
   ✔ Tier 4: Real-World Workload Scenarios (6.6063ms)
   ▶ Tier 5: Adversarial Regression & Edge-Case Remediation Suite
   ✔ Tier 5: Adversarial Regression & Edge-Case Remediation Suite (4.6786ms)
   ℹ tests 211
   ℹ suites 34
   ℹ pass 211
   ℹ fail 0
   ℹ cancelled 0
   ℹ skipped 0
   ℹ todo 0
   ℹ duration_ms 4961.9821
   ```
   Exit code: 0.

2. **Milestone 4 Test Suite (`node --test test/parse-demo.test.js`)**:
   ```
   ▶ Category 1: CLI Usage & Help Documentation
     ✔ 1.1 node parse-demo.js --help exits with code 0 and displays comprehensive usage (228.186ms)
     ✔ 1.2 node parse-demo.js -h short flag behaves identically to --help (191.6019ms)
   ▶ Category 2: End-to-End Execution in Mock Mode
     ✔ 2.1 node parse-demo.js --mock executes full pipeline on sample-notification.pdf (308.9818ms)
     ✔ 2.2 auto-detects absence of GEMINI_API_KEY and gracefully falls back to mock mode (304.8265ms)
   ▶ Category 3: Presets & Candidate Eligibility Evaluation
     ✔ 3.1 node parse-demo.js --mock --preset SSC_CGL --candidate underage evaluates candidate as DISQUALIFIED (326.7716ms)
     ✔ 3.2 node parse-demo.js --mock --preset UPSC --candidate general evaluates candidate as ELIGIBLE (312.5434ms)
     ✔ 3.3 handles case-insensitive preset and candidate aliases (310.8168ms)
     ✔ 3.4 runs without candidate profile using --candidate none (342.0514ms)
   ▶ Category 4: Machine-Readable JSON Output Mode
     ✔ 4.1 node parse-demo.js --mock --json outputs valid, parseable JSON envelope (341.2835ms)
     ✔ 4.2 node parse-demo.js --mock --json --preset SSC_CGL --candidate underage reflects disqualified status in JSON (343.5603ms)
   ▶ Category 5: Error Handling & Clean Exit Codes
     ✔ 5.1 non-existent PDF file exits cleanly with code 1 and descriptive error message (205.1663ms)
     ✔ 5.2 invalid criteria preset name exits cleanly with code 1 and lists valid presets (221.6001ms)
     ✔ 5.3 invalid candidate profile name exits cleanly with code 1 and lists valid candidates (175.4982ms)
     ✔ 5.4 non-existent PDF with --json flag outputs clean JSON error envelope with code 1 (176.3971ms)
   ▶ Category 6: Custom Keywords & Parameters
     ✔ 6.1 respects custom comma-separated keywords via --keywords (286.7733ms)
     ✔ 6.2 respects custom PDF file path via --pdf (291.7404ms)
   ▶ Category 7: Modular Programmatic Exports
     ✔ 7.1 parseCliArgs parses options correctly via node:util.parseArgs (1.2284ms)
     ✔ 7.2 parseCliArgs gracefully catches unknown options (0.2372ms)
     ✔ 7.3 resolvePreset validates and returns canonical criteria preset (0.2215ms)
     ✔ 7.4 resolveCandidate handles aliases, keys, and custom JSON profiles (0.4559ms)
     ✔ 7.5 validatePdfPath checks existence and directory constraints (0.4044ms)
     ✔ 7.6 runPipeline executes full pipeline programmatically (178.614ms)
   ℹ tests 22
   ℹ suites 7
   ℹ pass 22
   ℹ fail 0
   ```
   Exit code: 0.

3. **CLI Standalone Runs**:
   - `node parse-demo.js --mock`: Exited 0; rendered 4-phase dashboard with 37.2% reduction, 15 unity checks, 100% pass rate.
   - `node parse-demo.js --mock --json`: Exited 0; output pure parseable JSON with full telemetry (raw stats, reduction stats, criteria data, unity evaluations, candidate eligibility).
   - `node parse-demo.js --mock --preset SSC_CGL --candidate underage`: Exited 0; candidate evaluated as DISQUALIFIED due to age 19 vs required 21; overall verdict FAIL.
   - `node parse-demo.js --invalid-flag`: Exited 1; printed `[ERROR] Invalid CLI argument: Unknown option '--invalid-flag'`.
   - `node parse-demo.js --pdf non_existent_file.pdf`: Exited 1; printed `[ERROR] PDF file not found: "C:\Users\sindh\Documents\codes\mypath-scraper\non_existent_file.pdf"`.
   - `node parse-demo.js --pdf non_existent_file.pdf --json`: Exited 1; printed `{"success":false,"error":"PDF file not found: ... "}`.
   - `node parse-demo.js fixtures`: Exited 1; printed `[ERROR] Expected a PDF file, but path is a directory: "C:\Users\sindh\Documents\codes\mypath-scraper\fixtures"`.

---

## 2. Logic Chain

1. **Interface & Contract Verification**:
   - `parse-demo.js` conforms to the pipeline architecture defined in `PROJECT.md` by consuming the three published service interfaces:
     - `extractTargetedPdfText` (`src/services/pdf`) -> produces `{ rawStats, extractedStats, targetedText }`
     - `parseStructuredCriteria` (`src/services/ai`) -> produces `{ success, isMock, data }`
     - `verifyUnity` (`src/services/validator`) -> produces `{ overallVerdict, summary, evaluations, candidateEligibility }`
   - These calls are sequential, authentic, and handle both live API configuration and automatic offline mock fallback.

2. **Standalone Compliance (§R4)**:
   - §R4 states: *"This must be a standalone pipeline. Do NOT include Firestore database interactions, user creation, or email sending integrations (Resend). Provide a local test script (e.g., parse-demo.js) that allows the user to supply a PDF, a Gemini API key via .env, and mock database criteria to see the end-to-end extraction and validation in the console."*
   - Direct verification proved that no cloud database or email client is loaded, initialized, or invoked. The database criteria are loaded locally from `fixtures/mock-criteria.js`.

3. **No Cheats, Facades, or Pre-Populated Outputs**:
   - The CLI parses the input PDF on every invocation. When keywords or files change, the metrics and extraction output change accordingly (tested via custom keywords `--keywords "nonexistentkeywordxyz"` which produced 0 matches, null criteria, and warning checks, and `--keywords "eligibility,age,vacancies,fee,dates,selection"` which produced 25 sentences).
   - In `--json` mode, output is strictly valid JSON without extraneous log strings or `dotenv` banner noise.

4. **Error Handling Architecture**:
   - User errors (bad flags, missing files, directory paths, invalid presets, invalid candidates) trigger exit code 1 with clean one-line messages.
   - Normal business evaluation results (e.g., a candidate failing eligibility checks) trigger exit code 0, as the pipeline itself completed successfully.
   - This distinction conforms strictly to standard POSIX CLI conventions.

---

## 3. Caveats

- **Live Gemini API Execution**: Offline mock mode (`--mock` or absence of `GEMINI_API_KEY`) was tested and verified. Live network calls to Gemini require an active `GEMINI_API_KEY` set in the environment or `.env`. When absent, the script automatically and gracefully switches to mock mode without crashing.
- **Legacy Files**: Pre-existing scripts in `src/scripts/` (`scrape.js`, `pipeline.js`, `test-email.js`) and `src/services/email/` remain from prior project work, but are completely decoupled and unreferenced by the Milestone 4 deliverables.

---

## 4. Conclusion

Milestone 4 (`parse-demo.js` and `test/parse-demo.test.js`) is **fully authentic, functionally robust, and completely compliant with all integrity and standalone requirements (§R4)**.

**Verdict: CLEAN.**

---

## 5. Verification Method

### 5.1 Commands to Verify Locally
```powershell
# 1. Full repository test suite (211 tests)
npm test

# 2. Dedicated Milestone 4 CLI test suite (22 tests)
node --test test/parse-demo.test.js

# 3. CLI help manual
node parse-demo.js --help

# 4. Standard mock mode execution (formatted console dashboard)
node parse-demo.js --mock

# 5. Machine-readable JSON output
node parse-demo.js --mock --json

# 6. Presets and candidate disqualification check
node parse-demo.js --mock --preset SSC_CGL --candidate underage

# 7. Clean error exit code verification
node parse-demo.js --pdf fixtures/missing_file.pdf
```

### 5.2 Invalidation Conditions
- If any test in `npm test` fails.
- If `parse-demo.js` imports or requires `@google-cloud/firestore` or `resend`.
- If `node parse-demo.js --mock --json` emits non-JSON banner text on stdout.
- If invalid arguments or missing files cause unhandled stack traces rather than clean exit code 1.
