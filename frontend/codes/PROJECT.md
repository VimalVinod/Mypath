# Project: Responsive Web Experience via Central CSS

## Architecture
- **Paradigm**: Pure CSS-driven responsiveness using media queries in a single central stylesheet (`src/styles/responsive.css`).
- **Cascade Precedence**: Imported in `src/main.tsx` after `theme.css` to ensure responsive overrides take final precedence.
- **Breakpoints**:
  - Small Mobile: `@media screen and (max-width: 480px)`
  - Mobile: `@media screen and (max-width: 768px)`
  - Tablet: `@media screen and (max-width: 1024px)` (and `(min-width: 769px) and (max-width: 1024px)`)
  - Desktop: `> 1024px` (strictly 0 overrides, 100% pixel-for-pixel identical to baseline)
- **Styling Rules & Overrides**:
  - Elements requiring responsive styling use non-invasive semantic CSS class names (e.g. `profile-section`, `auth-card`, `tracker-table-container`).
  - Scoped `!important` is used in media queries ONLY where required to override inline React `style={{ ... }}` props.
  - Zero removal of existing inline styles.
  - Zero JavaScript conditional rendering (no `isMobile`, no window resize listeners).
  - Zero duplicate mobile DOM trees or duplicate components.
  - Zero generic AI styling (no new gradients, glassmorphism blur, or neon shadows).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | App Shell Layout | Two-column app shell with sticky desktop sidebar and responsive content container | M1 | survey |
| 2 | Bottom Navigation Bar | Transforms desktop sidebar into fixed bottom nav bar on mobile (<=768px) with 70px body padding offset | M1 | survey |
| 3 | Main Content Container | Responsive padding scaling (1rem on mobile vs 2rem on desktop) and zero horizontal overflow | M1 | survey |
| 4 | Public Navbar & Header | Public header with compact flex layout, scaled logo, and responsive nav buttons | M1 | survey |
| 5 | Cookie Consent Banner | Sticky bottom banner stacking buttons on mobile and cleared above bottom nav | M1 | survey |
| 6 | Profile Picture Picker Modal | Modal card width (92vw on mobile) and responsive grid columns | M1 | survey |
| 7 | Central CSS Architecture | Consolidate responsive rules into `responsive.css` imported in `main.tsx` after `theme.css` | M1 | survey |
| 8 | Dashboard Stats Grid | 4 metric cards auto-fit on desktop, 2x2 grid on tablet (<=1024px), 2 cols on mobile (<=768px) | M2 | survey |
| 9 | Incomplete Profile Banner | Alert banner stacking text and action button cleanly on mobile without overflow | M2 | survey |
| 10 | Upcoming Deadlines Card | Card with scaled padding (1rem), text truncation prevention, and deadline badge wrapping | M2 | survey |
| 11 | Profile Form Grids | Multi-section form grids collapsing from 2-column to 1-column on mobile (<=768px) | M3 | survey |
| 12 | Education Cards | Dynamic qualification cards with scaled padding (1rem) and properly positioned delete button | M3 | survey |
| 13 | Profile Save Button | Full-width ergonomic save button on mobile with proper bottom clearance | M3 | survey |
| 14 | Tracker Table Reflow | Tabular exam rows with horizontal scroll on tablet and stacked 1-column card reflow on mobile | M4 | survey |
| 15 | Placeholder Empty Cards | Scaled padding (2rem vs 4rem) on BrowseExams, StudyMaterials, Notifications views | M4 | survey |
| 16 | Hero Banner Carousel | Marketing slider aspect ratio preservation (3008/1408) and scaled navigation touch arrows | M5 | survey |
| 17 | Trending Exam Cards Grid | Grid minmax adjusted to 280px to prevent overflow on 320px-360px mobile viewports | M5 | survey |
| 18 | Career Assessment Quiz Card | Promotional card stacking text and full-width CTA button on mobile with scaled padding | M5 | survey |
| 19 | Auth Cards (Login/Signup) | Scaled card padding (1.25rem-1.5rem) and full-width inputs on mobile viewports | M5 | survey |
| 20 | Legal Documentation Pages | Scaled vertical padding on Privacy, Terms, Cookie, Refund policy pages | M5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Central Architecture & Global Shell | `main.tsx`, `App.tsx`, `responsive.css`, `SidebarLayout.tsx`, `Navbar.tsx`, `Footer.tsx`, `CookieConsentBanner.tsx` | none | DONE |
| M2 | Dashboard & Stats View | `DashboardPage.tsx`, `responsive.css` | M1 | IN_PROGRESS |
| M3 | Profile & Form Layouts | `ProfilePage.tsx`, `responsive.css` | M1 | PLANNED |
| M4 | Tracker & Tabular Layouts | `TrackerPage.tsx`, placeholder pages, `responsive.css` | M1 | PLANNED |
| M5 | Landing Page, Public Cards & Auth | `LandingPage.tsx`, `ExamCard.tsx`, `LoginPage.tsx`, `SignupPage.tsx`, legal pages, `responsive.css` | M1 | PLANNED |
| M6 | Final Verification & 100% E2E Pass | Full application across all 6 viewports, E2E test suite pass, adversarial hardening | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### Class Names & Selectors ↔ `responsive.css`
- **Shell & Nav**: `.app-container`, `.sidebar-container`, `.sidebar-nav`, `.sidebar-nav-btn`, `.main-content`, `.main-body`, `.cookie-consent-banner`, `.cookie-consent-actions`, `.profile-picker-modal`, `.profile-picker-grid`
- **Dashboard**: `.dashboard-stats-grid`, `.stat-card`, `.dashboard-banner`, `.dashboard-deadlines-card`, `.deadline-item`, `.dashboard-empty-card`
- **Profile**: `.profile-section`, `.profile-section-header`, `.profile-form-grid`, `.profile-education-card`, `.profile-save-container`, `.profile-save-btn`
- **Tracker & Placeholders**: `.tracker-table-container`, `.tracker-table-row`, `.placeholder-card`
- **Public & Auth**: `.trending-exams-grid`, `.career-quiz-banner`, `.career-quiz-content`, `.career-quiz-btn`, `.auth-wrapper`, `.auth-card`, `.legal-page-container`

### Media Query Cascading Contract
- Rules MUST be partitioned by `@media` block:
  - `@media screen and (max-width: 1024px)`: Tablet overrides.
  - `@media screen and (max-width: 768px)`: Mobile overrides.
  - `@media screen and (max-width: 480px)`: Small-mobile refinements.
- Desktop (`> 1024px`) MUST have ZERO rule activation.

## Code Layout
- `src/styles/responsive.css` — Central authoritative responsive stylesheet.
- `src/main.tsx` — Root application entry point importing `theme.css` then `responsive.css`.
- `src/App.tsx` — Core route container.
- `src/components/` — Shared shell, navigation, modals, banners, and cards.
- `src/pages/` — Page components.
- `tests/` or `scripts/` — Automated E2E responsive test harness and scripts.
