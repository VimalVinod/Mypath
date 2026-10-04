# Responsive Specifications & Constraints Mining Report

## Executive Summary
This authoritative specification report establishes the breakpoint boundaries, functional requirements, strict negative constraints, component-by-component CSS override strategies, acceptance matrix, and verification methodology for making the MyPath application responsive across mobile and tablet devices while guaranteeing 100% pixel-for-pixel preservation of the desktop experience.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Layout & Shell | App Shell Layout (`SidebarLayout.tsx`) | Two-column app shell with sticky desktop sidebar (260px expanded / 76px collapsed) and scrollable main content area. | Viewport width, route, active navigation key. | Desktop: Sidebar on left + main body. Mobile (`<= 768px`): Bottom navigation bar + stacked full-width content with bottom padding offset (70px). | Layout breakage / overlap if main content padding-bottom is omitted. | `src/components/SidebarLayout.tsx:280-450`, `src/styles/responsive.css:14-68` |
| 2 | Layout & Shell | Bottom Navigation Bar (`SidebarLayout.tsx`) | Transforms desktop sidebar into a mobile bottom navigation bar at `<= 768px`. Logo, collapse toggle, and profile block are hidden. | Viewport width `<= 768px`. | Fixed bottom bar (`position: fixed; bottom: 0; left: 0; width: 100%; z-index: 50; flex-direction: row; justify-content: space-around;`). | Navigation button text overflows if labels are not scaled down (`font-size: 0.65rem`). | `src/components/SidebarLayout.tsx:85-277`, `src/styles/responsive.css:20-64` |
| 3 | Layout & Shell | Main Content Container (`SidebarLayout.tsx`) | Main content wrapper containing page header and body. | Route children, pageTitle prop. | Full viewport width minus sidebar on desktop; 100% width with reduced padding (`1.25rem 1rem` vs `1.75rem 2rem`) on mobile. | Horizontal overflow if horizontal padding exceeds viewport or containers have fixed min-width. | `src/components/SidebarLayout.tsx:425-447`, `src/styles/responsive.css:66-77` |
| 4 | Navigation | Public Navbar (`Navbar.tsx`) | Header for unauthenticated landing and auth pages with brand logo, nav links, and action buttons. | Public route state, user authentication. | Desktop: Horizontal flex with 2.5rem padding. Mobile: Compact flex, links hidden (`display: none`), logo height scaled (32px-36px), compact buttons. | Button wrapping and overflow if padding and gap remain at desktop values (2.5rem). | `src/components/Navbar.tsx:12-165`, `src/styles/mobile.css:48-80` |
| 5 | Dashboard | Dashboard Stats Grid (`DashboardPage.tsx`) | 4-stat metric cards displaying Tracked Exams, Bookmarked, Applied, and Upcoming Deadlines. | Tracker items array from AppContext. | Desktop: 4 columns auto-fit (`minmax(200px, 1fr)`). Tablet (`> 768px and <= 1024px`): 2x2 grid. Mobile (`<= 768px`): 2 columns, centered stat cards. Small mobile (`<= 480px`): 2 compact columns or 1 column. | Stat card text truncated or cards crushed if column template is not overridden. | `src/pages/DashboardPage.tsx:101-132`, `src/styles/responsive.css:7-11, 79-90` |
| 6 | Dashboard | Dashboard Incomplete Profile Banner | Alert banner prompting user to complete profile to unlock exam matching. | User profile completeness state. | Desktop: Horizontal flex row with alert icon, text, and button on right. Mobile: Vertically stacked layout with full-width button. | Button overflows or is pushed off screen on narrow widths (< 380px) if flex-wrap is not allowed. | `src/pages/DashboardPage.tsx:70-99` |
| 7 | Dashboard | Dashboard Upcoming Deadlines Card | List of exams with closing deadlines. | Sorted tracker deadlines. | Responsive card container; rows display exam name on left and deadline date on right with clean wrapping. | Text overlaps date badge on narrow screens (< 360px) if text has no min-width: 0. | `src/pages/DashboardPage.tsx:137-196` |
| 8 | Profile | Profile Form Grids (`ProfilePage.tsx`) | Multi-section profile form (Personal Details, Address & Domicile, Education, Special Status, Family Details). | Form state, user profile data. | Desktop: 2-column grid (`gridTemplateColumns: '1fr 1fr'`). Mobile (`<= 768px`): Single-column grid (`gridTemplateColumns: 1fr`). | 2-column form elements squish and become illegible or overflow on screens <= 768px. | `src/pages/ProfilePage.tsx:206-250, 307-323, 353-385`, `src/styles/responsive.css:92-94` |
| 9 | Profile | Profile Education Qualification Cards | Repeating cards for qualifications (10th, 12th, Degree, etc.) with remove button, level, stream, university, passing year, and CGPA. | Education array in form state. | Desktop: 2-column sub-grids. Mobile: Single-column inputs; card padding scaled down from 1.5rem to 1rem. | Absolute delete button overlaps input labels if top padding is insufficient. | `src/pages/ProfilePage.tsx:348-386` |
| 10 | Profile | Profile Action & Account Control Buttons | Save Profile button and Delete Account modal trigger. | Saving state, deletion handler. | Desktop: Top-right Delete button and bottom-right Save button. Mobile: Full-width Save button (`width: 100%`), Delete button wrapped without clipping header. | Accidental taps if touch target is smaller than 44x44px. | `src/pages/ProfilePage.tsx:196-204, 459-469` |
| 11 | Tracker | Tracker Table View (`TrackerPage.tsx`) | Table of tracked competitive exams with Exam Name, Organization, Deadline, and Status selector. | Tracker items array from AppContext. | Desktop: 4 columns (`1fr 160px 160px 140px`). Mobile (`<= 768px`): Header hidden (`display: none`), rows collapse to 1-column card stack (`grid-template-columns: 1fr`). | Severe horizontal blowout and table cut-off on mobile if columns remain 160px fixed width. | `src/pages/TrackerPage.tsx:48-82`, `src/styles/responsive.css:96-103` |
| 12 | Landing Page | Hero Banner Carousel (`LandingPage.tsx`) | Full-width marketing banner slider with images, left/right arrows, and dot indicators. | Banner image assets, auto-slide timer. | Desktop: Full container with large arrows (38px). Mobile: Aspect-ratio locked (`3008 / 1408`), scaled arrows (28px), smaller touch dots. | Image distorted or cropped if aspect-ratio and object-fit are not preserved. | `src/pages/LandingPage.tsx:72-275`, `src/styles/mobile.css:81-99, 172-181` |
| 13 | Landing Page | Career Assessment Quiz Banner | Promotional card for the 5-minute psychometric assessment. | Current user login state. | Desktop: Two-column horizontal flex with 3rem 3.5rem padding. Mobile: Stacked vertical flex with centered text and full-width action button. | Content pushed off-screen or squished horizontally if padding is not scaled down. | `src/pages/LandingPage.tsx:308-345` |
| 14 | Landing Page | Feature Sections (`LandingPage.tsx`) | 3 alternating informational sections (Find Exams, Track Everything, Never Miss Deadlines) with text blocks and image placeholders. | Text copy, placeholder divs. | Desktop: Side-by-side flex (`feature-flex`) and reversed flex (`feature-reverse`). Mobile: Stacked single-column (`flex-direction: column !important`), text centered, placeholder aspect-ratio 4/3. | Horizontal misalignment or image/text overlap if flex-direction is not overridden. | `src/pages/LandingPage.tsx:347-406`, `src/styles/mobile.css:111-150` |
| 15 | Cards & Catalog | Exam Card Grid & Item (`ExamCard.tsx`) | Card component displaying exam acronym, organization, description, tags, countdown, and bookmark button. | Exam entity object. | Desktop: 3-column auto-fit grid (`minmax(320px, 1fr)`). Mobile: Single-column full-width cards (`1fr`), card padding scaled. | Long exam names or tag arrays overflowing horizontal boundary. | `src/components/ExamCard.tsx:38-130`, `src/pages/LandingPage.tsx:300-305` |
| 16 | Auth | Login & Signup Cards (`LoginPage.tsx`, `SignupPage.tsx`) | Authentication cards with OAuth (Google) and email/password forms. | Form inputs, validation errors. | Desktop: Centered card (`maxWidth: 420px`/`440px`, `padding: 2.5rem`). Mobile: Full-width card (`maxWidth: 100%`, `padding: 1.25rem-1.5rem`), zero overflow. | Total padding (card + container = 8rem = 128px) leaves less than 232px for form inputs on 360px screens. | `src/pages/LoginPage.tsx:51-185`, `src/pages/SignupPage.tsx:87-293` |
| 17 | Global | Cookie Consent Banner (`CookieConsentBanner.tsx`) | Sticky bottom banner requesting consent with Accept / Decline actions. | Cookie consent localStorage/cookie state. | Desktop: Fixed bottom bar with horizontal flex (`padding: 1rem 2rem`). Mobile: Stacked vertical layout with high z-index and touch-friendly buttons. | Banner overlaps and blocks mobile bottom navigation bar (`z-index: 50` vs `z-index: 9999`) or overflows horizontally. | `src/components/CookieConsentBanner.tsx:52-105` |
| 18 | Global | Footer (`Footer.tsx`) | Site footer with branding, legal links, and support links. | Route navigation functions. | Desktop: Multi-column flex row with space-between. Mobile: Stacked single column with centered text and links. | Multi-column links squish together horizontally on mobile. | `src/components/Footer.tsx:9-35`, `src/styles/mobile.css:152-171` |
| 19 | Placeholder Pages | Browse Exams, Study Material, Notifications (`BrowseExamsPage.tsx`, etc.) | Empty-state / coming-soon informational cards. | Active route. | Desktop: Centered 4rem padding card. Mobile: Scaled 2rem padding card with touch-friendly navigation buttons. | Card padding causes horizontal overflow if fixed width is present. | `src/pages/BrowseExamsPage.tsx`, `src/pages/StudyMaterialsPage.tsx`, `src/pages/NotificationsPage.tsx` |
| 20 | Legal | Legal Pages (`PrivacyPolicyPage.tsx`, `TermsPage.tsx`, etc.) | Static legal documentation text with section headings. | Route navigation. | Desktop: Centered container `maxWidth: 800px`, `padding: 4rem 0`. Mobile: Scaled container with `padding: 2rem 1.25rem`. | Text overflows viewport edges if container has fixed padding or fixed width. | `src/pages/PrivacyPolicyPage.tsx`, `src/pages/TermsPage.tsx`, `src/pages/CookiePolicyPage.tsx`, `src/pages/RefundPolicyPage.tsx` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Global Viewport | 320px screen width (e.g. Galaxy Fold outer screen, iPhone 5/SE1 legacy) | Cards with default `padding: 2.5rem` (40px on each side = 80px) leave only 240px; combined with parent `padding: 1.5rem` (48px), remaining width is 192px. Requires mobile card padding override to `1rem` or `1.25rem`. |
| 2 | Bottom Nav & Cookie Banner | Mobile (`<= 768px`) with both bottom navigation (`z-index: 50`) and Cookie Consent Banner (`z-index: 9999`) visible | Cookie banner docks at `bottom: 0` and visually conceals the bottom navigation bar until dismissed. Cookie banner must have clear dismiss buttons and stack vertically without exceeding 40% viewport height. |
| 3 | Bottom Nav & Form Inputs | Mobile user focusing an input on Profile Page with virtual keyboard open | Fixed bottom nav (`position: fixed; bottom: 0`) may move up above virtual keyboard in some mobile browsers. Main content must have adequate padding-bottom (minimum `70px !important`). |
| 4 | Dashboard Stats Grid | Screen width between 769px and 1024px (Tablet Landscape / Portrait) | 4 stat cards squeezed horizontally in a single row cause metric labels to truncate. Overridden to `grid-template-columns: repeat(2, 1fr) !important;` for clean 2x2 grid. |
| 5 | Profile Form Grid | Screen width 481px to 768px (Large Mobile / Small Tablet) | 2-column input grid (`gridTemplateColumns: '1fr 1fr'`) causes select dropdowns and date pickers to clip text. Must be collapsed to `grid-template-columns: 1fr !important;`. |
| 6 | Education Qualifications Card | Repeating qualification items on mobile with long institution name | Year of Passing and CGPA fields must sit on individual rows or fit side-by-side with 50% width without breaking parent card. |
| 7 | Tracker Table Row | Tracker items with long exam names (e.g. "UPSC Civil Services Examination 2026") on 360px viewport | In 4-column layout (`1fr 160px 160px 140px`), total width is at least 480px, causing severe horizontal scroll. In mobile layout (`1fr`), exam name, organization, deadline, and select dropdown stack into a clean card. |
| 8 | Public Navbar Auth Buttons | Screen width 360px on Landing Page | "Log In" and "Get Started Free" buttons side-by-side with 50px logo: buttons wrap or overflow if navbar padding is 2.5rem. Mobile CSS reduces navbar padding to `0 1rem` and button padding to `0.4rem 0.6rem`. |
| 9 | Banner Carousel Controls | Touch swipe or arrow tap on mobile touchscreens | Arrows positioned at `left: 20px` / `right: 20px` can interfere with edge swipe gestures. Mobile CSS resizes arrows to 28px and positions at 10px from edges. |
| 10 | Desktop Preservation Boundary | Screen width exactly 1025px | Media queries targeting `max-width: 1024px` do NOT match. Sidebar remains 260px wide, desktop nav is active, stat grid uses 4-column layout, and all desktop inline styles take precedence. Exactly 0px deviation from baseline. |

---

## 5-Component Handoff Report

### 1. Observation
1. **Target Project Layout & Files**:
   - Project Root: `c:/Users/sindh/Documents/codes/mypath/frontend/codes`
   - Entry Point: `src/main.tsx` imports `./styles/theme.css` and `./styles/mobile.css`.
   - App Component: `src/App.tsx` imports `./styles/responsive.css`.
   - CSS Files:
     - `src/styles/theme.css` (728 lines): contains root CSS variables, typography (`Plus Jakarta Sans`, `Inter`), buttons, badges, card styles, `.container` (1240px max width). Contains zero `@media` queries (`grep_search` found 0 matches).
     - `src/styles/responsive.css` (105 lines): contains `@media screen and (max-width: 1024px)` targeting `.dashboard-stats-grid` and `@media screen and (max-width: 768px)` targeting `.app-container`, `.sidebar-container`, `.sidebar-nav`, `.sidebar-nav-btn`, `.main-content`, `.main-body`, `.dashboard-stats-grid`, `.stat-card`, `.profile-form-grid`, `.tracker-table-row`.
     - `src/styles/mobile.css` (184 lines): contains `@media screen and (max-width: 768px)` targeting global typography, `.container`, public navbar, hero banner, feature sections, footer, and carousel arrows.
2. **Inline Styles Usage in JSX**:
   - Across `SidebarLayout.tsx`, `Navbar.tsx`, `DashboardPage.tsx`, `ProfilePage.tsx`, `TrackerPage.tsx`, `LandingPage.tsx`, `LoginPage.tsx`, and `SignupPage.tsx`, layout properties are declared via inline `style={{ ... }}` objects.
   - Example 1: `SidebarLayout.tsx:283` has `style={{ display: 'flex', minHeight: '100vh', ... }}` and `aside` has `style={{ width: sidebarWidth, minWidth: sidebarWidth, height: '100vh', position: 'sticky', ... }}`.
   - Example 2: `DashboardPage.tsx:102` has `style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}`.
   - Example 3: `ProfilePage.tsx:206` has `style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}`.
   - Example 4: `TrackerPage.tsx:50` has `style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 140px', gap: '1rem', ... }}`.
3. **Existing Build & Test State**:
   - `npm run build` (`tsc && vite build`) passes with exit code 0 (1515 modules transformed, production assets generated cleanly in 3.84s).
   - `index.html` has standard viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`.
   - `MobileNav.tsx` exists as a standalone component but is unreferenced in `App.tsx` and all page components (`grep_search` confirmed only declaration). The active layout shell is `SidebarLayout.tsx`.

### 2. Logic Chain
1. **Inheritance & Specificity Mechanism**:
   - Inline styles (`style={{ ... }}`) have CSS specificity of 1,0,0,0, which out-prioritizes any regular class selector (0,0,1,0).
   - Therefore, to reflow desktop elements on mobile/tablet without editing JSX inline styles (per R3 in `ORIGINAL_REQUEST.md`), media queries MUST use `!important` on the specific properties being overridden (e.g. `grid-template-columns: 1fr !important;`).
   - However, properties not specified inline do not require `!important`. Restricting `!important` only to the necessary overrides satisfies R1: *"Use `!important` only when required to override existing inline styles, and avoid unnecessary `!important` rules."*
2. **Desktop Preservation Mechanism**:
   - In standard CSS cascading, media queries wrapped in `@media screen and (max-width: 1024px)` or `@media screen and (max-width: 768px)` are completely ignored when `window.innerWidth > 1024px`.
   - Because no `@media (min-width: 1025px)` rules are added, the desktop rendering is driven entirely by the existing inline styles and `theme.css`.
   - This mathematically guarantees that desktop views (`> 1024px`) remain 100% pixel-for-pixel identical to their baseline state.
3. **Consolidation into Central `responsive.css`**:
   - Both `mobile.css` and `responsive.css` currently exist in `src/styles/`.
   - `ORIGINAL_REQUEST.md` specifically requires: *"Implement responsiveness strictly through CSS media queries in a central CSS file (e.g., `responsive.css`)."*
   - In the implementation track, `mobile.css` and `responsive.css` should be consolidated or imported cleanly so that `responsive.css` serves as the authoritative central hub for all responsive media queries across all routes.
4. **Architectural Purity (No JS Conditional Rendering)**:
   - No `isMobile` state, React hooks, or resize listeners may be introduced.
   - The DOM tree remains completely static; CSS flexbox and CSS grid reflow the nodes dynamically based on browser viewport calculation.
   - No duplicate mobile components (such as duplicate mobile navigation bars or duplicate cards) may be mounted.

### 3. Caveats
1. **Pre-existing Vitest Suite**: The existing `vitest run` tests test backend Firebase mock state and data validation scenarios (many of which fail due to external Firebase auth mocks), but do not test CSS or responsive viewport behavior. Responsive verification must rely on headless browser viewport tests and automated layout bounding box checks.
2. **Unused `MobileNav.tsx`**: `MobileNav.tsx` is an orphaned file from an earlier draft. Responsive navigation for authenticated routes is currently implemented via `SidebarLayout.tsx`'s `.sidebar-container` bottom navigation transformation. `MobileNav.tsx` should remain untouched or left unused to prevent duplicate DOM branching.
3. **Cookie Consent Banner Classing**: `CookieConsentBanner.tsx` currently only uses inline styles with no class name. Adding a single non-invasive CSS class (e.g. `cookie-consent-banner`) allows `responsive.css` to override its layout on mobile without changing its behavior on desktop.

### 4. Conclusion
1. **Breakpoint Definitions**:
   - **Mobile**: `<= 768px` (with sub-rules for small mobile `<= 480px`).
   - **Tablet**: `> 768px and <= 1024px` (`@media screen and (min-width: 769px) and (max-width: 1024px)` or `@media screen and (max-width: 1024px)`).
   - **Desktop**: `> 1024px` (strictly untouched, zero media query matches).
2. **Negative Constraints Enforced**:
   - Strict CSS-only: zero `isMobile` hooks, zero `resize` listeners.
   - Zero DOM duplication: single unified DOM tree per route.
   - Zero AI styling: preserve Puma/boAt clean aesthetic, zero new gradients, zero new glassmorphism blur filters, zero neon box-shadows.
   - Zero inline style deletion: all inline styles remain intact; overridden strictly via scoped `!important` in media queries.
3. **Implementation Blueprint**:
   - Centralize all mobile and tablet rules inside `src/styles/responsive.css`.
   - Ensure `responsive.css` is imported at root level.
   - Cover all 20 identified features across public and authenticated routes.

### 5. Verification Method

#### A. Automated Headless Browser Viewport Test Script
An automated headless Playwright or Puppeteer script (or Vitest browser mode test) should run across all routes (`/`, `/login`, `/signup`, `/dashboard`, `/tracker`, `/profile`, `/exams`, `/materials`, `/notifications`, `/privacy`, `/terms`) at the following 6 canonical viewports:
1. `360 x 740` (Small Mobile - Android)
2. `375 x 812` (Standard Mobile - iPhone)
3. `414 x 896` (Large Mobile - Plus/Max)
4. `768 x 1024` (Tablet Portrait - iPad)
5. `1024 x 768` (Tablet Landscape / Small Laptop)
6. `1440 x 900` (Desktop Standard)

**Automated Assertions**:
```javascript
// Test 1: Zero horizontal scroll
const hasHorizontalScroll = await page.evaluate(() => {
  return document.documentElement.scrollWidth > document.documentElement.clientWidth;
});
expect(hasHorizontalScroll).toBe(false);

// Test 2: No element overflows viewport width
const overflowingElements = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll('*'));
  const viewportWidth = window.innerWidth;
  return elements.filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.right > viewportWidth + 1; // 1px threshold for subpixel rounding
  }).map(el => el.tagName + '.' + el.className);
});
expect(overflowingElements.length).toBe(0);

// Test 3: Bottom Navigation on Mobile
if (viewportWidth <= 768) {
  const sidebarPosition = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar-container');
    if (!sidebar) return null;
    const style = window.getComputedStyle(sidebar);
    return { position: style.position, bottom: style.bottom };
  });
  if (sidebarPosition) {
    expect(sidebarPosition.position).toBe('fixed');
    expect(sidebarPosition.bottom).toBe('0px');
  }
}

// Test 4: Desktop Pixel Identity
if (viewportWidth > 1024) {
  const sidebarPosition = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar-container');
    if (!sidebar) return null;
    const style = window.getComputedStyle(sidebar);
    return { position: style.position, width: style.width };
  });
  if (sidebarPosition) {
    expect(sidebarPosition.position).toBe('sticky');
    expect(sidebarPosition.width).toBe('260px');
  }
}
```

#### B. Manual / Visual Inspection Checklist
1. **Navigation Usability**: Verify bottom nav items on mobile have touch targets >= 44x44px and tap triggers route change without latency.
2. **Form Interaction**: On `/profile`, verify all inputs, date pickers, category dropdowns, and checkboxes are easily selectable on mobile without pinch-zooming.
3. **Table Reflow**: On `/tracker`, verify rows appear as stacked cards with visible exam title, organization, deadline, and status dropdown.
4. **Desktop Sanity**: Resize browser to 1440px; verify no mobile styles bleed through and layout matches pre-responsive design 100%.
