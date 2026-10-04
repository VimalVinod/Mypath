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

// Safe dotenv loading with quiet: true to prevent stdout pollution in JSON mode
try {
  require('dotenv').config({ quiet: true });
} catch {
  // Graceful fallback if dotenv is unavailable
}

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const ROOT_DIR = __dirname;

const { extractTargetedPdfText } = require(path.join(ROOT_DIR, 'src', 'services', 'pdf'));
const { parseStructuredCriteria } = require(path.join(ROOT_DIR, 'src', 'services', 'ai'));
const { verifyUnity, formatUnityReport } = require(path.join(ROOT_DIR, 'src', 'services', 'validator'));
const { getBenchmarkCriteria, MOCK_CANDIDATES } = require(path.join(ROOT_DIR, 'fixtures', 'mock-criteria'));

// Default configuration constants
const DEFAULT_PDF_PATH = 'fixtures/sample-notification.pdf';
const DEFAULT_KEYWORDS = 'eligibility,age,qualification,vacancies,fee,dates,selection';

const CLI_OPTIONS = {
  pdf: { type: 'string', short: 'p', default: DEFAULT_PDF_PATH },
  keywords: { type: 'string', short: 'k', default: DEFAULT_KEYWORDS },
  mock: { type: 'boolean', short: 'm', default: false },
  preset: { type: 'string', default: 'UPSC' },
  candidate: { type: 'string', short: 'c', default: 'FULLY_QUALIFIED_GENERAL' },
  json: { type: 'boolean', short: 'j', default: false },
  'no-color': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

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

const CANDIDATE_ALIASES = {
  'general': 'FULLY_QUALIFIED_GENERAL',
  'default': 'FULLY_QUALIFIED_GENERAL',
  'qualified': 'FULLY_QUALIFIED_GENERAL',
  'fully_qualified': 'FULLY_QUALIFIED_GENERAL',
  'aarav': 'FULLY_QUALIFIED_GENERAL',

  'underage': 'UNDERAGE_CANDIDATE',
  'rohan': 'UNDERAGE_CANDIDATE',

  'overage': 'OVERAGE_GENERAL_CANDIDATE',
  'overage_general': 'OVERAGE_GENERAL_CANDIDATE',
  'vikram': 'OVERAGE_GENERAL_CANDIDATE',

  'sc_eligible': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'overage_sc': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'overage_sc_relaxed': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'pooja': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',

  'sc_overage': 'OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'overage_sc_exceeded': 'OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'suresh': 'OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION',

  'obc_eligible': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'overage_obc': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'overage_obc_relaxed': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'ananya': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',

  'obc_overage': 'OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'overage_obc_exceeded': 'OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'dinesh': 'OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION',

  'pwbd': 'PWBD_ELIGIBLE_WITH_RELAXATION',
  'kavita': 'PWBD_ELIGIBLE_WITH_RELAXATION',

  'wrong_stream': 'WRONG_STREAM_DISQUALIFIED',
  'stream_mismatch': 'WRONG_STREAM_DISQUALIFIED',
  'meera': 'WRONG_STREAM_DISQUALIFIED',

  'missing_education': 'MISSING_MANDATORY_EDUCATION_DISQUALIFIED',
  'rajesh': 'MISSING_MANDATORY_EDUCATION_DISQUALIFIED',

  'female_exempt': 'FEMALE_EXEMPT_FEE_CANDIDATE',
  'female_exempt_fee': 'FEMALE_EXEMPT_FEE_CANDIDATE',
  'sneha': 'FEMALE_EXEMPT_FEE_CANDIDATE',

  'min_age_boundary': 'EXACT_BOUNDARY_MIN_AGE',
  'max_age_boundary': 'EXACT_BOUNDARY_MAX_AGE',
  'relaxed_max_age': 'EXACT_BOUNDARY_RELAXED_MAX_AGE'
};

/**
 * Print CLI usage and help manual.
 */
function printHelp() {
  console.log(`
MyPath Recruitment Pipeline — Standalone CLI Runner (parse-demo.js)

Usage:
  node parse-demo.js [options] [pdf-file]

Options:
  --help, -h               Show this help manual and exit
  --pdf <path>, -p         Path to notification PDF (default: fixtures/sample-notification.pdf)
  --keywords <list>, -k    Comma-separated keywords for targeted extraction
                           (default: eligibility,age,qualification,vacancies,fee,dates,selection)
  --mock, -m               Force offline mock mode (bypasses live Gemini API calls)
  --preset <name>          Database benchmark criteria preset:
                           UPSC (default) | SSC_CGL | IBPS_PO | TECHNICAL_SERVICES
  --candidate <name>, -c   Candidate profile, alias, or JSON (default: FULLY_QUALIFIED_GENERAL)
                           Options: general | underage | overage | sc_eligible |
                           sc_overage | obc_eligible | obc_overage | pwbd |
                           wrong_stream | missing_education | female_exempt | none
  --json, -j               Output pure machine-readable JSON envelope only
  --no-color               Disable ANSI terminal styling

Examples:
  # Run full pipeline with default sample PDF in auto mode
  node parse-demo.js

  # Run in offline mock mode with SSC CGL criteria and underage candidate
  node parse-demo.js --mock --preset SSC_CGL --candidate underage

  # Output machine-readable JSON for scripting or automated testing
  node parse-demo.js --mock --json

  # Run targeted parsing with custom keywords on a specific PDF
  node parse-demo.js --pdf custom.pdf --keywords "minimum age,vacancies,fee"
`);
}

/**
 * Parse command line arguments using native node:util.parseArgs.
 * @param {string[]} [argv=process.argv.slice(2)]
 * @returns {{ success: boolean, values?: Record<string, any>, positionals?: string[], error?: string }}
 */
function parseCliArgs(argv = process.argv.slice(2)) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: CLI_OPTIONS,
      strict: true,
      allowPositionals: true
    });

    // Support positional PDF path fallback if user runs: node parse-demo.js my-exam.pdf
    if (positionals.length > 0 && values.pdf === CLI_OPTIONS.pdf.default) {
      values.pdf = positionals[0];
    }

    return { success: true, values, positionals };
  } catch (err) {
    return {
      success: false,
      error: `Invalid CLI argument: ${err.message}. Use --help to view available options.`
    };
  }
}

/**
 * Validates whether the target PDF file exists and is readable.
 * @param {string} inputPath
 * @returns {{ valid: boolean, resolvedPath?: string, error?: string }}
 */
function validatePdfPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return { valid: false, error: 'PDF file path must be a non-empty string.' };
  }
  const resolved = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    return { valid: false, error: `PDF file not found: "${resolved}"` };
  }
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    return { valid: false, error: `Expected a PDF file, but path is a directory: "${resolved}"` };
  }
  if (stat.size === 0) {
    return { valid: false, error: `PDF file is empty (0 bytes): "${resolved}"` };
  }
  return { valid: true, resolvedPath: resolved };
}

/**
 * Resolves and validates the database benchmark preset.
 * @param {string} name
 * @returns {{ valid: boolean, canonicalName?: string, criteria?: Object, error?: string }}
 */
function resolvePreset(name) {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: 'Invalid criteria preset: preset name must be a non-empty string. Supported presets: UPSC, SSC_CGL, IBPS_PO, TECHNICAL_SERVICES'
    };
  }
  const normalized = name.trim().toUpperCase();
  const canonical = VALID_PRESETS[normalized];
  if (!canonical) {
    return {
      valid: false,
      error: `Invalid preset "${name}". Supported presets: UPSC, SSC_CGL, IBPS_PO, TECHNICAL_SERVICES`
    };
  }
  return {
    valid: true,
    canonicalName: canonical,
    criteria: getBenchmarkCriteria(canonical)
  };
}

/**
 * Resolves candidate profile by exact key, alias, JSON string, or file path.
 * @param {string|Object|null} arg
 * @returns {{ valid: boolean, candidate?: Object|null, key?: string|null, error?: string }}
 */
function resolveCandidate(arg) {
  if (arg === null || arg === undefined) {
    return { valid: true, candidate: null, key: null };
  }
  if (typeof arg !== 'string') {
    if (typeof arg === 'object') {
      return { valid: true, candidate: arg, key: arg.name || 'CUSTOM_OBJECT' };
    }
    return { valid: false, error: 'Candidate profile must be a string identifier or object.' };
  }

  const trimmed = arg.trim();
  if (trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'null') {
    return { valid: true, candidate: null, key: null };
  }

  // 1. Inline JSON string
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return { valid: true, candidate: parsed, key: parsed.name || 'CUSTOM_JSON' };
    } catch (e) {
      return { valid: false, error: `Malformed candidate JSON string: ${e.message}` };
    }
  }

  // 2. Path to JSON file
  if (trimmed.endsWith('.json') || fs.existsSync(path.resolve(process.cwd(), trimmed))) {
    const resolvedJsonPath = path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(resolvedJsonPath) && fs.statSync(resolvedJsonPath).isFile()) {
      try {
        const content = fs.readFileSync(resolvedJsonPath, 'utf8');
        const parsed = JSON.parse(content);
        return { valid: true, candidate: parsed, key: parsed.name || path.basename(trimmed) };
      } catch (e) {
        return { valid: false, error: `Failed to load candidate JSON from file "${trimmed}": ${e.message}` };
      }
    }
  }

  // 3. Exact key match in MOCK_CANDIDATES
  const upper = trimmed.toUpperCase();
  if (MOCK_CANDIDATES[upper]) {
    return { valid: true, candidate: MOCK_CANDIDATES[upper], key: upper };
  }

  // 4. Alias lookup
  const lower = trimmed.toLowerCase();
  if (CANDIDATE_ALIASES[lower]) {
    const canonicalKey = CANDIDATE_ALIASES[lower];
    return { valid: true, candidate: MOCK_CANDIDATES[canonicalKey], key: canonicalKey };
  }

  // 5. Case-insensitive / prefix / partial matching in MOCK_CANDIDATES keys
  const candidateKeys = Object.keys(MOCK_CANDIDATES);
  const matchedKey = candidateKeys.find(k => k === upper || k.startsWith(upper) || k.includes(upper));
  if (matchedKey) {
    return { valid: true, candidate: MOCK_CANDIDATES[matchedKey], key: matchedKey };
  }

  return {
    valid: false,
    error: `Invalid candidate profile "${arg}". Supported profiles: general (FULLY_QUALIFIED_GENERAL), underage (UNDERAGE_CANDIDATE), overage (OVERAGE_GENERAL_CANDIDATE), sc_eligible, sc_overage, obc_eligible, obc_overage, pwbd, wrong_stream, missing_education, female_exempt, none (or provide valid JSON / file path)`
  };
}

/**
 * Terminal ANSI styling helpers.
 * @param {boolean} useColor
 */
function getColors(useColor) {
  return {
    useColor,
    green: useColor ? '\x1b[32m' : '',
    red: useColor ? '\x1b[31m' : '',
    yellow: useColor ? '\x1b[33m' : '',
    cyan: useColor ? '\x1b[36m' : '',
    bold: useColor ? '\x1b[1m' : '',
    dim: useColor ? '\x1b[2m' : '',
    reset: useColor ? '\x1b[0m' : ''
  };
}

/**
 * Formats a key-value pair with aligned padding and styling.
 */
function formatField(label, value, colors, labelWidth = 26) {
  const { bold, reset } = colors;
  return `  ${bold}${label.padEnd(labelWidth)}:${reset} ${value}`;
}

/**
 * Renders formatted console dashboard across all 4 phases.
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
  
  let candSummary = `${dim}None (Benchmark Only)${reset}`;
  if (meta.candidateProfile) {
    const cp = meta.candidateProfile;
    candSummary = `${bold}${cp.name || meta.candidateKey}${reset} (${cp.category || 'N/A'}, ${cp.age ? cp.age + 'y' : 'N/A'}, ${cp.education || 'N/A'})`;
  }
  lines.push(`Candidate Profile: ${candSummary}`);
  lines.push(`Execution Time   : ${meta.timingMs} ms | Standalone: Zero Firestore / Zero Resend`);
  lines.push(divider);

  // Phase 1: Targeted PDF Extraction Card
  lines.push('');
  lines.push(`${cyan}${bold}[PHASE 1] TARGETED PDF PARSING & TOKEN REDUCTION SUMMARY${reset}`);
  lines.push(subDivider);
  const raw = (pdfResult && pdfResult.rawStats) || {};
  const ext = (pdfResult && pdfResult.extractedStats) || {};

  const rawReduction = ext.reductionPercentage;
  const reductionPercentage = (rawReduction !== null && rawReduction !== undefined && !Number.isNaN(Number(rawReduction)))
    ? Number(rawReduction)
    : 0.0;

  const rawTokens = (raw.estimatedRawTokens !== null && raw.estimatedRawTokens !== undefined && !Number.isNaN(Number(raw.estimatedRawTokens)))
    ? Number(raw.estimatedRawTokens)
    : 0;
  const extTokens = (ext.estimatedTokens !== null && ext.estimatedTokens !== undefined && !Number.isNaN(Number(ext.estimatedTokens)))
    ? Number(ext.estimatedTokens)
    : 0;
  const rawCompression = extTokens > 0 ? (rawTokens / Math.max(1, extTokens)) : 1.0;
  const compression = (Number.isNaN(rawCompression) || !Number.isFinite(rawCompression)) ? '1.0' : rawCompression.toFixed(1);

  const totalPages = raw.totalPages !== undefined ? raw.totalPages : 0;
  const matchedPagesStr = Array.isArray(ext.matchedPages) ? ext.matchedPages.join(', ') : '';
  const rawCharCount = (raw.rawCharCount !== undefined && !Number.isNaN(Number(raw.rawCharCount))) ? Number(raw.rawCharCount) : 0;
  const rawWordCount = (raw.rawWordCount !== undefined && !Number.isNaN(Number(raw.rawWordCount))) ? Number(raw.rawWordCount) : 0;
  const sentenceCount = (ext.sentenceCount !== undefined && !Number.isNaN(Number(ext.sentenceCount))) ? Number(ext.sentenceCount) : 0;
  const extractedCharCount = (ext.extractedCharCount !== undefined && !Number.isNaN(Number(ext.extractedCharCount))) ? Number(ext.extractedCharCount) : 0;
  const matchedKeywordsStr = Array.isArray(ext.matchedKeywords) ? ext.matchedKeywords.join(', ') : '';

  lines.push(formatField('Document Scope', `${totalPages} Total Pages | Scanned Pages: [${matchedPagesStr}]`, colors));
  lines.push(formatField('Raw Content Metrics', `${rawCharCount.toLocaleString()} chars | ${rawWordCount.toLocaleString()} words | ~${rawTokens.toLocaleString()} tokens`, colors));
  lines.push(formatField('Targeted Extract', `${sentenceCount} sentences | ${extractedCharCount.toLocaleString()} chars | ~${extTokens.toLocaleString()} tokens`, colors));
  lines.push(formatField('Token Savings', `${green}${bold}${reductionPercentage}% Reduction${reset} (~${compression}x compression)`, colors));
  lines.push(formatField('Active Keywords', `${matchedKeywordsStr}`, colors));
  lines.push(subDivider);

  // Phase 2: Gemini Criteria Summary Card
  lines.push('');
  lines.push(`${cyan}${bold}[PHASE 2] GEMINI STRUCTURED CRITERIA EXTRACTION${reset}`);
  lines.push(subDivider);
  const d = aiResult.data || {};
  lines.push(formatField('Exam Title', `${bold}${d.examTitle || 'null'}${reset}`, colors));
  lines.push(formatField('Organization', `${bold}${d.organization || 'null'}${reset}`, colors));
  lines.push(formatField('Recruitment Status', `${d.status || 'UNKNOWN'}`, colors));
  lines.push(formatField('Total Vacancies', `${d.vacancies !== null && d.vacancies !== undefined ? d.vacancies : 'Not specified / Tentative'}`, colors));

  const minAge = d.eligibility && d.eligibility.minAge !== null && d.eligibility.minAge !== undefined ? `${d.eligibility.minAge} yrs` : 'None';
  const maxAge = d.eligibility && d.eligibility.maxAge !== null && d.eligibility.maxAge !== undefined ? `${d.eligibility.maxAge} yrs` : 'None';
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

  const genFee = d.applicationFee && d.applicationFee.general !== null && d.applicationFee.general !== undefined ? `₹${d.applicationFee.general}` : 'TBD';
  const resFee = d.applicationFee && d.applicationFee.reserved !== null && d.applicationFee.reserved !== undefined
    ? (d.applicationFee.reserved === 0 ? '₹0 (Exempt)' : `₹${d.applicationFee.reserved}`)
    : 'TBD';
  lines.push(formatField('Application Fee', `General: ${genFee} | Reserved / Female: ${resFee}`, colors));
  lines.push(subDivider);

  // Phase 3: Unity Verification Report using formatUnityReport
  lines.push(formatUnityReport(unityResult, { color: colors.useColor }));

  // Phase 4: Executive Pipeline Summary
  lines.push(`${cyan}${bold}[PIPELINE EXECUTION SUMMARY]${reset}`);
  const verdictBadge = unityResult.overallVerdict === 'PASS'
    ? `${green}${bold}✔ SUCCESS`
    : (unityResult.overallVerdict === 'WARNING' ? `${yellow}${bold}⚠ WARNING` : `${red}${bold}✘ ACTION REQUIRED`);
  lines.push(`  Pipeline Status     : ${verdictBadge}${reset}`);

  const candElig = unityResult.candidateEligibility;
  let candBadge;
  if (!meta.candidateProfile) {
    candBadge = `${dim}NOT EVALUATED (BENCHMARK ONLY)${reset}`;
  } else if (candElig && candElig.isEligible) {
    candBadge = `${green}${bold}ELIGIBLE TO APPLY${reset}`;
  } else {
    candBadge = `${red}${bold}DISQUALIFIED${reset}`;
  }
  lines.push(`  Candidate Status    : ${candBadge}`);
  lines.push(`  Token Efficiency    : ${green}${reductionPercentage}% saved via targeted extraction${reset}`);
  lines.push(`  External Services   : Zero Firestore queries, Zero Resend emails (100% standalone)`);
  lines.push(divider);
  lines.push('');

  return lines.join('\n');
}

/**
 * Executes the 3-step recruitment extraction and unity verification pipeline.
 * @param {Object} [options={}]
 * @returns {Promise<Object>}
 */
async function runPipeline(options = {}) {
  const startTime = Date.now();

  try {
    // 1. Validate PDF path
    const pdfInput = options.pdf || options.pdfPath || DEFAULT_PDF_PATH;
    const pdfVal = validatePdfPath(pdfInput);
    if (!pdfVal.valid) {
      return { success: false, error: pdfVal.error };
    }
    const resolvedPdfPath = pdfVal.resolvedPath;

    // 2. Resolve Preset
    const presetInput = options.preset || 'UPSC';
    const presetRes = resolvePreset(presetInput);
    if (!presetRes.valid) {
      return { success: false, error: presetRes.error };
    }

    // 3. Resolve Candidate
    const candidateInput = options.candidate !== undefined ? options.candidate : 'FULLY_QUALIFIED_GENERAL';
    const candidateRes = resolveCandidate(candidateInput);
    if (!candidateRes.valid) {
      return { success: false, error: candidateRes.error };
    }

    // 4. Resolve Keywords
    let keywordList;
    if (Array.isArray(options.keywords)) {
      keywordList = options.keywords;
    } else if (typeof options.keywords === 'string') {
      keywordList = options.keywords.split(',').map(k => k.trim()).filter(Boolean);
    } else {
      keywordList = DEFAULT_KEYWORDS.split(',');
    }

    // Step 1: Targeted PDF Extraction
    let pdfResult;
    try {
      pdfResult = await extractTargetedPdfText(resolvedPdfPath, {
        keywords: keywordList,
        contextBefore: 1,
        contextAfter: 1
      });
    } catch (err) {
      return {
        success: false,
        error: `PDF extraction failed: ${err.message}`
      };
    }

    if (!pdfResult || !pdfResult.success) {
      return {
        success: false,
        error: (pdfResult && pdfResult.error) ? `PDF extraction failed: ${pdfResult.error}` : 'PDF extraction failed'
      };
    }

    // Step 2: Structured Criteria Extraction
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    const isExplicitMock = options.mock === true;
    const isAutoMock = !apiKey && !isExplicitMock;
    const mockMode = isExplicitMock || isAutoMock;

    let aiResult;
    try {
      aiResult = await parseStructuredCriteria(pdfResult.targetedText, {
        apiKey,
        mockMode,
        model: options.model || 'gemini-3.5-flash',
        fallbackToMockOnError: true
      });
    } catch (err) {
      return {
        success: false,
        error: `Gemini extraction failed: ${err.message}`
      };
    }

    if (!aiResult || (!aiResult.success && !aiResult.data)) {
      return {
        success: false,
        error: `Gemini extraction failed: ${(aiResult && aiResult.error) || 'Unknown error'}`
      };
    }

    // Step 3: Unity Verification Check
    let unityResult;
    try {
      const dbCriteria = { ...presetRes.criteria };
      if (candidateRes.candidate) {
        dbCriteria.candidate = candidateRes.candidate;
      }
      unityResult = verifyUnity(aiResult.data, dbCriteria);
    } catch (err) {
      return {
        success: false,
        error: `Unity verification failed: ${err.message}`
      };
    }

    const timingMs = Date.now() - startTime;

    return {
      success: true,
      executionMode: aiResult.isMock ? 'mock' : 'live',
      timingMs,
      pdfResult,
      aiResult,
      unityResult,
      meta: {
        pdfPath: resolvedPdfPath,
        preset: presetRes.canonicalName,
        candidateKey: candidateRes.key,
        candidateProfile: candidateRes.candidate,
        model: aiResult.modelUsed,
        timingMs
      }
    };
  } catch (err) {
    return {
      success: false,
      error: `Pipeline execution failed: ${err.message}`
    };
  }
}

/**
 * Main CLI entry point.
 * @param {string[]} [argv=process.argv.slice(2)]
 */
async function main(argv = process.argv.slice(2)) {
  const isJsonMode = argv.includes('--json') || argv.includes('-j');
  try {
    const parseRes = parseCliArgs(argv);
    if (!parseRes.success) {
      if (isJsonMode) {
        console.log(JSON.stringify({ success: false, error: parseRes.error, code: 1 }, null, 2));
      } else {
        console.error(`\n[ERROR] ${parseRes.error}\n`);
      }
      process.exit(1);
    }

    const flags = parseRes.values;

    if (flags.help) {
      printHelp();
      process.exit(0);
    }

    const pipelineRes = await runPipeline(flags);

    if (!pipelineRes.success) {
      if (flags.json) {
        console.log(JSON.stringify({ success: false, error: pipelineRes.error, code: 1 }, null, 2));
      } else {
        console.error(`\n[ERROR] ${pipelineRes.error}\n`);
      }
      process.exit(1);
    }

    if (flags.json) {
      const pdfDetails = {
        path: path.relative(process.cwd(), pipelineRes.meta.pdfPath),
        rawStats: pipelineRes.pdfResult.rawStats,
        extractedStats: pipelineRes.pdfResult.extractedStats
      };
      const jsonOutput = {
        success: true,
        executionMode: pipelineRes.executionMode,
        timingMs: pipelineRes.timingMs,
        pdf: pdfDetails,
        pdfExtraction: pdfDetails,
        extractedCriteria: pipelineRes.aiResult.data,
        geminiCriteria: pipelineRes.aiResult.data,
        unityVerification: pipelineRes.unityResult
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
    } else {
      const useColor = !flags['no-color'] && process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);
      const colors = getColors(useColor);
      const dashboard = renderDashboard({
        pdfResult: pipelineRes.pdfResult,
        aiResult: pipelineRes.aiResult,
        unityResult: pipelineRes.unityResult,
        meta: pipelineRes.meta,
        colors
      });
      console.log(dashboard);
    }

    process.exit(0);
  } catch (err) {
    if (isJsonMode) {
      console.log(JSON.stringify({ success: false, error: err.message, code: 1 }, null, 2));
    } else {
      console.error(`\n[FATAL ERROR] Unexpected execution error: ${err.message}\n`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    const isJson = process.argv.includes('--json') || process.argv.includes('-j');
    if (isJson) {
      console.log(JSON.stringify({ success: false, error: err.message, code: 1 }, null, 2));
    } else {
      console.error(`\n[FATAL ERROR] Unexpected execution error: ${err.message}\n`);
    }
    process.exit(1);
  });
}

module.exports = {
  parseCliArgs,
  resolvePreset,
  resolveCandidate,
  validatePdfPath,
  runPipeline,
  renderDashboard,
  printHelp,
  main,
  CLI_OPTIONS,
  VALID_PRESETS,
  CANDIDATE_ALIASES
};
