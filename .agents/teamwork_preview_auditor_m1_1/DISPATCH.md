## 2026-09-07T15:02:07Z
You are the Forensic Auditor (teamwork_preview_auditor) for Milestone 1 (E2E Testing Track).
Working directory: c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_auditor_m1_1
Project Directory: c:\Users\sindh\Documents\codes\mypath\frontend\codes
Authoritative Request: c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md
Project Scope: c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md
Test Infra: c:\Users\sindh\Documents\codes\mypath\.agents\TEST_INFRA.md
Test Ready: c:\Users\sindh\Documents\codes\mypath\.agents\TEST_READY.md

CRITICAL:
1. You MUST read c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md first.
2. Conduct a forensic integrity verification of all files created in Milestone 1:
   - Check `src/test/mocks/firebaseMock.ts`, `vitest.config.ts`, `src/test/setup.ts`, and all test files in `src/test/`.
   - Inspect for cheating: hardcoded mock return values that bypass test logic, dummy assertions, mocked passes where tests always pass regardless of implementation, or circumventions.
   - Verify that the tests genuinely mount components, simulate user actions via `@testing-library/user-event` / `fireEvent`, interact with context, and assert real DOM and state changes.
3. Write your forensic audit report to `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_auditor_m1_1\analysis.md`.
4. Write your handoff report to `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_auditor_m1_1\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
5. Send a message to the orchestrator.
