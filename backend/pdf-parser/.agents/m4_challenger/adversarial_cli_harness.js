'use strict';

/**
 * .agents/m4_challenger/adversarial_cli_harness.js
 * Comprehensive Adversarial CLI Stress Harness for parse-demo.js
 * Evaluates process exit codes, JSON integrity, standalone independence,
 * keyword edge cases, and output format resilience.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(WORKSPACE_ROOT, 'parse-demo.js');
const FIXTURES_DIR = path.join(WORKSPACE_ROOT, 'fixtures');
const SAMPLE_PDF = path.join(FIXTURES_DIR, 'sample-notification.pdf');
const TEMP_DIR = path.join(__dirname, 'temp_artifacts');

// Ensure sample fixture exists
if (!fs.existsSync(SAMPLE_PDF)) {
  const { generateSamplePdf } = require(path.join(FIXTURES_DIR, 'generate-sample-pdf'));
  generateSamplePdf({ outputPath: SAMPLE_PDF });
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Spawns parse-demo.js child process with isolated environment options.
 */
function runCli(args = [], options = {}) {
  const startTime = Date.now();
  const spawnEnv = {
    ...process.env,
    ...options.env
  };

  if (options.deleteEnv) {
    for (const key of options.deleteEnv) {
      delete spawnEnv[key];
    }
  }

  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 15000,
    env: spawnEnv
  });

  return {
    code: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
    durationMs: Date.now() - startTime
  };
}

const testResults = [];
let passCount = 0;
let failCount = 0;

function test(id, description, fn) {
  try {
    fn();
    testResults.push({ id, description, status: 'PASS' });
    passCount++;
    console.log(`  [PASS] ${id}: ${description}`);
  } catch (err) {
    testResults.push({ id, description, status: 'FAIL', error: err.message });
    failCount++;
    console.error(`  [FAIL] ${id}: ${description}`);
    console.error(`         Error: ${err.message}`);
  }
}

console.log('='.repeat(80));
console.log('ADVERSARIAL STRESS HARNESS: parse-demo.js');
console.log('Workspace:', WORKSPACE_ROOT);
console.log('='.repeat(80));

// =============================================================================
// CATEGORY 1: PROCESS EXIT CODES
// =============================================================================
console.log('\n[1. Process Exit Codes]');

test('1.1', '--help returns exit code 0 and displays comprehensive usage', () => {
  const res = runCli(['--help']);
  assert.equal(res.code, 0, `Expected code 0, got ${res.code}`);
  assert.match(res.stdout, /usage/i);
  assert.match(res.stdout, /--pdf/i);
  assert.match(res.stdout, /--mock/i);
  assert.match(res.stdout, /--preset/i);
  assert.match(res.stdout, /--candidate/i);
  assert.match(res.stdout, /--json/i);
});

test('1.2', '-h returns exit code 0 identical to --help', () => {
  const res = runCli(['-h']);
  assert.equal(res.code, 0, `Expected code 0, got ${res.code}`);
  assert.match(res.stdout, /usage/i);
});

test('1.3', '--mock returns exit code 0 for full pipeline on sample PDF', () => {
  const res = runCli(['--mock']);
  assert.equal(res.code, 0, `Expected code 0, got ${res.code}. Stderr: ${res.stderr}`);
  assert.match(res.stdout, /PHASE 1/i);
  assert.match(res.stdout, /PHASE 2/i);
  assert.match(res.stdout, /PHASE 3|Scorecard/i);
  assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*PASS\s*\]/i);
});

test('1.4', '--mock --json returns exit code 0', () => {
  const res = runCli(['--mock', '--json']);
  assert.equal(res.code, 0, `Expected code 0, got ${res.code}`);
});

test('1.5', '--mock --preset SSC_CGL --candidate underage returns exit code 0 (business failure != exit 1)', () => {
  const res = runCli(['--mock', '--preset', 'SSC_CGL', '--candidate', 'underage']);
  assert.equal(res.code, 0, `Expected code 0, got ${res.code}`);
  assert.match(res.stdout, /DISQUALIFIED/i);
  assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*FAIL\s*\]/i);
});

test('1.6', 'Missing/non-existent PDF returns exit code 1 with descriptive error', () => {
  const res = runCli(['--pdf', 'fixtures/non-existent-file-xyz.pdf']);
  assert.equal(res.code, 1, `Expected code 1, got ${res.code}`);
  const combined = res.stderr + res.stdout;
  assert.match(combined, /not found/i);
  assert.doesNotMatch(combined, /TypeError|uncaughtException/i);
});

test('1.7', 'Invalid preset returns exit code 1 with supported presets listed', () => {
  const res = runCli(['--preset', 'INVALID_PRESET_TEST']);
  assert.equal(res.code, 1, `Expected code 1, got ${res.code}`);
  const combined = res.stderr + res.stdout;
  assert.match(combined, /invalid preset/i);
  assert.match(combined, /UPSC|SSC_CGL|IBPS_PO|TECHNICAL_SERVICES/i);
});

test('1.8', 'Invalid candidate profile returns exit code 1 with supported candidates listed', () => {
  const res = runCli(['--candidate', 'INVALID_CANDIDATE_TEST']);
  assert.equal(res.code, 1, `Expected code 1, got ${res.code}`);
  const combined = res.stderr + res.stdout;
  assert.match(combined, /invalid candidate/i);
  assert.match(combined, /general|underage|overage/i);
});

test('1.9', 'Unknown CLI option returns exit code 1', () => {
  const res = runCli(['--unknown-unsupported-flag']);
  assert.equal(res.code, 1, `Expected code 1, got ${res.code}`);
  const combined = res.stderr + res.stdout;
  assert.match(combined, /invalid cli argument/i);
});

test('1.10', 'Directory provided as PDF path returns exit code 1', () => {
  const res = runCli(['--pdf', 'src']);
  assert.equal(res.code, 1, `Expected code 1, got ${res.code}`);
  const combined = res.stderr + res.stdout;
  assert.match(combined, /directory/i);
});

test('1.11', '0-byte empty file provided as PDF path returns exit code 1', () => {
  const emptyFile = path.join(TEMP_DIR, 'zero_byte.pdf');
  fs.writeFileSync(emptyFile, Buffer.alloc(0));
  const res = runCli(['--pdf', emptyFile]);
  assert.equal(res.code, 1, `Expected code 1, got ${res.code}`);
  const combined = res.stderr + res.stdout;
  assert.match(combined, /empty/i);
});

// =============================================================================
// CATEGORY 2: JSON OUTPUT INTEGRITY
// =============================================================================
console.log('\n[2. JSON Output Integrity]');

test('2.1', 'JSON parseability: JSON.parse(stdout) succeeds with 0 syntax errors', () => {
  const res = runCli(['--mock', '--json']);
  assert.equal(res.code, 0);
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(res.stdout.trim());
  }, 'stdout must be parseable JSON');
  assert.equal(parsed.success, true);
  assert.equal(parsed.executionMode, 'mock');
});

test('2.2', 'Presence of implemented pipeline keys: pdf, extractedCriteria, unityVerification', () => {
  const res = runCli(['--mock', '--json']);
  const parsed = JSON.parse(res.stdout.trim());
  assert.ok(parsed.pdf && typeof parsed.pdf === 'object', 'Missing "pdf" key');
  assert.ok(parsed.extractedCriteria && typeof parsed.extractedCriteria === 'object', 'Missing "extractedCriteria" key');
  assert.ok(parsed.unityVerification && typeof parsed.unityVerification === 'object', 'Missing "unityVerification" key');
});

test('2.3', 'CHALLENGE FOCUS 2 CONTRACT CHECK: Presence of pdfExtraction and geminiCriteria', () => {
  const res = runCli(['--mock', '--json']);
  const parsed = JSON.parse(res.stdout.trim());

  const missingKeys = [];
  if (parsed.pdfExtraction === undefined) missingKeys.push('pdfExtraction (only found "pdf")');
  if (parsed.geminiCriteria === undefined) missingKeys.push('geminiCriteria (only found "extractedCriteria")');
  if (parsed.unityVerification === undefined) missingKeys.push('unityVerification');

  assert.equal(
    missingKeys.length,
    0,
    `Challenge requirement specifies object must contain pdfExtraction, geminiCriteria, unityVerification. Missing: ${missingKeys.join(', ')}`
  );
});

test('2.4', 'Error cases with --json output clean JSON error envelope (missing PDF)', () => {
  const res = runCli(['--pdf', 'non-existent-for-json.pdf', '--json']);
  assert.equal(res.code, 1);
  let errJson;
  assert.doesNotThrow(() => {
    errJson = JSON.parse(res.stdout.trim() || res.stderr.trim());
  }, 'Should produce valid JSON error envelope');
  assert.equal(errJson.success, false);
  assert.ok(errJson.error && typeof errJson.error === 'string');
});

test('2.5', 'Error cases with --json output clean JSON error envelope (invalid preset)', () => {
  const res = runCli(['--preset', 'BAD_PRESET', '--json']);
  assert.equal(res.code, 1);
  let errJson;
  assert.doesNotThrow(() => {
    errJson = JSON.parse(res.stdout.trim() || res.stderr.trim());
  }, 'Should produce valid JSON error envelope');
  assert.equal(errJson.success, false);
  assert.match(errJson.error, /invalid preset/i);
});

test('2.6', 'Error cases with --json output clean JSON error envelope (unknown option)', () => {
  const res = runCli(['--invalid-flag', '--json']);
  assert.equal(res.code, 1);
  let errJson;
  assert.doesNotThrow(() => {
    errJson = JSON.parse(res.stdout.trim() || res.stderr.trim());
  }, 'Should produce valid JSON error envelope');
  assert.equal(errJson.success, false);
  assert.match(errJson.error, /invalid cli argument/i);
});

test('2.7', 'Corrupted PDF file with --json produces valid JSON error envelope instead of plain text fatal error', () => {
  const corruptPdf = path.join(TEMP_DIR, 'corrupt_sample.pdf');
  fs.writeFileSync(corruptPdf, 'CORRUPT_NOT_A_PDF_STREAM_123456');
  const res = runCli(['--pdf', corruptPdf, '--mock', '--json']);
  assert.equal(res.code, 1);
  
  let errJson;
  try {
    errJson = JSON.parse(res.stdout.trim());
  } catch {
    // Check if output was raw text
    assert.fail(
      `When PDF extraction fails on corrupted PDF with --json, stdout was not valid JSON! ` +
      `Stdout: "${res.stdout.trim()}", Stderr: "${res.stderr.trim()}"`
    );
  }
  assert.equal(errJson.success, false);
});

test('2.8', 'No ANSI escape codes or extraneous text in --json stdout', () => {
  const res = runCli(['--mock', '--json']);
  assert.doesNotMatch(res.stdout, /\x1b\[[0-9;]*m/, 'ANSI sequences found in JSON output');
  const trimmed = res.stdout.trim();
  assert.ok(trimmed.startsWith('{') && trimmed.endsWith('}'), 'JSON output must start and end with braces');
});

// =============================================================================
// CATEGORY 3: STANDALONE INDEPENDENCE
// =============================================================================
console.log('\n[3. Standalone Independence]');

test('3.1', 'Zero external cloud service imports (Firestore/Firebase/Resend) in source code and dependencies', () => {
  const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
  
  // Test require/import statements specifically
  const importLines = scriptContent.split('\n').filter(line => /require\(|import\s+/i.test(line));
  for (const line of importLines) {
    assert.doesNotMatch(line, /firebase|firestore|resend|nodemailer/i, `Forbidden service import found in: ${line}`);
  }

  // Check loaded module cache
  const loadedModules = Object.keys(require.cache);
  for (const mod of loadedModules) {
    assert.doesNotMatch(mod, /firebase|firestore|resend|nodemailer/i, `Forbidden module loaded: ${mod}`);
  }
});

test('3.2', 'Auto-mock fallback activates when GEMINI_API_KEY is empty string', () => {
  const res = runCli(['--json'], {
    env: { GEMINI_API_KEY: '' }
  });
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
  assert.equal(json.executionMode, 'mock');
});

test('3.3', 'Auto-mock fallback activates when GEMINI_API_KEY is undefined in environment', () => {
  const res = runCli(['--json'], {
    deleteEnv: ['GEMINI_API_KEY']
  });
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
  assert.equal(json.executionMode, 'mock');
});

test('3.4', 'Silent dotenv loading does not crash or pollute output if .env is missing or invalid', () => {
  const res = runCli(['--mock', '--json'], {
    env: { DOTENV_CONFIG_PATH: path.join(TEMP_DIR, 'empty.env') }
  });
  assert.equal(res.code, 0);
  assert.doesNotThrow(() => JSON.parse(res.stdout.trim()));
});

// =============================================================================
// CATEGORY 4: SUBSTRING & KEYWORD EDGE CASES
// =============================================================================
console.log('\n[4. Substring & Keyword Edge Cases]');

test('4.1', 'Non-existent keywords (--keywords "xyz123,nonexistent") handle 0 matches gracefully', () => {
  const res = runCli(['--mock', '--keywords', 'xyz123,nonexistent', '--json']);
  assert.equal(res.code, 0, `Failed with code ${res.code}: ${res.stderr}`);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
  assert.equal(json.pdf.extractedStats.sentenceCount, 0);
  assert.equal(json.pdf.extractedStats.matchedPages.length, 0);
  assert.equal(json.pdf.extractedStats.reductionPercentage, 100);
  assert.ok(json.unityVerification);
  assert.equal(json.unityVerification.overallVerdict, 'FAIL');
});

test('4.2', 'Dashboard handles 0 keyword matches without NaN values or broken formatting', () => {
  const res = runCli(['--mock', '--keywords', 'xyz123,nonexistent', '--no-color']);
  assert.equal(res.code, 0);
  assert.doesNotMatch(res.stdout, /\bNaN\b/, 'Dashboard must not contain word-bounded NaN');
  assert.match(res.stdout, /100% Reduction/);
  assert.match(res.stdout, /0 sentences/);
  assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*FAIL\s*\]/);
});

test('4.3', 'Regex special metacharacters in keywords do not cause regex crash', () => {
  const special = 'fee (in rs.)?,[0-9]+,age*,selection.*,exam+';
  const res = runCli(['--mock', '--keywords', special, '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
});

test('4.4', 'Whitespace padding and empty comma tokens in --keywords are sanitized', () => {
  const messy = '  ,  eligibility , ,  age  , ';
  const res = runCli(['--mock', '--keywords', messy, '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
  assert.ok(json.pdf.extractedStats.sentenceCount > 0);
});

test('4.5', 'Single character keyword does not crash or cause infinite loops', () => {
  const res = runCli(['--mock', '--keywords', 'a', '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
});

test('4.6', 'Extreme keyword list (100 synthetic keywords) executes within performance budget (< 5000ms)', () => {
  const largeKeywordList = Array.from({ length: 100 }, (_, i) => `kw_synthetic_${i}`).concat(['eligibility', 'age']).join(',');
  const res = runCli(['--mock', '--keywords', largeKeywordList, '--json']);
  assert.equal(res.code, 0);
  assert.ok(res.durationMs < 5000, `Execution took ${res.durationMs}ms, exceeded budget of 5000ms`);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
});

// =============================================================================
// CATEGORY 5: OUTPUT FORMAT RESILIENCE & ERROR HANDLING
// =============================================================================
console.log('\n[5. Output Format Resilience]');

test('5.1', 'No uncaught exceptions or unhandled promise rejections across malformed inputs', () => {
  const scenarios = [
    ['--preset', 'BOGUS'],
    ['--candidate', 'BOGUS'],
    ['--pdf', 'BOGUS.pdf'],
    ['--candidate', '{"broken json']
  ];
  for (const args of scenarios) {
    const res = runCli(args);
    assert.equal(res.code, 1, `Expected exit code 1 for ${args.join(' ')}`);
    const output = res.stdout + res.stderr;
    assert.doesNotMatch(output, /UnhandledPromiseRejection|uncaughtException|at (?:[a-zA-Z0-9_\.]+\.js)/, `Stack dump for ${args.join(' ')}`);
  }
});

test('5.2', '--no-color disables ANSI escape codes in dashboard output', () => {
  const res = runCli(['--mock', '--no-color']);
  assert.equal(res.code, 0);
  assert.doesNotMatch(res.stdout, /\x1b\[[0-9;]*m/);
});

test('5.3', 'NO_COLOR=1 environment variable disables ANSI escape codes in dashboard output', () => {
  const res = runCli(['--mock'], { env: { NO_COLOR: '1' } });
  assert.equal(res.code, 0);
  assert.doesNotMatch(res.stdout, /\x1b\[[0-9;]*m/);
});

test('5.4', 'Custom inline JSON candidate profile evaluates accurately', () => {
  const inlineCand = JSON.stringify({
    name: 'Custom Challenger Candidate',
    age: 26,
    category: 'General',
    education: "Bachelor's degree in any discipline",
    stream: 'Any Discipline'
  });
  const res = runCli(['--mock', '--candidate', inlineCand, '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.success, true);
  assert.equal(json.unityVerification.candidateEligibility.isEligible, true);
});

test('5.5', 'Boundary candidate min_age_boundary (21) evaluates as ELIGIBLE', () => {
  const res = runCli(['--mock', '--candidate', 'min_age_boundary', '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.unityVerification.candidateEligibility.isEligible, true);
});

test('5.6', 'Boundary candidate max_age_boundary (32) evaluates as ELIGIBLE', () => {
  const res = runCli(['--mock', '--candidate', 'max_age_boundary', '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.unityVerification.candidateEligibility.isEligible, true);
});

test('5.7', 'Overage candidate (35) evaluates as DISQUALIFIED', () => {
  const res = runCli(['--mock', '--candidate', 'overage', '--json']);
  assert.equal(res.code, 0);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.unityVerification.candidateEligibility.isEligible, false);
  assert.equal(json.unityVerification.overallVerdict, 'FAIL');
});

// Clean up temp dir
try {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
} catch {
  // Ignore cleanup failure
}

// Final Summary
console.log('\n' + '='.repeat(80));
console.log(`FINAL HARNESS RESULTS: ${passCount} PASSED / ${failCount} FAILED (TOTAL ${testResults.length})`);
console.log('='.repeat(80));

const summary = {
  total: testResults.length,
  passed: passCount,
  failed: failCount,
  results: testResults
};

fs.writeFileSync(path.join(__dirname, 'harness_results.json'), JSON.stringify(summary, null, 2));

if (failCount > 0) {
  console.log('\nSummary of Failed Tests:');
  for (const r of testResults.filter(r => r.status === 'FAIL')) {
    console.log(`- [${r.id}] ${r.description}\n  Error: ${r.error}`);
  }
}

module.exports = summary;
