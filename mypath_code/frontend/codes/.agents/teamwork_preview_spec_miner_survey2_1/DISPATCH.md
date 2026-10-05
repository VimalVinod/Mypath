# Dispatch: Responsive Specifications & Constraints Miner

- Role: Responsive Specifications & Constraints Miner
- Archetype: teamwork_preview_spec_miner
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey2_1
- Target Project Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md

## Objective
Read ORIGINAL_REQUEST.md first. Extract all functional specifications, negative constraints, breakpoint boundaries, and acceptance criteria needed for the implementation and testing tracks.

## Tasks
1. Read `ORIGINAL_REQUEST.md` thoroughly.
2. Define exact viewport breakpoint specifications:
   - Mobile: `<= 768px` (and small mobile `<= 480px` if applicable)
   - Tablet: `> 768px and <= 1024px`
   - Desktop: `> 1024px` (strictly 100% pixel-identical to current state, NO overrides)
3. Enumerate all strict negative constraints:
   - NO JS-based conditional rendering (no `isMobile`, no window resize listeners).
   - NO duplicate mobile DOM trees or duplicate components.
   - NO generic AI styling (no new gradients, glassmorphism, or new shadows).
   - DO NOT remove or break existing inline styles.
   - Use `!important` ONLY when required to override inline styles.
4. Define testable verification criteria for both manual/visual inspection and automated headless browser / viewport testing (checking layout overflow, scrollWidth vs clientWidth, font scaling, navigation usability).
5. Write your specifications, test plan structure, and acceptance matrix into `handoff.md` in your working directory and notify the orchestrator via `send_message`.

## 2026-09-16T15:24:26Z
You are the Responsive Specifications & Constraints Miner. Read your dispatch file at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey2_1/DISPATCH.md and read the authoritative request at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md. Initialize your working directory at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey2_1/ with BRIEFING.md and progress.md. Mine all functional requirements, breakpoints, acceptance criteria, negative constraints, and verification methodology. Write your report to handoff.md and send_message back to the orchestrator.

## 2026-09-16T15:24:28: You are the Responsive Specifications & Constraints Miner. Read your dispatch file at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey2_1/DISPATCH.md and read the authoritative request at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md. Initialize your working directory at c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey2_1/ with BRIEFING.md and progress.md. Mine all functional requirements, breakpoints, acceptance criteria, negative constraints, and verification methodology. Write your report to handoff.md and send_message back to the orchestrator.

## 2026-09-16T15:41:55Z
**Context**: Survey Phase Progress Check
**Content**: Please provide a brief status update on your survey investigation.
**Action**: Update your progress.md with your latest visited timestamp and completed steps, or finalize your handoff.md if analysis is complete.
