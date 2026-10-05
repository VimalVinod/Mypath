const fs = require('fs');
const path = 'src/pages/LandingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldStr = `          <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>`;
const newStr = `          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync(path, code);
  console.log('Increased image placeholder max-width to 1200px.');
} else {
  console.log('Could not find the exact max-width string.');
}
