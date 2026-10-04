# Dispatch: Forensic Auditor (M1 Integrity Verification)

- Archetype: teamwork_preview_auditor
- Role: M1 Integrity Auditor
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_auditor_m1_1
- Target Project Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
- Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
- Worker Handoff: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m1_1/handoff.md

## Forensic Audit Protocol
Perform an unyielding integrity check on Milestone 1 code changes:
1. **Code Authenticity**:
   - Verify that responsive rules are genuine CSS media queries in `src/styles/responsive.css`.
   - Check that no test results or expected values are hardcoded.
   - Check that no dummy or facade implementations were introduced.
2. **Prohibited Patterns Check**:
   - Check for prohibited conditional JavaScript rendering: search for `isMobile`, `useMediaQuery`, `window.innerWidth`, resize event listeners in JSX components. (MUST BE ZERO).
   - Check for duplicate mobile-specific DOM trees or duplicate components. (MUST BE ZERO).
   - Check for removal of existing inline styles. (MUST BE ZERO).
   - Check for generic AI styling (no new gradients, glassmorphism blur, neon glow).
3. **Desktop Fidelity**:
   - Verify that no rules in `responsive.css` apply outside `@media` queries (>1024px).
4. **Audit Verdict**:
   - Deliver `CLEAN` or `INTEGRITY VIOLATION`.
   - Document all evidence in `handoff.md` and report to orchestrator via `send_message`.

## 2026-09-17T01:44:00Z
You are the Forensic Integrity Auditor for Milestone 1.
Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_auditor_m1_1
Dispatch file: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_auditor_m1_1/DISPATCH.md
Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
Worker Handoff: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m1_1/handoff.md

Your task:
1. Perform forensic integrity checks on Milestone 1 code changes.
2. Check for genuine CSS media queries vs hardcoded hacks or facades.
3. Check for prohibited patterns: conditional JavaScript (isMobile, useMediaQuery, resize listeners), duplicate mobile DOM trees, removal of inline styles, generic AI styling.
4. Verify zero desktop overrides (>1024px).
5. Deliver verdict (CLEAN or INTEGRITY VIOLATION) with full evidence in handoff.md, and send_message to orchestrator.
