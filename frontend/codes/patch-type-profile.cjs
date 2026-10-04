const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(/mightBeEligibleExams\?: string\[\];/, "mightBeEligibleExams?: string[];\n  isProfileComplete?: boolean;");

fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
console.log("Added isProfileComplete");
