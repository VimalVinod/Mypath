## 2026-09-14T11:50:44Z
<USER_REQUEST>
You are m3_worker (teamwork_preview_worker).
Your parent orchestrator is teamwork_preview_orchestrator_3.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_worker
Workspace root: c:\Users\sindh\Documents\codes\mypath-scraper

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
Also read the project scope document at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_3\PROJECT.md

OBJECTIVE:
Implement the complete Unity / Database Checking Module for Milestone 3 conforming to Interface Contract #3 and Requirements §R3 / §R4.

EXPLORER BLUEPRINTS & HANDOFFS TO READ:
1. `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_1\handoff.md` (Declarative rules engine architecture, registry, evaluators, candidate eligibility matching with category relaxation and education hierarchy)
2. `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_2\handoff.md` (Unity checking comparison engine, input unwrapping, summary scorecard invariants, overall verdict truth table, console formatting helpers `formatUnityReport` and `printUnityReport`)
3. `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_3\handoff.md` (Mock database criteria fixtures and comprehensive 4-Tier test suite)

REFERENCE CODE IN AGENT WORKSPACES (Verified prototype implementations):
- `.agents/m3_explorer_1/test-full-declarative-engine.js`
- `.agents/m3_explorer_2/test_unity_prototype.js`
- `.agents/m3_explorer_3/proposed_mock_criteria.js`
- `.agents/m3_explorer_3/proposed_unity_checker_test.js`

EXCLUSIVE WRITE BOUNDARIES (You own and may create/edit these files):
1. `fixtures/mock-criteria.js` (Presets: UPSC, SSC CGL, IBPS PO, Technical Engineering; 15 mock candidate profiles)
2. `src/services/validator/rules.js` (Declarative rules registry, evaluators: required, equals, range, enum, dateOrder, regex, custom; candidate eligibility matching: age + category relaxation, education levels, streams)
3. `src/services/validator/unity-checker.js` (Core engine `verifyUnity(extractedData, databaseCriteria)`, summary scorecard, verdict resolution: PASS/FAIL/WARNING, candidate eligibility breakdown, `formatUnityReport`, `printUnityReport`)
4. `src/services/validator/index.js` (Module entry point exporting `verifyUnity`, `rules`, `formatUnityReport`, `printUnityReport`)
5. `test/unity-checker.test.js` (Comprehensive multi-tier test suite: isolated rules, boundary conditions, negative/malformed data, full recruitment benchmark comparisons)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

VERIFICATION REQUIREMENTS:
- Run `npm test` using run_command.
- Verify that all existing 129 tests STILL pass (zero regressions in pdf-extractor, gemini-parser, m2 stress).
- Verify that ALL new unity-checker tests pass cleanly with 0 failures.
- Document test commands and actual terminal outputs in your handoff report.

OUTPUT REQUIREMENTS:
- Write your complete handoff report to:
  `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_worker\handoff.md`
  following the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
- Send a concise completion message with the path to your handoff report back to your parent.
</USER_REQUEST>
