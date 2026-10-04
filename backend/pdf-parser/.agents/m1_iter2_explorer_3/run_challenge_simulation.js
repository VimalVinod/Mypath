'use strict';

/**
 * run_challenge_simulation.js
 * Runs the exact 29 challenges from .agents/m1_challenger_2/challenge_harness.js
 * using the patched modules in temp_lib to verify 29/29 (100%) pass rate.
 */

// First run simulate_fixes.js to generate temp_lib
require('./simulate_fixes.js');

const fs = require('fs');
const path = require('path');

// Read the challenge harness code
const harnessCode = fs.readFileSync(path.resolve(__dirname, '../m1_challenger_2/challenge_harness.js'), 'utf8');

// Replace the require statement to point to our temp_lib
const patchedHarnessCode = harnessCode.replace(
  "require('../../src/services/pdf')",
  "require('../m1_iter2_explorer_3/temp_lib')"
);

const tempHarnessPath = path.resolve(__dirname, 'temp_challenge_harness.js');
fs.writeFileSync(tempHarnessPath, patchedHarnessCode, 'utf8');

console.log('Running simulated challenge harness on patched implementation...');
const { runAllChallenges } = require(tempHarnessPath);

runAllChallenges()
  .then(results => {
    console.log(`\nSIMULATION RESULT: ${results.passed}/${results.total} passed (${results.failed} failed)`);
    if (results.passed === results.total) {
      console.log('PERFECT 29/29 PASSED (100%) VERIFIED!');
      process.exit(0);
    } else {
      console.error('Some tests failed:');
      results.details.filter(d => !d.passed).forEach(d => {
        console.error(`- ${d.suite} > ${d.testName}: ${d.error}`);
      });
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal simulation error:', err);
    process.exit(2);
  });
