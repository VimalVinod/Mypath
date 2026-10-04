const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

const importRegex = /import \{ useApp \} from '\.\.\/context\/AppContext';/;
const newImport = `import { useApp } from '../context/AppContext';\nimport { checkEligibility } from '../eligibility';`;

const destructureRegex = /const \{ navigate, userProfile, currentUser, logoutUser, unreadNotificationCount, updateUserProfile, linkGoogleAccount, linkPasswordAccount \} = useApp\(\);/;
const newDestructure = `const { navigate, userProfile, currentUser, logoutUser, unreadNotificationCount, updateUserProfile, linkGoogleAccount, linkPasswordAccount, exams } = useApp();`;

const fetchRegex = /await fetch\("https:\/\/mypath-hub\.vercel\.app\/match-user",\s*\{\s*method:\s*"POST",\s*headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\},\s*body:\s*JSON\.stringify\(\{\s*userId:\s*currentUser\?\.uid\s*\}\)\s*\}\);/;

const newFetch = `const eligibleHashes: string[] = [];
        const mightBeEligibleHashes: string[] = [];
        exams.forEach(exam => {
          const { eligible } = checkEligibility(userProfile, (exam as any).eligibilityBreakdown || (exam as any).eligibility || {});
          if (eligible === true) eligibleHashes.push(exam.id);
          else if (eligible === 'maybe') mightBeEligibleHashes.push(exam.id);
        });
        await updateUserProfile({ eligibleExams: eligibleHashes, mightBeEligibleExams: mightBeEligibleHashes });`;

if (importRegex.test(content) && destructureRegex.test(content) && fetchRegex.test(content)) {
  content = content.replace(importRegex, newImport);
  content = content.replace(destructureRegex, newDestructure);
  content = content.replace(fetchRegex, newFetch);
  fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
  console.log("Patched SidebarLayout");
} else {
  console.log("Failed to match one of the regexes");
}
