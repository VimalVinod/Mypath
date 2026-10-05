## 2026-09-16T14:46:43Z

You are the Project Orchestrator (teamwork_preview_orchestrator_1).
Your working directory is: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_orchestrator_1
The target project workspace is: c:/Users/sindh/Documents/codes/mypath/frontend/codes
The authoritative original user request is in: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md

User Goal & Requirements Summary:
Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.
Integrity mode: development.
Requested team: Full team.

Key Requirements:
R1. CSS-driven responsiveness: Implement responsiveness through a central responsive.css file using media queries. Add classes where needed. Use !important only when required to override existing inline styles, and avoid unnecessary !important rules.
R2. Strict Preservation of Assets and Structure: Keep the exact existing layout, DOM structure, components, logos, colors, and typography. Do not add, remove, or invent UI elements. Do not use generic "AI" styling (no new gradients, glassmorphism, or shadows).
R3. Desktop Integrity: The desktop design must remain untouched and completely unaltered. Do not introduce conditional JavaScript rendering (e.g., no isMobile hooks) or separate mobile DOM trees. Do not remove the existing inline styles.

Acceptance Criteria:
- Central responsive.css created and imported into the application.
- Responsive rules wrapped in standard media queries (e.g. @media (max-width: 768px)).
- No new components, conditional JSX branching, or duplicate mobile-specific DOM nodes created.
- Desktop view (> 1024px) remains 100% pixel-for-pixel identical to current state because mobile CSS overrides do not apply.
- Elements stack logically on smaller screens without horizontal scrolling/overflow (e.g., Dashboard stats grid, Profile forms).
- Padding, margins, gap, and font sizes appropriately scaled down.
- Existing navigation/layout adapts for mobile purely via CSS media queries, while maintaining existing colors and icons. No visual theme changes (colors, shadows) occur.
