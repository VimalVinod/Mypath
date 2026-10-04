const fs = require('fs');

// 1. Clean ProfilePage.tsx
const profilePath = 'src/pages/ProfilePage.tsx';
let profileCode = fs.readFileSync(profilePath, 'utf8');
profileCode = profileCode.replace(/fathersName: userProfile\.fathersName \|\| '',\n\s*mothersName: userProfile\.mothersName \|\| '',\n/g, '');
profileCode = profileCode.replace(/fathersName: '',\n\s*mothersName: '',\n/g, '');
fs.writeFileSync(profilePath, profileCode);
console.log('Cleaned ProfilePage.tsx');

// 2. Clean mockData.ts
const mockDataPath = 'src/data/mockData.ts';
let mockDataCode = fs.readFileSync(mockDataPath, 'utf8');
mockDataCode = mockDataCode.replace(/fathersName: 'John Doe',\n\s*mothersName: 'Jane Doe',\n/g, '');
fs.writeFileSync(mockDataPath, mockDataCode);
console.log('Cleaned mockData.ts');

