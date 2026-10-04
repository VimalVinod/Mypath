const fs = require('fs');
let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

const regex = /const ongoing = exams\.filter[^;]+;\s*const deadlines = trackerItems\.filter[^;]+;\s*const bookmarks = trackerItems\.filter[^;]+;[\s\S]*?const stats = \[\s*\{\s*label:\s*'Ongoing Exams',\s*value:\s*ongoing\.length,\s*icon:\s*Target,\s*color:\s*ACCENT,\s*note:\s*'you qualify for',\s*onClick:\s*\(\) => navigate\('\/exams'\)\s*\},/s;

const newLogic = `const strictlyEligible = exams.filter(e => e.matchLevel === 'Eligible' && e.daysRemaining > 0);
  const maybeEligible = exams.filter(e => e.matchLevel === 'Probably Eligible' && e.daysRemaining > 0);
  const deadlines = trackerItems.filter(t => t.deadlineDate);
  const bookmarks = trackerItems.filter(t => t.status === 'Bookmarked');

  // ?????? Stat Cards ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
  const stats = [
    { label: 'Eligible Exams', value: strictlyEligible.length, icon: Target, color: ACCENT, note: maybeEligible.length > 0 ? \`+ \${maybeEligible.length} to verify\` : 'you qualify for', onClick: () => navigate('/exams') },`;

if (regex.test(content)) {
  content = content.replace(regex, newLogic);
  fs.writeFileSync('src/pages/DashboardPage.tsx', content, 'utf8');
  console.log("Patched Dashboard stats!");
} else {
  console.log("Regex failed to match dashboard.");
}
