# Dispatch: E2E Test Suite Architect & Writer

- Archetype: teamwork_preview_test_writer
- Role: E2E Test Suite Architect & Writer
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_test_writer_e2e_2
- Target Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
- Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
- Test Infra Plan: c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_INFRA.md

## Mission & Instructions
You are the dedicated E2E Test Suite Architect & Writer for the project.
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `TEST_INFRA.md`.
2. Follow the 4-Tier test methodology across all 6 canonical viewports:
   - Small Mobile (360px × 740px)
   - Standard Mobile (375px × 812px)
   - Large Mobile (414px × 896px)
   - Tablet Portrait (768px × 1024px)
   - Tablet Landscape (1024px × 768px)
   - Desktop Standard (1440px × 900px)
3. Implement an automated, opaque-box responsive test harness (e.g. executable Node.js test script `tests/verify-responsive.cjs` or similar) that can be run directly from terminal via `node tests/verify-responsive.cjs` (or `npm test`) with exit code 0 on pass.
   - Tier 1: Feature Coverage (≥5 checks per feature for all 20 features)
   - Tier 2: Boundary & Corner Cases (320px width, 768px boundary, 1024px boundary, 1025px desktop baseline preservation where 0 mobile rules apply)
   - Tier 3: Cross-Feature Interactions
   - Tier 4: Real-World User Journeys (student exam discovery, login, dashboard navigation, profile editing, application tracker)
4. Verify the test suite execution.
5. Create `TEST_READY.md` at project root (`c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_READY.md`) summarizing test runner command, tier coverage counts, and feature checklist.
6. Write `handoff.md` in your working directory and communicate results back to the orchestrator via `send_message`.

## 2026-09-17T01:33:57Z
You are the E2E Test Suite Architect & Writer for the project.
Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_test_writer_e2e_2
Dispatch file: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_test_writer_e2e_2/DISPATCH.md
Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
Test Infra Plan: c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_INFRA.md

Your task:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md, and DISPATCH.md.
2. Build an automated, opaque-box responsive test suite across all 6 canonical viewports:
   - Small Mobile (360px × 740px)
   - Standard Mobile (375px × 812px)
   - Large Mobile (414px × 896px)
   - Tablet Portrait (768px × 1024px)
   - Tablet Landscape (1024px × 768px)
   - Desktop Standard (1440px × 900px)
3. Implement 4 tiers of test coverage:
   - Tier 1: Feature Coverage (>=5 checks per feature for all 20 features)
   - Tier 2: Boundary & Corner Cases (320px width, 768px tablet cutoff, 1024px tablet cutoff, 1025px desktop baseline)
   - Tier 3: Cross-Feature Interactions
   - Tier 4: Real-World Scenarios
4. Make sure the test runner can be executed via terminal (e.g., node tests/verify-responsive.cjs) and returns exit code 0 when passing.
5. Create TEST_READY.md at project root (c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_READY.md) when complete.
6. Write handoff.md in your working directory and notify the orchestrator with send_message.
