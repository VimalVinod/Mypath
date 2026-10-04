const fs = require('fs');
let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

const regexOngoing = /const ongoing = exams\.filter[^\n]*\n/;
const newOngoing = `const strictlyEligible = exams.filter(e => e.matchLevel === 'Eligible' && e.daysRemaining > 0);
  const maybeEligible = exams.filter(e => e.matchLevel === 'Probably Eligible' && e.daysRemaining > 0);
`;

const regexStats = /\{\s*label:\s*'Ongoing Exams',\s*value:\s*ongoing\.length,\s*icon:\s*Target,\s*color:\s*ACCENT,\s*note:\s*'you qualify for',\s*onClick:\s*\(\)\s*=>\s*navigate\('\/exams'\)\s*\}/;
const newStats = `{ label: 'Eligible Exams', value: strictlyEligible.length, icon: Target, color: ACCENT, note: maybeEligible.length > 0 ? '+ ' + maybeEligible.length + ' to verify' : 'you qualify for', onClick: () => navigate('/exams') }`;

if (regexOngoing.test(content) && regexStats.test(content)) {
  content = content.replace(regexOngoing, newOngoing);
  content = content.replace(regexStats, newStats);
  fs.writeFileSync('src/pages/DashboardPage.tsx', content, 'utf8');
  console.log("Safely patched DashboardPage.tsx");
} else {
  console.log("Failed to match safe regexes.");
}
