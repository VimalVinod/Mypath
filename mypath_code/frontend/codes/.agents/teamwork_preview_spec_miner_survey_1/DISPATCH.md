# Dispatch Assignment for Specification Miner

- Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey_1
- Target codebase: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Original request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md

## Objective
Thoroughly examine the requirements and constraints in ORIGINAL_REQUEST.md and synthesize the comprehensive responsive specification and acceptance criteria.
1. Extract all functional requirements:
   - Central responsive.css file creation and import rules.
   - Standard media queries breakpoints (e.g. mobile <=768px, tablet 768px-1024px, desktop >1024px).
   - Use of !important rules: when permitted (only to override existing inline styles), when prohibited (unnecessary overrides).
   - Stacking rules for small screens (Dashboard stats grid, Profile forms, layouts).
   - Downscaling rules (padding, margins, gap, font sizes).
   - Navigation and layout adaptation purely via CSS media queries.
2. Extract all negative constraints & integrity requirements:
   - ZERO alteration to desktop view (>1024px) - must remain 100% pixel-for-pixel identical.
   - ZERO new components, ZERO conditional JSX branching (no isMobile hooks), ZERO duplicate mobile DOM trees.
   - ZERO removal of existing inline styles.
   - ZERO generic "AI" styling (no new gradients, glassmorphism, or shadows).
   - Preservation of existing colors, icons, typography, logos, assets.
3. Formulate the verification methodology and concrete criteria needed for acceptance.
4. Document your findings in handoff.md in your working directory.

## 2026-09-16T14:52:45Z
You are the Specification Miner (teamwork_preview_spec_miner_survey_1).
Your working directory is: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey_1
The target codebase is: c:/Users/sindh/Documents/codes/mypath/frontend/codes
Read your instructions in: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey_1/DISPATCH.md
Read the original request in: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md

Extract and formalize all explicit requirements, acceptance criteria, boundaries, and hard negative constraints (central responsive.css, breakpoints, !important usage, desktop 100% untouched, zero new components, zero conditional JSX, zero AI styling).
Formulate verification methodology and concrete criteria needed for acceptance.
Write your structured findings to handoff.md in your working directory and notify the orchestrator with send_message.
