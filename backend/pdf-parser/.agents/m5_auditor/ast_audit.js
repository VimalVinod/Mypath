'use strict';

const fs = require('fs');
const path = require('path');

const targets = [
  'parse-demo.js',
  'fixtures/generate-sample-pdf.js',
  'fixtures/mock-criteria.js',
  'src/services/pdf',
  'src/services/ai',
  'src/services/validator'
];

function getJsFiles(dirOrFile) {
  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) return [dirOrFile];
  let results = [];
  for (const item of fs.readdirSync(dirOrFile)) {
    const full = path.join(dirOrFile, item);
    const s = fs.statSync(full);
    if (s.isDirectory()) results = results.concat(getJsFiles(full));
    else if (item.endsWith('.js')) results.push(full);
  }
  return results;
}

const allFiles = targets.flatMap(getJsFiles);
const requires = {};
const forbidden = ['firebase', '@google-cloud/firestore', 'resend', 'nodemailer'];
const violations = [];

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
  requires[f] = matches;
  for (const mod of matches) {
    for (const bad of forbidden) {
      if (mod === bad || mod.startsWith(bad + '/')) {
        violations.push({ file: f, required: mod });
      }
    }
  }
}

const externalRequires = [...new Set(Object.values(requires).flat().filter(r => !r.startsWith('.')))];

console.log('Total files audited:', allFiles.length);
console.log('Audited files:');
allFiles.forEach(f => console.log('  -', f));
console.log('\nDistinct external requires across pipeline:', externalRequires);
console.log('\nForbidden violations found:', violations);

if (violations.length > 0) {
  console.error('FAILED: Forbidden imports found');
  process.exit(1);
} else {
  console.log('\nSUCCESS: Zero forbidden imports found across pipeline files.');
}
