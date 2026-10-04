# Dispatch: E2E Test Writer (Testing Track)

- Role: E2E Test Suite Architect & Writer
- Archetype: teamwork_preview_test_writer
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_test_writer_e2e_1
- Target Project Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
- Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
- Test Infra Plan: c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_INFRA.md

## Objective
Design and implement an automated, opaque-box responsive test suite for the project that validates responsiveness across all 6 canonical viewports:
1. Small Mobile (360px × 740px)
2. Standard Mobile (375px × 812px)
3. Large Mobile (414px × 896px)
4. Tablet Portrait (768px × 1024px)
5. Tablet Landscape (1024px × 768px)
6. Desktop Standard (1440px × 900px)

## Requirements & Methodology
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `TEST_INFRA.md`.
2. Follow the 4-Tier test methodology:
   - Tier 1: Feature Coverage (≥5 checks per feature for all 20 features) - verifies element presence, visibility, and basic responsive layout.
   - Tier 2: Boundary & Corner Cases (320px width, 768px tablet cutoff, 1024px tablet cutoff, 1025px desktop baseline preservation where 0 mobile rules apply, cookie banner collision).
   - Tier 3: Cross-Feature Interactions (navigation reflow + page content, form inputs on mobile with keyboard margin, modal open on mobile).
   - Tier 4: Real-World Scenarios (student exam discovery journey, login journey, profile journey, tracker journey).
3. Implement the test suite in a self-contained Node.js script (e.g., `tests/verify-responsive.cjs` or similar) or test harness using Puppeteer, Playwright, or static CSS/AST/DOM analysis that can be executed via terminal (e.g. `node tests/verify-responsive.cjs`).
4. Ensure the test runner gives clear pass/fail output and exit code 0 on pass.
5. Create `TEST_READY.md` at project root (`c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_READY.md`) summarizing the test suite, test runner command, tier coverage counts, and feature checklist.
6. Write `handoff.md` and send completion message to orchestrator.

## 2026-09-16T16:00:29Z
You are the E2E Test Suite Architect & Writer for the E2E Testing Track. Read your dispatch file at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_test_writer_e2e_1/DISPATCH.md, the authoritative request at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md, the project scope at c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md, and test infra plan at c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_INFRA.md. Initialize your working directory at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_test_writer_e2e_1/ with BRIEFING.md and progress.md. Build the automated opaque-box responsive test suite across all 6 canonical viewports covering Tiers 1-4. Ensure it can be run via node command. Publish TEST_READY.md at project root upon completion, write handoff.md, and send_message back to the orchestrator.
