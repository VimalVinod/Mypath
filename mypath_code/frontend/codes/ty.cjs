const fs = require('fs');
const path = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/types/index.ts';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(/\s*isProfileComplete: boolean;\n/g, '\n');
fs.writeFileSync(path, c);

const app = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/context/AppContext.tsx';
let ca = fs.readFileSync(app, 'utf8');
ca = ca.replace(/\s*completeGoogleProfile,\n/g, '\n');
ca = ca.replace(/\s*completeGoogleProfile\n/g, '\n');
fs.writeFileSync(app, ca);
