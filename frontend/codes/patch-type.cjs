const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const target = `export interface ExtendedUserProfile extends Omit<UserProfile, 'uid'> {
  uid: string;
  isEmailVerified?: boolean;`;

const replacement = `export interface ExtendedUserProfile extends Omit<UserProfile, 'uid'> {
  uid: string;
  mightBeEligibleExams?: string[];
  isEmailVerified?: boolean;`;

content = content.replace(target, replacement);
fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
console.log("Patched ExtendedUserProfile");
