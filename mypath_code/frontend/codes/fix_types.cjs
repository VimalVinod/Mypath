const fs = require('fs');

let prof = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

const target = `        district: userProfile.district || '',
        permanentAddress: userProfile.permanentAddress || '',
        currentAddress: userProfile.currentAddress || '',
        isSameAddress: userProfile.permanentAddress === userProfile.currentAddress && userProfile.permanentAddress !== '',`;
const replacement = `        district: userProfile.district || '',
        subDistrict: userProfile.subDistrict || '',`;

prof = prof.replace(target, replacement);

const targetState = `    state: '',
    district: '',
    state: '', district: '', subDistrict: '',`;
const replacementState = `    state: '',
    district: '',
    subDistrict: '',`;

prof = prof.replace(targetState, replacementState);

fs.writeFileSync('src/pages/ProfilePage.tsx', prof);

let ctx = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
ctx = ctx.replace(`    district: '',
    permanentAddress: '',
    currentAddress: '',`, `    district: '',
    subDistrict: '',`);
fs.writeFileSync('src/context/AppContext.tsx', ctx);

console.log('Fixed types!');
