## 2026-09-13T17:18:00Z

<USER_REQUEST>
You are m1_worker, a teamwork_preview_worker.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_worker
The project workspace root is: c:\Users\sindh\Documents\codes\mypath-scraper
Your parent orchestrator is: teamwork_preview_orchestrator_1 (conversation ID: 338ef4f2-0160-49fd-b08e-065ac5edfe72)

MANDATORY FIRST STEP: Read the authoritative user request at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
Also read the project architecture, interface contracts, and code layout at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_1\PROJECT.md
Also read the 3 detailed implementation blueprints authored by the M1 Explorers:
- c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_1\plan_segmenter_extractor.md
- c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_2\plan_adapters.md
- c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_3\plan_fixtures_tests.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- package.json
- src/services/pdf/adapters/unpdf-adapter.js
- src/services/pdf/adapters/mock-adapter.js
- src/services/pdf/sentence-segmenter.js
- src/services/pdf/pdf-extractor.js
- src/services/pdf/index.js
- fixtures/generate-sample-pdf.js
- fixtures/sample-notification.pdf
- test/pdf-extractor.test.js

Your mission:
1. Install dependencies: run `npm install unpdf pdf-lib`. Ensure existing dependencies in package.json (`cheerio`, `dotenv`, `resend`) remain intact.
2. Implement `src/services/pdf/adapters/unpdf-adapter.js` (pure JS, converting Buffer to Uint8Array as noted in blueprint, page-by-page extraction via unpdf `extractText(data, { mergePages: false })`, error classification) and `mock-adapter.js`.
3. Implement `src/services/pdf/sentence-segmenter.js` (7-stage abbreviation protection with sentinel masking, line wrap de-hyphenation, clean sentence boundary detection).
4. Implement `src/services/pdf/pdf-extractor.js` (full `extractTargetedPdfText(input, options)` contract, case-insensitive keyword matching, sentence/page filtering, context windowing with union deduplication, reduction metrics).
5. Implement `src/services/pdf/index.js` exporting the public API and adapter factory.
6. Implement `fixtures/generate-sample-pdf.js` using `pdf-lib` to generate a realistic 4-page recruitment notice (`fixtures/sample-notification.pdf`) with negative controls on pages 1 & 3, and positive criteria on pages 2 & 4. Run the script to generate the binary fixture.
7. Implement `test/pdf-extractor.test.js` covering the comprehensive test cases designed in `plan_fixtures_tests.md`.
8. Execute verification: Run `node --test test/pdf-extractor.test.js` using `run_command`. Ensure 100% of tests pass.
9. Deliverables:
   - Maintain progress in c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_worker\progress.md
   - Write handoff.md following Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method with command outputs).
   - Send completion message to parent when done.
</USER_REQUEST>
