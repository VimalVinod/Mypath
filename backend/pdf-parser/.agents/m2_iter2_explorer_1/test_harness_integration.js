'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

// Load original files
let mockCode = fs.readFileSync(path.resolve(__dirname, '../../src/services/ai/mock-gemini.js'), 'utf8');

// Apply remediations:
// 1. ReDoS
mockCode = mockCode.replace(
  `const orgMatch = text.match(/(?:UNION\\s+PUBLIC\\s+SERVICE\\s+COMMISSION|STAFF\\s+SELECTION\\s+COMMISSION|INSTITUTE\\s+OF\\s+BANKING\\s+PERSONNEL\\s+SELECTION|RAILWAY\\s+RECRUITMENT\\s+BOARD|\\bUPSC\\b|\\bSSC\\b|\\bIBPS\\b|\\bRRB\\b)/i) ||\n                   text.match(/([A-Z\\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);`,
  `const orgMatch = text.match(/(?:UNION\\s+PUBLIC\\s+SERVICE\\s+COMMISSION|STAFF\\s+SELECTION\\s+COMMISSION|INSTITUTE\\s+OF\\s+BANKING\\s+PERSONNEL\\s+SELECTION|RAILWAY\\s+RECRUITMENT\\s+BOARD|\\bUPSC\\b|\\bSSC\\b|\\bIBPS\\b|\\bRRB\\b)/i) ||\n                   text.match(/\\b([A-Z][A-Z\\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\\b/);`
);

// 2. Colon in Age & Experience guard
mockCode = mockCode.replace(
  `const minAgeMatch = text.match(/(?:minimum\\s+age(?:\\s+of)?|min\\.?\\s*age:?)\\s*(\\d+)/i) ||\n                      text.match(/(\\d+)\\s*(?:to|-)\\s*\\d+\\s*years/i) ||\n                      text.match(/Age(?:\\s+Limit)?:?\\s*(\\d+)\\s*(?:to|-)/i);\n  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;\n\n  const maxAgeMatch = text.match(/(?:maximum\\s+age(?:\\s+of)?|max\\.?\\s*age:?|upper\\s+age\\s+limit(?:\\s+is)?:?)\\s*(\\d+)/i) ||\n                      text.match(/\\d+\\s*(?:to|-)\\s*(\\d+)\\s*years/i) ||\n                      text.match(/Age(?:\\s+Limit)?:?\\s*\\d+\\s*(?:to|-)\\s*(\\d+)/i);\n  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;`,
  `const minAgeMatch = text.match(/(?:minimum\\s+age(?:\\s+(?:of|is))?|min\\.?\\s*age)(?:\\s*:)?\\s*(\\d+)/i) ||\n                      text.match(/Age(?:\\s+Limit)?(?:\\s*:)?\\s*(\\d+)\\s*(?:to|-)/i) ||\n                      text.match(/(?<!experience[^\\n.]{0,30})(\\b\\d+)\\s*(?:to|-)\\s*\\d+\\s*years(?!\\s+experience)/i);\n  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;\n\n  const maxAgeMatch = text.match(/(?:maximum\\s+age(?:\\s+(?:of|is))?|max\\.?\\s*age|upper\\s+age\\s+limit(?:\\s+is)?)(?:\\s*:)?\\s*(\\d+)/i) ||\n                      text.match(/Age(?:\\s+Limit)?(?:\\s*:)?\\s*\\d+\\s*(?:to|-)\\s*(\\d+)/i) ||\n                      text.match(/(?<!experience[^\\n.]{0,30})\\b\\d+\\s*(?:to|-)\\s*(\\d+)\\s*years(?!\\s+experience)/i);\n  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;`
);

// 3. Exam date
mockCode = mockCode.replace(
  `const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\\s+(\\d{4}-\\d{2}-\\d{2})/i);`,
  `const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|(?:preliminary\\s+|tentative\\s+)?exam(?:ination)?\\s+date(?:\\s+is)?|date of exam(?:ination)?(?:\\s+is)?)(?:\\s*:)?\\s+(\\d{4}-\\d{2}-\\d{2})/i);`
);

// 4. Vacancies
mockCode = mockCode.replace(
  `const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\\s+(\\d+)\\s+posts/i) ||\n                   text.match(/(?:total vacancies|vacancies)\\s*:\\s*(\\d+)/i) ||\n                   text.match(/(\\d+)\\s+vacancies/i);\n  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;`,
  `const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\\s+([\\d,]+)\\s+(?:posts|vacancies)/i) ||\n                   text.match(/(?:\\b|\\()(?:total\\s+)?vacancies(?:\\s*\\([^)]*\\))?(?:\\s*\\))?\\s*:\\s*([\\d,]+)/i) ||\n                   text.match(/([\\d,]+)\\s+vacancies/i) ||\n                   text.match(/(?:total\\s+)?vacancies\\s+(?:are|is)\\s+([\\d,]+)\\s+posts/i);\n  const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;`
);

// Override require cache for mock-gemini
const mockPath = path.resolve(__dirname, '../../src/services/ai/mock-gemini.js');
const m = { exports: {} };
const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', mockCode);
fn(m, m.exports, require, path.dirname(mockPath), mockPath);
require.cache[mockPath] = m;

// Now run Challenger 1's harness
const harness = require('../../.agents/m2_challenger_1/adversarial_harness.js');
harness.runAllSuites().then(res => {
  console.log('\nHarness run with patched mock-gemini completed:');
  console.log(`Passed: ${res.passedTests}, Failed: ${res.failedTests}`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
