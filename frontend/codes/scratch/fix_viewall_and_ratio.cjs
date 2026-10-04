const fs = require('fs');
const path = 'src/pages/LandingPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update the View All button
const oldViewAllBtn = `<button 
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/exams')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                View All <ChevronRight size={16} />
              </button>`;

const newViewAllBtn = `<button 
                onClick={() => navigate('/exams')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#000000', color: '#FFFFFF', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                View All <ChevronRight size={18} />
              </button>`;

if (code.includes(oldViewAllBtn)) {
  code = code.replace(oldViewAllBtn, newViewAllBtn);
  console.log('Updated View All button.');
} else {
  console.log('Could not find old View All button block.');
  
  // Try regex in case of slight spacing differences
  const viewAllRegex = /<button\s+className="btn btn-ghost btn-sm"[\s\S]*?View All <ChevronRight size=\{16\} \/>\s*<\/button>/;
  if (viewAllRegex.test(code)) {
    code = code.replace(viewAllRegex, newViewAllBtn);
    console.log('Updated View All button via regex.');
  } else {
    console.log('Regex also failed to find View All button.');
  }
}

// 2. Update the dashboard placeholder aspect ratio
const oldAspectRatio = `aspectRatio: '16/9'`;
const newAspectRatio = `aspectRatio: '1918/908'`;

if (code.includes(oldAspectRatio)) {
  code = code.replace(oldAspectRatio, newAspectRatio);
  console.log('Updated aspect ratio to 1918/908.');
} else {
  console.log('Could not find 16/9 aspect ratio.');
}

fs.writeFileSync(path, code);
