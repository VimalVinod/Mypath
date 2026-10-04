# Context — teamwork_preview_orchestrator_3

## User Requirements & Boundaries
- Target: Standalone Node.js backend pipeline.
- Key Components:
  1. Targeted PDF Parsing (keyword-based page/sentence filtering to save tokens and noise) — [DONE, verified with 40 unit tests and 29 challenger tests].
  2. Gemini API Integration using official `@google/genai` SDK for structured extraction (Type.OBJECT schema, grounded prompt, mock fallback) — [NEAR COMPLETE, 99/99 regression tests pass, ready for final sign-off].
  3. Unity / Database Checking module (comparing extracted data against criteria/schema rules, candidate qualification matching, diff diagnostics) — [PLANNED].
  4. Standalone Execution via `parse-demo.js` (no Firestore, no email/Resend, formatted console dashboard) — [PLANNED].
  5. E2E Verification & Hardening (comprehensive test runner, high test coverage across all requirements) — [PLANNED].

## Constraints
- Windows OS environment.
- Root directory: `c:\Users\sindh\Documents\codes\mypath-scraper`.
- Metadata folder: `.agents\`.
- All code implementation, testing, and exploration must be delegated to specialized subagents.
- Orchestrator maintains state in `.agents/teamwork_preview_orchestrator_3/`.
- No direct source code writing, no direct test execution, no direct code exploration by the orchestrator.
