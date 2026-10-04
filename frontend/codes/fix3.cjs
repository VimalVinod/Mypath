const fs = require('fs');
const mockData = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/data/mockData.ts';
let c2 = fs.readFileSync(mockData, 'utf8');
c2 = c2.replace(/username: '[^']+',/g, '');
fs.writeFileSync(mockData, c2);

const appCtx = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/context/AppContext.tsx';
let c1 = fs.readFileSync(appCtx, 'utf8');
c1 = c1.replace(/completeGoogleProfile,\n/g, '');
fs.writeFileSync(appCtx, c1);

const dashPage = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/pages/DashboardPage.tsx';
let c3 = fs.readFileSync(dashPage, 'utf8');
c3 = c3.replace(/@\{userProfile\?.username\}/g, '');
c3 = c3.replace(/<span style=\{\{ color: 'var\(--text-secondary\)', fontSize: '0.9rem', fontWeight: 500 \}\}>\s*<\/span>/g, '');
c3 = c3.replace(/<span style=\{\{ color: 'var\(--text-secondary\)', fontSize: '0.9rem', fontWeight: 500 \}\}>\s*@\{userProfile\?.username\}\s*<\/span>/g, '');
c3 = c3.replace(/@\{userProfile\?.username\} \| /g, '');
c3 = c3.replace(/\{userProfile\?.username \?  | @\$\{userProfile.username\} : ''\}/g, '');
c3 = c3.replace(/\{userProfile\?.username \?  \| @\$\{userProfile.username\} : ''\}/g, '');
fs.writeFileSync(dashPage, c3);
