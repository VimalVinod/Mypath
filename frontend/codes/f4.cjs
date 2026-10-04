const fs = require('fs');

const types = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/types/index.ts';
let c = fs.readFileSync(types, 'utf8');
c = c.replace(/email: string;\n/, 'email: string;\n  isProfileComplete?: boolean;\n');
fs.writeFileSync(types, c);

const app = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/context/AppContext.tsx';
let ca = fs.readFileSync(app, 'utf8');
ca = ca.replace(/\s*completeGoogleProfile: \([^)]+\) => Promise<void>;/g, '');
ca = ca.replace(/\s*completeGoogleProfile,/g, '');
fs.writeFileSync(app, ca);

