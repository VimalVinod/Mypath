'use strict';

const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '../..');
const { runPipeline } = require(path.join(ROOT_DIR, 'parse-demo.js'));

async function testRuntime() {
  console.log('Running full pipeline in runtime audit...');
  const res = await runPipeline({
    pdf: path.join(ROOT_DIR, 'fixtures', 'sample-notification.pdf'),
    mock: true,
    preset: 'UPSC',
    candidate: 'general'
  });

  if (!res.success) {
    console.error('Pipeline failed:', res.error);
    process.exit(1);
  }

  const loaded = Object.keys(require.cache);
  console.log('Total modules in require.cache:', loaded.length);

  const forbidden = ['firebase', '@google-cloud/firestore', 'resend', 'nodemailer'];
  const violations = [];

  for (const mod of loaded) {
    for (const bad of forbidden) {
      if (mod.includes(bad)) {
        violations.push({ module: mod, matchedForbidden: bad });
      }
    }
  }

  console.log('Forbidden modules found in require.cache:', violations);

  if (violations.length > 0) {
    console.error('FAILED: Forbidden modules found in require.cache');
    process.exit(1);
  } else {
    console.log('SUCCESS: require.cache is 100% clean of forbidden cloud/email modules.');
  }
}

testRuntime();
