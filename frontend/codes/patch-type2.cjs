const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const regex = /export interface ExtendedUserProfile extends Omit<UserProfile, 'uid'> \{\s*uid: string;/;
const replacement = `export interface ExtendedUserProfile extends Omit<UserProfile, 'uid'> {\n  uid: string;\n  mightBeEligibleExams?: string[];`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
  console.log("Patched with regex!");
} else {
  console.log("Regex failed.");
}
