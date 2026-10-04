const fs = require('fs');

let profile = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

// Strip out any multiple 'state' and 'district' in initial state block
profile = profile.replace(/state: '',\s*district: '',\s*subDistrict: '',\s*state: '',\s*district: '',\s*subDistrict: '',/g, 'state: \\'\\', district: \\'\\', subDistrict: \\'\\',');

// Strip out currentAddress and permanentAddress from initial state
profile = profile.replace(/permanentAddress: '',\s*currentAddress: '',\s*isSameAddress: false,/g, '');

// Strip out currentAddress/permanentAddress from useEffect block
profile = profile.replace(/permanentAddress: userProfile\.permanentAddress \|\| '',/g, '');
profile = profile.replace(/currentAddress: userProfile\.currentAddress \|\| '',/g, '');
profile = profile.replace(/isSameAddress: userProfile\.permanentAddress === userProfile\.currentAddress && !!userProfile\.permanentAddress,/g, '');

// Remove all currentAddress / permanentAddress mentions entirely from formData
profile = profile.replace(/formData\.permanentAddress/g, 'formData.subDistrict');
profile = profile.replace(/formData\.currentAddress/g, 'formData.subDistrict');
profile = profile.replace(/formData\.isSameAddress/g, 'false');

fs.writeFileSync('src/pages/ProfilePage.tsx', profile);

let appCtx = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
appCtx = appCtx.replace(/permanentAddress: '',/g, '');
appCtx = appCtx.replace(/currentAddress: '',/g, '');
appCtx = appCtx.replace(/state: '',/g, 'state: \\'\\', district: \\'\\', subDistrict: \\'\\',');
appCtx = appCtx.replace(/state: '',\s*district: '',\s*subDistrict: '',\s*state: '',\s*district: '',\s*subDistrict: '',/g, 'state: \\'\\', district: \\'\\', subDistrict: \\'\\',');
fs.writeFileSync('src/context/AppContext.tsx', appCtx);

console.log('Done!');
