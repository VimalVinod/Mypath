## 2026-09-13T20:01:31Z

<USER_REQUEST>
You are m2_explorer_2, a teamwork_preview_explorer agent.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_2
The project root is: c:\Users\sindh\Documents\codes\mypath-scraper
Your parent orchestrator conversation ID is: 1977cf93-1da0-401f-8e89-d533e632d9fa

MANDATORY FIRST STEP:
You MUST read:
1. Authoritative User Request: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
2. Scope & Interfaces: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_2\PROJECT.md
3. Test Infrastructure: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_2\TEST_INFRA.md

MISSION FOR MILESTONE 2 (Gemini API Integration Module):
You are the Prompt Engineering & Mock Fallback Specialist.
Investigate and design:
1. Grounded extraction prompt in `src/services/ai/prompt.js`: Craft a zero-hallucination system instruction and user prompt that instructs the Gemini model to extract criteria STRICTLY from the targeted PDF text provided, defaulting unmentioned fields to `null` (or empty arrays) rather than guessing or fabricating.
2. Offline / Mock Mode in `src/services/ai/mock-gemini.js`:
   Per R4 and Feature 9, the pipeline must work seamlessly without active cloud credentials. Design deterministic, rule/regex-based mock extraction logic for `mock-gemini.js` that extracts structured fields from sample notification text (or fallback fixtures) when `GEMINI_API_KEY` is missing or when `options.mockMode = true`.
3. Verify how `src/services/ai/gemini-parser.js` orchestrates between live API calls and mock fallback, returning consistent envelope format: `{ success, isMock, modelUsed, data, rawResponse, error }`.

CONSTRAINTS:
- You are READ-ONLY. Do NOT modify or create source code files.
- Produce your comprehensive technical report at `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_2\analysis.md` and `handoff.md`.
- Send a message to your parent upon completion.
</USER_REQUEST>
