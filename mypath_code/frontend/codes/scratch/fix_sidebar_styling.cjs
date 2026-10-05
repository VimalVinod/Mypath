const fs = require('fs');

const path = 'src/components/SidebarLayout.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix BRAND_GREEN
code = code.replace(
  /const BRAND_GREEN = '#6B8E23';/,
  `const BRAND_GREEN = '#10B981';`
);

// 2. Fix Nav padding
code = code.replace(
  /padding: '1rem 0\.75rem', display: 'flex', flexDirection: 'column', gap: '0\.25rem'/,
  `padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.15rem'`
);

// 3. Fix Nav Header padding to match new button padding
code = code.replace(
  /padding: '0 0\.75rem', marginBottom: '0\.5rem'/,
  `padding: '0 1.25rem', marginBottom: '0.5rem'`
);

// 4. Fix button styles (remove border radius, update padding)
code = code.replace(
  /padding: collapsed \? '0\.75rem' : '0\.75rem 1rem',\s*borderRadius: '10px',/g,
  `padding: collapsed ? '0.75rem 0' : '0.75rem 1.25rem',\n                borderRadius: '0px',`
);

// 5. Fix sidebar transition speed
code = code.replace(
  /transition: 'width 0\.2s ease',/,
  `transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',`
);

fs.writeFileSync(path, code);
console.log('Sidebar styling fixed');
