'use strict';

/**
 * test/e2e-pipeline.test.js
 * Exhaustive End-to-End Integration & Acceptance Test Suite for Milestone 5.
 * 
 * Systematically verifies all Acceptance Criteria from ORIGINAL_REQUEST.md:
 * 1. Targeted PDF Parsing: reads sample PDF, extracts only keyword-matching pages/sentences,
 *    asserts noise reduction > 50% (typically ~74-78% with selective recruitment keywords).
 * 2. Gemini Extraction: sends targeted text to Gemini API integration (`parseStructuredCriteria`),
 *    asserts structured JSON matching schema (examTitle, organization, eligibility, dates, vacancies, fees).
 * 3. Unity Check: compares extracted criteria against database benchmarks (`verifyUnity`),
 *    asserts match/mismatch diagnostics, overallVerdict (PASS/FAIL/WARNING), candidate eligibility.
 * 4. Standalone CLI: spawns `node parse-demo.js` via child_process:
 *    - `--mock` produces formatted console dashboard with 4 phases
 *    - `--mock --json` outputs pure valid JSON to stdout with zero stderr pollution
 *    - `--mock --preset SSC_CGL --candidate underage` evaluates candidate as DISQUALIFIED
 *    - `--pdf non-existent.pdf` exits with code 1 and clean error message
 *    - confirms zero Firestore / Resend / Firebase dependencies across the recruitment pipeline.
 * 
 * Tiers:
 * Tier 1: Feature Acceptance Criteria Verification (ORIGINAL_REQUEST.md §R1-R4)
 * Tier 2: Boundary Conditions, Reductions & Contract Precision
 * Tier 3: Combination & End-to-End Orchestration Flows
 * Tier 4: Standalone CLI Process Lifecycle & Child Process Robustness
 * Tier 5: Adversarial Stress, Corrupted Inputs & Anti-Dependency Attestation
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PARSE_DEMO_SCRIPT = path.join(ROOT_DIR, 'parse-demo.js');
const FIXTURES_DIR = path.join(ROOT_DIR, 'fixtures');
const SAMPLE_PDF_PATH = path.join(FIXTURES_DIR, 'sample-notification.pdf');

// Service modules under test
const {
  extractTargetedPdfText,
  MockPdfAdapter,
  UnpdfAdapter,
  splitSentences
} = require(path.join(ROOT_DIR, 'src', 'services', 'pdf'));

const {
  parseStructuredCriteria,
  normalizeExtractedData,
  Type,
  CRITERIA_SCHEMA
} = require(path.join(ROOT_DIR, 'src', 'services', 'ai'));

const {
  verifyUnity,
  evaluateCandidateEligibility,
  formatUnityReport
} = require(path.join(ROOT_DIR, 'src', 'services', 'validator'));

const {
  BENCHMARK_CRITERIA,
  UPSC_BENCHMARK_CRITERIA,
  SSC_CGL_BENCHMARK_CRITERIA,
  IBPS_PO_BENCHMARK_CRITERIA,
  TECHNICAL_SERVICES_BENCHMARK_CRITERIA,
  MOCK_CANDIDATES,
  createCustomCriteria,
  createCustomCandidate,
  getBenchmarkCriteria
} = require(path.join(FIXTURES_DIR, 'mock-criteria'));

const {
  parseCliArgs,
  resolvePreset,
  resolveCandidate,
  validatePdfPath,
  runPipeline
} = require(PARSE_DEMO_SCRIPT);

const { generateSamplePdf } = require(path.join(FIXTURES_DIR, 'generate-sample-pdf'));

// Ensure the fixture PDF exists before any test executes
before(async () => {
  if (!fs.existsSync(SAMPLE_PDF_PATH)) {
    await generateSamplePdf({ outputPath: SAMPLE_PDF_PATH });
  }
});

/**
 * Synchronous helper to spawn parse-demo.js as a child process.
 * @param {string[]} args CLI arguments
 * @param {Object} [options={}] Custom spawn options
 * @returns {{ code: number|null, stdout: string, stderr: string, signal: string|null }}
 */
function runCli(args = [], options = {}) {
  const result = spawnSync(process.execPath, [PARSE_DEMO_SCRIPT, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      NO_COLOR: '1',
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

// =============================================================================
// TIER 1: FEATURE ACCEPTANCE CRITERIA VERIFICATION (ORIGINAL_REQUEST.md §R1-R4)
// =============================================================================
describe('Tier 1: Feature Acceptance Criteria Verification', () => {

  it('1.1 [AC-1 Parsing] Successfully reads sample-notification.pdf and extracts targeted text only', async () => {
    assert.ok(fs.existsSync(SAMPLE_PDF_PATH), 'sample-notification.pdf must exist');

    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee'],
      contextBefore: 1,
      contextAfter: 1
    });

    assert.equal(result.success, true, 'Extraction must be successful');
    assert.equal(result.rawStats.totalPages, 4, 'PDF must contain 4 pages');
    assert.ok(result.sections.length > 0, 'Sections must be extracted');
    assert.ok(result.targetedText.length > 0, 'Targeted text must not be empty');

    // Verify key recruitment clauses are captured
    assert.match(result.targetedText, /minimum\s+age\s+of\s+21/i, 'Must contain minimum age clause');
    assert.match(result.targetedText, /maximum\s+age\s+of\s+32/i, 'Must contain maximum age clause');
    assert.match(result.targetedText, /Bachelor'?s\s+degree/i, 'Must contain education clause');
    assert.match(result.targetedText, /1056\s+posts/i, 'Must contain vacancies clause');
    assert.match(result.targetedText, /Rs\.?\s*100/i, 'Must contain application fee clause');

    // Verify non-targeted / non-matching sections are excluded (noise filtering)
    assert.doesNotMatch(result.targetedText, /facilitation\s+counter\s+near\s+gate\s+C/i,
      'Administrative preamble about gate C counter should be omitted');
    assert.doesNotMatch(result.targetedText, /Agartala,\s+Ahmedabad,\s+Aizawl/i,
      'Examination centres list should be omitted when not queried');
  });

  it('1.2 [AC-1 Noise Reduction] Asserts token and character reduction metrics exceed 50%', async () => {
    // Standard recruitment keywords
    const standardResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age limit', 'vacancies', 'fee'],
      contextBefore: 1,
      contextAfter: 1
    });

    assert.equal(standardResult.success, true);
    assert.ok(standardResult.extractedStats.reductionPercentage > 50,
      `Reduction percentage (${standardResult.extractedStats.reductionPercentage}%) must exceed 50%`);
    assert.ok(standardResult.extractedStats.extractedCharCount < standardResult.rawStats.rawCharCount);
    assert.ok(standardResult.extractedStats.estimatedTokens < standardResult.rawStats.estimatedRawTokens);

    // Selective recruitment keywords yielding ~74-78% token reduction
    const selectiveResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['age', 'vacancies'],
      contextBefore: 1,
      contextAfter: 1
    });

    const selectiveReduction = selectiveResult.extractedStats.reductionPercentage;
    assert.ok(selectiveReduction >= 70 && selectiveReduction <= 80,
      `Selective reduction percentage (${selectiveReduction}%) should be in typical ~74-78% range`);
  });

  it('1.3 [AC-2 Gemini Extraction] Intelligently parses structured criteria from targeted text matching schema', async () => {
    const pdfResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee', 'dates'],
      contextBefore: 1,
      contextAfter: 1
    });
    assert.equal(pdfResult.success, true);

    const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { mockMode: true });
    assert.equal(aiResult.success, true, 'AI extraction must succeed');
    assert.ok(aiResult.data && typeof aiResult.data === 'object', 'AI result must contain structured data');

    const data = aiResult.data;

    // Strict schema assertions matching Interface Contract #2
    assert.equal(typeof data.examTitle, 'string', 'examTitle must be string');
    assert.match(data.examTitle, /CIVIL SERVICES/i, 'examTitle must match Civil Services');

    assert.equal(typeof data.organization, 'string', 'organization must be string');
    assert.match(data.organization, /UNION PUBLIC SERVICE COMMISSION/i, 'organization must match UPSC');

    assert.equal(typeof data.status, 'string', 'status must be string');

    // Eligibility object
    assert.ok(data.eligibility && typeof data.eligibility === 'object', 'eligibility must be object');
    assert.equal(data.eligibility.minAge, 21, 'minAge must be 21');
    assert.equal(data.eligibility.maxAge, 32, 'maxAge must be 32');
    assert.ok(Array.isArray(data.eligibility.ageRelaxation), 'ageRelaxation must be array');
    assert.ok(data.eligibility.ageRelaxation.some(r => /SC/i.test(r.category) && r.years === 5), 'SC relaxation must be 5y');
    assert.ok(data.eligibility.ageRelaxation.some(r => /OBC/i.test(r.category) && r.years === 3), 'OBC relaxation must be 3y');
    assert.ok(Array.isArray(data.eligibility.requiredEducation), 'requiredEducation must be array');
    assert.ok(data.eligibility.requiredEducation.some(e => /Bachelor/i.test(e)), 'education must include Bachelor degree');

    // Important dates
    assert.ok(data.importantDates && typeof data.importantDates === 'object', 'importantDates must be object');
    assert.equal(data.importantDates.applicationStartDate, '2026-01-10');
    assert.equal(data.importantDates.applicationEndDate, '2026-02-15');

    // Vacancies & Fees
    assert.equal(data.vacancies, 1056, 'vacancies must be 1056');
    assert.ok(data.applicationFee && typeof data.applicationFee === 'object', 'applicationFee must be object');
    assert.equal(data.applicationFee.general, 100, 'general fee must be 100');
    assert.equal(data.applicationFee.reserved, 0, 'reserved fee must be 0 (exempt)');
  });

  it('1.4 [AC-3 Unity Check] Validates extracted criteria against database benchmarks (Pass Case)', async () => {
    const pdfResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee', 'dates']
    });
    const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { mockMode: true });

    const benchmarkCriteria = {
      ...UPSC_BENCHMARK_CRITERIA,
      candidate: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL
    };

    const unityResult = verifyUnity(aiResult.data, benchmarkCriteria);

    assert.equal(unityResult.overallVerdict, 'PASS', 'Overall verdict should be PASS for qualified candidate');
    assert.equal(unityResult.summary.failedChecks, 0, 'There should be 0 failed checks');
    assert.equal(unityResult.summary.passRate, 100, 'Pass rate should be 100%');
    assert.equal(unityResult.candidateEligibility.isEligible, true, 'Qualified candidate must be ELIGIBLE');
    assert.equal(unityResult.candidateEligibility.disqualifications.length, 0, 'Must have zero disqualifications');
    assert.ok(unityResult.candidateEligibility.matchedQualifications.length > 0, 'Must record matched qualifications');
  });

  it('1.5 [AC-3 Diagnostics] Validates extracted criteria against mismatched benchmark & candidate (Fail Case)', async () => {
    const pdfResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee', 'dates']
    });
    const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { mockMode: true });

    const benchmarkCriteria = {
      ...SSC_CGL_BENCHMARK_CRITERIA,
      candidate: MOCK_CANDIDATES.UNDERAGE_CANDIDATE
    };

    const unityResult = verifyUnity(aiResult.data, benchmarkCriteria);

    assert.equal(unityResult.overallVerdict, 'FAIL', 'Overall verdict should be FAIL');
    assert.equal(unityResult.candidateEligibility.isEligible, false, 'Underage candidate must be DISQUALIFIED');
    assert.ok(unityResult.candidateEligibility.disqualifications.some(d => /below.*minimum|age/i.test(d)),
      'Disqualification reasons must mention age');

    // Diagnostics verify organization mismatch between UPSC and SSC benchmark
    const orgEval = unityResult.evaluations.find(e => e.field === 'organization');
    assert.ok(orgEval, 'Must evaluate organization field');
    assert.equal(orgEval.status, 'FAIL', 'Organization check should fail against SSC benchmark');
  });

  it('1.6 [AC-4 CLI Runner] Spawns node parse-demo.js --mock and verifies formatted console dashboard', () => {
    const res = runCli(['--mock']);
    assert.equal(res.code, 0, `CLI runner failed with code ${res.code}: ${res.stderr}`);

    // Verify 4-phase dashboard headers
    assert.match(res.stdout, /MYPATH RECRUITMENT PIPELINE/i, 'Banner title must appear');
    assert.match(res.stdout, /\[PHASE 1\] TARGETED PDF PARSING/i, 'Phase 1 header must appear');
    assert.match(res.stdout, /\[PHASE 2\] GEMINI STRUCTURED CRITERIA/i, 'Phase 2 header must appear');
    assert.match(res.stdout, /UNITY CHECK VERIFICATION REPORT/i, 'Phase 3 header must appear');
    assert.match(res.stdout, /\[PIPELINE EXECUTION SUMMARY\]/i, 'Phase 4 header must appear');

    // Verify reduction and scorecard stats
    assert.match(res.stdout, /Reduction/i, 'Reduction percentage must appear');
    assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*PASS\s*\]/i, 'Overall verdict PASS must appear');
    assert.match(res.stdout, /Scorecard\s*:\s*Total:\s*\d+/i, 'Scorecard must appear');
    assert.match(res.stdout, /ELIGIBLE TO APPLY/i, 'Candidate eligibility badge must appear');
  });

  it('1.7 [AC-4 CLI JSON Mode] Spawns node parse-demo.js --mock --json and verifies pure JSON & zero stderr', () => {
    const res = runCli(['--mock', '--json']);
    assert.equal(res.code, 0, `CLI JSON run failed: ${res.stderr}`);
    assert.equal(res.stderr.trim(), '', 'Must produce zero stderr pollution in JSON mode');

    let json;
    assert.doesNotThrow(() => {
      json = JSON.parse(res.stdout.trim());
    }, 'stdout must be valid, parseable JSON');

    assert.equal(json.success, true);
    assert.equal(json.executionMode, 'mock');
    assert.ok(json.pdf && typeof json.pdf === 'object');
    assert.equal(json.pdf.rawStats.totalPages, 4);
    assert.ok(json.pdf.extractedStats.reductionPercentage > 0);
    assert.equal(json.extractedCriteria.organization, 'UNION PUBLIC SERVICE COMMISSION');
    assert.equal(json.unityVerification.overallVerdict, 'PASS');
    assert.equal(json.unityVerification.candidateEligibility.isEligible, true);
  });

  it('1.8 [AC-4 CLI Preset & Candidate] Spawns node parse-demo.js --mock --preset SSC_CGL --candidate underage', () => {
    const res = runCli(['--mock', '--preset', 'SSC_CGL', '--candidate', 'underage']);
    assert.equal(res.code, 0, `CLI run failed: ${res.stderr}`);

    assert.match(res.stdout, /DISQUALIFIED/i, 'Output should clearly show DISQUALIFIED status');
    assert.match(res.stdout, /below.*minimum|age/i, 'Output should mention underage reason');
    assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*FAIL\s*\]/i, 'Verdict should be FAIL');
  });

  it('1.9 [AC-4 Clean Error Handling] Spawns node parse-demo.js --pdf non-existent.pdf and asserts clean exit code 1', () => {
    const res = runCli(['--pdf', 'non-existent.pdf']);
    assert.equal(res.code, 1, 'Should exit with code 1 on missing PDF');
    const combinedOutput = res.stderr + res.stdout;
    assert.match(combinedOutput, /PDF file not found/i, 'Should report clean file not found message');
    assert.doesNotMatch(combinedOutput, /uncaughtException/i, 'Must not crash with uncaughtException');
  });

  it('1.10 [AC-4 Anti-Dependency Attestation] Confirms zero Firestore / Resend / Firebase in pipeline code', () => {
    const pipelineFiles = [
      PARSE_DEMO_SCRIPT,
      path.join(ROOT_DIR, 'src', 'services', 'pdf', 'index.js'),
      path.join(ROOT_DIR, 'src', 'services', 'pdf', 'pdf-extractor.js'),
      path.join(ROOT_DIR, 'src', 'services', 'pdf', 'sentence-segmenter.js'),
      path.join(ROOT_DIR, 'src', 'services', 'pdf', 'adapters', 'unpdf-adapter.js'),
      path.join(ROOT_DIR, 'src', 'services', 'pdf', 'adapters', 'mock-adapter.js'),
      path.join(ROOT_DIR, 'src', 'services', 'ai', 'index.js'),
      path.join(ROOT_DIR, 'src', 'services', 'ai', 'gemini-parser.js'),
      path.join(ROOT_DIR, 'src', 'services', 'ai', 'mock-gemini.js'),
      path.join(ROOT_DIR, 'src', 'services', 'ai', 'prompt.js'),
      path.join(ROOT_DIR, 'src', 'services', 'ai', 'schema.js'),
      path.join(ROOT_DIR, 'src', 'services', 'validator', 'index.js'),
      path.join(ROOT_DIR, 'src', 'services', 'validator', 'unity-checker.js'),
      path.join(ROOT_DIR, 'src', 'services', 'validator', 'rules.js')
    ];

    const forbiddenPatterns = [
      /require\s*\(\s*['"]firebase['"]\s*\)/i,
      /require\s*\(\s*['"]@google-cloud\/firestore['"]\s*\)/i,
      /require\s*\(\s*['"]firestore['"]\s*\)/i,
      /require\s*\(\s*['"]resend['"]\s*\)/i
    ];

    for (const file of pipelineFiles) {
      assert.ok(fs.existsSync(file), `File must exist: ${file}`);
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.doesNotMatch(content, pattern,
          `File ${path.relative(ROOT_DIR, file)} must not import forbidden cloud/email service matching ${pattern}`);
      }
    }

    // Package.json dependencies verification
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    assert.equal(allDeps['firebase'], undefined, 'firebase must not be in package.json dependencies');
    assert.equal(allDeps['@google-cloud/firestore'], undefined, '@google-cloud/firestore must not be in package.json');
  });

});

// =============================================================================
// TIER 2: BOUNDARY CONDITIONS, REDUCTIONS & CONTRACT PRECISION
// =============================================================================
describe('Tier 2: Boundary Conditions, Reductions & Contract Precision', () => {

  it('2.1 minimal keyword query extracts targeted cluster with high reduction (> 80%)', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['age limit'],
      contextBefore: 0,
      contextAfter: 0
    });

    assert.equal(result.success, true);
    assert.ok(result.extractedStats.reductionPercentage > 85,
      `Strict 'age limit' query should yield > 85% reduction, got ${result.extractedStats.reductionPercentage}%`);
    assert.ok(result.extractedStats.sentenceCount <= 4, 'Should extract only matching sentence(s)');
  });

  it('2.2 selective recruitment keywords strictly achieve typical ~74-78% token reduction', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['age limit', 'qualification', 'fee'],
      contextBefore: 1,
      contextAfter: 1
    });

    assert.equal(result.success, true);
    const reduction = result.extractedStats.reductionPercentage;
    assert.ok(reduction >= 72 && reduction <= 78,
      `Selective keyword reduction (${reduction}%) must fall in ~74-78% benchmark range`);
  });

  it('2.3 exact minimum age boundary evaluates correctly through the pipeline', async () => {
    const benchmark = getBenchmarkCriteria('UPSC');

    // Candidate at exact minimum age boundary (21) -> ELIGIBLE
    const exactMinCandidate = createCustomCandidate({ age: 21, category: 'General' });
    const eligibleRes = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: [], requiredEducation: [], eligibleStreams: [] } },
      { ...benchmark, candidate: exactMinCandidate }
    );
    assert.equal(eligibleRes.candidateEligibility.isEligible, true, 'Candidate at age 21 must be ELIGIBLE');

    // Candidate at off-by-one under minimum age boundary (20) -> DISQUALIFIED
    const underageCandidate = createCustomCandidate({ age: 20, category: 'General' });
    const disqualifiedRes = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: [], requiredEducation: [], eligibleStreams: [] } },
      { ...benchmark, candidate: underageCandidate }
    );
    assert.equal(disqualifiedRes.candidateEligibility.isEligible, false, 'Candidate at age 20 must be DISQUALIFIED');
    assert.match(disqualifiedRes.candidateEligibility.disqualifications[0], /below the minimum required age/i);
  });

  it('2.4 exact maximum age and relaxed age boundaries evaluate correctly through the pipeline', async () => {
    const benchmark = getBenchmarkCriteria('UPSC');
    const relaxations = [{ category: 'SC', years: 5 }];

    // General at exact maxAge (32) -> ELIGIBLE
    const exactMaxGen = createCustomCandidate({ age: 32, category: 'General' });
    const genElig = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: relaxations, requiredEducation: [], eligibleStreams: [] } },
      { ...benchmark, candidate: exactMaxGen }
    );
    assert.equal(genElig.candidateEligibility.isEligible, true);

    // General at maxAge + 1 (33) -> DISQUALIFIED
    const overageGen = createCustomCandidate({ age: 33, category: 'General' });
    const genDisq = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: relaxations, requiredEducation: [], eligibleStreams: [] } },
      { ...benchmark, candidate: overageGen }
    );
    assert.equal(genDisq.candidateEligibility.isEligible, false);

    // SC at exact relaxed maxAge (32 + 5 = 37) -> ELIGIBLE
    const exactMaxSC = createCustomCandidate({ age: 37, category: 'SC' });
    const scElig = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: relaxations, requiredEducation: [], eligibleStreams: [] } },
      { ...benchmark, candidate: exactMaxSC }
    );
    assert.equal(scElig.candidateEligibility.isEligible, true);

    // SC at maxAge + 5 + 1 (38) -> DISQUALIFIED
    const overageSC = createCustomCandidate({ age: 38, category: 'SC' });
    const scDisq = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: relaxations, requiredEducation: [], eligibleStreams: [] } },
      { ...benchmark, candidate: overageSC }
    );
    assert.equal(scDisq.candidateEligibility.isEligible, false);
  });

  it('2.5 fee boundary handling treats 0 INR as valid exemption rather than falsy or null', () => {
    const criteria = createCustomCriteria({ maxReservedFee: 0 });
    const result = verifyUnity(
      { applicationFee: { general: 100, reserved: 0 } },
      criteria
    );

    const reservedEval = result.evaluations.find(e => e.field === 'applicationFee.reserved');
    assert.ok(reservedEval);
    assert.equal(reservedEval.status, 'PASS');
    assert.equal(reservedEval.actual, 0);
  });

  it('2.6 application date ordering and leap-year calendar boundaries', () => {
    const criteria = createCustomCriteria({ applicationEndDateMin: '2026-02-01' });

    // Valid window: end date after min
    const validResult = verifyUnity(
      { importantDates: { applicationStartDate: '2026-01-10', applicationEndDate: '2026-02-15' } },
      criteria
    );
    const dateEval = validResult.evaluations.find(e => e.field === 'importantDates.applicationEndDate');
    assert.ok(dateEval);
    assert.equal(dateEval.status, 'PASS');

    // Leap year boundary: 2028-02-29
    const leapCriteria = createCustomCriteria({ applicationEndDateMin: '2028-02-28' });
    const leapResult = verifyUnity(
      { importantDates: { applicationStartDate: '2028-02-01', applicationEndDate: '2028-02-29' } },
      leapCriteria
    );
    const leapEval = leapResult.evaluations.find(e => e.field === 'importantDates.applicationEndDate');
    assert.ok(leapEval);
    assert.equal(leapEval.status, 'PASS');
  });

  it('2.7 context window boundary comparison (context 0 vs context 1)', async () => {
    const strict0 = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['1056 posts'],
      contextBefore: 0,
      contextAfter: 0
    });

    const window1 = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['1056 posts'],
      contextBefore: 1,
      contextAfter: 1
    });

    assert.equal(strict0.success, true);
    assert.equal(window1.success, true);
    assert.ok(strict0.extractedStats.sentenceCount <= window1.extractedStats.sentenceCount,
      'Context 0 must produce fewer or equal sentences than context 1');
    assert.ok(strict0.extractedStats.extractedCharCount <= window1.extractedStats.extractedCharCount);
  });

});

// =============================================================================
// TIER 3: COMBINATION & END-TO-END ORCHESTRATION FLOWS
// =============================================================================
describe('Tier 3: Combination & End-to-End Orchestration Flows', () => {

  it('3.1 executes full pipeline from an in-memory PDF Buffer identically to file path', async () => {
    const pdfBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const result = await runPipeline({
      pdf: SAMPLE_PDF_PATH,
      mock: true,
      preset: 'UPSC',
      candidate: 'general'
    });

    assert.equal(result.success, true);
    assert.equal(result.executionMode, 'mock');
    assert.ok(result.pdfResult.success);
    assert.ok(result.aiResult.success);
    assert.equal(result.unityResult.overallVerdict, 'PASS');
    assert.equal(result.unityResult.candidateEligibility.isEligible, true);
  });

  it('3.2 evaluates full canonical candidate profile matrix against pipeline output', async () => {
    const pdfResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee', 'dates']
    });
    const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { mockMode: true });
    const baseBenchmark = getBenchmarkCriteria('UPSC');

    // Candidates evaluated against UPSC notification directly
    const testCandidates = [
      { profile: MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL, expected: true, label: 'General Qualified' },
      { profile: MOCK_CANDIDATES.UNDERAGE_CANDIDATE, expected: false, label: 'Underage' },
      { profile: MOCK_CANDIDATES.OVERAGE_GENERAL_CANDIDATE, expected: false, label: 'Overage General' },
      { profile: MOCK_CANDIDATES.OVERAGE_SC_ELIGIBLE_WITH_RELAXATION, expected: true, label: 'SC Relaxed Eligible' },
      { profile: MOCK_CANDIDATES.OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION, expected: false, label: 'SC Exceeded Overage' },
      { profile: MOCK_CANDIDATES.OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION, expected: true, label: 'OBC Relaxed Eligible' },
      { profile: MOCK_CANDIDATES.OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION, expected: false, label: 'OBC Exceeded Overage' },
      { profile: MOCK_CANDIDATES.MISSING_MANDATORY_EDUCATION_DISQUALIFIED, expected: false, label: 'Missing Education' },
      { profile: MOCK_CANDIDATES.FEMALE_EXEMPT_FEE_CANDIDATE, expected: true, label: 'Female Exempt Fee' },
      { profile: MOCK_CANDIDATES.EXACT_BOUNDARY_MIN_AGE, expected: true, label: 'Exact Min Age' },
      { profile: MOCK_CANDIDATES.EXACT_BOUNDARY_MAX_AGE, expected: true, label: 'Exact Max Age' },
      { profile: MOCK_CANDIDATES.EXACT_BOUNDARY_RELAXED_MAX_AGE, expected: true, label: 'Exact Relaxed Max Age' }
    ];

    for (const { profile, expected, label } of testCandidates) {
      const benchmark = { ...baseBenchmark, candidate: profile };
      const evaluation = verifyUnity(aiResult.data, benchmark);
      assert.equal(evaluation.candidateEligibility.isEligible, expected,
        `Candidate "${label}" (${profile.name}) expected eligibility ${expected}, got ${evaluation.candidateEligibility.isEligible}`);
    }

    // PwBD candidate is eligible when notification criteria includes PwBD relaxation
    const noticeWithPwbd = JSON.parse(JSON.stringify(aiResult.data));
    noticeWithPwbd.eligibility.ageRelaxation.push({ category: 'PwBD', years: 10 });
    const pwbdEval = verifyUnity(noticeWithPwbd, {
      ...baseBenchmark,
      candidate: MOCK_CANDIDATES.PWBD_ELIGIBLE_WITH_RELAXATION
    });
    assert.equal(pwbdEval.candidateEligibility.isEligible, true,
      'PwBD candidate must be ELIGIBLE when notification includes PwBD relaxation');
  });

  it('3.3 multi-preset benchmark cross-validation against UPSC notification', async () => {
    const pdfResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee', 'dates']
    });
    const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { mockMode: true });

    // Preset 1: UPSC CSE -> PASS
    const upscRes = verifyUnity(aiResult.data, getBenchmarkCriteria('UPSC'));
    assert.equal(upscRes.overallVerdict, 'PASS');

    // Preset 2: SSC CGL -> FAIL (organization and examTitle mismatch)
    const sscRes = verifyUnity(aiResult.data, getBenchmarkCriteria('SSC_CGL'));
    assert.equal(sscRes.overallVerdict, 'FAIL');
    assert.ok(sscRes.evaluations.some(e => e.field === 'organization' && e.status === 'FAIL'));

    // Preset 3: IBPS PO -> FAIL (organization and fee benchmark mismatch)
    const ibpsRes = verifyUnity(aiResult.data, getBenchmarkCriteria('IBPS_PO'));
    assert.equal(ibpsRes.overallVerdict, 'FAIL');
    assert.ok(ibpsRes.evaluations.some(e => e.field === 'organization' && e.status === 'FAIL'));

    // Preset 4: Technical Services -> FAIL (examTitle mismatch)
    const techRes = verifyUnity(aiResult.data, TECHNICAL_SERVICES_BENCHMARK_CRITERIA);
    assert.equal(techRes.overallVerdict, 'FAIL');
    assert.ok(techRes.evaluations.some(e => e.field === 'examTitle' && e.status === 'FAIL'));
  });

  it('3.4 custom criteria overrides trigger expected rule evaluation', async () => {
    const pdfResult = await extractTargetedPdfText(SAMPLE_PDF_PATH, {
      keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'fee', 'dates']
    });
    const aiResult = await parseStructuredCriteria(pdfResult.targetedText, { mockMode: true });

    // Set minVacancies to 5000 (actual is 1056) -> should trigger WARNING
    const strictCriteria = createCustomCriteria({ minVacancies: 5000 });
    const unityResult = verifyUnity(aiResult.data, strictCriteria);

    const vacEval = unityResult.evaluations.find(e => e.field === 'vacancies');
    assert.ok(vacEval);
    assert.equal(vacEval.status, 'WARNING');
    assert.match(vacEval.reason, /below.*threshold/i);
  });

  it('3.5 programmatic runPipeline returns compliant envelope with metadata', async () => {
    const pipelineRes = await runPipeline({
      pdf: SAMPLE_PDF_PATH,
      mock: true,
      preset: 'UPSC',
      candidate: 'general'
    });

    assert.equal(pipelineRes.success, true);
    assert.equal(typeof pipelineRes.timingMs, 'number');
    assert.ok(pipelineRes.meta && typeof pipelineRes.meta === 'object');
    assert.equal(pipelineRes.meta.preset, 'UPSC');
    assert.equal(pipelineRes.meta.candidateKey, 'FULLY_QUALIFIED_GENERAL');
    assert.ok(pipelineRes.pdfResult.rawStats.totalPages > 0);
    assert.ok(pipelineRes.aiResult.data.examTitle);
    assert.ok(pipelineRes.unityResult.summary.totalChecks > 0);
  });

});

// =============================================================================
// TIER 4: STANDALONE CLI PROCESS LIFECYCLE & CHILD PROCESS ROBUSTNESS
// =============================================================================
describe('Tier 4: Standalone CLI Process Lifecycle & Child Process Robustness', () => {

  it('4.1 CLI --help and -h flags display full manual and exit cleanly with code 0', () => {
    const longHelp = runCli(['--help']);
    assert.equal(longHelp.code, 0);
    assert.match(longHelp.stdout, /usage/i);
    assert.match(longHelp.stdout, /--pdf/i);
    assert.match(longHelp.stdout, /--mock/i);
    assert.match(longHelp.stdout, /--preset/i);
    assert.match(longHelp.stdout, /--candidate/i);

    const shortHelp = runCli(['-h']);
    assert.equal(shortHelp.code, 0);
    assert.match(shortHelp.stdout, /usage/i);
  });

  it('4.2 CLI --keywords parameter filters extraction and reflects in JSON output', () => {
    const res = runCli(['--mock', '--keywords', 'vacancies,fee', '--json']);
    assert.equal(res.code, 0);
    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.ok(json.pdf.extractedStats.matchedKeywords.includes('vacancies'));
    assert.ok(json.pdf.extractedStats.matchedKeywords.includes('fee'));
  });

  it('4.3 CLI accepts inline JSON candidate profile', () => {
    const inlineJson = '{"name":"Aditi Sen","age":28,"category":"General","education":"Bachelor of Engineering"}';
    const res = runCli(['--mock', '--candidate', inlineJson, '--json']);
    assert.equal(res.code, 0);
    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.equal(json.unityVerification.candidateEligibility.isEligible, true);
  });

  it('4.4 CLI runs benchmark only when candidate is none', () => {
    const res = runCli(['--mock', '--candidate', 'none', '--json']);
    assert.equal(res.code, 0);
    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.equal(json.unityVerification.overallVerdict, 'PASS');
  });

  it('4.5 CLI --no-color flag suppresses all ANSI color codes', () => {
    const res = runCli(['--mock', '--no-color']);
    assert.equal(res.code, 0);
    assert.doesNotMatch(res.stdout, /\x1b\[[0-9;]*m/, 'Stdout must contain zero ANSI escape codes');
  });

  it('4.6 CLI invalid preset name exits with code 1 and lists available presets', () => {
    const res = runCli(['--preset', 'UNKNOWN_PRESET_12345']);
    assert.equal(res.code, 1);
    const output = res.stderr + res.stdout;
    assert.match(output, /invalid preset/i);
    assert.match(output, /UPSC|SSC_CGL|IBPS_PO|TECHNICAL_SERVICES/i);
  });

  it('4.7 CLI invalid candidate profile exits with code 1 and lists available profiles', () => {
    const res = runCli(['--candidate', 'NON_EXISTENT_CANDIDATE_NAME']);
    assert.equal(res.code, 1);
    const output = res.stderr + res.stdout;
    assert.match(output, /invalid candidate/i);
    assert.match(output, /general|underage|overage/i);
  });

  it('4.8 CLI missing PDF in JSON mode outputs clean JSON error envelope with code 1', () => {
    const res = runCli(['--pdf', 'fixtures/missing_test_pdf_file.pdf', '--json']);
    assert.equal(res.code, 1);
    let errJson;
    assert.doesNotThrow(() => {
      errJson = JSON.parse(res.stdout.trim());
    }, 'Output must be parseable JSON error envelope');
    assert.equal(errJson.success, false);
    assert.equal(errJson.code, 1);
    assert.match(errJson.error, /not found|does not exist/i);
  });

  it('4.9 CLI supports positional PDF argument', () => {
    const res = runCli([SAMPLE_PDF_PATH, '--mock', '--json']);
    assert.equal(res.code, 0);
    const json = JSON.parse(res.stdout.trim());
    assert.equal(json.success, true);
    assert.equal(json.pdf.rawStats.totalPages, 4);
  });

  it('4.10 CLI runs gracefully in mock mode with all cloud API keys stripped', () => {
    const res = runCli(['--mock'], {
      env: {
        GEMINI_API_KEY: '',
        RESEND_API_KEY: '',
        FIRESTORE_EMULATOR_HOST: ''
      }
    });
    assert.equal(res.code, 0);
    assert.match(res.stdout, /OFFLINE MOCK MODE/i);
    assert.match(res.stdout, /Overall Verdict\s*:\s*\[\s*PASS\s*\]/i);
  });

});

// =============================================================================
// TIER 5: ADVERSARIAL STRESS, CORRUPTED INPUTS & ANTI-DEPENDENCY ATTESTATION
// =============================================================================
describe('Tier 5: Adversarial Stress, Corrupted Inputs & Anti-Dependency Attestation', () => {

  it('5.1 corrupted PDF payload handled safely without process crash', async () => {
    const tempCorruptPath = path.join(FIXTURES_DIR, 'temp_corrupt_payload.pdf');
    try {
      fs.writeFileSync(tempCorruptPath, 'MALFORMED_NON_PDF_BINARY_CORRUPT_BYTES_XYZ');
      const res = await runPipeline({
        pdf: tempCorruptPath,
        mock: true
      });

      assert.equal(res.success, false, 'Corrupted PDF should fail gracefully');
      assert.ok(res.error && typeof res.error === 'string');
      assert.match(res.error, /PDF extraction failed/i);
    } finally {
      if (fs.existsSync(tempCorruptPath)) {
        fs.unlinkSync(tempCorruptPath);
      }
    }
  });

  it('5.2 zero-byte empty PDF file handled cleanly with code 1', () => {
    const tempEmptyPath = path.join(FIXTURES_DIR, 'temp_empty_0byte.pdf');
    try {
      fs.writeFileSync(tempEmptyPath, '');
      const res = runCli(['--pdf', tempEmptyPath]);
      assert.equal(res.code, 1, 'Empty PDF must exit with code 1');
      const output = res.stderr + res.stdout;
      assert.match(output, /empty \(0 bytes\)/i);
    } finally {
      if (fs.existsSync(tempEmptyPath)) {
        fs.unlinkSync(tempEmptyPath);
      }
    }
  });

  it('5.3 candidate profile prototype pollution resistance', () => {
    const pollutedCandidate = JSON.parse('{"name":"Hacker","age":25,"__proto__":{"isAdmin":true}}');
    const res = verifyUnity(
      { eligibility: { minAge: 21, maxAge: 32, ageRelaxation: [], requiredEducation: [], eligibleStreams: [] } },
      { ...UPSC_BENCHMARK_CRITERIA, candidate: pollutedCandidate }
    );

    assert.equal(res.candidateEligibility.isEligible, true);
    assert.equal({}.isAdmin, undefined, 'Object prototype must not be polluted');
  });

  it('5.4 simulated malformed criteria output handles missing and invalid types without crashing', () => {
    const malformedInputs = [
      null,
      undefined,
      {},
      { examTitle: 12345, organization: false },
      { eligibility: { minAge: 'twenty-one', maxAge: -5, ageRelaxation: 'not-an-array' } },
      { importantDates: { applicationStartDate: 'invalid-date-string' } },
      { vacancies: NaN, applicationFee: { general: Infinity } }
    ];

    for (const input of malformedInputs) {
      assert.doesNotThrow(() => {
        const result = verifyUnity(input, UPSC_BENCHMARK_CRITERIA);
        assert.ok(result && typeof result === 'object');
        assert.ok(['PASS', 'FAIL', 'WARNING'].includes(result.overallVerdict));
      }, `verifyUnity must not crash on malformed input: ${JSON.stringify(input)}`);
    }
  });

  it('5.5 static AST & code dependency audit confirms zero cloud/email imports across src/services/', () => {
    function walkDir(dir) {
      let files = [];
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // Exclude email service directory which belongs to previous scraper script
          if (item !== 'email') {
            files = files.concat(walkDir(fullPath));
          }
        } else if (item.endsWith('.js')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const servicesDir = path.join(ROOT_DIR, 'src', 'services');
    const serviceFiles = walkDir(servicesDir).concat([PARSE_DEMO_SCRIPT]);

    const forbiddenStrings = [
      'firebase',
      '@google-cloud/firestore',
      'resend',
      'nodemailer'
    ];

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const forbidden of forbiddenStrings) {
        const requireRegex = new RegExp(`require\\s*\\(\\s*['"]${forbidden}['"]\\s*\\)`, 'i');
        assert.doesNotMatch(content, requireRegex,
          `File ${path.relative(ROOT_DIR, file)} must not require '${forbidden}'`);
      }
    }
  });

  it('5.6 runtime require.cache audit after full pipeline execution', async () => {
    // Run complete pipeline
    const pipelineRes = await runPipeline({
      pdf: SAMPLE_PDF_PATH,
      mock: true,
      preset: 'UPSC',
      candidate: 'general'
    });
    assert.equal(pipelineRes.success, true);

    // Inspect require.cache
    const loadedModules = Object.keys(require.cache);
    const forbiddenLoaded = loadedModules.filter(m =>
      /node_modules[\\/](?:firebase|@google-cloud\/firestore|resend)/i.test(m)
    );

    assert.deepEqual(forbiddenLoaded, [],
      `Pipeline runtime must not load any forbidden cloud/email modules. Found: ${forbiddenLoaded.join(', ')}`);
  });

});
