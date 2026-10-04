const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const regex = /const isEligible = userProfile\?\.eligibleExams\?\.includes\(doc\.id\);\s*return \{\s*id: doc\.id,\s*name: [^\n]*\n\s*shortName: [^\n]*\n\s*organization: [^\n]*\n\s*type: [^\n]*\n\s*matchLevel: isEligible \? 'Eligible' : 'Not Eligible',/s;

const newLogic = `const isEligible = userProfile?.eligibleExams?.includes(doc.id);
          const mightBeEligible = userProfile?.mightBeEligibleExams?.includes(doc.id);
          let computedMatchLevel = 'Not Eligible';
          if (isEligible) computedMatchLevel = 'Eligible';
          else if (mightBeEligible) computedMatchLevel = 'Probably Eligible';

          return {
            id: doc.id,
            name: data.name || data.title || data.examName || '',
            shortName: data.shortName || data.title || data.examName || '',
            organization: data.organization || data.conductingBody || '',
            type: data.type || 'Government',
            matchLevel: computedMatchLevel,`;

if (regex.test(content)) {
  content = content.replace(regex, newLogic);
  fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
  console.log("Patched AppContext.tsx!");
} else {
  console.log("Failed to match regex in AppContext.");
}
