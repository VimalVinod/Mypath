# Orchestration Plan — teamwork_preview_orchestrator_3

## Objective
Execute Milestones 2 through 5 of the PDF Parsing and Validation Pipeline:
- M1: Targeted PDF Parsing Module [DONE & 100% VERIFIED]
- M2: Gemini API Integration Module (@google/genai, JSON Schema, prompt, mock mode) [NEAR COMPLETE — 1 worker dispatch for final 15-line age regex fix]
- M3: Unity / Database Checking Module (criteria verification, diffs, candidate eligibility) [PLANNED]
- M4: Standalone Execution CLI Runner (parse-demo.js, mock criteria, console dashboard) [PLANNED]
- M5: E2E Verification & Hardening (comprehensive test suite execution, npm test verification) [PLANNED]

## Step-by-Step Execution Plan:
1. **Milestone 2 Final Sign-Off**:
   - Spawn a worker (`m2_final_worker`) to apply the surgical 15-line patch from Section 4 of `.agents/m2_iter2_challenger_1/handoff.md` to `src/services/ai/mock-gemini.js` lines 135–172.
   - Worker verifies:
     - `node .agents/m2_iter2_challenger_1/additional_stress_harness.js` (30/30 PASS)
     - `node .agents/m2_challenger_1/adversarial_harness.js` (34/34 PASS)
     - `node .agents/m2_challenger_2/challenge_harness.js` (58/58 PASS, 0 crashes)
     - `npm test` (all suites pass)
   - Mark Milestone 2 as **DONE** in `PROJECT.md` and `progress.md`.
2. **Milestone 3 Execution (Unity / Database Checking Module)**:
   - Module: `src/services/validator/unity-checker.js` & `src/services/validator/rules.js`.
   - Contract: Interface Contract #3 in `PROJECT.md`.
   - Iteration cycle: Explorers (3) -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.
3. **Milestone 4 Execution (Standalone CLI Runner `parse-demo.js`)**:
   - `parse-demo.js`: PDF parsing -> Gemini extraction -> Unity check -> console dashboard.
   - Standalone execution: Zero Firestore, zero Resend. Support `--mock` and auto-mock fallback.
   - Iteration cycle: Explorers -> Worker -> Reviewers -> Challengers -> Auditor -> Gate.
4. **Milestone 5 Execution (E2E Testing & Hardening)**:
   - Run complete test suite (`npm test`), verifying all Tiers 1-4 and adversarial Tier 5 tests pass.
5. **Sentinel Final Handover**:
   - Report complete pipeline results to Sentinel parent (`d95f4bb8-6af5-44c5-b990-bbd127973528`).
