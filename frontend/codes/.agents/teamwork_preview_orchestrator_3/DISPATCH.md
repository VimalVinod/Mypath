# DISPATCH — teamwork_preview_orchestrator_3

## Mission
Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.

## Context
This is a restart following a session quota reset.
- Working directory: `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_orchestrator_3`
- Project root: `c:/Users/sindh/Documents/codes/mypath/frontend/codes`
- Authoritative request: `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md`
- Existing architectural artifacts:
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md` (Project decomposition, milestones, contracts)
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/TEST_INFRA.md` (E2E testing architecture)
  - Previous agent notes and handoffs are preserved under `.agents/` (e.g. `teamwork_preview_orchestrator_2`, `teamwork_preview_explorer_survey2_1`, `teamwork_preview_explorer_survey2_2`, `teamwork_preview_spec_miner_survey2_1`).

## Core Requirements & Constraints
1. **CSS-driven responsiveness**: Implement responsiveness strictly through `responsive.css` using media queries (mobile <=768px, tablet <=1024px, desktop >1024px). Add classes where needed. Use `!important` only when required to override inline styles, avoiding unnecessary `!important`.
2. **Strict Preservation**: Keep exact existing layout, DOM structure, components, logos, colors, typography. Do not add, remove, or invent UI elements. No generic AI styling (no new gradients, glassmorphism, shadows).
3. **Desktop Integrity**: Desktop view (>1024px) must remain 100% pixel-for-pixel untouched and unaltered. No conditional JS/JSX rendering (`isMobile` hooks) or duplicate mobile DOM nodes.
4. **Execution Protocol**: You are a dispatch-only Project Orchestrator. Execute dual-track execution (implementation milestones and E2E verification). Report completion to Sentinel when all milestones pass verification.

## 2026-09-17T01:31:58Z
You are teamwork_preview_orchestrator, the Project Orchestrator.

Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_orchestrator_3
Project root: c:/Users/sindh/Documents/codes/mypath/frontend/codes
Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
Dispatch instructions: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_orchestrator_3/DISPATCH.md

Mission: Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.

Context & Restart Status:
This session is restarted after a quota reset.
- `c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md` and `TEST_INFRA.md` already exist at the project root from Phase 0 & Phase 1.
- Previous agent outputs and handoffs are preserved in `.agents/`.
- Review the existing artifacts, initialize your BRIEFING.md and progress.md, and drive the execution of the dual track (E2E Testing Track and Milestone implementation cycles).

Key constraints:
- Pure CSS-driven responsiveness via central `responsive.css` with media queries (mobile <=768px, tablet <=1024px, desktop >1024px).
- Add classes only where needed; use !important only when required to override existing inline styles, avoiding unnecessary !important.
- Strict preservation of assets, DOM structure, components, logos, colors, typography. Do not add, remove, or invent UI elements. No generic AI styling.
- Desktop view (>1024px) must remain 100% pixel-for-pixel identical to current state. No conditional JSX/JS branching (no isMobile hooks) and no duplicate mobile DOM nodes.
- Dispatch-only: coordinate subagents (explorers, workers, reviewers, challengers, auditors, test writers), maintain progress.md, and report completion to me when verified.

