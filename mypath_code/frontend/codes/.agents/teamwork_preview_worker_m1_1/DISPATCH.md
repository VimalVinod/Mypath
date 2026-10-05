# Dispatch: Milestone 1 Worker (Central Architecture & Global Shell)

- Archetype: teamwork_preview_worker
- Role: Milestone 1 Implementation Worker
- Working Directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m1_1
- Target Project Workspace: c:/Users/sindh/Documents/codes/mypath/frontend/codes
- Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
- Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md
- Explorer Synthesis & References:
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m1_4/handoff.md`
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m1_4/proposed_responsive.css`
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m1_5/handoff.md`
  - `c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_explorer_m1_6/handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusive Write Ownership
You have exclusive write ownership over the following files:
1. `src/styles/responsive.css`
2. `src/main.tsx`
3. `src/App.tsx`
4. `src/styles/mobile.css`
5. `src/components/SidebarLayout.tsx`
6. `src/components/CookieConsentBanner.tsx`
7. `src/components/Navbar.tsx`
8. `src/components/Footer.tsx`

You MUST NOT edit any other application source files during Milestone 1.

## Scope & Implementation Tasks
1. **Entry Point & Cascade Correction**:
   - In `src/main.tsx`: Reorder imports to import `./styles/theme.css`, then `./styles/responsive.css`, then `App`. Remove `import './styles/mobile.css'`.
   - In `src/App.tsx`: Remove `import './styles/responsive.css'`.
   - In `src/styles/mobile.css`: Deprecate/clean up (all rules consolidated into `responsive.css`).
2. **Central Responsive Stylesheet (`src/styles/responsive.css`)**:
   - Consolidate all mobile rules from `mobile.css`, existing `responsive.css`, and explorer recommendations into `src/styles/responsive.css`.
   - Structure strictly by media query:
     - `@media screen and (min-width: 769px) and (max-width: 1024px)`: Tablet rules (sidebar width 200px, scaled headers/padding).
     - `@media screen and (max-width: 768px)`: Mobile rules (bottom nav bar, 70px body clearance, cookie banner clearance, navbar scaling, footer reflow).
     - `@media screen and (max-width: 480px)`: Small mobile refinements (320px-360px overflow prevention, 46px modal avatars, 9px button text).
   - Desktop view (>1024px) MUST have strictly ZERO rule activation.
3. **App Shell & Navigation Reflow (`SidebarLayout.tsx`)**:
   - Add `className="sidebar-inner"` to the inner div of `SidebarContent` (line 86).
   - In `responsive.css`:
     - Set `.sidebar-container`: `position: fixed !important; bottom: 0 !important; top: auto !important; height: auto !important; max-height: 64px !important; z-index: 60 !important;`.
     - Hide desktop chrome: `.sidebar-logo-area, .sidebar-profile-area, .sidebar-signout, .sidebar-nav-header { display: none !important; }`.
     - Reflow nav buttons: `.sidebar-nav-btn`: `flex: 1 1 0 !important; min-width: 0 !important; flex-direction: column !important;` with truncated label text.
     - Position unread notification count badge anchored on the bell icon.
     - Apply 70px bottom padding clearance on `.main-content` and `.main-body` (`padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;`).
     - Apply `overflow-x: hidden !important; max-width: 100% !important;` across `.app-container`, `.main-content`, and `.main-body`.
4. **Modal & Banner Clearance**:
   - In `SidebarLayout.tsx`: Add semantic classes `.profile-picker-overlay`, `.profile-picker-modal`, `.profile-picker-grid`, `.profile-picker-avatar-btn`, `.profile-picker-close-btn` to the inline ProfilePicturePicker modal.
   - In `CookieConsentBanner.tsx`: Add classes `.cookie-consent-banner`, `.cookie-consent-text`, `.cookie-consent-actions`, `.cookie-consent-btn`.
   - In `responsive.css`:
     - Set `.profile-picker-modal`: `width: 92vw !important; max-width: 360px !important; padding: 1.25rem 1rem !important;`. Set avatar buttons to `52px !important; height: 52px !important;` (`46px` on `<= 360px`).
     - Set `.cookie-consent-banner`: Stack buttons full-width (`flex-direction: column !important; width: 100% !important;`). Add clearance above bottom nav on authenticated routes:
       `body:has(.sidebar-container) .cookie-consent-banner { bottom: 68px !important; }`.
5. **Verification**:
   - Run `npm run build` (`tsc && vite build`) and ensure exit code 0.
   - Verify layout and zero overflow down to 320px width.
   - Verify desktop view (>1024px) is 100% unaffected.
   - Write `handoff.md` and send completion message to orchestrator.

## 2026-09-17T01:39:13Z
You are the Milestone 1 Implementation Worker.
Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m1_1
Dispatch file: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/teamwork_preview_worker_m1_1/DISPATCH.md
Authoritative Request: c:/Users/sindh/Documents/codes/mypath/frontend/codes/.agents/ORIGINAL_REQUEST.md
Project Scope: c:/Users/sindh/Documents/codes/mypath/frontend/codes/PROJECT.md

Read your dispatch file and explorer findings. Tasks:
1. Implement consolidated CSS architecture in responsive.css, main.tsx, App.tsx, mobile.css.
2. Add semantic class names to SidebarLayout.tsx and CookieConsentBanner.tsx.
3. Pure CSS media query rules for App Shell, mobile bottom nav (top: auto !important fix), 70px body padding clearance, cookie banner clearance, profile picker modal scaling.
4. Run `npm run build` and ensure exit code 0.
5. Write handoff.md and notify orchestrator.
