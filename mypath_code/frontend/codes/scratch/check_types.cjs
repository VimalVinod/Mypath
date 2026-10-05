const fs = require('fs');

const path = 'src/context/AppContext.tsx';
let code = fs.readFileSync(path, 'utf8');

// Update ExtendedUserProfile
code = code.replace(
  /fathersName\?: string;\s*mothersName\?: string;/g,
  `accountName?: string;`
);

// Actually, wait, it might be in types.ts not AppContext.tsx!
// Let me check types.ts
