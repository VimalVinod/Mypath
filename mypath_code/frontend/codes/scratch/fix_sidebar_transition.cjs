const fs = require('fs');

const path = 'src/components/SidebarLayout.tsx';
let code = fs.readFileSync(path, 'utf8');

// The issue is that the <aside> has transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'.
// If we change it to 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', it animates both width and minWidth smoothly.

code = code.replace(
  /transition: 'width 0\.5s cubic-bezier\(0\.4, 0, 0\.2, 1\)',/,
  "transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',"
);

fs.writeFileSync(path, code);
console.log('Sidebar transition fixed');
