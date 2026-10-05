const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

// Add db import after checkEligibility import
content = content.replace(
  `import { checkEligibility } from '../eligibility';`,
  `import { checkEligibility } from '../eligibility';\nimport { db, getDocs, collection } from '../firebase';`
);

// Fix the INSTANT MATCH block to fetch raw exams from Firestore
const oldBlock = `exams.forEach(exam => {
              const { eligible } = checkEligibility(profileForCheck, (exam as any).eligibilityBreakdown || (exam as any).eligibility || {});
              if (eligible === true) eligibleHashes.push(exam.id);
              else if (eligible === 'maybe') mightBeEligibleHashes.push(exam.id);
            });`;

const newBlock = `const examsSnapshot = await getDocs(collection(db, 'exams'));
            examsSnapshot.forEach(doc => {
              const examData = doc.data();
              const rawEligibility = examData.eligibility || {};
              const { eligible } = checkEligibility(profileForCheck, rawEligibility);
              const examId = examData.id || doc.id;
              if (eligible === true) eligibleHashes.push(examId);
              else if (eligible === 'maybe') mightBeEligibleHashes.push(examId);
            });`;

if (content.includes('exams.forEach(exam =>')) {
  content = content.replace(/exams\.forEach\(exam =>[^)]+\}\);/s, newBlock);
  console.log("Replaced exams.forEach block");
} else {
  console.log("Could not find exams.forEach block");
}

fs.writeFileSync('src/pages/ProfilePage.tsx', content, 'utf8');
console.log("Done!");
