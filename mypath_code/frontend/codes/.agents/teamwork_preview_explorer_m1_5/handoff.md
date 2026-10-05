# Handoff Report: App Shell & Navigation Adaptation (Milestone 1)

## Executive Summary
This investigation determines the exact CSS rules, DOM selector mappings, and architectural adjustments required to adapt the desktop App Shell and Navigation (`src/components/SidebarLayout.tsx`, `src/App.tsx`, and `src/components/Navbar.tsx`) into a mobile-first responsive layout without modifying the desktop baseline (>1024px) or introducing JavaScript conditional branching (`isMobile`) or duplicate DOM trees.

Specifically:
1. The desktop sticky sidebar (`width: 260px; height: 100vh; position: sticky; top: 0;`) transforms at `<= 768px` into a fixed bottom navigation bar (`position: fixed; bottom: 0; top: auto; height: 60px;`) spanning 100% width with 6 evenly distributed touch targets (`flex: 1 1 0; min-width: 0;`).
2. Crucial bug prevention: because inline React styles set `top: 0` on the `<aside className="sidebar-container">`, setting `bottom: 0 !important` without `top: auto !important` causes standard CSS engines to stretch the fixed container across the entire viewport height (`height = 100vh - 0 - 0`). We mandate `top: auto !important`.
3. Body/content clearance: `.main-content` and `.main-body` receive a 70px bottom padding offset (`padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;`), ensuring no buttons, forms, or cards are obscured by the 60px bottom bar.
4. Desktop chrome hiding: desktop-only sidebar elements (`.sidebar-logo-area`, `.sidebar-profile-area`, `.sidebar-signout`, `.sidebar-nav-header`) are visually hidden (`display: none !important;`) at `<= 768px`.
5. Overflow-X prevention: `.app-container`, `.main-content`, and `.main-body` are constrained to `width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; box-sizing: border-box !important;`.
6. Public Header (`Navbar.tsx`): adapts with scaled logo (32px), hidden desktop text links (`.nav-links { display: none !important }`), and compact button padding on `.nav-auth-desktop`.
7. Desktop Preservation: All overrides are strictly enclosed within `@media screen and (max-width: 1024px)`, `@media screen and (max-width: 768px)`, and `@media screen and (max-width: 480px)`. Viewports `> 1024px` receive 0 overrides, remaining 100% pixel-for-pixel identical to baseline.

---

## 1. Observation

### Observation 1.1: Desktop Sidebar Layout Structure & Inline Styles
In `src/components/SidebarLayout.tsx`:
- Lines 280-300:
  ```tsx
  const sidebarWidth = collapsed ? '76px' : '260px';

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar */}
      <aside className="sidebar-container" style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        backgroundColor: SIDEBAR_BG,
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <SidebarContent />
      </aside>
  ```
- Line 85-87:
  ```tsx
  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
  ```
  Note: This inner wrapper currently lacks an explicit class name, but can be styled via `.sidebar-container > div` or by adding `className="sidebar-inner"`.
- Lines 89-117:
  ```tsx
  <div className="sidebar-logo-area" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    padding: '1.5rem 1.25rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  }}>
    {!collapsed && (
      <img src={logoImg} alt="MyPath" style={{ height: '72px', objectFit: 'contain' }} />
    )}
    <button onClick={() => setCollapsed(c => !c)} ...>
  ```
- Lines 120-189:
  ```tsx
  <div className="sidebar-profile-area" style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: collapsed ? '1.5rem 0.75rem' : '1.5rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    gap: '0.6rem',
  }}>
  ```
- Lines 192-247:
  ```tsx
  <nav className="sidebar-nav" style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
    {!collapsed && (
      <div className="sidebar-nav-header" style={{ fontSize: '0.65rem', fontWeight: 600, color: '#52525B', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1.25rem', marginBottom: '0.5rem' }}>
        MAIN MENU
      </div>
    )}
    {NAV_ITEMS.map(item => {
      const Icon = item.icon;
      const isActive = activeNav === item.key;
      return (
        <button
          key={item.key}
          className="sidebar-nav-btn"
          onClick={() => navigate(item.path)}
          title={collapsed ? item.label : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: collapsed ? '0.75rem' : '0.75rem 1.25rem',
            borderRadius: 0,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: isActive ? BRAND_GREEN : 'transparent',
            color: isActive ? '#ffffff' : '#A1A1AA',
            fontWeight: 500,
            fontSize: '0.9rem',
            textAlign: 'left',
            width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s ease',
            boxShadow: 'none',
          }}
        >
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
          {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
          {!collapsed && item.key === 'notifications' && unreadNotificationCount > 0 && (
            <span style={{
              backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#EF4444',
              color: '#fff',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              minWidth: '16px',
              textAlign: 'center',
            }}>
              {unreadNotificationCount}
            </span>
          )}
        </button>
      );
    })}
  </nav>
  ```
- Lines 250-276:
  ```tsx
  <div className="sidebar-signout" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
    <button onClick={logoutUser} ...>
      <LogOut size={18} />
      {!collapsed && <span>Sign Out</span>}
    </button>
  </div>
  ```
- Lines 425-447:
  ```tsx
  {/* Main area */}
  <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

    {/* Slim top bar — page title only */}
    <header className="main-header" style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      padding: '0 2rem',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{pageTitle}</h1>
    </header>

    {/* Page content */}
    <main className="main-body" style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
      {children}
    </main>
  </div>
  ```

### Observation 1.2: Existing CSS in `src/styles/responsive.css`
In `src/styles/responsive.css` lines 14-77:
```css
/* MOBILE (up to 768px) */
@media screen and (max-width: 768px) {
  /* Sidebar Layout container - stack vertically on mobile */
  .app-container {
    flex-direction: column !important;
  }

  /* Sidebar becomes a bottom nav */
  .sidebar-container {
    width: 100% !important;
    height: auto !important;
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    z-index: 50 !important;
    flex-direction: row !important;
    border-right: none !important;
    border-top: 1px solid rgba(255,255,255,0.05) !important;
    min-width: 0 !important;
  }

  .sidebar-logo-area, .sidebar-profile-area {
    display: none !important;
  }

  .sidebar-nav {
    flex-direction: row !important;
    justify-content: space-around !important;
    padding: 0.5rem 0 !important;
  }

  .sidebar-nav-header {
    display: none !important;
  }

  .sidebar-nav-btn {
    flex-direction: column !important;
    padding: 0.5rem !important;
    gap: 0.2rem !important;
    font-size: 0.7rem !important;
    justify-content: center !important;
  }
  
  .sidebar-nav-btn > span {
    font-size: 0.65rem !important;
    display: block !important;
  }

  .sidebar-signout {
    display: none !important;
  }

  /* Main content takes full width, add padding for bottom nav */
  .main-content {
    padding-bottom: 70px !important;
  }

  /* Adjust main container padding */
  .main-body {
    padding: 1.25rem 1rem !important;
  }

  .main-header {
    padding: 0 1rem !important;
  }
```

Critical Observations on Existing CSS:
1. Line 24-25 sets `position: fixed !important; bottom: 0 !important;`. However, inline style on `aside.sidebar-container` sets `top: 0`. Since `top` is not overridden (`top: auto !important`), CSS layout rules calculate `top: 0` AND `bottom: 0`, stretching the sidebar from the top of the viewport to the bottom of the viewport (`height: 100vh`)!
2. `.sidebar-container > div` is not targeted. The desktop inner div retains inline `display: flex; flexDirection: column; height: 100%`, which fails to expand full width across the horizontal bottom nav bar.
3. `.sidebar-nav-btn` does not set `flex: 1 1 0 !important; width: auto !important; min-width: 0 !important;`. Because the desktop inline style has `width: '100%'`, on flex row it relies on implicit flex shrink, and items with longer labels ("Study Material", "Notifications") can blow out the 360px/375px mobile viewport width.
4. The notification count `<span>` badge inside the Notifications button does not have mobile positioning (`position: absolute !important; top: 4px !important; right: calc(50% - 18px) !important;`). In a column layout, it drops below the label and blows out the button height.
5. In `responsive.css` line 71-73: `.main-body { padding: 1.25rem 1rem !important; }`. While `.main-content` has `padding-bottom: 70px !important;`, if `.main-body` is the element that scrolls (`overflowY: 'auto'`), `.main-body` must also explicitly have `padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;` to ensure scrollable content stops 70px above the viewport bottom.

### Observation 1.3: Public Navbar in `src/components/Navbar.tsx`
In `src/components/Navbar.tsx`:
- Line 12: `<nav className="navbar" style={{ backgroundColor: '#000000', borderBottom: '1px solid #1C1C1E', padding: '0.65rem 0' }}>`
- Line 14: `<div className="nav-container" style={{ maxWidth: '100%', padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>`
- Line 27: `<a href="#home" className="logo" ...>`
- Line 37: `<img src={logoWhiteImg} alt="MyPath Logo" className="navbar-brand-logo" style={{ height: '50px', width: 'auto', objectFit: 'contain', display: 'block' }} />`
- Line 49: `<ul className="nav-links">`
- Line 76: `<div className="nav-auth-desktop" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>`

Existing `mobile.css` lines 48-80 has partial navbar rules, but `mobile.css` is being consolidated into `responsive.css` per Milestone 1 scope.

### Observation 1.4: App Router & Layout Usage in `src/App.tsx`
- Lines 98-103: Protected routes rendering `SidebarLayout`:
  - `/dashboard` -> `<DashboardPage />`
  - `/exams` -> `<BrowseExamsPage />`
  - `/tracker` -> `<TrackerPage />`
  - `/materials` -> `<StudyMaterialsPage />`
  - `/profile` -> `<ProfilePage />`
  - `/notifications` -> `<NotificationsPage />`
- Lines 136-147: Public routes rendering `Navbar`:
  - `/` -> `<LandingPage />`
  - `/terms`, `/privacy`, `/cookies`, `/refund` -> legal documentation pages
- Lines 181-184:
  ```tsx
  <AppProvider>
    <MainRouter />
    <CookieConsentBanner />
  </AppProvider>
  ```

### Observation 1.5: Build Pipeline Execution
Running `npm run build` exits with code 0:
```
✓ 1515 modules transformed.
dist/index.html 0.87 kB
dist/assets/index-M_UMW1RM.css 15.19 kB
dist/assets/index-B_yAfQF3.js 705.30 kB
✓ built in 5.89s
```

---

## 2. Logic Chain

1. **Premise 1 (Constraint from ORIGINAL_REQUEST §R2, §R3 & PROJECT.md §Architecture)**:
   The desktop experience (>1024px) must be 100% pixel-for-pixel untouched. No existing inline styles may be removed from JSX components. No JavaScript conditional rendering (`isMobile`, `useMediaQuery`, resize listeners) or duplicate DOM trees are permitted. All adaptations must be achieved strictly through CSS media queries.

2. **Premise 2 (Inline Style Overriding Mechanics)**:
   In HTML/React, inline `style={{ ... }}` declarations have an inherent specificity of `(1,0,0,0)`. Standard CSS selectors (class specificity `(0,0,1,0)`) cannot override inline styles unless modified with `!important`. Therefore, media queries targeting elements with inline styles MUST use scoped `!important` on the specific properties being adapted.

3. **Premise 3 (The `top: 0` vs `bottom: 0` Stretching Bug)**:
   `SidebarLayout.tsx` line 292 sets `top: 0` via inline style on `<aside className="sidebar-container">`.
   When a media query sets `position: fixed !important; bottom: 0 !important; height: auto !important;`, but fails to override `top`, the element possesses both `top: 0` and `bottom: 0`.
   According to CSS Level 2 and CSS Positioned Layout Level 3 specification (§5.1 & §5.3), when both `top` and `bottom` are non-auto on an absolutely/fixed positioned box with `height: auto`, the height is determined by `viewport_height - top - bottom`.
   Consequently, the sidebar stretches over the entire screen from top to bottom, completely occluding the page.
   *Resolution*: The media query MUST specify `top: auto !important; bottom: 0 !important;` to anchor the bar exclusively to the bottom.

4. **Premise 4 (Inner Div Flex Direction)**:
   Inside `<aside className="sidebar-container">`, `SidebarContent` renders a container div with inline `display: flex; flexDirection: column; height: 100%`.
   On mobile, the bottom nav bar is horizontal. Even though `.sidebar-nav` is horizontal, having its parent div set to `flex-direction: column` and `height: 100%` prevents proper stretching and layout.
   *Resolution*: Target `.sidebar-container > div` (and/or add `className="sidebar-inner"`) with `width: 100% !important; height: auto !important; display: flex !important; flex-direction: row !important; align-items: center !important;`.

5. **Premise 5 (Equal 6-Way Tab Distribution & Overflow Prevention)**:
   There are 6 navigation items in `NAV_ITEMS`: Dashboard, Browse Exams, My Tracker, Study Material, Profile, Notifications.
   On standard mobile devices (360px to 414px width):
   - At 360px width, each button has exactly `360px / 6 = 60px` available width.
   - Inline style sets `width: '100%'` and `display: 'flex'` with horizontal layout on desktop.
   - To reflow horizontally into 6 equal tabs:
     - `.sidebar-nav-btn` must have `flex: 1 1 0 !important; width: auto !important; min-width: 0 !important;`.
     - `min-width: 0 !important` is required to allow flex items to shrink below their content size.
     - `flex-direction: column !important` stacks icon above label.
     - Label text must have `white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;` with `font-size: 0.625rem !important;` (10px) on mobile and `0.55rem !important;` on small mobile (`<= 480px`).
     - This guarantees that even a 320px viewport (53.3px per tab) renders without horizontal scroll.

6. **Premise 6 (Notification Badge Positioning)**:
   The notification badge is rendered as a second `<span>` in the Notifications button with inline `borderRadius: '999px'`.
   In a column flex layout, it would render below the label, expanding the button vertically beyond 60px.
   *Resolution*: By setting `.sidebar-nav-btn { position: relative !important; }`, the badge can be positioned with:
   `position: absolute !important; top: 4px !important; right: calc(50% - 18px) !important;`
   Since the icon is 18px wide and horizontally centered, `calc(50% - 18px)` anchors the badge directly to the top-right corner of the bell icon, matching native mobile tab bar design.

7. **Premise 7 (70px Bottom Clearance Mechanics)**:
   The fixed bottom navigation bar occupies 60px of the viewport at the bottom.
   To prevent page content (such as cards, tables, inputs, and the full-width Profile save button) from being occluded:
   - Total required clearance = `60px (bar height) + 10px (breathing room) = 70px`.
   - On `.main-content`: `padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;` ensures the container bounding box clears the bottom nav bar.
   - On `.main-body`: `padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;` ensures that when scrolling inside `.main-body` (`overflowY: 'auto'`), the last child element scrolls completely into view with 10px margin above the bottom bar.

8. **Premise 8 (Tablet Viewport 769px - 1024px)**:
   On tablet viewports, the sidebar remains on the left. However, a 260px sidebar on a 768px-800px tablet portrait view squeezes the main body into ~500px.
   *Resolution*: In `@media screen and (min-width: 769px) and (max-width: 1024px)`, reduce `.sidebar-container` to `width: 200px !important; min-width: 200px !important;` and reduce `.main-body` padding to `1.25rem 1.5rem !important;`. The sidebar remains sticky left, and at `<= 768px` snaps into the fixed bottom nav bar.

---

## 3. Caveats

1. **React State `collapsed`**:
   The desktop sidebar includes a state variable `const [collapsed, setCollapsed] = useState(false);`. The toggle button is inside `.sidebar-logo-area`, which is `display: none !important;` on mobile. If a user resizes their browser window from desktop (with collapsed mode toggled on) to mobile, the collapsed state might omit labels (`{!collapsed && <span>{item.label}</span>}`). On actual mobile devices, the initial state is `collapsed = false`, so all 6 icons and labels are rendered. If needed, the worker can ensure `collapsed` remains false or the JSX renders labels without depending on `!collapsed` when on mobile.
2. **CookieConsentBanner Collision**:
   `CookieConsentBanner.tsx` renders at `bottom: 0` with `position: fixed; z-index: 9999;`. On mobile authenticated routes where the bottom nav is active, the cookie banner sits over the bottom nav until accepted. Explorer M1-6 and the worker should offset the cookie banner on mobile (`bottom: 60px !important;`) or stack its actions cleanly so it does not block navigation.
3. **Modal Z-Index**:
   `ProfilePicturePicker` in `SidebarLayout.tsx` has `z-index: 100`. The mobile bottom nav is `z-index: 60`. Modals will cleanly appear on top of the bottom nav bar.

---

## 4. Conclusion & Actionable Recommendations

### 4.1 Concrete Class / Selector Map
| Component | Existing Class | Recommended Classes / Selectors | Purpose |
|-----------|----------------|---------------------------------|---------|
| `SidebarLayout.tsx` | `.app-container` | `.app-container` | Full-width vertical flex container, `overflow-x: hidden` |
| `SidebarLayout.tsx` | `.sidebar-container` | `.sidebar-container` | Fixed bottom dock (`bottom: 0; top: auto; height: 60px; z-index: 60;`) |
| `SidebarLayout.tsx` | (inner div line 86) | `.sidebar-inner` or `.sidebar-container > div` | Horizontal flex row wrapper spanning 100% width |
| `SidebarLayout.tsx` | `.sidebar-logo-area` | `.sidebar-logo-area` | `display: none !important;` on mobile |
| `SidebarLayout.tsx` | `.sidebar-profile-area` | `.sidebar-profile-area` | `display: none !important;` on mobile |
| `SidebarLayout.tsx` | `.sidebar-signout` | `.sidebar-signout` | `display: none !important;` on mobile |
| `SidebarLayout.tsx` | `.sidebar-nav-header` | `.sidebar-nav-header` | `display: none !important;` on mobile |
| `SidebarLayout.tsx` | `.sidebar-nav` | `.sidebar-nav` | Horizontal flex row, `justify-content: space-around; height: 60px;` |
| `SidebarLayout.tsx` | `.sidebar-nav-btn` | `.sidebar-nav-btn` | Equal touch target (`flex: 1 1 0; min-width: 0; flex-direction: column;`) |
| `SidebarLayout.tsx` | (label `<span>`) | `.sidebar-nav-btn > span:not([style*="borderRadius"])` | Truncated 10px / 9px label, single line |
| `SidebarLayout.tsx` | (badge `<span>`) | `.sidebar-nav-btn span[style*="borderRadius"]` | Anchored absolute badge on notification icon |
| `SidebarLayout.tsx` | `.main-content` | `.main-content` | 70px bottom padding clearance, `min-width: 0; overflow-x: hidden;` |
| `SidebarLayout.tsx` | `.main-body` | `.main-body` | 70px bottom padding clearance, scaled padding (`1.25rem 1rem`) |
| `SidebarLayout.tsx` | `.main-header` | `.main-header` | Scaled header (`50px`), truncated single-line title |
| `Navbar.tsx` | `.navbar` | `.navbar` | Mobile public header (`padding: 0.5rem 0; width: 100%;`) |
| `Navbar.tsx` | `.nav-container` | `.nav-container` | Mobile padding (`0 1rem`), flex layout |
| `Navbar.tsx` | `.navbar-brand-logo` | `.navbar-brand-logo` | Scaled logo height (`32px`) |
| `Navbar.tsx` | `.nav-links` | `.nav-links` | `display: none !important;` on mobile |
| `Navbar.tsx` | `.nav-auth-desktop` | `.nav-auth-desktop` | Compact button padding and font size |

---

### 4.2 Exact Recommended CSS Rules for `src/styles/responsive.css`

```css
/* ==========================================================================
   MILESTONE 1: APP SHELL & NAVIGATION RESPONSIVE RULES
   Enclosed strictly within media queries to ensure 100% desktop fidelity.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. TABLET VIEWPORT (769px - 1024px)
   -------------------------------------------------------------------------- */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  /* Prevent sidebar squeeze on tablet portrait */
  .sidebar-container {
    width: 200px !important;
    min-width: 200px !important;
  }

  .main-header {
    padding: 0 1.5rem !important;
  }

  .main-body {
    padding: 1.5rem !important;
  }
}

/* --------------------------------------------------------------------------
   2. MOBILE VIEWPORT (<= 768px)
   -------------------------------------------------------------------------- */
@media screen and (max-width: 768px) {
  /* Global viewport & overflow containment */
  html, body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  /* App Shell Container: stack vertically */
  .app-container {
    flex-direction: column !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100vh !important;
    overflow-x: hidden !important;
  }

  /* Sidebar Container: Transform into fixed bottom navigation bar */
  .sidebar-container {
    width: 100% !important;
    min-width: 100% !important;
    height: auto !important;
    max-height: 64px !important;
    position: fixed !important;
    top: auto !important;           /* CRITICAL: Overrides inline top: 0 to prevent vertical stretching */
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 60 !important;
    flex-direction: row !important;
    border-right: none !important;
    border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    background-color: #121212 !important;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3) !important;
    overflow: visible !important;
  }

  /* Inner wrapper inside sidebar */
  .sidebar-inner,
  .sidebar-container > div {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    height: auto !important;
    align-items: center !important;
    justify-content: space-around !important;
  }

  /* Hide desktop-only sidebar chrome */
  .sidebar-logo-area,
  .sidebar-profile-area,
  .sidebar-signout,
  .sidebar-nav-header {
    display: none !important;
  }

  /* Navigation Bar Rail: horizontal tab bar */
  .sidebar-nav {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-around !important;
    align-items: center !important;
    width: 100% !important;
    height: 60px !important;
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
  }

  /* Navigation Buttons: 6 equal touch targets with vertical icon+label layout */
  .sidebar-nav-btn {
    flex: 1 1 0 !important;
    width: auto !important;
    min-width: 0 !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 0.35rem 0.1rem !important;
    gap: 0.2rem !important;
    text-align: center !important;
    position: relative !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  /* Button Icons */
  .sidebar-nav-btn > svg {
    flex-shrink: 0 !important;
  }

  /* Button Labels: truncated text preventing overflow */
  .sidebar-nav-btn > span:not([style*="borderRadius"]) {
    font-size: 0.625rem !important; /* 10px */
    line-height: 1.1 !important;
    font-weight: 500 !important;
    display: block !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 100% !important;
    text-align: center !important;
  }

  /* Unread Notification Badge: anchored to top-right of bell icon */
  .sidebar-nav-btn span[style*="borderRadius"] {
    position: absolute !important;
    top: 4px !important;
    right: calc(50% - 18px) !important;
    font-size: 0.55rem !important;
    padding: 0.05rem 0.3rem !important;
    min-width: 14px !important;
    height: 14px !important;
    line-height: 14px !important;
    z-index: 2 !important;
  }

  /* Main Area: 70px bottom clearance to prevent bottom bar collision */
  .main-content {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  }

  /* Page Content Container */
  .main-body {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    padding: 1.25rem 1rem calc(70px + env(safe-area-inset-bottom, 0px)) 1rem !important;
    overflow-x: hidden !important;
  }

  /* Sticky Header in Protected Shell */
  .main-header {
    height: 50px !important;
    padding: 0 1rem !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .main-header h1 {
    font-size: 1rem !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    max-width: 100% !important;
  }

  /* Public Header (Navbar.tsx) Mobile Adaptations */
  .navbar {
    padding: 0.5rem 0 !important;
    width: 100% !important;
    overflow-x: hidden !important;
  }

  .nav-container {
    padding: 0 1rem !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 0.5rem !important;
  }

  .navbar-brand-logo {
    height: 32px !important;
    width: auto !important;
  }

  .nav-links {
    display: none !important;
  }

  .nav-auth-desktop {
    gap: 0.5rem !important;
    flex-shrink: 0 !important;
  }

  .nav-auth-desktop .btn {
    padding: 0.4rem 0.65rem !important;
    font-size: 0.75rem !important;
    white-space: nowrap !important;
  }
}

/* --------------------------------------------------------------------------
   3. SMALL MOBILE VIEWPORT (<= 480px)
   -------------------------------------------------------------------------- */
@media screen and (max-width: 480px) {
  .sidebar-nav-btn {
    padding: 0.25rem 0.05rem !important;
    gap: 0.15rem !important;
  }

  .sidebar-nav-btn > svg {
    width: 16px !important;
    height: 16px !important;
  }

  .sidebar-nav-btn > span:not([style*="borderRadius"]) {
    font-size: 0.55rem !important; /* ~9px */
    max-width: 50px !important;
  }

  .main-header {
    padding: 0 0.75rem !important;
    height: 48px !important;
  }

  .main-header h1 {
    font-size: 0.95rem !important;
  }

  .main-body {
    padding-left: 0.75rem !important;
    padding-right: 0.75rem !important;
  }
}
```

---

### 4.3 Optional Non-Breaking JSX Refinement
In `src/components/SidebarLayout.tsx` line 86:
Change:
```tsx
const SidebarContent = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
```
To:
```tsx
const SidebarContent = () => (
  <div className="sidebar-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
```
This adds the semantic class `sidebar-inner` without changing any behavior or desktop styling.

---

## 5. Verification Method

To independently verify these findings:

1. **Build Integrity Check**:
   Run:
   ```bash
   npm run build
   ```
   Must exit with code 0 without any TypeScript or bundling errors.

2. **Visual & Computed Style Verification**:
   Inspect the elements under Chrome DevTools device mode across all 6 viewports:
   - **Small Mobile (360px × 740px)**:
     - Check `getComputedStyle(document.querySelector('.sidebar-container')).position === 'fixed'`
     - Check `getComputedStyle(document.querySelector('.sidebar-container')).bottom === '0px'`
     - Check `getComputedStyle(document.querySelector('.sidebar-container')).top === 'auto'` (not `'0px'`)
     - Check `document.documentElement.scrollWidth <= 360` (zero horizontal overflow)
     - Check all 6 `.sidebar-nav-btn` elements are visible with `flex: 1 1 0`
   - **Standard Mobile (375px × 812px)**:
     - Check `.main-content` and `.main-body` computed `padding-bottom >= 70px`
     - Verify bottom content (e.g. Save button on `/profile`) is not occluded by bottom bar
   - **Tablet Portrait (768px × 1024px)**:
     - Boundary check: At `768px`, sidebar is fixed bottom bar (`bottom: 0px`).
   - **Tablet Landscape (1024px × 768px)**:
     - Boundary check: At `769px - 1024px`, sidebar is sticky on the left with `width: 200px`.
   - **Desktop Standard (1440px × 900px)**:
     - Check `getComputedStyle(document.querySelector('.sidebar-container')).position === 'sticky'`
     - Check `getComputedStyle(document.querySelector('.sidebar-container')).width === '260px'`
     - Check `.sidebar-logo-area` and `.sidebar-profile-area` are `display: flex` (visible)
     - Verify 0 media query overrides apply.

3. **Invalidation Conditions**:
   - If `.sidebar-container` expands from top to bottom on mobile, `top: auto !important` is missing.
   - If navigation buttons wrap to a second line or blow out past 360px, `flex: 1 1 0 !important` or `min-width: 0 !important` is missing on `.sidebar-nav-btn`.
   - If content at the bottom of the page is cut off behind the bottom bar, `padding-bottom: 70px !important` is missing from `.main-body` or `.main-content`.
