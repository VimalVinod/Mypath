const fs = require('fs');

// Fix AppContext.tsx again
const appCtx = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/context/AppContext.tsx';
let c1 = fs.readFileSync(appCtx, 'utf8');
c1 = c1.replace(/\s*username: '',/g, '');
c1 = c1.replace(/\s*username: data\?\.username \|\| '',/g, '');
c1 = c1.replace(/\s*username: userData\.username \|\| '',/g, '');
c1 = c1.replace(/\s*username: data\.username \|\| '',/g, '');
c1 = c1.replace(/\s*completeGoogleProfile: \([^)]+\) => Promise<void>;/g, '');
c1 = c1.replace(/\s*checkUsernameAvailable: \(username: string\) => Promise<boolean>;/g, '');
c1 = c1.replace(/\s*checkUsernameAvailable/g, '');
fs.writeFileSync(appCtx, c1);

// Fix mockData.ts
const mockData = 'C:/Users/sindh/Documents/codes/mypath/frontend/codes/src/data/mockData.ts';
let c2 = fs.readFileSync(mockData, 'utf8');
c2 = c2.replace(/\s*username: '[^']+',/g, '');
fs.writeFileSync(mockData, c2);

console.log('Fixed TS errors step 2');
