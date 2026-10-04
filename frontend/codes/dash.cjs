const fs = require('fs');
const path = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/pages/DashboardPage.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\s*userProfile\?\.username \|\|/g, '');
fs.writeFileSync(path, c);
