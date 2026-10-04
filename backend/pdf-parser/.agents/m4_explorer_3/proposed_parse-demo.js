#!/usr/bin/env node
'use strict';

/**
 * parse-demo.js
 * Standalone CLI Runner & Formatted Console Dashboard for Milestone 4.
 * Demonstrates end-to-end PDF parsing, targeted sentence extraction,
 * Gemini criteria parsing, and deterministic unity validation against database criteria.
 * 
 * Standalone guarantee: Zero Firestore, zero Resend/email dependencies.
 */

// Safe dotenv loading
try {
  require('dotenv').config({ quiet: true });
} catch {
  // Graceful fallback if dotenv is unavailable
}

const fs = require('fs');
const path = require('path');

// Determine root directory whether running from root or from .agents/m4_explorer_3/
const ROOT_DIR = fs.existsSync(path.join(__dirname, 'src')) ? __dirname : path.resolve(__dirname, '../..');

const { extractTargetedPdfText } = require(path.join(ROOT_DIR, 'src/services/pdf'));
const { parseStructuredCriteria } = require(path.join(ROOT_DIR, 'src/services/ai'));
const { verifyUnity, formatUnityReport } = require(path.join(ROOT_DIR, 'src/services/validator'));
const { getBenchmarkCriteria, MOCK_CANDIDATES } = require(path.join(ROOT_DIR, 'fixtures/mock-criteria'));

// Default configuration constants
const DEFAULT_PDF_PATH = path.join(ROOT_DIR, 'fixtures', 'sample-notification.pdf');
const DEFAULT_KEYWORDS = ['eligibility', 'age', 'qualification', 'fee', 'vacancies', 'dates'];

const VALID_PRESETS = {
  'UPSC': 'UPSC',
  'CSE': 'UPSC',
  'SSC': 'SSC_CGL',
  'SSC_CGL': 'SSC_CGL',
  'IBPS': 'IBPS_PO',
  'IBPS_PO': 'IBPS_PO',
  'BANK': 'IBPS_PO',
  'TECH': 'TECHNICAL_SERVICES',
  'TECHNICAL': 'TECHNICAL_SERVICES',
  'TECHNICAL_SERVICES': 'TECHNICAL_SERVICES'
};

const VALID_CANDIDATES = {
  'general': 'FULLY_QUALIFIED_GENERAL',
  'default': 'FULLY_QUALIFIED_GENERAL',
  'aarav': 'FULLY_QUALIFIED_GENERAL',
  'underage': 'UNDERAGE_CANDIDATE',
  'rohan': 'UNDERAGE_CANDIDATE',
  'overage': 'OVERAGE_GENERAL_CANDIDATE',
  'overage_general': 'OVERAGE_GENERAL_CANDIDATE',
  'vikram': 'OVERAGE_GENERAL_CANDIDATE',
  'sc_eligible': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'pooja': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'sc_overage': 'OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'suresh': 'OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'obc_eligible': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'ananya': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'obc_overage': 'OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'dinesh': 'OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'pwbd': 'PWBD_ELIGIBLE_WITH_RELAXATION',
  'kavita': 'PWBD_ELIGIBLE_WITH_RELAXATION',
  'wrong_stream': 'WRONG_STREAM_DISQUALIFIED',
  'meera': 'WRONG_STREAM_DISQUALIFIED',
  'missing_education': 'MISSING_MANDATORY_EDUCATION_DISQUALIFIED',
  'rajesh': 'MISSING_MANDATORY_EDUCATION_DISQUALIFIED',
  'female_exempt': 'FEMALE_EXEMPT_FEE_CANDIDATE',
  'sneha': 'FEMALE_EXEMPT_FEE_CANDIDATE',
  'none': null
};

/**
 * Print CLI usage and help manual.
 */
function printHelp() {
  console.log(`
MyPath Recruitment Pipeline — Standalone CLI Runner (parse-demo.js)

Usage:
  node parse-demo.js [options]

Options:
  --help, -h               Show this help manual and exit
  --pdf <path>             Path to notification PDF (default: fixtures/sample-notification.pdf)
  --keywords <list>        Comma-separated keywords for targeted extraction
                           (default: eligibility,age,qualification,fee,vacancies,dates)
  --mock                   Force offline mock mode (bypasses live Gemini API calls)
  --preset <name>          Database benchmark criteria preset:
                           UPSC (default) | SSC_CGL | IBPS_PO | TECHNICAL_SERVICES
  --candidate <profile>    Mock candidate profile to evaluate:
                           general (default) | underage | overage | sc_eligible |
                           sc_overage | obc_eligible | obc_overage | pwbd |
                           wrong_stream | missing_education | female_exempt | none
  --json                   Output machine-readable JSON envelope only
  --no-color               Disable ANSI terminal styling

Examples:
  # Run full pipeline with default sample PDF in auto-mode
  node parse-demo.js

  # Run in offline mock mode with SSC CGL criteria and underage candidate
  node parse-demo.js --mock --preset SSC_CGL --candidate underage

  # Output machine-readable JSON for integration tests or scripting
  node parse-demo.js --mock --json

  # Run targeted parsing with custom keywords on a custom PDF
  node parse-demo.js --pdf custom.pdf --keywords "eligibility,salary,deadline"
`);
}

/**
 * Parse command line arguments.
 */
function parseArgs(argv) {
  const options = {
    help: false,
    pdfPath: DEFAULT_PDF_PATH,
    keywords: DEFAULT_KEYWORDS,
    mock: false,
    preset: 'UPSC',
    candidate: 'general',
    json: false,
    noColor: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--mock') {
      options.mock = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--no-color') {
      options.noColor = true;
    } else if (arg === '--pdf') {
      options.pdfPath = argv[++i] || '';
    } else if (arg.startsWith('--pdf=')) {
      options.pdfPath = arg.slice(6);
    } else if (arg === '--keywords') {
      const raw = argv[++i] || '';
      options.keywords = raw.split(',').map(k => k.trim()).filter(Boolean);
    } else if (arg.startsWith('--keywords=')) {
      options.keywords = arg.slice(11).split(',').map(k => k.trim()).filter(Boolean);
    } else if (arg === '--preset') {
      options.preset = (argv[++i] || '').toUpperCase();
    } else if (arg.startsWith('--preset=')) {
      options.preset = arg.slice(9).toUpperCase();
    } else if (arg === '--candidate') {
      options.candidate = (argv[++i] || '').toLowerCase();
    } else if (arg.startsWith('--candidate=')) {
      options.candidate = arg.slice(12).toLowerCase();
    }
  }

  return options;
}

/**
 * Formats key-value pair with aligned padding and color.
 */
function formatField(label, value, colors, labelWidth = 26) {
  const { cyan, reset, bold } = colors;
  return `  ${bold}${label.padEnd(labelWidth)}:${reset} ${value}`;
}

/**
 * Renders beautiful terminal dashboard.
 */
function renderDashboard({ pdfResult, aiResult, unityResult, meta, colors }) {
  const { cyan, green, yellow, red, bold, dim, reset } = colors;
  const divider = `${cyan}${bold}${'='.repeat(80)}${reset}`;
  const subDivider = `${dim}${'-'.repeat(80)}${reset}`;

  const modeBadge = aiResult.isMock
    ? `${yellow}${bold}[ OFFLINE MOCK MODE ] (Mock Rules Engine — Zero External Calls)${reset}`
    : `${green}${bold}[ LIVE GEMINI API MODE ] (Model: ${meta.model})${reset}`;

  const lines = [];

  // Banner Header
  lines.push('');
  lines.push(divider);
  lines.push(`${cyan}${bold}   MYPATH RECRUITMENT PIPELINE — TARGETED PDF EXTRACTION & UNITY VALIDATOR${reset}`);
  lines.push(divider);
  lines.push(`Execution Mode   : ${modeBadge}`);
  lines.push(`Target Document  : ${path.resolve(meta.pdfPath)}`);
  lines.push(`Benchmark Preset : ${bold}${meta.preset}${reset}`);
  lines.push(`Candidate Profile: ${meta.candidateKey ? bold + meta.candidateKey + reset : dim + 'None (Benchmark Only)' + reset}`);
  lines.push(`Execution Time   : ${meta.timingMs} ms | Standalone: Zero Firestore / Zero Resend`);
  lines.push(divider);

  // Phase 1: PDF Parsing & Targeted Extraction Card
  lines.push('');
  lines.push(`${cyan}${bold}[PHASE 1] TARGETED PDF PARSING & TOKEN REDUCTION SUMMARY${reset}`);
  lines.push(subDivider);
  const raw = pdfResult.rawStats;
  const ext = pdfResult.extractedStats;
  lines.push(formatField('Document Scope', `${raw.totalPages} Total Pages | Scanned Pages: [${ext.matchedPages.join(', ')}]`, colors));
  lines.push(formatField('Raw Content Metrics', `${raw.rawCharCount.toLocaleString()} chars | ${raw.rawWordCount.toLocaleString()} words | ~${raw.estimatedRawTokens.toLocaleString()} tokens`, colors));
  lines.push(formatField('Targeted Extract', `${ext.sentenceCount} sentences | ${ext.extractedCharCount.toLocaleString()} chars | ~${ext.estimatedTokens.toLocaleString()} tokens`, colors));
  lines.push(formatField('Token Savings', `${green}${bold}${ext.reductionPercentage}% Reduction${reset} (~${(raw.estimatedRawTokens / Math.max(1, ext.estimatedTokens)).toFixed(1)}x compression)`, colors));
  lines.push(formatField('Active Keywords', `${ext.matchedKeywords.join(', ')}`, colors));
  lines.push(subDivider);

  // Phase 2: Gemini Criteria Card
  lines.push('');
  lines.push(`${cyan}${bold}[PHASE 2] GEMINI STRUCTURED CRITERIA EXTRACTION${reset}`);
  lines.push(subDivider);
  const d = aiResult.data || {};
  lines.push(formatField('Exam Title', `${bold}${d.examTitle || 'null'}${reset}`, colors));
  lines.push(formatField('Organization', `${bold}${d.organization || 'null'}${reset}`, colors));
  lines.push(formatField('Recruitment Status', `${d.status || 'UNKNOWN'}`, colors));
  lines.push(formatField('Total Vacancies', `${d.vacancies !== null ? d.vacancies : 'Not specified / Tentative'}`, colors));
  
  const minAge = d.eligibility && d.eligibility.minAge !== null ? `${d.eligibility.minAge} yrs` : 'None';
  const maxAge = d.eligibility && d.eligibility.maxAge !== null ? `${d.eligibility.maxAge} yrs` : 'None';
  lines.push(formatField('Age Criteria', `Min: ${minAge} | Max: ${maxAge}`, colors));

  const relaxations = d.eligibility && Array.isArray(d.eligibility.ageRelaxation) && d.eligibility.ageRelaxation.length > 0
    ? d.eligibility.ageRelaxation.map(r => `${r.category}: +${r.years}y`).join(', ')
    : 'None announced';
  lines.push(formatField('Age Relaxations', relaxations, colors));

  const edu = d.eligibility && Array.isArray(d.eligibility.requiredEducation) && d.eligibility.requiredEducation.length > 0
    ? d.eligibility.requiredEducation.join(' | ')
    : 'Not specified';
  lines.push(formatField('Required Education', edu, colors));

  const streams = d.eligibility && Array.isArray(d.eligibility.eligibleStreams) && d.eligibility.eligibleStreams.length > 0
    ? d.eligibility.eligibleStreams.join(', ')
    : 'Any Discipline';
  lines.push(formatField('Eligible Streams', streams, colors));

  const appStart = d.importantDates && d.importantDates.applicationStartDate ? d.importantDates.applicationStartDate : 'TBD';
  const appEnd = d.importantDates && d.importantDates.applicationEndDate ? d.importantDates.applicationEndDate : 'TBD';
  const examDate = d.importantDates && d.importantDates.examDate ? d.importantDates.examDate : 'Tentative';
  lines.push(formatField('Application Window', `${appStart} to ${appEnd} | Exam Date: ${examDate}`, colors));

  const genFee = d.applicationFee && d.applicationFee.general !== null ? `₹${d.applicationFee.general}` : 'TBD';
  const resFee = d.applicationFee && d.applicationFee.reserved !== null ? (d.applicationFee.reserved === 0 ? '₹0 (Exempt)' : `₹${d.applicationFee.reserved}`) : 'TBD';
  lines.push(formatField('Application Fee', `General: ${genFee} | Reserved / Female: ${resFee}`, colors));
  lines.push(subDivider);

  // Phase 3: Unity Verification Card (Leveraging formatUnityReport)
  lines.push(formatUnityReport(unityResult, { color: colors.useColor }));

  // Phase 4: Executive Pipeline Summary
  lines.push(`${cyan}${bold}[PIPELINE EXECUTION SUMMARY]${reset}`);
  lines.push(`  Pipeline Status     : ${unityResult.overallVerdict === 'PASS' ? green + bold + '✔ SUCCESS' : (unityResult.overallVerdict === 'WARNING' ? yellow + bold + '⚠ WARNING' : red + bold + '✘ ACTION REQUIRED')}${reset}`);
  lines.push(`  Candidate Status    : ${unityResult.candidateEligibility.isEligible ? green + bold + 'ELIGIBLE TO APPLY' : red + bold + 'DISQUALIFIED'}${reset}`);
  lines.push(`  Token Efficiency    : ${green}${ext.reductionPercentage}% saved via targeted extraction${reset}`);
  lines.push(`  External Services   : Zero Firestore queries, Zero Resend emails (100% standalone)`);
  lines.push(divider);
  lines.push('');

  return lines.join('\n');
}

/**
 * Main pipeline runner.
 */
async function main() {
  const startTime = Date.now();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // 1. Validate PDF file existence
  const resolvedPdfPath = path.resolve(args.pdfPath);
  if (!fs.existsSync(resolvedPdfPath)) {
    const errorMsg = `PDF file not found: "${resolvedPdfPath}"`;
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(`\n[ERROR] ${errorMsg}`);
      console.error(`Please provide a valid file path via --pdf <path>.\n`);
    }
    process.exit(1);
  }

  // 2. Validate Benchmark Criteria Preset
  const resolvedPreset = VALID_PRESETS[args.preset];
  if (!resolvedPreset) {
    const validNames = Object.keys(VALID_PRESETS).filter(p => !['CSE', 'SSC', 'IBPS', 'BANK', 'TECH', 'TECHNICAL'].includes(p)).join(', ');
    const errorMsg = `Invalid preset "${args.preset}". Valid presets are: ${validNames}`;
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(`\n[ERROR] ${errorMsg}\n`);
    }
    process.exit(1);
  }
  const benchmarkCriteria = getBenchmarkCriteria(resolvedPreset);

  // 3. Validate Candidate Profile
  if (!(args.candidate in VALID_CANDIDATES)) {
    const validCandidates = Object.keys(VALID_CANDIDATES).filter(c => !['default', 'aarav', 'rohan', 'vikram', 'pooja', 'suresh', 'ananya', 'dinesh', 'kavita', 'meera', 'rajesh', 'sneha'].includes(c)).join(', ');
    const errorMsg = `Invalid candidate profile "${args.candidate}". Valid profiles are: ${validCandidates}`;
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(`\n[ERROR] ${errorMsg}\n`);
    }
    process.exit(1);
  }
  const candidateKey = VALID_CANDIDATES[args.candidate];
  const candidateProfile = candidateKey ? MOCK_CANDIDATES[candidateKey] : null;

  // 4. Color Configuration
  const useColor = !args.json && !args.noColor && process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);
  const colors = {
    useColor,
    green: useColor ? '\x1b[32m' : '',
    red: useColor ? '\x1b[31m' : '',
    yellow: useColor ? '\x1b[33m' : '',
    cyan: useColor ? '\x1b[36m' : '',
    bold: useColor ? '\x1b[1m' : '',
    dim: useColor ? '\x1b[2m' : '',
    reset: useColor ? '\x1b[0m' : ''
  };

  // 5. Phase 1: Targeted PDF Extraction
  const pdfResult = await extractTargetedPdfText(resolvedPdfPath, {
    keywords: args.keywords,
    contextBefore: 1,
    contextAfter: 1
  });

  // 6. Phase 2: Gemini Criteria Parsing
  const apiKey = process.env.GEMINI_API_KEY;
  const isExplicitMock = args.mock === true;
  const isAutoMock = !apiKey && !isExplicitMock;
  const mockMode = isExplicitMock || isAutoMock;

  const aiResult = await parseStructuredCriteria(pdfResult.targetedText, {
    apiKey,
    mockMode,
    model: 'gemini-2.5-flash'
  });

  if (!aiResult.success && !aiResult.data) {
    const errorMsg = `Gemini extraction failed: ${aiResult.error || 'Unknown error'}`;
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(`\n[ERROR] ${errorMsg}\n`);
    }
    process.exit(1);
  }

  // 7. Phase 3: Unity Verification Check
  const unityResult = verifyUnity(aiResult.data, {
    ...benchmarkCriteria,
    candidate: candidateProfile
  });

  const timingMs = Date.now() - startTime;

  // 8. Output Formatting (JSON vs Formatted Dashboard)
  if (args.json) {
    const jsonOutput = {
      success: true,
      executionMode: aiResult.isMock ? 'mock' : 'live',
      timingMs,
      pdf: {
        path: path.relative(process.cwd(), resolvedPdfPath),
        rawStats: pdfResult.rawStats,
        extractedStats: pdfResult.extractedStats
      },
      extractedCriteria: aiResult.data,
      unityVerification: unityResult
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    const dashboard = renderDashboard({
      pdfResult,
      aiResult,
      unityResult,
      meta: {
        pdfPath: resolvedPdfPath,
        preset: resolvedPreset,
        candidateKey: candidateKey ? `${candidateProfile.name} (${candidateProfile.category}, ${candidateProfile.age}y, ${candidateProfile.education})` : null,
        model: aiResult.modelUsed,
        timingMs
      },
      colors
    });
    console.log(dashboard);
  }
}

main().catch((err) => {
  console.error(`\n[FATAL ERROR] Unexpected execution error: ${err.message}\n`);
  process.exit(1);
});
