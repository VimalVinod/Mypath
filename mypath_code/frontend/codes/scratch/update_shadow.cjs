const fs = require('fs');
const landingPath = 'src/pages/LandingPage.tsx';

let code = fs.readFileSync(landingPath, 'utf8');
code = code.replace(
  "boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'",
  "boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.4)', border: '1px solid #27272A'"
);

fs.writeFileSync(landingPath, code);
console.log('Updated LandingPage.tsx with black shadow effect.');
