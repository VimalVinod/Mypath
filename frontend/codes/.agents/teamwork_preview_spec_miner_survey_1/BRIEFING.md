# BRIEFING — 2026-09-16T14:55:00Z

## Mission
Extract and formalize all explicit requirements, acceptance criteria, boundaries, hard negative constraints, and verification criteria for responsive CSS styling.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Teamwork specialist, Specification Mining
- Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_spec_miner_survey_1
- Original parent: 02b2671b-7a66-4185-b948-8ddd7b7a244b
- Milestone: Survey / Spec Mining

## 🔒 Key Constraints
- Central responsive.css file creation and import rules
- Standard media queries breakpoints (mobile <=768px, tablet 768px-1024px, desktop >1024px)
- Use of !important rules: only to override existing inline styles, avoid unnecessary !important
- Stacking rules for small screens (Dashboard stats grid, Profile forms, layouts)
- Downscaling rules (padding, margins, gap, font sizes)
- Navigation and layout adaptation purely via CSS media queries
- ZERO alteration to desktop view (>1024px) - must remain 100% pixel-for-pixel identical
- ZERO new components, ZERO conditional JSX branching (no isMobile hooks), ZERO duplicate mobile DOM trees
- ZERO removal of existing inline styles
- ZERO generic "AI" styling (no new gradients, glassmorphism, or shadows)
- Preservation of existing colors, icons, typography, logos, assets
- Read-only: do NOT implement anything

## Current Parent
- Conversation ID: 02b2671b-7a66-4185-b948-8ddd7b7a244b
- Updated: not yet

## Task Summary
- **What to build**: Specification discovery & synthesis for responsive mobile/tablet styling via CSS only.
- **Success criteria**: Comprehensive requirements catalog, feature tables, edge case tables, verification methodology, and acceptance criteria in handoff.md.
- **Interface contracts**: ORIGINAL_REQUEST.md & DISPATCH.md
- **Code layout**: Target codebase `c:/Users/sindh/Documents/codes/mypath/frontend/codes`

## Loaded Skills
- None specified by orchestrator

## Key Decisions Made
- Specification mining will cover both functional requirements (breakpoints, CSS class additions, inline overrides, stacking, scaling) and negative constraints (desktop integrity, zero JSX logic change, zero inline style removal, zero AI styles).
- Codebase inspection will be conducted to identify exact structure, existing inline styles, CSS files, and build/test commands.

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness heartbeat & step status
- handoff.md — Final specification report
