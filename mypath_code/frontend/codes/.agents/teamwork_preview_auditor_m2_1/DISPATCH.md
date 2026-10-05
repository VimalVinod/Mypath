# Dispatch: Forensic Auditor (M2 Integrity Verification)

- Archetype: teamwork_preview_auditor
- Role: M2 Integrity Auditor
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_auditor_m2_1
- Target Project Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
- Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
- Worker Handoff: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m2_1/handoff.md

## Tasks
Perform forensic integrity verification on Milestone 2 changes:
1. Verify genuine CSS media queries vs hardcoded mocks.
2. Check for prohibited patterns: conditional JavaScript (`isMobile`, `useMediaQuery`, resize listeners), duplicate mobile DOM nodes, removal of inline styles, generic AI styling.
3. Check desktop fidelity (>1024px) for 0 rule leakage.
4. Deliver verdict (`CLEAN` or `INTEGRITY VIOLATION`) with evidence in `handoff.md` and send message to orchestrator.

## 2026-09-17T02:00:00Z
You are the Forensic Integrity Auditor for Milestone 2.
Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_auditor_m2_1
Dispatch file: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_auditor_m2_1/DISPATCH.md
Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
Worker Handoff: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m2_1/handoff.md

Perform forensic integrity checks on Milestone 2 changes.
Check for genuine CSS media queries vs hardcoded mocks.
Check for prohibited patterns: conditional JS, duplicate mobile DOM trees, removal of inline styles, generic AI styling.
Deliver verdict (CLEAN or INTEGRITY VIOLATION) in handoff.md and send_message to orchestrator.

