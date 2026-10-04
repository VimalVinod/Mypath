const fs = require('fs');
let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

const importRegex = /import \{ useApp \} from '\.\.\/context\/AppContext';/;
const newImport = `import { useApp } from '../context/AppContext';\nimport { checkEligibility } from '../eligibility';`;

const fetchRegex = /await fetch\("https:\/\/mypath-hub\.vercel\.app\/match-user"[^)]+\);/s;
const newFetch = `const eligibleHashes: string[] = [];
        const mightBeEligibleHashes: string[] = [];
        exams.forEach(exam => {
          const { eligible } = checkEligibility(userProfile, (exam as any).eligibilityBreakdown || (exam as any).eligibility || {});
          if (eligible === true) eligibleHashes.push(exam.id);
          else if (eligible === 'maybe') mightBeEligibleHashes.push(exam.id);
        });
        await updateUserProfile({ eligibleExams: eligibleHashes, mightBeEligibleExams: mightBeEligibleHashes });`;

if (importRegex.test(content) && fetchRegex.test(content)) {
  content = content.replace(importRegex, newImport);
  content = content.replace(fetchRegex, newFetch);
  fs.writeFileSync('src/components/SidebarLayout.tsx', content, 'utf8');
  console.log("Patched SidebarLayout");
} else {
  console.log("Failed to patch SidebarLayout");
}
