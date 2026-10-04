## 2026-09-14T12:17:58Z
You are m4_worker (teamwork_preview_worker).
Your parent orchestrator is teamwork_preview_orchestrator_3.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_worker
Workspace root: c:\Users\sindh\Documents\codes\mypath-scraper

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
Also read the project scope document at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_3\PROJECT.md

READ EXPLORER BLUEPRINTS:
1. `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_explorer_1\handoff.md` (CLI argument parser, options, whitelisting, dotenv, exit codes)
2. `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_explorer_2\handoff.md` (Pipeline data flow, token reduction metrics, zero external services, mock fallback)
3. `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_explorer_3\handoff.md` (Dashboard UX, quiet dotenv in json mode, and automated test suite)

REFERENCE IMPLEMENTATIONS:
- `.agents/m4_explorer_3/proposed_parse-demo.js`
- `.agents/m4_explorer_3/proposed_parse-demo.test.js`

OBJECTIVE:
Implement `parse-demo.js` in project root and `test/parse-demo.test.js` under test/:
1. `parse-demo.js`:
   - Standalone CLI runner with zero Firestore or email/Resend dependencies.
   - Loads environment via `require('dotenv').config({ quiet: true })` (preventing stdout pollution in JSON mode).
   - CLI flags via `node:util.parseArgs`:
     - `--pdf <path>` (default: `fixtures/sample-notification.pdf`)
     - `--keywords <list>` (default: `eligibility,age,qualification,vacancies,fee,dates,selection`)
     - `--mock` (force offline mock Gemini mode)
     - `--preset <name>` (UPSC, SSC_CGL, IBPS_PO, TECHNICAL_SERVICES; default: UPSC)
     - `--candidate <name>` (supports profile keys, aliases like `underage`, or JSON; default: `FULLY_QUALIFIED_GENERAL`)
     - `--json` (pure machine-readable JSON output)
     - `--help` / `-h` (usage guide, exits with 0)
   - Executes 3-step pipeline:
     Step 1: Targeted PDF extraction via `extractTargetedPdfText`.
     Step 2: Structured criteria extraction via `parseStructuredCriteria` (auto-mock if GEMINI_API_KEY absent or --mock set).
     Step 3: Unity verification via `verifyUnity(extractedData, databaseCriteria)`.
   - Console Dashboard formatting:
     - Header banner & execution mode.
     - Phase 1: Targeted PDF Extraction reduction statistics card (pages matched, raw vs targeted chars/tokens, reduction percentage ~74-78%).
     - Phase 2: Gemini Extracted Criteria summary card.
     - Phase 3: Unity Verification Report using `formatUnityReport(unityResult, { color: true })`.
     - Phase 4: Executive Pipeline Summary.
   - Exit codes: 0 for success/help, 1 for execution error with clean user-facing error message (no stack traces).
   - Export modular functions (`parseCliArgs`, `resolvePreset`, `resolveCandidate`, `runPipeline`, `main`) so tests can require them.
2. `test/parse-demo.test.js`:
   - Comprehensive integration tests covering `--help`, `--mock`, `--preset`, `--candidate`, `--json`, and non-existent file error code 1.

EXCLUSIVE WRITE BOUNDARIES:
- `parse-demo.js`
- `test/parse-demo.test.js`
- `fixtures/mock-criteria.js` (if export helpers need adjustment)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION COMMANDS:
1. `node parse-demo.js --help` -> exit code 0
2. `node parse-demo.js --mock` -> exit code 0, complete dashboard printed
3. `node parse-demo.js --mock --preset SSC_CGL --candidate underage` -> exit code 0, correct candidate evaluated
4. `node parse-demo.js --mock --json` -> exit code 0, pure parseable JSON
5. `npm test` -> all suites pass (189 existing + new parse-demo tests, 0 failures)

OUTPUT REQUIREMENTS:
- Write your complete handoff report to:
  `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_worker\handoff.md`
- Send a completion message to parent with verification commands and outputs.
