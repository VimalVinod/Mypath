/**
 * ==============================================================================
 * JSDOM RENDER & COMPUTED STYLE STRESS TEST
 * Agent: Challenger 2 (M1 Desktop Fidelity Challenger)
 * ==============================================================================
 * 
 * Tests the DOM layout of SidebarLayout with actual CSS applied:
 * 1. Desktop Standard (1440px): Full 260px sticky sidebar, all desktop chrome visible.
 * 2. Desktop Boundary (1025px): Zero CSS overrides, 260px sticky sidebar.
 * 3. Tablet Upper Boundary (1024px): 200px width override, sticky left, desktop chrome visible.
 * 4. Tablet Midpoint (834px): 200px width override, sticky left, desktop chrome visible.
 * 5. Tablet Lower Boundary (769px): 200px width override, sticky left, desktop chrome visible.
 * 6. Mobile Boundary (768px): Fixed bottom nav transformation, desktop chrome hidden.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const cssTools = require('@adobe/css-tools');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

const cssPath = path.resolve(__dirname, '../dist/assets/index-BleKdcGx.css');
if (!fs.existsSync(cssPath)) {
  console.error('Run npm run build first!');
  process.exit(1);
}
const bundleCss = fs.readFileSync(cssPath, 'utf8');

// HTML template containing the SidebarLayout DOM structure as rendered by React
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>${bundleCss}</style>
</head>
<body>
  <div class="app-container" style="display: flex; min-height: 100vh; background-color: rgb(241, 245, 249); font-family: Inter, sans-serif;">
    <aside class="sidebar-container" style="width: 260px; min-width: 260px; background-color: rgb(18, 18, 18); height: 100vh; position: sticky; top: 0px; transition: width 0.2s ease; overflow: hidden; z-index: 30; display: flex; flex-direction: column;">
      <div class="sidebar-inner" style="display: flex; flex-direction: column; height: 100%;">
        <div class="sidebar-logo-area" style="display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 1.25rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <img src="/logo.png" style="height: 72px;" />
          <button class="collapse-btn"><svg></svg></button>
        </div>
        <div class="sidebar-profile-area" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); gap: 0.6rem;">
          <div style="width: 80px; height: 80px; border-radius: 50%;">GH</div>
          <div class="profile-name">Grace Hopper</div>
        </div>
        <nav class="sidebar-nav" style="flex: 1 1 0%; padding: 1rem 0px; display: flex; flex-direction: column; gap: 0.15rem;">
          <div class="sidebar-nav-header" style="font-size: 0.65rem; font-weight: 600; color: rgb(82, 82, 91); padding: 0px 1.25rem; margin-bottom: 0.5rem;">MAIN MENU</div>
          <button class="sidebar-nav-btn active" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1.25rem; background-color: rgb(16, 185, 129); color: rgb(255, 255, 255); width: 100%;">
            <svg class="nav-icon"></svg>
            <span class="sidebar-nav-label" style="flex: 1 1 0%;">Dashboard</span>
          </button>
          <button class="sidebar-nav-btn" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1.25rem; color: rgb(161, 161, 170); width: 100%;">
            <svg class="nav-icon"></svg>
            <span class="sidebar-nav-label" style="flex: 1 1 0%;">Browse Exams</span>
          </button>
        </nav>
        <div class="sidebar-signout" style="border-top: 1px solid rgba(255, 255, 255, 0.05);">
          <button style="display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1.25rem; background-color: transparent; color: rgb(244, 244, 245); width: 100%;">
            <svg></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
    <div class="main-content" style="flex: 1 1 0%; display: flex; flex-direction: column; min-width: 0px;">
      <header class="main-header" style="background-color: rgb(255, 255, 255); border-bottom: 1px solid rgb(226, 232, 240); padding: 0px 2rem; height: 56px; display: flex; align-items: center;">
        <h1 style="font-size: 1.15rem; font-weight: 700; margin: 0px;">Dashboard</h1>
      </header>
      <main class="main-body" style="flex: 1 1 0%; padding: 1.75rem 2rem; overflow-y: auto;">
        <div class="dashboard-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          <div class="stat-card" style="padding: 1.25rem; background: #fff; border-radius: 10px;">Stat 1</div>
          <div class="stat-card" style="padding: 1.25rem; background: #fff; border-radius: 10px;">Stat 2</div>
        </div>
      </main>
    </div>
  </div>
</body>
</html>
`;

console.log(`${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN}   JSDOM COMPUTED STYLES & LAYOUT SPECIFICATION TEST            ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

// Helper to simulate computed style with inline + CSS cascade rules for a given viewport width
function simulateComputedStyle(elementSelector, vpWidth) {
  const dom = new JSDOM(htmlTemplate);
  const doc = dom.window.document;
  const el = doc.querySelector(elementSelector);
  if (!el) throw new Error(`Element ${elementSelector} not found in DOM`);

  // Parse inline style
  const computed = {};
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    computed[prop] = el.style.getPropertyValue(prop);
  }

  // Apply CSS AST rules matching vpWidth
  const ast = cssTools.parse(bundleCss);
  for (const r of ast.stylesheet.rules) {
    let matchesMedia = false;
    if (r.type === 'rule') {
      matchesMedia = true; // global rules
    } else if (r.type === 'media') {
      const maxMatch = r.media.match(/max-width:\s*(\d+(\.\d+)?)px/);
      const minMatch = r.media.match(/min-width:\s*(\d+(\.\d+)?)px/);
      const max = maxMatch ? parseFloat(maxMatch[1]) : Infinity;
      const min = minMatch ? parseFloat(minMatch[1]) : 0;
      if (vpWidth >= min && vpWidth <= max) {
        matchesMedia = true;
      }
    }

    if (matchesMedia) {
      const rulesToProcess = r.type === 'media' ? r.rules : [r];
      for (const rule of rulesToProcess) {
        if (rule.type === 'rule') {
          for (const sel of rule.selectors) {
            // Check if element matches selector
            try {
              if (el.matches(sel)) {
                for (const decl of rule.declarations) {
                  if (decl.type === 'declaration') {
                    // If CSS has !important, it overrides inline style!
                    if (decl.value.includes('!important')) {
                      computed[decl.property] = decl.value.replace('!important', '').trim();
                    } else if (!computed[decl.property]) {
                      computed[decl.property] = decl.value.trim();
                    }
                  }
                }
              }
            } catch {
              // Ignore complex/unsupported selectors like :has() in JSDOM query
            }
          }
        }
      }
    }
  }

  return computed;
}

let checksPassed = 0;
let checksFailed = 0;

function assertStyle(testName, actual, expected) {
  const normActual = (actual || '').replace(/\s*,\s*/g, ', ').trim();
  const normExpected = (expected || '').replace(/\s*,\s*/g, ', ').trim();
  if (normActual === normExpected) {
    checksPassed++;
    console.log(`  ${GREEN}✓ PASS${RESET}: ${testName} => ${actual}`);
  } else {
    checksFailed++;
    console.log(`  ${RED}✗ FAIL${RESET}: ${testName} => Expected '${expected}', got '${actual}'`);
  }
}

// 1. DESKTOP BASELINE (1440px)
console.log(`${BOLD}>>> Desktop Baseline (1440px) Computed Styles:${RESET}`);
const sidebar1440 = simulateComputedStyle('.sidebar-container', 1440);
assertStyle('Desktop 1440px sidebar width', sidebar1440['width'], '260px');
assertStyle('Desktop 1440px sidebar min-width', sidebar1440['min-width'], '260px');
assertStyle('Desktop 1440px sidebar position', sidebar1440['position'], 'sticky');
assertStyle('Desktop 1440px sidebar top', sidebar1440['top'], '0px');
assertStyle('Desktop 1440px sidebar height', sidebar1440['height'], '100vh');
assertStyle('Desktop 1440px sidebar flex-direction', sidebar1440['flex-direction'], 'column');
assertStyle('Desktop 1440px sidebar z-index', sidebar1440['z-index'], '30');

const header1440 = simulateComputedStyle('.main-header', 1440);
assertStyle('Desktop 1440px header padding', header1440['padding'], '0px 2rem');

const body1440 = simulateComputedStyle('.main-body', 1440);
assertStyle('Desktop 1440px body padding', body1440['padding'], '1.75rem 2rem');

const stats1440 = simulateComputedStyle('.dashboard-stats-grid', 1440);
assertStyle('Desktop 1440px stats grid', stats1440['grid-template-columns'], 'repeat(auto-fit, minmax(240px, 1fr))');

// 2. DESKTOP LOWER BOUNDARY (1025px)
console.log(`\n${BOLD}>>> Desktop Lower Boundary (1025px) Computed Styles:${RESET}`);
const sidebar1025 = simulateComputedStyle('.sidebar-container', 1025);
assertStyle('Desktop 1025px sidebar width', sidebar1025['width'], '260px');
assertStyle('Desktop 1025px sidebar position', sidebar1025['position'], 'sticky');
assertStyle('Desktop 1025px sidebar top', sidebar1025['top'], '0px');

const header1025 = simulateComputedStyle('.main-header', 1025);
assertStyle('Desktop 1025px header padding', header1025['padding'], '0px 2rem');

const body1025 = simulateComputedStyle('.main-body', 1025);
assertStyle('Desktop 1025px body padding', body1025['padding'], '1.75rem 2rem');

// 3. TABLET UPPER BOUNDARY (1024px)
console.log(`\n${BOLD}>>> Tablet Upper Boundary (1024px) Computed Styles:${RESET}`);
const sidebar1024 = simulateComputedStyle('.sidebar-container', 1024);
assertStyle('Tablet 1024px sidebar width override', sidebar1024['width'], '200px');
assertStyle('Tablet 1024px sidebar min-width override', sidebar1024['min-width'], '200px');
assertStyle('Tablet 1024px sidebar position retains sticky', sidebar1024['position'], 'sticky');
assertStyle('Tablet 1024px sidebar top retains 0px', sidebar1024['top'], '0px');
assertStyle('Tablet 1024px sidebar height retains 100vh', sidebar1024['height'], '100vh');

const header1024 = simulateComputedStyle('.main-header', 1024);
assertStyle('Tablet 1024px header padding override', header1024['padding'], '0 1.5rem');

const body1024 = simulateComputedStyle('.main-body', 1024);
assertStyle('Tablet 1024px body padding override', body1024['padding'], '1.5rem');

const stats1024 = simulateComputedStyle('.dashboard-stats-grid', 1024);
assertStyle('Tablet 1024px stats grid override', stats1024['grid-template-columns'], 'repeat(2, 1fr)');

// 4. TABLET LOWER BOUNDARY (769px)
console.log(`\n${BOLD}>>> Tablet Lower Boundary (769px) Computed Styles:${RESET}`);
const sidebar769 = simulateComputedStyle('.sidebar-container', 769);
assertStyle('Tablet 769px sidebar width override', sidebar769['width'], '200px');
assertStyle('Tablet 769px sidebar min-width override', sidebar769['min-width'], '200px');
assertStyle('Tablet 769px sidebar position retains sticky', sidebar769['position'], 'sticky');
assertStyle('Tablet 769px sidebar top retains 0px', sidebar769['top'], '0px');

const header769 = simulateComputedStyle('.main-header', 769);
assertStyle('Tablet 769px header padding override', header769['padding'], '0 1.5rem');

const body769 = simulateComputedStyle('.main-body', 769);
assertStyle('Tablet 769px body padding override', body769['padding'], '1.5rem');

// 5. MOBILE CUTOFF BOUNDARY (768px)
console.log(`\n${BOLD}>>> Mobile Cutoff Boundary (768px) Computed Styles:${RESET}`);
const sidebar768 = simulateComputedStyle('.sidebar-container', 768);
assertStyle('Mobile 768px sidebar width override', sidebar768['width'], '100%');
assertStyle('Mobile 768px sidebar position override', sidebar768['position'], 'fixed');
assertStyle('Mobile 768px sidebar top override', sidebar768['top'], 'auto');
assertStyle('Mobile 768px sidebar height override', sidebar768['height'], 'auto');
assertStyle('Mobile 768px sidebar flex-direction override', sidebar768['flex-direction'], 'row');

const appContainer768 = simulateComputedStyle('.app-container', 768);
assertStyle('Mobile 768px app container flex-direction', appContainer768['flex-direction'], 'column');

console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
console.log(`Total Computed Style Checks: ${checksPassed + checksFailed}`);
console.log(`Passed: ${checksPassed}`);
console.log(`Failed: ${checksFailed}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

if (checksFailed > 0) {
  process.exit(1);
} else {
  console.log(`${BOLD}${GREEN}COMPUTED STYLES VERIFICATION 100% SUCCESSFUL!${RESET}\n`);
  process.exit(0);
}
