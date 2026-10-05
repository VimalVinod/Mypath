# E2E Test Infra: Responsive Web Experience

## Test Philosophy
- Opaque-box, requirement-driven. Verified against `ORIGINAL_REQUEST.md`.
- Viewport and layout testing across 6 canonical viewports:
  1. Small Mobile: 360px × 740px
  2. Standard Mobile: 375px × 812px
  3. Large Mobile: 414px × 896px
  4. Tablet Portrait: 768px × 1024px
  5. Tablet Landscape: 1024px × 768px
  6. Desktop Standard: 1440px × 900px
- Zero tolerance for horizontal scrolling / element overflow on mobile and tablet.
- 100% pixel-for-pixel preservation of desktop experience (>1024px).

## Feature Inventory & Test Matrix
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | App Shell Layout | ORIGINAL_REQUEST §R1, R3 | 5 | 5 | ✓ |
| 2 | Bottom Navigation Bar | ORIGINAL_REQUEST §R1, R2 | 5 | 5 | ✓ |
| 3 | Main Content Container | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Public Navbar & Header | ORIGINAL_REQUEST §R1, R2 | 5 | 5 | ✓ |
| 5 | Cookie Consent Banner | ORIGINAL_REQUEST §R1, R2 | 5 | 5 | ✓ |
| 6 | Profile Picture Picker Modal | ORIGINAL_REQUEST §R1, R2 | 5 | 5 | ✓ |
| 7 | Central CSS Architecture | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 8 | Dashboard Stats Grid | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 9 | Incomplete Profile Banner | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 10 | Upcoming Deadlines Card | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 11 | Profile Form Grids | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 12 | Education Cards | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 13 | Profile Save Button | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 14 | Tracker Table Reflow | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 15 | Placeholder Empty Cards | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 16 | Hero Banner Carousel | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 17 | Trending Exam Cards Grid | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 18 | Career Quiz Banner | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 19 | Auth Cards (Login/Signup) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 20 | Legal Documentation Pages | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Automated Node.js / Puppeteer or JSDOM/browser emulation test script (`node tests/verify-responsive.cjs` or `npm test`).
- Assertions:
  - `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (zero horizontal overflow)
  - Elements have non-zero height and visible content within viewport boundaries
  - Sidebar fixed bottom at `<= 768px`; sidebar sticky left at `> 1024px`
  - Cookie banner does not obscure bottom nav buttons
  - Desktop (>1024px) retains 100% baseline styles with zero `@media` overrides

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Student Exam Discovery on Mobile (375px) | Public Navbar, Hero Carousel, Trending Exams Grid, Footer | Medium |
| 2 | Student Login & Onboarding on Mobile (390px) | Auth Card, Form Inputs, OAuth Buttons | Low |
| 3 | Authenticated Dashboard Navigation on Mobile (360px) | Bottom Nav, Incomplete Profile Banner, Stats Grid, Deadlines | High |
| 4 | Comprehensive Profile Editing on Mobile (375px) | 6 Profile Sections, Form Grids, Education Cards, Save Button | High |
| 5 | Application Tracker Inspection on Tablet (768px) | Sidebar Layout, Table Horizontal Scroll / Reflow, Status Badges | High |
| 6 | Desktop Non-Regression Check (1440px) | Full Site Desktop Baseline Verification | Medium |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (100+ feature checks)
- Tier 2: ≥5 boundary & corner cases (320px, 768px, 1024px, 1025px, etc.)
- Tier 3: Pairwise combinations of views and viewports
- Tier 4: 6 realistic end-to-end user journeys
