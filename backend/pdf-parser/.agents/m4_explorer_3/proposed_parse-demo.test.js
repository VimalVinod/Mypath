'use strict';

/**
 * test/parse-demo.test.js
 * Automated test suite for Milestone 4 Standalone CLI Runner (parse-demo.js).
 * 
 * Verifies:
 * 1. CLI Usage & Help: `node parse-demo.js --help` (exit code 0, displays usage)
 * 2. End-to-end Mock Execution: `node parse-demo.js --mock` (exit code 0, runs end-to-end on sample PDF)
 * 3. Presets & Candidate Profiles: `node parse-demo.js --preset SSC_CGL --candidate underage`
 * 4. Machine-Readable JSON: `node parse-demo.js --mock --json` (valid parseable JSON output)
 * 5. Clean Error Handling: non-existent PDF file (exit code 1, descriptive error, no unhandled stack dump)
 * 6. Invalid Presets & Candidate Profiles: clean exit code 1 with helpful guidance
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PARSE_DEMO_SCRIPT = fs.existsSync(path.join(ROOT_DIR, 'parse-demo.js'))
  ? path.join(ROOT_DIR, 'parse-demo.js')
  : path.join(__dirname, 'proposed_parse-demo.js');
const SAMPLE_PDF_PATH = path.join(ROOT_DIR, 'fixtures', 'sample-notification.pdf');

/**
 * Synchronously executes parse-demo.js with isolated environment options.
 * @param {string[]} args CLI arguments
 * @param {Object} [options={}] Options including env overrides
 * @returns {{ code: number|null, stdout: string, stderr: string, signal: string|null }}
 */
function runCli(args = [], options = {}) {
  const result = spawnSync(process.execPath, [PARSE_DEMO_SCRIPT, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      NO_COLOR: '1', // Ensure plain text for reliable regex and keyword matching
      ...options.env
    },
    ...options
  });

  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    signal: result.signal
  };
}

// Ensure sample fixture exists
if (!fs.existsSync(SAMPLE_PDF_PATH)) {
  const { generateSamplePdf } = require('../fixtures/generate-sample-pdf');
  generateSamplePdf({ outputPath: SAMPLE_PDF_PATH });
}

// =============================================================================
// CATEGORY 1: CLI USAGE & HELP DOCUMENTATION
// =============================================================================
describe('Category 1: CLI Usage & Help Documentation', () => {
  it('1.1 node parse-demo.js --help exits with code 0 and displays comprehensive usage', () => {
    const res = runCli(['--help']);
    assert.equal(res.code, 0, 'Exit code should be 0 for --help');
    assert.match(res.stdout, /usage/i, 'Output should mention Usage');
    assert.match(res.stdout, /--pdf/i, 'Output should document --pdf option');
    assert.match(res.stdout, /--mock/i, 'Output should document --mock option');
    assert.match(res.stdout, /--preset/i, 'Output should document --preset option');
    assert.match(res.stdout, /--candidate/i, 'Output should document --candidate option');
    assert.match(res.stdout, /--json/i, 'Output should document --json option');
    assert.match(res.stdout, /--keywords/i, 'Output should document --keywords option');
  });

  it('1.2 node parse-demo.js -h short flag behaves identically to --help', () => {
    const res = runCli(['-h']);
    assert.equal(res.code, 0, 'Exit code should be 0 for -h');
    assert.match(res.stdout, /usage/i, 'Output should mention Usage');
    assert.match(res.stdout, /--pdf/i, 'Output should document --pdf option');
  });
});

// =============================================================================
// CATEGORY 2: END-TO-END EXECUTION IN MOCK MODE
// =============================================================================
describe('Category 2: End-to-End Execution in Mock Mode', () => {
  it('2.1 node parse-demo.js --mock executes full pipeline on sample-notification.pdf', () => {
    const res = runCli(['--mock']);
    assert.equal(res.code, 0, `Execution failed with code ${res.code}: ${res.stderr}`);

    // Verify all 3 phases appear in dashboard output
    assert.match(res.stdout, /PHASE 1.*PDF PARSING|TARGETED PDF PARSING/i, 'Phase 1 header should appear');
    assert.match(res.stdout, /PHASE 2.*GEMINI|CRITERIA EXTRACTION/i, 'Phase 2 header should appear');
    assert.match(res.stdout, /PHASE 3.*UNITY|VERIFICATION/i, 'Phase 3 header should appear');

    // Verify reduction stats
    assert.match(res.stdout, /reduction|token savings/i, 'Reduction stats should be displayed');
    assert.match(res.stdout, /%/i, 'Percentage symbol should appear for reduction');

    // Verify Mock Mode indicator
    assert.match(res.stdout, /MOCK/i, 'Mock mode indicator should be displayed');

    // Verify Unity scorecard and overall verdict
    assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*(PASS|FAIL|WARNING)\s*\]/i, 'Verdict badge should appear');
    assert.match(res.stdout, /Scorecard/i, 'Scorecard should appear');
    assert.match(res.stdout, /Candidate Eligibility Summary|Candidate Status/i, 'Candidate summary should appear');
  });

  it('2.2 auto-detects absence of GEMINI_API_KEY and gracefully falls back to mock mode', () => {
    const res = runCli([], {
      env: { GEMINI_API_KEY: '' }
    });
    assert.equal(res.code, 0, `Execution without key should succeed via mock fallback. Stderr: ${res.stderr}`);
    assert.match(res.stdout, /MOCK/i, 'Should indicate fallback to mock mode');
    assert.match(res.stdout, /Overall Verdict/i, 'Should complete unity check');
  });
});

// =============================================================================
// CATEGORY 3: PRESETS & CANDIDATE ELIGIBILITY
// =============================================================================
describe('Category 3: Presets & Candidate Eligibility Evaluation', () => {
  it('3.1 node parse-demo.js --mock --preset SSC_CGL --candidate underage evaluates candidate as DISQUALIFIED', () => {
    const res = runCli(['--mock', '--preset', 'SSC_CGL', '--candidate', 'underage']);
    assert.equal(res.code, 0, `CLI failed with code ${res.code}: ${res.stderr}`);

    // Verify preset matched SSC
    assert.match(res.stdout, /STAFF SELECTION COMMISSION|SSC/i, 'Output should mention SSC criteria');

    // Verify candidate disqualified
    assert.match(res.stdout, /DISQUALIFIED/i, 'Underage candidate should be disqualified');
    assert.match(res.stdout, /below.*minimum|age/i, 'Disqualification reason should mention age');

    // Overall verdict should be FAIL due to disqualification and organization mismatch
    assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*FAIL\s*\]/i, 'Verdict should be FAIL');
  });

  it('3.2 node parse-demo.js --mock --preset UPSC --candidate general evaluates candidate as ELIGIBLE', () => {
    const res = runCli(['--mock', '--preset', 'UPSC', '--candidate', 'general']);
    assert.equal(res.code, 0, `CLI failed with code ${res.code}: ${res.stderr}`);

    assert.match(res.stdout, /UNION PUBLIC SERVICE COMMISSION/i, 'Output should match UPSC criteria');
    assert.match(res.stdout, /ELIGIBLE/i, 'General qualified candidate should be ELIGIBLE');
    assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*PASS\s*\]/i, 'Verdict should be PASS');
  });

  it('3.3 handles case-insensitive preset and candidate aliases', () => {
    const res = runCli(['--mock', '--preset', 'ssc_cgl', '--candidate', 'UNDERAGE']);
    assert.equal(res.code, 0, 'Should accept lowercase preset and uppercase candidate');
    assert.match(res.stdout, /DISQUALIFIED/i, 'Candidate should be evaluated correctly');
  });

  it('3.4 runs without candidate profile using --candidate none', () => {
    const res = runCli(['--mock', '--preset', 'UPSC', '--candidate', 'none']);
    assert.equal(res.code, 0);
    assert.match(res.stdout, /No candidate profile specified|Notification criteria evaluated only/i);
  });
});

// =============================================================================
// CATEGORY 4: MACHINE-READABLE JSON OUTPUT MODE
// =============================================================================
describe('Category 4: Machine-Readable JSON Output Mode', () => {
  it('4.1 node parse-demo.js --mock --json outputs valid, parseable JSON envelope', () => {
    const res = runCli(['--mock', '--json']);
    assert.equal(res.code, 0, `JSON run failed with code ${res.code}: ${res.stderr}`);

    let json;
    assert.doesNotThrow(() => {
      json = JSON.parse(res.stdout.trim());
    }, 'stdout should be valid JSON');

    assert.equal(json.success, true);
    assert.equal(json.executionMode, 'mock');
    assert.ok(json.pdf && typeof json.pdf === 'object', 'json.pdf should exist');
    assert.equal(typeof json.pdf.rawStats.totalPages, 'number');
    assert.equal(typeof json.pdf.extractedStats.reductionPercentage, 'number');
    assert.ok(json.pdf.extractedStats.reductionPercentage > 0, 'reduction percentage should be positive');

    assert.ok(json.extractedCriteria && typeof json.extractedCriteria === 'object', 'json.extractedCriteria should exist');
    assert.equal(json.extractedCriteria.organization, 'UNION PUBLIC SERVICE COMMISSION');
    assert.match(json.extractedCriteria.examTitle, /CIVIL SERVICES/i);

    assert.ok(json.unityVerification && typeof json.unityVerification === 'object', 'json.unityVerification should exist');
    assert.ok(['PASS', 'FAIL', 'WARNING'].includes(json.unityVerification.overallVerdict));
    assert.ok(Array.isArray(json.unityVerification.evaluations));
    assert.ok(json.unityVerification.candidateEligibility && typeof json.unityVerification.candidateEligibility === 'object');
  });

  it('4.2 node parse-demo.js --mock --json --preset SSC_CGL --candidate underage reflects disqualified status in JSON', () => {
    const res = runCli(['--mock', '--json', '--preset', 'SSC_CGL', '--candidate', 'underage']);
    assert.equal(res.code, 0);

    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.equal(json.unityVerification.candidateEligibility.isEligible, false);
    assert.ok(json.unityVerification.candidateEligibility.disqualifications.length > 0);
    assert.equal(json.unityVerification.overallVerdict, 'FAIL');
  });
});

// =============================================================================
// CATEGORY 5: ERROR HANDLING & CLEAN EXIT CODES
// =============================================================================
describe('Category 5: Error Handling & Clean Exit Codes', () => {
  it('5.1 non-existent PDF file exits cleanly with code 1 and descriptive error message', () => {
    const res = runCli(['--pdf', 'fixtures/non_existent_file_xyz123.pdf']);
    assert.equal(res.code, 1, 'Should exit with code 1 on missing PDF');
    const combinedOutput = res.stderr + res.stdout;
    assert.match(combinedOutput, /not found|ENOENT|does not exist/i, 'Should report missing file clearly');
    // Ensure no unhandled exception crash / raw stack trace
    assert.doesNotMatch(combinedOutput, /uncaughtException/i, 'Should not throw uncaughtException');
  });

  it('5.2 invalid criteria preset name exits cleanly with code 1 and lists valid presets', () => {
    const res = runCli(['--preset', 'INVALID_PRESET_FOOBAR']);
    assert.equal(res.code, 1, 'Should exit with code 1 on invalid preset');
    const combinedOutput = res.stderr + res.stdout;
    assert.match(combinedOutput, /invalid preset|unknown preset/i, 'Should indicate invalid preset');
    assert.match(combinedOutput, /UPSC|SSC_CGL|IBPS_PO/i, 'Should list available presets');
  });

  it('5.3 invalid candidate profile name exits cleanly with code 1 and lists valid candidates', () => {
    const res = runCli(['--candidate', 'INVALID_CANDIDATE_NAME']);
    assert.equal(res.code, 1, 'Should exit with code 1 on invalid candidate');
    const combinedOutput = res.stderr + res.stdout;
    assert.match(combinedOutput, /invalid candidate|unknown candidate/i, 'Should indicate invalid candidate');
    assert.match(combinedOutput, /general|underage|overage/i, 'Should list available candidate profiles');
  });

  it('5.4 non-existent PDF with --json flag outputs clean JSON error envelope with code 1', () => {
    const res = runCli(['--pdf', 'fixtures/missing_for_json.pdf', '--json']);
    assert.equal(res.code, 1, 'Should exit with code 1');
    const output = (res.stdout || res.stderr).trim();
    let json;
    assert.doesNotThrow(() => {
      json = JSON.parse(output);
    }, 'Output should be valid JSON error envelope');
    assert.equal(json.success, false);
    assert.ok(json.error && typeof json.error === 'string');
    assert.match(json.error, /not found|ENOENT|does not exist/i);
  });
});

// =============================================================================
// CATEGORY 6: CUSTOM KEYWORDS & OPTIONS
// =============================================================================
describe('Category 6: Custom Keywords & Parameters', () => {
  it('6.1 respects custom comma-separated keywords via --keywords', () => {
    const res = runCli(['--mock', '--keywords', 'eligibility,vacancies', '--json']);
    assert.equal(res.code, 0);
    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.ok(json.pdf.extractedStats.sentenceCount > 0);
  });

  it('6.2 respects custom PDF file path via --pdf', () => {
    const res = runCli(['--mock', '--pdf', SAMPLE_PDF_PATH, '--json']);
    assert.equal(res.code, 0);
    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.equal(json.pdf.rawStats.totalPages, 4);
  });
});
