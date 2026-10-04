const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

const importRegex = /import \{ useApp \} from '\.\.\/context\/AppContext';/;
const newImport = `import { useApp } from '../context/AppContext';\nimport { checkEligibility } from '../eligibility';`;

const destructureRegex = /const \{ currentUser, userProfile, updateUserProfile, navigate, logoutUser, deleteAccount, linkGoogleAccount, linkPasswordAccount \} = useApp\(\);/;
const newDestructure = `const { currentUser, userProfile, updateUserProfile, navigate, logoutUser, deleteAccount, linkGoogleAccount, linkPasswordAccount, exams } = useApp();`;

const fetchRegex = /await fetch\('https:\/\/mypath-hub\.vercel\.app\/match-user',[^)]+\);/s;

const newFetch = `const eligibleHashes: string[] = [];
          const mightBeEligibleHashes: string[] = [];
          
          const profileForCheck = { ...userProfile, ...profileDataToSave };
          
          exams.forEach(exam => {
            const { eligible } = checkEligibility(profileForCheck, (exam as any).eligibilityBreakdown || (exam as any).eligibility || {});
            if (eligible === true) eligibleHashes.push(exam.id);
            else if (eligible === 'maybe') mightBeEligibleHashes.push(exam.id);
          });
          
          await updateUserProfile({ eligibleExams: eligibleHashes, mightBeEligibleExams: mightBeEligibleHashes });`;

if (importRegex.test(content) && destructureRegex.test(content) && fetchRegex.test(content)) {
  content = content.replace(importRegex, newImport);
  content = content.replace(destructureRegex, newDestructure);
  content = content.replace(fetchRegex, newFetch);
  fs.writeFileSync('src/pages/ProfilePage.tsx', content, 'utf8');
  console.log("Patched ProfilePage");
} else {
  console.log("Failed to match ProfilePage regexes");
}
