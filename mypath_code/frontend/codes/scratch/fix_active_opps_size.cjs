const fs = require('fs');
const path = 'src/styles/responsive.css';
let code = fs.readFileSync(path, 'utf8');

// The current responsive.css block for desktop-active-opps:
const oldDesktopActiveOpps = `/* Enhance PC Active Opportunities section */
.desktop-active-opps .container {
  padding: 2.5rem 0 !important;
}
.desktop-active-opps h2 {
  font-size: 1.75rem !important;
  margin-top: 0.5rem !important;
}
.desktop-active-opps span {
  font-size: 0.8rem !important;
}
.desktop-active-opps button {
  padding: 0.6rem 1rem !important;
  font-size: 0.9rem !important;
}`;

const newDesktopActiveOpps = `/* Enhance PC Active Opportunities section */
.desktop-active-opps .container {
  padding: 3.5rem 0 !important;
}
.desktop-active-opps h2 {
  font-size: 2.2rem !important;
  margin-top: 0.75rem !important;
}
.desktop-active-opps span {
  font-size: 0.95rem !important;
}
.desktop-active-opps button {
  padding: 0.8rem 1.4rem !important;
  font-size: 1.05rem !important;
}
.desktop-active-opps .opportunity-card {
  padding: 2rem !important;
}
.desktop-active-opps .opportunity-card h3 {
  font-size: 1.3rem !important;
}
.desktop-active-opps .opportunity-card p {
  font-size: 1rem !important;
}
.desktop-active-opps .opportunity-card .status-pill {
  font-size: 0.8rem !important;
  padding: 0.35rem 0.75rem !important;
}`;

if (code.includes(oldDesktopActiveOpps)) {
  code = code.replace(oldDesktopActiveOpps, newDesktopActiveOpps);
  fs.writeFileSync(path, code);
  console.log('responsive.css active opps sizing updated successfully.');
} else {
  console.log('active opps block not found in responsive.css');
}
