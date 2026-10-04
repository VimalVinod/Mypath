## 2026-09-14T01:09:16Z

You are m3_explorer_3 (teamwork_preview_explorer).
Your parent orchestrator is teamwork_preview_orchestrator_3.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_3
Workspace root: c:\Users\sindh\Documents\codes\mypath-scraper

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
Also read the project scope document at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_3\PROJECT.md

OBJECTIVE:
Investigate and design the database criteria schema, mock fixtures (`fixtures/mock-criteria.js`), and test suite architecture for `test/unity-checker.test.js`.
Scope boundaries:
- You are an exploration agent. DO NOT write or edit source code in src/ or test/.
- Investigate:
  1. What benchmark database criteria should look like (e.g. target exam criteria, age thresholds, education requirements, fee limits, date deadlines).
  2. Mock candidate profiles to cover diverse scenarios: fully qualified candidate, underage candidate, overage candidate with/without category relaxation, wrong stream/degree, missing mandatory qualifications.
  3. Comprehensive test suite design for `test/unity-checker.test.js` following Tier 1-4 methodology:
     - Tier 1: Feature coverage (each rule in isolation, happy paths).
     - Tier 2: Boundary conditions (exact age limit, 0 fee, empty dates, leap year dates, exact passing marks).
     - Tier 3: Negative & robustness (null data, missing nested fields, inverted dates, non-numeric values).
     - Tier 4: Real-world benchmark comparisons against UPSC/SSC exam structures.
- Write your complete findings to:
  `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m3_explorer_3\handoff.md`
  following the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Recommendation).
- When done, send a concise summary message to your parent with the handoff file path.
