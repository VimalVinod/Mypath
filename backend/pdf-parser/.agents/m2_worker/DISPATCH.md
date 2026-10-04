## 2026-09-14T01:46:27Z
You are m2_worker, a teamwork_preview_worker agent.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_worker
The project workspace root is: c:\Users\sindh\Documents\codes\mypath-scraper
Your parent orchestrator conversation ID is: 1977cf93-1da0-401f-8e89-d533e632d9fa

MANDATORY FIRST STEP:
Read the following authoritative documents before touching any code:
1. Authoritative User Request: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
2. Scope Document: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_2\PROJECT.md
3. Test Infrastructure: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_2\TEST_INFRA.md
4. Explorer Reports:
   - m2_explorer_1 (SDK & Schema): c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_1\analysis.md and handoff.md
   - m2_explorer_2 (Prompt & Mock Fallback): c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_2\analysis.md and handoff.md
   - m2_explorer_3 (Test Suite Design): c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_3\analysis.md and handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own and may modify or create the following files exclusively:
- package.json
- src/services/ai/schema.js
- src/services/ai/prompt.js
- src/services/ai/mock-gemini.js
- src/services/ai/gemini-parser.js
- src/services/ai/index.js
- test/gemini-parser.test.js
Do NOT modify files owned by other milestones (such as src/services/pdf/*).

TASK OBJECTIVE (Milestone 2: Gemini API Integration Module):
1. Ensure `@google/genai` (v2.22.0) is installed and in `package.json` dependencies (`npm install @google/genai`).
2. Implement `src/services/ai/schema.js` using `@google/genai` `Type` enum conforming 100% to Interface Contract #2 in `PROJECT.md`.
3. Implement `src/services/ai/prompt.js` with grounded extraction instructions, strict closed-world assumption (null/empty array defaults for unmentioned fields).
4. Implement `src/services/ai/mock-gemini.js` with deterministic heuristic regex extraction for offline testing and fallback when `GEMINI_API_KEY` is absent or `mockMode: true`.
5. Implement `src/services/ai/gemini-parser.js` and `src/services/ai/index.js`:
   - Expose `parseStructuredCriteria(targetedText, options)` returning envelope `{ success, isMock, modelUsed, data, rawResponse, error }`.
   - Support `options.apiKey` (fallback to `process.env.GEMINI_API_KEY`), `options.model` (default `'gemini-2.5-flash'`), `options.mockMode` (default `false`, auto-true if key absent), and `options.client` (test double injection for unit tests).
   - Implement `normalizeCriteriaData(data)` to ensure robust data shape.
6. Implement `test/gemini-parser.test.js` covering all 43 test cases across 9 categories designed by `m2_explorer_3`.
7. Run the test suite:
   - `node --test test/gemini-parser.test.js`
   - `node --test test/pdf-extractor.test.js test/gemini-parser.test.js`
8. Write your completion report in `handoff.md` and send a message back to the parent orchestrator with passing test outputs.
