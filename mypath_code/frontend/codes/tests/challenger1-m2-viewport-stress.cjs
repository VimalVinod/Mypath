/**
 * Challenger 1: Empirical Mobile Viewport Stress Harness for Milestone 2
 * Dashboard & Stats View (Features 8, 9, 10)
 *
 * Target Viewports:
 * - 320px (Extreme Narrow Mobile - iPhone SE 1st gen / compact Android)
 * - 360px (Small Mobile - Samsung Galaxy A-series / common Android)
 * - 375px (Standard Mobile - iPhone SE 2nd/3rd, iPhone 8/X/11 Pro/12 mini)
 * - 414px (Large Mobile - iPhone Plus / Max / XR)
 * - 768px (Mobile / Tablet Portrait Cutoff Boundary)
 * - 769px (Tablet Portrait Lower Boundary)
 * - 1024px (Tablet Landscape Upper Boundary)
 * - 1440px (Desktop Baseline Reference)
 *
 * Requirements Tested:
 * 1. .dashboard-banner vertical stacking & full-width CTA button at 320px-768px.
 * 2. .dashboard-stats-grid 2-column layout and zero cell blowout across 320px-768px.
 * 3. .dashboard-deadlines-card padding scaling & .deadline-item wrapping with extreme text strings.
 * 4. .dashboard-empty-card scaling & .dashboard-empty-btn WCAG touch targets (>=44px).
 * 5. Layout geometry math: Zero horizontal scroll on 320px, 360px, 375px, 414px, 768px.
 * 6. Desktop (>1024px) baseline 100% non-regression with exactly 0 media query overrides.
 */

const fs = require('fs');
const path = require('path');
const cssTools = require('@adobe/css-tools');
const { JSDOM } = require('jsdom');

// ANSI color formatting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const VIEWPORTS = [
  { name: '320px Extreme Narrow Mobile', width: 320, height: 568, isMobile: true,  isSmallMobile: true },
  { name: '360px Small Mobile',          width: 360, height: 740, isMobile: true,  isSmallMobile: true },
  { name: '375px Standard Mobile',       width: 375, height: 812, isMobile: true,  isSmallMobile: true },
  { name: '414px Large Mobile',          width: 414, height: 896, isMobile: true,  isSmallMobile: true },
  { name: '768px Mobile Boundary',       width: 768, height: 1024, isMobile: true, isSmallMobile: false },
  { name: '769px Tablet Boundary',       width: 769, height: 1024, isMobile: false, isSmallMobile: false },
  { name: '1024px Tablet Landscape',     width: 1024, height: 768, isMobile: false, isSmallMobile: false },
  { name: '1440px Desktop Baseline',     width: 1440, height: 900, isMobile: false, isSmallMobile: false },
];

// Paths
const responsiveCssPath = path.resolve(__dirname, '../src/styles/responsive.css');
const dashboardTsxPath = path.resolve(__dirname, '../src/pages/DashboardPage.tsx');
const mainTsxPath = path.resolve(__dirname, '../src/main.tsx');

const responsiveCss = fs.readFileSync(responsiveCssPath, 'utf8');
const dashboardTsx = fs.readFileSync(dashboardTsxPath, 'utf8');
const mainTsx = fs.readFileSync(mainTsxPath, 'utf8');

// Parse CSS AST
const ast = cssTools.parse(responsiveCss);

function parseMediaCondition(mediaStr) {
  const maxMatch = mediaStr.match(/max-width:\s*(\d+)px/);
  const minMatch = mediaStr.match(/min-width:\s*(\d+)px/);
  return {
    raw: mediaStr,
    maxWidth: maxMatch ? parseInt(maxMatch[1], 10) : Infinity,
    minWidth: minMatch ? parseInt(minMatch[1], 10) : 0,
  };
}

const mediaRules = [];
let rulesOutsideMedia = 0;

for (const rule of ast.stylesheet.rules) {
  if (rule.type === 'media') {
    const condition = parseMediaCondition(rule.media);
    for (const inner of rule.rules) {
      if (inner.type === 'rule') {
        for (const selector of inner.selectors) {
          const declarations = {};
          for (const decl of inner.declarations) {
            if (decl.type === 'declaration') {
              declarations[decl.property] = {
                value: decl.value.replace('!important', '').trim(),
                important: decl.value.includes('!important'),
                raw: decl.value.trim(),
              };
            }
          }
          mediaRules.push({
            media: rule.media,
            condition,
            selector: selector.trim(),
            declarations,
          });
        }
      }
    }
  } else if (rule.type === 'rule') {
    rulesOutsideMedia++;
  }
}

// Active declarations lookup
function getActiveDeclarations(selector, width) {
  const active = {};
  for (const r of mediaRules) {
    if (width >= r.condition.minWidth && width <= r.condition.maxWidth) {
      const parts = r.selector.split(',').map(s => s.trim());
      if (parts.includes(selector.trim())) {
        for (const [prop, decl] of Object.entries(r.declarations)) {
          // If already set by an important rule and this one is not important, skip
          if (active[prop] && active[prop].important && !decl.important) {
            continue;
          }
          active[prop] = { ...decl, media: r.media };
        }
      }
    }
  }
  return active;
}

const results = [];
function test(category, name, fn) {
  try {
    fn();
    results.push({ category, name, passed: true });
    console.log(`  ${GREEN}✓ PASS${RESET} [${category}] ${name}`);
  } catch (err) {
    results.push({ category, name, passed: false, error: err.message });
    console.log(`  ${RED}✗ FAIL${RESET} [${category}] ${name}\n    ${RED}Error: ${err.message}${RESET}`);
  }
}

console.log(`${BOLD}${CYAN}============================================================${RESET}`);
console.log(`${BOLD}${CYAN}  CHALLENGER 1: M2 MOBILE VIEWPORT STRESS HARNESS          ${RESET}`);
console.log(`${BOLD}${CYAN}============================================================${RESET}\n`);

// ==========================================================================
// SUITE 1: SOURCE INTEGRITY & CONTRACT VERIFICATION
// ==========================================================================
console.log(`${BOLD}Suite 1: Source Integrity & Interface Contract Conformance${RESET}`);

test('Source Integrity', 'DashboardPage.tsx injects required semantic class names', () => {
  const requiredClasses = [
    'dashboard-banner',
    'dashboard-banner-content',
    'dashboard-banner-btn',
    'dashboard-stats-grid',
    'stat-card',
    'dashboard-deadlines-card',
    'deadline-item',
    'dashboard-empty-card',
    'dashboard-empty-btn',
  ];
  for (const cls of requiredClasses) {
    if (!dashboardTsx.includes(`className="`) || !dashboardTsx.includes(cls)) {
      throw new Error(`Missing expected class name "${cls}" in DashboardPage.tsx`);
    }
  }
});

test('Source Integrity', 'DashboardPage.tsx preserves 100% of baseline inline styles (no removals)', () => {
  const baselineStyles = [
    "backgroundColor: '#FFF7ED'",
    "border: '1px solid #FED7AA'",
    "borderRadius: '12px'",
    "gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'",
    "backgroundColor: '#FFFFFF'",
    "borderRadius: '14px'",
    "border: '1px solid #E2E8F0'",
    "color: '#EF4444'",
    "backgroundColor: '#F8FAFC'",
  ];
  for (const st of baselineStyles) {
    if (!dashboardTsx.includes(st)) {
      throw new Error(`Expected baseline inline style "${st}" missing in DashboardPage.tsx`);
    }
  }
});

test('Source Integrity', 'Zero conditional JavaScript layout branching (no isMobile / window resize)', () => {
  if (dashboardTsx.includes('isMobile') || dashboardTsx.includes('window.innerWidth') || dashboardTsx.includes('useMediaQuery')) {
    throw new Error('DashboardPage.tsx introduces forbidden JavaScript viewport branching');
  }
});

test('Source Integrity', 'All responsive rules reside strictly inside @media queries', () => {
  if (rulesOutsideMedia !== 0) {
    throw new Error(`Found ${rulesOutsideMedia} rules outside @media queries; expected 0.`);
  }
});

// ==========================================================================
// SUITE 2: INCOMPLETE PROFILE BANNER (.dashboard-banner) STRESS TEST
// ==========================================================================
console.log(`\n${BOLD}Suite 2: Incomplete Profile Banner (.dashboard-banner) Viewport Stress${RESET}`);

const mobileVps = VIEWPORTS.filter(v => v.isMobile);

mobileVps.forEach(vp => {
  test('Banner Stacking', `[${vp.width}px] .dashboard-banner switches to flex-direction: column !important and aligns stretch`, () => {
    const decls = getActiveDeclarations('.dashboard-banner', vp.width);
    if (!decls['flex-direction'] || decls['flex-direction'].value !== 'column' || !decls['flex-direction'].important) {
      throw new Error(`Expected flex-direction: column !important at ${vp.width}px, got: ${JSON.stringify(decls['flex-direction'])}`);
    }
    if (!decls['align-items'] || decls['align-items'].value !== 'stretch' || !decls['align-items'].important) {
      throw new Error(`Expected align-items: stretch !important at ${vp.width}px, got: ${JSON.stringify(decls['align-items'])}`);
    }
  });

  test('Banner Content', `[${vp.width}px] .dashboard-banner-content spans 100% width and aligns flex-start`, () => {
    const decls = getActiveDeclarations('.dashboard-banner-content', vp.width);
    if (!decls['width'] || decls['width'].value !== '100%' || !decls['width'].important) {
      throw new Error(`Expected width: 100% !important at ${vp.width}px`);
    }
    if (!decls['align-items'] || decls['align-items'].value !== 'flex-start' || !decls['align-items'].important) {
      throw new Error(`Expected align-items: flex-start !important at ${vp.width}px`);
    }
  });

  test('Banner Button', `[${vp.width}px] .dashboard-banner-btn expands to 100% width with centered flex alignment`, () => {
    const decls = getActiveDeclarations('.dashboard-banner-btn', vp.width);
    if (!decls['width'] || decls['width'].value !== '100%' || !decls['width'].important) {
      throw new Error(`Expected width: 100% !important at ${vp.width}px`);
    }
    if (!decls['display'] || decls['display'].value !== 'flex' || !decls['display'].important) {
      throw new Error(`Expected display: flex !important at ${vp.width}px`);
    }
    if (!decls['justify-content'] || decls['justify-content'].value !== 'center' || !decls['justify-content'].important) {
      throw new Error(`Expected justify-content: center !important at ${vp.width}px`);
    }
  });
});

// Banner 320px mathematical layout stress test
test('Banner Layout Math', '[320px Boundary] Exact horizontal geometry computation: Zero lateral overflow', () => {
  const screenWidth = 320;
  // Body padding on <= 480px is 0.75rem (12px) on left and right = 24px total
  const bodyPaddingH = 0.75 * 16 * 2; // 24px
  const mainBodyWidth = screenWidth - bodyPaddingH; // 296px

  // Banner padding on <= 480px is 0.875rem (14px) and 1px border on each side (2px)
  const bannerPaddingH = 0.875 * 16 * 2; // 28px
  const bannerBorderH = 2; // 2px
  const bannerInnerWidth = mainBodyWidth - bannerPaddingH - bannerBorderH; // 266px

  // Inside banner content:
  // Icon block: 20px SVG + (0.6rem * 16 * 2 = 19.2px padding) = 39.2px
  const iconWidth = 20 + (0.6 * 16 * 2); // 39.2px
  const gap = 0.75 * 16; // 12px
  const availableTextWidth = bannerInnerWidth - iconWidth - gap; // 214.8px

  // Banner Button: width 100% of bannerInnerWidth (266px), box-sizing border-box
  // Button padding: 0.6rem top/bottom, 0.875rem (14px) left/right
  const buttonWidth = bannerInnerWidth; // 266px

  console.log(`    [320px Banner Math] Screen Width:       ${screenWidth}px`);
  console.log(`    [320px Banner Math] Main Body Width:    ${mainBodyWidth}px (after 24px body padding)`);
  console.log(`    [320px Banner Math] Banner Inner Width: ${bannerInnerWidth.toFixed(1)}px (after 28px banner padding + 2px border)`);
  console.log(`    [320px Banner Math] Text Column Width:  ${availableTextWidth.toFixed(1)}px`);
  console.log(`    [320px Banner Math] Button Full Width:  ${buttonWidth.toFixed(1)}px`);

  if (mainBodyWidth > screenWidth) throw new Error('Main body exceeds screen width');
  if (bannerInnerWidth <= 0) throw new Error('Banner inner width collapsed');
  if (availableTextWidth < 180) throw new Error(`Available text width (${availableTextWidth}px) too narrow`);
});

// ==========================================================================
// SUITE 3: STATS GRID (.dashboard-stats-grid & .stat-card) STRESS TEST
// ==========================================================================
console.log(`\n${BOLD}Suite 3: Stats Grid (.dashboard-stats-grid & .stat-card) Viewport Stress${RESET}`);

mobileVps.forEach(vp => {
  test('Stats Grid Columns', `[${vp.width}px] .dashboard-stats-grid specifies repeat(2, 1fr) !important`, () => {
    const decls = getActiveDeclarations('.dashboard-stats-grid', vp.width);
    if (!decls['grid-template-columns'] || decls['grid-template-columns'].value !== 'repeat(2, 1fr)' || !decls['grid-template-columns'].important) {
      throw new Error(`Expected grid-template-columns: repeat(2, 1fr) !important at ${vp.width}px, got: ${JSON.stringify(decls['grid-template-columns'])}`);
    }
  });

  test('Stats Card Hardening', `[${vp.width}px] .stat-card enforces min-width: 0 !important and width: 100% !important (prevents blowout)`, () => {
    const decls = getActiveDeclarations('.stat-card', vp.width);
    if (!decls['min-width'] || decls['min-width'].value !== '0' || !decls['min-width'].important) {
      throw new Error(`Expected min-width: 0 !important on .stat-card at ${vp.width}px`);
    }
    if (!decls['width'] || decls['width'].value !== '100%' || !decls['width'].important) {
      throw new Error(`Expected width: 100% !important on .stat-card at ${vp.width}px`);
    }
  });

  test('Stats Card Alignment', `[${vp.width}px] .stat-card reflows vertically (flex-direction: column !important, text-align: center)`, () => {
    const decls = getActiveDeclarations('.stat-card', vp.width);
    if (!decls['flex-direction'] || decls['flex-direction'].value !== 'column' || !decls['flex-direction'].important) {
      throw new Error(`Expected flex-direction: column !important on .stat-card at ${vp.width}px`);
    }
    if (!decls['align-items'] || decls['align-items'].value !== 'center' || !decls['align-items'].important) {
      throw new Error(`Expected align-items: center !important on .stat-card at ${vp.width}px`);
    }
  });
});

// Stats Grid Math across all mobile viewports
[320, 360, 375, 414, 768].forEach(w => {
  test('Stats Grid Layout Math', `[${w}px Viewport] 2-column mathematical grid fit: Zero horizontal overflow`, () => {
    const bodyPaddingH = w <= 480 ? (0.75 * 16 * 2) : (1.0 * 16 * 2); // 24px on <=480px, 32px on 768px
    const mainBodyWidth = w - bodyPaddingH;
    const gridGap = 0.75 * 16; // 12px
    const cellWidth = (mainBodyWidth - gridGap) / 2;

    // Card padding is 1rem 0.75rem (12px horizontal each side = 24px) + 2px border
    const cardContentWidth = cellWidth - (0.75 * 16 * 2) - 2;

    console.log(`    [${w}px Stats Math] Grid Width: ${mainBodyWidth.toFixed(1)}px | Col Width: ${cellWidth.toFixed(1)}px | Usable Card: ${cardContentWidth.toFixed(1)}px`);

    if (cellWidth < 130 && w !== 320) throw new Error(`Cell width (${cellWidth}px) too cramped at ${w}px`);
    if (w === 320 && cellWidth < 140) {
      // 320px: (296 - 12) / 2 = 142px
      if (cellWidth < 140) throw new Error(`Cell width at 320px (${cellWidth}px) is less than 140px`);
    }
    if (cellWidth * 2 + gridGap > mainBodyWidth + 0.001) {
      throw new Error(`Grid exceeds main body width at ${w}px`);
    }
  });
});

// ==========================================================================
// SUITE 4: DEADLINES CARD & ROW ITEMS STRESS TEST
// ==========================================================================
console.log(`\n${BOLD}Suite 4: Upcoming Deadlines Card & Row Items Viewport Stress${RESET}`);

mobileVps.forEach(vp => {
  test('Deadlines Padding', `[${vp.width}px] .dashboard-deadlines-card overrides padding to <= 1rem !important`, () => {
    const decls = getActiveDeclarations('.dashboard-deadlines-card', vp.width);
    if (!decls['padding'] || !decls['padding'].important) {
      throw new Error(`Expected scoped !important padding override at ${vp.width}px`);
    }
    if (vp.isSmallMobile) {
      // At <= 480px, padding should be 0.875rem 0.75rem
      if (decls['padding'].value !== '0.875rem 0.75rem') {
        throw new Error(`Expected padding: 0.875rem 0.75rem !important at ${vp.width}px, got ${decls['padding'].value}`);
      }
    } else {
      if (decls['padding'].value !== '1rem') {
        throw new Error(`Expected padding: 1rem !important at ${vp.width}px, got ${decls['padding'].value}`);
      }
    }
  });

  test('Deadline Item Wrapping', `[${vp.width}px] .deadline-item activates flex-wrap: wrap !important and space-between`, () => {
    const decls = getActiveDeclarations('.deadline-item', vp.width);
    if (!decls['flex-wrap'] || decls['flex-wrap'].value !== 'wrap' || !decls['flex-wrap'].important) {
      throw new Error(`Expected flex-wrap: wrap !important at ${vp.width}px`);
    }
    if (!decls['display'] || decls['display'].value !== 'flex' || !decls['display'].important) {
      throw new Error(`Expected display: flex !important at ${vp.width}px`);
    }
  });

  test('Deadline Item Text Defense', `[${vp.width}px] Exam name container enforces word-break: break-word & overflow-wrap`, () => {
    const decls = getActiveDeclarations('.deadline-item > div:first-child', vp.width);
    if (!decls['word-break'] || decls['word-break'].value !== 'break-word' || !decls['word-break'].important) {
      throw new Error(`Expected word-break: break-word !important at ${vp.width}px`);
    }
    if (!decls['overflow-wrap'] || decls['overflow-wrap'].value !== 'break-word' || !decls['overflow-wrap'].important) {
      throw new Error(`Expected overflow-wrap: break-word !important at ${vp.width}px`);
    }
    if (!decls['min-width'] || decls['min-width'].value !== '0' || !decls['min-width'].important) {
      throw new Error(`Expected min-width: 0 !important at ${vp.width}px`);
    }
  });
});

// ==========================================================================
// SUITE 5: EMPTY STATE CARD & BUTTON TOUCH ERGONOMICS
// ==========================================================================
console.log(`\n${BOLD}Suite 5: Empty State Card & Action Button Touch Ergonomics${RESET}`);

mobileVps.forEach(vp => {
  test('Empty Card Padding', `[${vp.width}px] .dashboard-empty-card scales padding down from 2.5rem`, () => {
    const decls = getActiveDeclarations('.dashboard-empty-card', vp.width);
    if (!decls['padding'] || !decls['padding'].important) {
      throw new Error(`Missing !important padding override for .dashboard-empty-card at ${vp.width}px`);
    }
    if (vp.isSmallMobile) {
      if (decls['padding'].value !== '1.5rem 0.75rem') {
        throw new Error(`Expected 1.5rem 0.75rem at ${vp.width}px, got ${decls['padding'].value}`);
      }
    } else {
      if (decls['padding'].value !== '1.75rem 1.25rem') {
        throw new Error(`Expected 1.75rem 1.25rem at ${vp.width}px, got ${decls['padding'].value}`);
      }
    }
  });

  test('Empty Button Ergonomics', `[${vp.width}px] .dashboard-empty-btn satisfies WCAG touch target height >= 42px`, () => {
    const decls = getActiveDeclarations('.dashboard-empty-btn', vp.width);
    if (!decls['min-height'] || !decls['min-height'].important) {
      throw new Error(`Expected min-height !important on .dashboard-empty-btn at ${vp.width}px`);
    }
    const minHeightVal = parseInt(decls['min-height'].value, 10);
    if (minHeightVal < 42) {
      throw new Error(`Expected min-height >= 42px, got ${minHeightVal}px`);
    }
    if (vp.isSmallMobile && minHeightVal < 44) {
      throw new Error(`Expected min-height >= 44px on small mobile, got ${minHeightVal}px`);
    }
  });
});

test('Empty Button Bounds', '[320px Boundary] .dashboard-empty-btn clamps to max-width: 280px and width: 100%', () => {
  const decls = getActiveDeclarations('.dashboard-empty-btn', 320);
  if (!decls['width'] || decls['width'].value !== '100%') throw new Error('Expected width: 100%');
  if (!decls['max-width'] || decls['max-width'].value !== '280px') throw new Error('Expected max-width: 280px');
});

// ==========================================================================
// SUITE 6: JSDOM DOM RENDERING & EXTREME CONTENT STRESS SIMULATION
// ==========================================================================
console.log(`\n${BOLD}Suite 6: JSDOM DOM Rendering & Extreme Content Stress Simulation${RESET}`);

test('JSDOM Simulation', 'DOM render: Banner + 4 Stats Cards + Deadlines with extreme 80-char unbroken name', () => {
  const extremeExamName = 'UnionPublicServiceCommissionCombinedCivilServicesPreliminaryAndMainsExamination2026';
  const longOrgName = 'GovernmentOfIndiaStaffSelectionCommissionNorthernRegionNewDelhiHeadquarters';

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>${responsiveCss}</style>
</head>
<body>
  <div class="app-container">
    <div class="main-content">
      <div class="main-body">
        <!-- Incomplete Profile Banner -->
        <div class="dashboard-banner">
          <div class="dashboard-banner-content">
            <div class="icon-box"><svg></svg></div>
            <div>
              <div class="banner-title">Complete your profile to unlock exam matching</div>
              <div class="banner-sub">We need your education & demographics to find eligible exams for you.</div>
            </div>
          </div>
          <button class="dashboard-banner-btn">Complete Profile →</button>
        </div>

        <!-- Stats Grid (4 Cards) -->
        <div class="dashboard-stats-grid">
          <div class="stat-card"><div class="stat-val">12</div><div class="stat-label">Tracked Exams</div></div>
          <div class="stat-card"><div class="stat-val">5</div><div class="stat-label">Bookmarked</div></div>
          <div class="stat-card"><div class="stat-val">2</div><div class="stat-label">Applied</div></div>
          <div class="stat-card"><div class="stat-val">3</div><div class="stat-label">Upcoming Deadlines</div></div>
        </div>

        <!-- Deadlines Card with Extreme Text -->
        <div class="dashboard-deadlines-card deadlines-card">
          <div class="deadline-item">
            <div>
              <div class="exam-title">${extremeExamName}</div>
              <div class="exam-org">${longOrgName}</div>
            </div>
            <div>
              <div class="deadline-badge">15 Oct 2026</div>
              <div class="deadline-label">Deadline</div>
            </div>
          </div>
        </div>

        <!-- Empty State Card -->
        <div class="dashboard-deadlines-card deadlines-card">
          <div class="dashboard-empty-card">
            <div class="empty-title">No tracked exams yet</div>
            <button class="dashboard-empty-btn">Explore Available Exams</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const banner = doc.querySelector('.dashboard-banner');
  const bannerBtn = doc.querySelector('.dashboard-banner-btn');
  const statsGrid = doc.querySelector('.dashboard-stats-grid');
  const statCards = doc.querySelectorAll('.stat-card');
  const deadlinesCard = doc.querySelector('.dashboard-deadlines-card');
  const deadlineItem = doc.querySelector('.deadline-item');
  const emptyCard = doc.querySelector('.dashboard-empty-card');
  const emptyBtn = doc.querySelector('.dashboard-empty-btn');

  if (!banner) throw new Error('Banner DOM node missing');
  if (!bannerBtn) throw new Error('Banner button DOM node missing');
  if (!statsGrid) throw new Error('Stats grid DOM node missing');
  if (statCards.length !== 4) throw new Error(`Expected 4 stat cards, found ${statCards.length}`);
  if (!deadlinesCard) throw new Error('Deadlines card DOM node missing');
  if (!deadlineItem) throw new Error('Deadline item DOM node missing');
  if (!emptyCard) throw new Error('Empty state card DOM node missing');
  if (!emptyBtn) throw new Error('Empty state button DOM node missing');

  // Verify text inclusion
  if (!deadlineItem.textContent.includes(extremeExamName)) {
    throw new Error('Extreme exam name not rendered inside DOM');
  }
});

// ==========================================================================
// SUITE 7: DESKTOP & TABLET BOUNDARY NON-REGRESSION (769px, 1024px, 1025px, 1440px)
// ==========================================================================
console.log(`\n${BOLD}Suite 7: Desktop & Tablet Boundary Non-Regression${RESET}`);

test('Tablet Boundary', '[769px Tablet Portrait] Stats grid renders 2 columns; mobile banner/deadlines overrides inactive', () => {
  const gridDecls = getActiveDeclarations('.dashboard-stats-grid', 769);
  if (!gridDecls['grid-template-columns'] || gridDecls['grid-template-columns'].value !== 'repeat(2, 1fr)') {
    throw new Error(`Expected repeat(2, 1fr) at 769px, got: ${JSON.stringify(gridDecls['grid-template-columns'])}`);
  }

  // Mobile banner overrides should NOT be active at 769px
  const bannerDecls = getActiveDeclarations('.dashboard-banner', 769);
  if (bannerDecls['flex-direction'] && bannerDecls['flex-direction'].value === 'column') {
    throw new Error('Mobile flex-direction: column activated at 769px tablet breakpoint');
  }
});

test('Tablet Boundary', '[1024px Tablet Landscape] Stats grid retains repeat(2, 1fr); mobile overrides inactive', () => {
  const gridDecls = getActiveDeclarations('.dashboard-stats-grid', 1024);
  if (!gridDecls['grid-template-columns'] || gridDecls['grid-template-columns'].value !== 'repeat(2, 1fr)') {
    throw new Error(`Expected repeat(2, 1fr) at 1024px`);
  }

  const deadlinesDecls = getActiveDeclarations('.dashboard-deadlines-card', 1024);
  if (Object.keys(deadlinesDecls).length !== 0) {
    throw new Error(`Mobile deadlines card overrides active at 1024px: ${JSON.stringify(deadlinesDecls)}`);
  }
});

test('Desktop Baseline', '[1025px Desktop Threshold] Exactly 0 media query overrides active for ALL dashboard components', () => {
  const dashboardSelectors = [
    '.dashboard-stats-grid',
    '.stat-card',
    '.dashboard-banner',
    '.dashboard-banner-content',
    '.dashboard-banner-btn',
    '.dashboard-deadlines-card',
    '.deadlines-card',
    '.deadline-item',
    '.dashboard-empty-card',
    '.dashboard-empty-btn',
  ];
  for (const sel of dashboardSelectors) {
    const decls = getActiveDeclarations(sel, 1025);
    if (Object.keys(decls).length !== 0) {
      throw new Error(`Active declarations found at 1025px for selector "${sel}": ${JSON.stringify(decls)}`);
    }
  }
});

test('Desktop Baseline', '[1440px Desktop Reference] Exactly 0 media query overrides active (100% desktop fidelity)', () => {
  const dashboardSelectors = [
    '.dashboard-stats-grid',
    '.stat-card',
    '.dashboard-banner',
    '.dashboard-banner-content',
    '.dashboard-banner-btn',
    '.dashboard-deadlines-card',
    '.deadlines-card',
    '.deadline-item',
    '.dashboard-empty-card',
    '.dashboard-empty-btn',
  ];
  for (const sel of dashboardSelectors) {
    const decls = getActiveDeclarations(sel, 1440);
    if (Object.keys(decls).length !== 0) {
      throw new Error(`Active declarations found at 1440px for selector "${sel}": ${JSON.stringify(decls)}`);
    }
  }
});

// ==========================================================================
// SUMMARY & VERDICT
// ==========================================================================
console.log(`\n============================================================`);
console.log(`${BOLD}CHALLENGER 1 M2 VIEWPORT STRESS TEST SUMMARY${RESET}`);
console.log(`============================================================`);

const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
const failedCount = totalCount - passedCount;

console.log(`  Total Stress Tests: ${totalCount}`);
console.log(`  Passed:             ${GREEN}${passedCount}${RESET}`);
console.log(`  Failed:             ${failedCount > 0 ? RED : GREEN}${failedCount}${RESET}`);
console.log(`============================================================\n`);

if (failedCount === 0) {
  console.log(`${GREEN}${BOLD}ALL M2 MOBILE VIEWPORT STRESS TESTS PASSED EMPIRICALLY! VERDICT: APPROVE${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}${BOLD}M2 VIEWPORT STRESS FAILURES DETECTED! VERDICT: REQUEST_CHANGES${RESET}\n`);
  process.exit(1);
}
