const fs = require('fs');
const path = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/data/mockData.ts';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\s*username: '',\n/g, '\n');
c = c.replace(/\s*isProfileComplete: (false|true),\n/g, '\n');
fs.writeFileSync(path, c);
