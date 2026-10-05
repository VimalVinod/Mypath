const fs = require('fs');
let lines = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8').split('\n');
for (let i = 110; i < 130; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
