const fs = require('fs');
let code = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

code = code.replace(/state: '',[\s]*district: '',[\s]*state: '', district: '', subDistrict: '',/g, "state: '', district: '', subDistrict: '',");
code = code.replace(/district: userProfile\.district \|\| '',[\s]*category: userProfile\.category/g, "district: userProfile.district || '',\n        subDistrict: userProfile.subDistrict || '',\n        category: userProfile.category");
code = code.replace(/formData\.currentAddress/g, 'formData.subDistrict');
code = code.replace(/formData\.permanentAddress/g, 'formData.subDistrict');
code = code.replace(/formData\.isSameAddress/g, 'false');

fs.writeFileSync('src/pages/ProfilePage.tsx', code);
