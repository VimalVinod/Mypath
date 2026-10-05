const fs = require('fs');
const path = 'src/pages/LandingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldSection = `<section style={{ padding: '4.5rem 0', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>`;
const newSection = `<section style={{ padding: '4.5rem 0', backgroundColor: '#000000', borderBottom: '1px solid var(--border)' }}>`;

const oldHeading = `<h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase' }}>Active Opportunities</h2>`;
const newHeading = `<h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase', color: '#FFFFFF' }}>Active Opportunities</h2>`;

if (code.includes(oldSection)) {
  code = code.replace(oldSection, newSection);
}

if (code.includes(oldHeading)) {
  code = code.replace(oldHeading, newHeading);
}

fs.writeFileSync(path, code);
console.log('Updated Active Opportunities background and heading color.');
