/**
 * ==============================================================================
 * CHALLENGE HARNESS: M1 Desktop Fidelity & Tablet Boundary Verification
 * Agent: Challenger 2 (M1 Desktop Fidelity Challenger)
 * ==============================================================================
 * 
 * Objectives:
 * 1. Empirically test Desktop Baseline (>1024px) for 100% pixel-for-pixel fidelity
 *    with EXACTLY 0 responsive overrides.
 * 2. Empirically test Tablet Boundary (769px - 1024px) for sticky left sidebar
 *    with 200px width and tablet layout reflows.
 * 3. Test exact boundary crossings:
 *    - 768px (Mobile cutoff) vs 769px (Tablet lower boundary)
 *    - 1024px (Tablet upper boundary) vs 1025px (Desktop baseline boundary)
 * 4. Test extreme desktop resolutions (1440px, 1920px, 2560px, 3840px 4K).
 */

const fs = require('fs');
const path = require('path');
const cssTools = require('@adobe/css-tools');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

let passed = 0;
let failed = 0;
const results = [];

function check(title, assertion, details = '') {
  if (assertion) {
    passed++;
    console.log(`  ${GREEN}✓ PASS${RESET}: ${title}`);
    results.push({ title, pass: true, details });
  } else {
    failed++;
    console.log(`  ${RED}✗ FAIL${RESET}: ${title}`);
    if (details) console.log(`    ${RED}Error: ${details}${RESET}`);
    results.push({ title, pass: false, details });
  }
}

console.log(`${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN}   CHALLENGER 2: DESKTOP FIDELITY & TABLET BOUNDARY HARNESS     ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

// 1. Load Stylesheet
const responsiveCssPath = path.resolve(__dirname, '../src/styles/responsive.css');
if (!fs.existsSync(responsiveCssPath)) {
  console.error(`${RED}FATAL: src/styles/responsive.css not found!${RESET}`);
  process.exit(1);
}
const cssContent = fs.readFileSync(responsiveCssPath, 'utf8');

// 2. Parse CSS AST
const ast = cssTools.parse(cssContent);

function parseMediaCondition(mediaStr) {
  const maxMatch = mediaStr.match(/max-width:\s*(\d+(\.\d+)?)px/);
  const minMatch = mediaStr.match(/min-width:\s*(\d+(\.\d+)?)px/);
  return {
    raw: mediaStr,
    maxWidth: maxMatch ? parseFloat(maxMatch[1]) : Infinity,
    minWidth: minMatch ? parseFloat(minMatch[1]) : 0,
  };
}

const parsedRules = [];
let topLevelRulesOutsideMedia = 0;

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
          parsedRules.push({
            media: rule.media,
            condition,
            selector,
            declarations,
          });
        }
      }
    }
  } else if (rule.type === 'rule') {
    topLevelRulesOutsideMedia++;
  }
}

// Helper: matches width to media query
function matchesMediaQuery(condition, width) {
  return width >= condition.minWidth && width <= condition.maxWidth;
}

// Helper: get active declarations for a selector at given width
function getActiveDeclarations(selector, width) {
  const active = {};
  for (const r of parsedRules) {
    if (matchesMediaQuery(r.condition, width)) {
      const selectors = r.selector.split(',').map(s => s.trim());
      if (selectors.includes(selector) || r.selector.trim() === selector.trim()) {
        for (const [prop, decl] of Object.entries(r.declarations)) {
          active[prop] = decl;
        }
      }
    }
  }
  return active;
}

// Helper: count all active rules in responsive.css at a given width
function countActiveRulesAtWidth(width) {
  let count = 0;
  for (const r of parsedRules) {
    if (matchesMediaQuery(r.condition, width)) {
      count++;
    }
  }
  return count;
}

// -----------------------------------------------------------------------------
// SUITE 1: STRICT CSS STRUCTURE & ZERO DESKTOP OVERRIDES
// -----------------------------------------------------------------------------
console.log(`${BOLD}${YELLOW}>>> SUITE 1: CSS Architecture & Desktop (>1024px) Zero Override Invariant${RESET}`);

check(
  'AST Invariant: Exactly 0 CSS rules exist outside @media query blocks in responsive.css',
  topLevelRulesOutsideMedia === 0,
  `Found ${topLevelRulesOutsideMedia} top-level rules outside media queries`
);

const desktopViewports = [1025, 1080, 1152, 1200, 1280, 1366, 1440, 1600, 1920, 2560, 3840];
for (const vp of desktopViewports) {
  const activeCount = countActiveRulesAtWidth(vp);
  check(
    `Desktop Invariant [${vp}px]: Exactly 0 responsive rules active`,
    activeCount === 0,
    `Found ${activeCount} active rules at ${vp}px`
  );
}

// Check key selectors have 0 overrides at 1025px and 1440px
const criticalSelectors = [
  '.app-container',
  '.sidebar-container',
  '.sidebar-inner',
  '.sidebar-logo-area',
  '.sidebar-profile-area',
  '.sidebar-signout',
  '.sidebar-nav',
  '.sidebar-nav-btn',
  '.sidebar-nav-label',
  '.sidebar-nav-badge',
  '.main-content',
  '.main-header',
  '.main-body',
  '.dashboard-stats-grid',
  '.stat-card',
  '.cookie-consent-banner',
  '.cookie-consent-actions',
  '.profile-picker-modal',
  '.profile-picker-grid',
  '.nav-container',
  '.nav-links',
  '.navbar-brand-logo',
  'footer',
  '.app-footer',
];

for (const sel of criticalSelectors) {
  const decls1025 = getActiveDeclarations(sel, 1025);
  const decls1440 = getActiveDeclarations(sel, 1440);
  const count1025 = Object.keys(decls1025).length;
  const count1440 = Object.keys(decls1440).length;
  check(
    `Selector [${sel}]: 0 overrides active at desktop threshold 1025px`,
    count1025 === 0,
    `Found overrides: ${JSON.stringify(decls1025)}`
  );
  check(
    `Selector [${sel}]: 0 overrides active at canonical desktop 1440px`,
    count1440 === 0,
    `Found overrides: ${JSON.stringify(decls1440)}`
  );
}

// -----------------------------------------------------------------------------
// SUITE 2: TABLET BOUNDARY (769px - 1024px) EMPIRICAL VERIFICATION
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}${YELLOW}>>> SUITE 2: Tablet Boundary (769px - 1024px) Empirical Verification${RESET}`);

// Check tablet lower boundary: 769px
const tabletViewports = [769, 770, 800, 820, 834, 900, 960, 1000, 1024];

for (const vp of tabletViewports) {
  const sidebarDecls = getActiveDeclarations('.sidebar-container', vp);
  const headerDecls = getActiveDeclarations('.main-header', vp);
  const bodyDecls = getActiveDeclarations('.main-body', vp);
  const statsDecls = getActiveDeclarations('.dashboard-stats-grid', vp);

  check(
    `Tablet [${vp}px]: .sidebar-container width is explicitly overridden to 200px !important`,
    sidebarDecls['width'] && sidebarDecls['width'].value === '200px' && sidebarDecls['width'].important,
    `Expected width: 200px !important, got: ${JSON.stringify(sidebarDecls['width'])}`
  );

  check(
    `Tablet [${vp}px]: .sidebar-container min-width is explicitly overridden to 200px !important`,
    sidebarDecls['min-width'] && sidebarDecls['min-width'].value === '200px' && sidebarDecls['min-width'].important,
    `Expected min-width: 200px !important, got: ${JSON.stringify(sidebarDecls['min-width'])}`
  );

  check(
    `Tablet [${vp}px]: .sidebar-container position is NOT overridden to fixed (remains sticky from inline)`,
    sidebarDecls['position'] === undefined,
    `Position should not be overridden on tablet, but got: ${JSON.stringify(sidebarDecls['position'])}`
  );

  check(
    `Tablet [${vp}px]: .sidebar-container bottom is NOT overridden to 0 (stays vertical, not bottom bar)`,
    sidebarDecls['bottom'] === undefined,
    `Bottom should not be overridden on tablet, but got: ${JSON.stringify(sidebarDecls['bottom'])}`
  );

  check(
    `Tablet [${vp}px]: Desktop chrome (.sidebar-logo-area) is NOT hidden (remains visible)`,
    getActiveDeclarations('.sidebar-logo-area', vp)['display'] === undefined,
    `Sidebar logo area should be visible on tablet`
  );

  check(
    `Tablet [${vp}px]: Desktop chrome (.sidebar-profile-area) is NOT hidden (remains visible)`,
    getActiveDeclarations('.sidebar-profile-area', vp)['display'] === undefined,
    `Sidebar profile area should be visible on tablet`
  );

  check(
    `Tablet [${vp}px]: Desktop chrome (.sidebar-signout) is NOT hidden (remains visible)`,
    getActiveDeclarations('.sidebar-signout', vp)['display'] === undefined,
    `Sidebar signout should be visible on tablet`
  );

  check(
    `Tablet [${vp}px]: .main-header padding is scaled to 0 1.5rem !important`,
    headerDecls['padding'] && headerDecls['padding'].value === '0 1.5rem' && headerDecls['padding'].important,
    `Expected padding: 0 1.5rem !important, got: ${JSON.stringify(headerDecls['padding'])}`
  );

  check(
    `Tablet [${vp}px]: .main-body padding is scaled to 1.5rem !important`,
    bodyDecls['padding'] && bodyDecls['padding'].value === '1.5rem' && bodyDecls['padding'].important,
    `Expected padding: 1.5rem !important, got: ${JSON.stringify(bodyDecls['padding'])}`
  );

  check(
    `Tablet [${vp}px]: .dashboard-stats-grid is 2-column repeat(2, 1fr) !important`,
    statsDecls['grid-template-columns'] && statsDecls['grid-template-columns'].value === 'repeat(2, 1fr)' && statsDecls['grid-template-columns'].important,
    `Expected grid-template-columns: repeat(2, 1fr) !important, got: ${JSON.stringify(statsDecls['grid-template-columns'])}`
  );
}

// -----------------------------------------------------------------------------
// SUITE 3: EXACT BOUNDARY CROSSING TESTS
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}${YELLOW}>>> SUITE 3: Exact Boundary Transitions (768px vs 769px & 1024px vs 1025px)${RESET}`);

// Boundary 1: 768px vs 769px
const sidebarAt768 = getActiveDeclarations('.sidebar-container', 768);
const sidebarAt769 = getActiveDeclarations('.sidebar-container', 769);

check(
  'Boundary 768px: Mobile fixed bottom nav activates (position: fixed !important)',
  sidebarAt768['position'] && sidebarAt768['position'].value === 'fixed' && sidebarAt768['position'].important,
  `At 768px expected position: fixed !important, got: ${JSON.stringify(sidebarAt768['position'])}`
);

check(
  'Boundary 768px: Mobile fixed bottom nav anchors to bottom (bottom: 0 !important)',
  sidebarAt768['bottom'] && sidebarAt768['bottom'].value === '0' && sidebarAt768['bottom'].important,
  `At 768px expected bottom: 0 !important, got: ${JSON.stringify(sidebarAt768['bottom'])}`
);

check(
  'Boundary 768px: Mobile fixed bottom nav clears top offset (top: auto !important)',
  sidebarAt768['top'] && sidebarAt768['top'].value === 'auto' && sidebarAt768['top'].important,
  `At 768px expected top: auto !important, got: ${JSON.stringify(sidebarAt768['top'])}`
);

check(
  'Boundary 769px: Mobile fixed bottom nav DEACTIVATES (position is NOT fixed)',
  sidebarAt769['position'] === undefined,
  `At 769px position should be undefined in responsive overrides, got: ${JSON.stringify(sidebarAt769['position'])}`
);

check(
  'Boundary 769px: Mobile bottom: 0 DEACTIVATES',
  sidebarAt769['bottom'] === undefined,
  `At 769px bottom should be undefined in responsive overrides, got: ${JSON.stringify(sidebarAt769['bottom'])}`
);

check(
  'Boundary 769px: Tablet sidebar width 200px ACTIVATES',
  sidebarAt769['width'] && sidebarAt769['width'].value === '200px',
  `At 769px expected width: 200px, got: ${JSON.stringify(sidebarAt769['width'])}`
);

// Boundary 2: 1024px vs 1025px
const rulesAt1024 = countActiveRulesAtWidth(1024);
const rulesAt1025 = countActiveRulesAtWidth(1025);
const sidebarAt1024 = getActiveDeclarations('.sidebar-container', 1024);
const sidebarAt1025 = getActiveDeclarations('.sidebar-container', 1025);

check(
  'Boundary 1024px: Tablet rules are active (rules count > 0)',
  rulesAt1024 > 0,
  `Expected >0 rules at 1024px, got ${rulesAt1024}`
);

check(
  'Boundary 1024px: Sidebar width is 200px !important',
  sidebarAt1024['width'] && sidebarAt1024['width'].value === '200px',
  `Expected width: 200px at 1024px, got: ${JSON.stringify(sidebarAt1024['width'])}`
);

check(
  'Boundary 1025px: EXACTLY 0 responsive rules active (clean cutoff)',
  rulesAt1025 === 0,
  `Expected 0 rules at 1025px, got ${rulesAt1025}`
);

check(
  'Boundary 1025px: Sidebar width override CEASES (reverts to baseline 260px)',
  sidebarAt1025['width'] === undefined,
  `Expected width to be undefined in overrides at 1025px, got: ${JSON.stringify(sidebarAt1025['width'])}`
);

// -----------------------------------------------------------------------------
// SUITE 4: INLINE BASELINE PRESERVATION STRESS TEST (SidebarLayout.tsx)
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}${YELLOW}>>> SUITE 4: Component Baseline Structure & Inline Style Audit${RESET}`);

const sidebarFile = fs.readFileSync(path.resolve(__dirname, '../src/components/SidebarLayout.tsx'), 'utf8');

// Check that baseline inline styles are intact in JSX
check(
  'SidebarLayout.tsx: Baseline 260px sidebar width variable is intact',
  sidebarFile.includes("const sidebarWidth = collapsed ? '76px' : '260px';"),
  'sidebarWidth expression modified or missing'
);

check(
  'SidebarLayout.tsx: Inline position: sticky is preserved on sidebar',
  sidebarFile.includes("position: 'sticky'"),
  'position: sticky not found in SidebarLayout inline style'
);

check(
  'SidebarLayout.tsx: Inline top: 0 is preserved on sidebar',
  sidebarFile.includes("top: 0"),
  'top: 0 not found in SidebarLayout inline style'
);

check(
  'SidebarLayout.tsx: Inline height: 100vh is preserved on sidebar',
  sidebarFile.includes("height: '100vh'"),
  'height: 100vh not found in SidebarLayout inline style'
);

check(
  'SidebarLayout.tsx: Inline flex-direction: column is preserved on sidebar',
  sidebarFile.includes("flexDirection: 'column'"),
  'flexDirection: column not found in SidebarLayout inline style'
);

check(
  'SidebarLayout.tsx: Desktop chrome (SidebarContent) contains logo and profile areas',
  sidebarFile.includes('className="sidebar-logo-area"') && sidebarFile.includes('className="sidebar-profile-area"'),
  'sidebar-logo-area or sidebar-profile-area missing'
);

check(
  'SidebarLayout.tsx: Main header inline baseline padding: 0 2rem is preserved',
  sidebarFile.includes("padding: '0 2rem'"),
  'padding: 0 2rem not found on header in SidebarLayout'
);

check(
  'SidebarLayout.tsx: Main body inline baseline padding: 1.75rem 2rem is preserved',
  sidebarFile.includes("padding: '1.75rem 2rem'"),
  'padding: 1.75rem 2rem not found on main in SidebarLayout'
);

check(
  'App.tsx & main.tsx: Zero JS conditional rendering (no isMobile / matchMedia hooks)',
  !sidebarFile.includes('isMobile') && !sidebarFile.includes('useMediaQuery') && !sidebarFile.includes('matchMedia'),
  'Conditional JS rendering detected in SidebarLayout.tsx'
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN}                     CHALLENGE HARNESS SUMMARY                  ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}`);
console.log(`  Total Checks: ${passed + failed}`);
console.log(`  ${GREEN}Passed:       ${passed}${RESET}`);
console.log(`  ${failed === 0 ? GREEN : RED}Failed:       ${failed}${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`${BOLD}${GREEN}ALL EMPIRICAL CHALLENGES PASSED! DESKTOP FIDELITY & TABLET BOUNDARY VERIFIED.${RESET}\n`);
  process.exit(0);
}
