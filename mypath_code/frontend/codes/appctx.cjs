const fs = require('fs');
const path = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/context/AppContext.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\s*completeGoogleProfile,\n/g, '\n');
fs.writeFileSync(path, c);
