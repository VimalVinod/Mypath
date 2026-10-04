# Dispatch: Milestone 2 Worker (Dashboard & Stats View)

- Archetype: teamwork_preview_worker
- Role: Milestone 2 Implementation Worker
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m2_1
- Target Project Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
- Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
- Explorer Handoffs:
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m2_1/handoff.md`
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m2_2/handoff.md`
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m2_3/handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusive Write Ownership
You have exclusive write ownership over the following files:
1. `src/pages/DashboardPage.tsx`
2. `src/styles/responsive.css`

You MUST NOT modify any other files.

## Tasks
1. In `src/pages/DashboardPage.tsx`:
   - Line 71: Add `className="dashboard-banner"` to the incomplete profile banner container div.
   - Line 83: Add `className="dashboard-banner-content"` to the inner content div.
   - Line 92: Add `className="dashboard-banner-btn"` to the "Complete Profile →" button.
   - Line 138: Add `className="dashboard-deadlines-card deadlines-card"` to the upcoming deadlines card div.
   - Line 150: Add `className="deadline-item"` to the deadline item row div.
   - Line 163: Add `className="dashboard-empty-card"` to the empty state container div.
   - Line 171: Add `className="dashboard-empty-btn"` to the "Explore Available Exams" button.
   - Retain ALL existing inline styles and JSX structure completely intact. Do not delete any styles or elements.
2. In `src/styles/responsive.css`:
   - Under Section 2 (`@media screen and (max-width: 768px)`):
     - Add rules for `.dashboard-banner`, `.dashboard-banner-content`, `.dashboard-banner-btn` (vertical stack, `align-items: flex-start`, full-width button).
     - Add rules for `.dashboard-deadlines-card` (padding 1rem !important).
     - Add rules for `.deadline-item` (`flex-wrap: wrap !important`, word breaking, prevention of title overflow).
     - Add rules for `.dashboard-empty-card` (padding 1.75rem 1.25rem !important) and `.dashboard-empty-btn`.
     - Ensure `.stat-card` has `min-width: 0 !important; width: 100% !important;` for robust 2-column mobile layout.
   - Under Section 3 (`@media screen and (max-width: 480px)`):
     - Refine `.dashboard-banner` padding (0.875rem !important) and button text.
     - Refine `.dashboard-deadlines-card` padding (0.875rem 0.75rem !important).
     - Refine `.dashboard-empty-card` padding (1.5rem 0.75rem !important) and `.dashboard-empty-btn` (width 100%, max-width 280px).
   - Strict Desktop Guarantee: Exactly ZERO rules outside `@media` queries; viewports >1024px experience 0 overrides.
3. Verification:
   - Run `npm run build` (`tsc && vite build`) and ensure exit code 0.
   - Run `node tests/verify-responsive.cjs` and ensure all 125 tests pass.
   - Write `handoff.md` and send completion message to orchestrator.
