const fs = require('fs');

const path = 'src/pages/ProfilePage.tsx';
let code = fs.readFileSync(path, 'utf8');

// The section starts with "{/* Section: Authentication Methods */}" and ends before "{/* Section 2: Address */}"
const startMarker = "{/* Section: Authentication Methods */}";
const endMarker = "{/* Section 2: Address */}";

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const codeBefore = code.substring(0, startIndex);
  const codeAfter = code.substring(endIndex);
  code = codeBefore + codeAfter;
  fs.writeFileSync(path, code);
  console.log('Successfully removed Authentication Methods section.');
} else {
  console.log('Could not find markers.');
}
