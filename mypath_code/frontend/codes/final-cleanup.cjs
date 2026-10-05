const fs = require('fs');

let ctx = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
ctx = ctx.replace(/permanentAddress: '',/g, '');
ctx = ctx.replace(/currentAddress: '',/g, '');
ctx = ctx.replace(/state: '',/g, 'state: \\'\\', district: \\'\\', subDistrict: \\'\\',');
fs.writeFileSync('src/context/AppContext.tsx', ctx);

let prof = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');
prof = prof.replace(/permanentAddress: userProfile\.permanentAddress \|\| '',/g, '');
prof = prof.replace(/currentAddress: userProfile\.currentAddress \|\| '',/g, '');
prof = prof.replace(/isSameAddress: userProfile\.permanentAddress === userProfile\.currentAddress && !!userProfile\.permanentAddress,/g, '');
prof = prof.replace(/state: '', district: '', subDistrict: '',\s*state: '', district: '', subDistrict: '',/, "state: '', district: '', subDistrict: '',");
fs.writeFileSync('src/pages/ProfilePage.tsx', prof);
