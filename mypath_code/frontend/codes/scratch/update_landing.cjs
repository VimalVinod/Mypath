const fs = require('fs');

const landingPath = 'src/pages/LandingPage.tsx';
let code = fs.readFileSync(landingPath, 'utf8');

// 1. Remove Active Opportunities section
const sectionRegex = /\/\* Featured \/ Trending Exams \*\/\s*<section[\s\S]*?<\/section>/;
code = code.replace(sectionRegex, '');

// 2. Replace dashboard placeholder with image
const placeholderRegex = /\{\/\* Dashboard Placeholder[\s\S]*?\[ Dashboard Image Placeholder \]\s*<\/div>/;
const newImage = `{/* Dashboard Screenshot */}
            <div style={{ width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
              <img src="/dashboard-screenshot.png" alt="Dashboard Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>`;
code = code.replace(placeholderRegex, newImage);

fs.writeFileSync(landingPath, code);
console.log('Updated LandingPage.tsx layout and image.');
