const fs = require('fs');

let profile = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');
profile = profile.replace(/permanentAddress:.*?,/g, '');
profile = profile.replace(/currentAddress:.*?,/g, '');
profile = profile.replace(/isSameAddress:.*?,/g, '');
// Let's just find any leftover currentAddress stuff and remove it
profile = profile.replace(/<div[^>]*>\s*<label[^>]*>Permanent Address[\s\S]*?<\/textarea>\s*<\/div>/g, '');
profile = profile.replace(/<div[^>]*>\s*<div[^>]*>\s*<label[^>]*>Current \/ Correspondence Address[\s\S]*?<\/textarea>\s*<\/div>/g, '');
fs.writeFileSync('src/pages/ProfilePage.tsx', profile);

let appCtx = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
appCtx = appCtx.replace(/permanentAddress: '',/g, '');
appCtx = appCtx.replace(/currentAddress: '',/g, '');
fs.writeFileSync('src/context/AppContext.tsx', appCtx);

console.log('Fixed Types');
