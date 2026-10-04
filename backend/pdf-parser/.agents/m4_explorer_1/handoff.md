# Milestone 4 Exploration Report: CLI Argument Parsing and Execution Lifecycle (`parse-demo.js`)

**Agent**: `m4_explorer_1` (teamwork_preview_explorer)  
**Parent**: `teamwork_preview_orchestrator_3`  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_explorer_1`  
**Target File**: `c:\Users\sindh\Documents\codes\mypath-scraper\parse-demo.js`  
**Date**: 2026-09-14  

---

## 1. Observation

### 1.1 Runtime and Dependency Context
- **Node.js Runtime**: Node.js `v24.13.0` is installed on the host. Node's standard library `node:util` provides `parseArgs`, a fully native, typed CLI argument parser (`parseArgs({ options, args, strict, allowPositionals })`).
- **Dependencies (`package.json`)**:
  ```json
  "dependencies": {
    "@google/genai": "^2.22.0",
    "cheerio": "^1.2.0",
    "dotenv": "^17.4.2",
    "pdf-lib": "^1.17.1",
    "resend": "^6.26.0",
    "unpdf": "^1.8.1"
  }
  ```
  `dotenv` `^17.4.2` is installed. No third-party argument parser (`yargs`, `commander`) is installed; using native `node:util.parseArgs` guarantees zero additional dependencies.

### 1.2 Benchmark Presets and Candidate Profiles (`fixtures/mock-criteria.js`)
- **Benchmark Presets**:
  - `UPSC_BENCHMARK_CRITERIA` (lines 13–38)
  - `SSC_CGL_BENCHMARK_CRITERIA` (lines 40–58)
  - `IBPS_PO_BENCHMARK_CRITERIA` (lines 60–78)
  - `TECHNICAL_SERVICES_BENCHMARK_CRITERIA` (lines 80–96)
  - Function `getBenchmarkCriteria(presetName)` (lines 320–337):
    ```javascript
    switch (String(presetName).toUpperCase()) {
      case 'SSC':
      case 'SSC_CGL':
        return JSON.parse(JSON.stringify(SSC_CGL_BENCHMARK_CRITERIA));
      case 'IBPS':
      case 'IBPS_PO':
      case 'BANK':
        return JSON.parse(JSON.stringify(IBPS_PO_BENCHMARK_CRITERIA));
      case 'TECH':
      case 'TECHNICAL':
        return JSON.parse(JSON.stringify(TECHNICAL_SERVICES_BENCHMARK_CRITERIA));
      case 'UPSC':
      case 'CSE':
      default:
        return JSON.parse(JSON.stringify(UPSC_BENCHMARK_CRITERIA));
    }
    ```
    *Critical Observation*: `getBenchmarkCriteria` defaults any unrecognized string to `UPSC_BENCHMARK_CRITERIA`. Therefore, the CLI must perform explicit preset validation beforehand to detect invalid presets and output friendly error messages instead of silently falling back to UPSC.
- **Candidate Profiles (`MOCK_CANDIDATES`, lines 102–304)**:
  - 15 predefined profiles: `FULLY_QUALIFIED_GENERAL`, `UNDERAGE_CANDIDATE`, `OVERAGE_GENERAL_CANDIDATE`, `OVERAGE_SC_ELIGIBLE_WITH_RELAXATION`, `OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION`, `OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION`, `OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION`, `PWBD_ELIGIBLE_WITH_RELAXATION`, `WRONG_STREAM_DISQUALIFIED`, `MISSING_MANDATORY_EDUCATION_DISQUALIFIED`, `EXACT_BOUNDARY_MIN_AGE`, `EXACT_BOUNDARY_MAX_AGE`, `EXACT_BOUNDARY_RELAXED_MAX_AGE`, `FEMALE_EXEMPT_FEE_CANDIDATE`, `MALFORMED_CANDIDATE_PROFILE`.

### 1.3 Targeted PDF Extraction & Keyword Behavior (`src/services/pdf/`)
- `extractTargetedPdfText(input, options)` in `src/services/pdf/pdf-extractor.js` (lines 124–293):
  - Uses `compileKeywords(keywords, wholeWord = true)` (lines 39–65).
  - Whole-word regex bounding (`\b`) means exact match on singular keywords (e.g. `\bage limit\b`) will **not** match plural occurrences in the PDF (e.g. `Age Limits`).
  - In `fixtures/sample-notification.pdf`:
    - Page 2 heading: `2. Age Limits: A candidate must have attained the minimum age of 21 years and must not have exceeded the maximum age of 32 years...`
    - Page 2 qualification: `3. Minimum Educational Qualifications: A candidate must hold a Bachelor's degree in any discipline...`
    - Page 4 vacancies: `1. Number of Vacancies: ... 1056 posts.`
    - Page 4 dates: `2. Schedule and Important Dates: The online application window opens on 2026-01-10 ... last date ... is 2026-02-15 ...`
    - Page 4 fees: `3. Application Fee Structure: ... fee of Rs. 100 ... Female ... SC, ST ... exempt (Fee: Nil).`
  - When keywords are set to stemmed / flexible terms: `['age', 'qualification', 'eligibility', 'vacancies', 'fee', 'dates']`, the extractor extracts 19 targeted sentences from Pages 2 and 4, achieving **56.7% - 66.1% token reduction**, capturing all essential data.

### 1.4 AI Criteria Extraction & Mock Mode Arbitration (`src/services/ai/`)
- `parseStructuredCriteria(targetedText, options)` in `src/services/ai/gemini-parser.js` (lines 203–250):
  - Line 206: `const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;`
  - Lines 220–225:
    ```javascript
    const isExplicitMock = opts.mockMode === true;
    const isAutoMock = !apiKey && opts.mockMode !== false && !opts.client;

    if (isExplicitMock || isAutoMock) {
      return generateMockResponse(targetedText, { ...opts, modelUsed: 'mock-rules-v1' });
    }
    ```
  - When `GEMINI_API_KEY` is not present in `.env` or the environment, `isAutoMock` is automatically activated.
  - When `--mock` is specified, `mockMode: true` is passed, explicitly forcing mock mode even if `GEMINI_API_KEY` exists.

### 1.5 Unity Verification Engine (`src/services/validator/`)
- `verifyUnity(extractedData, databaseCriteria)` in `src/services/validator/unity-checker.js` (lines 50–386):
  - Evaluates benchmark criteria rules (organization, examTitle, vacancies, fee, dates) and candidate profile qualifications (age limits, category relaxation, education level, stream).
  - Automatically unwraps `{ success: true, data: { ... } }` envelopes.
  - Returns `{ overallVerdict: 'PASS'|'FAIL'|'WARNING', summary: { totalChecks, passedChecks, failedChecks, warningChecks, passRate }, evaluations, candidateEligibility }`.
- `formatUnityReport(result, options)` and `printUnityReport(result, options)`:
  - Formats ANSI dashboard table and candidate eligibility scorecard.

### 1.6 Environment Variable Loading Behavior
- `require('dotenv').config()`:
  - If `.env` is absent, returns `{ error: [Error: ENOENT...] }` without throwing an unhandled exception.
  - If `.env` is present, populates `process.env`.
  - Wrapping in a safe `try { require('dotenv').config(); } catch (err) {}` block guarantees zero fatal exceptions during boot.

---

## 2. Logic Chain

```
[Observation 1.1: Node 24 standard library node:util.parseArgs]
  │
  ├─► Avoids adding extra dependencies to package.json.
  ├─► Provides native options schema, type safety, default values, short flags.
  └─► Throws typed errors (ERR_PARSE_ARGS_UNKNOWN_OPTION, ERR_PARSE_ARGS_INVALID_OPTION_VALUE)
      which can be cleanly caught to suppress raw Node stack dumps.

[Observation 1.2: Presets & Candidates in fixtures/mock-criteria.js]
  │
  ├─► Preset switch in getBenchmarkCriteria has a default that masks invalid preset names.
  │   └─► Logic: CLI must validate preset against whitelist ['UPSC', 'SSC_CGL', 'IBPS_PO', 'TECHNICAL_SERVICES']
  │       BEFORE calling getBenchmarkCriteria.
  │
  └─► Candidate profiles exist as 15 named keys.
      └─► Logic: CLI should resolve candidate by:
          1. Exact key match (case-insensitive)
          2. Convenient aliases (e.g. 'underage' -> 'UNDERAGE_CANDIDATE', 'general' -> 'FULLY_QUALIFIED_GENERAL')
          3. 'none' -> evaluates document benchmark rules without candidate
          4. JSON string or path to .json file
          5. If invalid string -> print friendly list of choices, exit with code 1.

[Observation 1.3: Default Keywords & Word Boundaries]
  │
  └─► Singular keywords like 'age limit' miss plural 'Age Limits' in the fixture PDF.
      └─► Logic: Default keywords should be ['age', 'qualification', 'eligibility', 'vacancies', 'fee', 'dates'].
          This guarantees 100% field extraction from fixtures/sample-notification.pdf.

[Observation 1.4: Gemini Mock Mode Arbitration]
  │
  └─► gemini-parser automatically enables mock mode when apiKey is absent.
      └─► Logic: Flags `--mock` explicitly sets `mockMode: true`.
          If `--mock` is not passed and apiKey is missing, gracefully notify user and set `mockMode: true`.
          If apiKey is present and `--mock` is not passed, run live Gemini 2.5 Flash model.

[Observation 1.5 & 1.6: Clean Error Handling & Exit Codes]
  │
  ├─► Catch missing PDF, empty PDF, invalid preset, invalid candidate, invalid flags.
  ├─► Print friendly 1-line error to console.error (or JSON error if --json is active).
  ├─► Exit with code 1 on execution failure; exit with code 0 on successful pipeline completion.
  └─► Exit with code 0 on `--help`.
```

---

## 3. Detailed Architecture & Design Specifications

### 3.1 CLI Flag Matrix

| Flag | Type | Short | Default | Description |
|---|---|---|---|---|
| `--pdf` | `string` | `-p` | `'fixtures/sample-notification.pdf'` | File path to recruitment notification PDF |
| `--keywords` | `string` | `-k` | `'age,qualification,eligibility,vacancies,fee,dates'` | Comma-separated list of keywords to filter text |
| `--mock` | `boolean` | `-m` | `false` | Force offline mock Gemini extraction mode |
| `--preset` | `string` | | `'UPSC'` | Benchmark database criteria preset (`UPSC`, `SSC_CGL`, `IBPS_PO`, `TECHNICAL_SERVICES`) |
| `--candidate` | `string` | `-c` | `'FULLY_QUALIFIED_GENERAL'` | Candidate profile name, alias, JSON string, or `.json` file (`none` for benchmark only) |
| `--json` | `boolean` | `-j` | `false` | Output pure machine-readable JSON to stdout |
| `--help` | `boolean` | `-h` | `false` | Display help guide and exit with code 0 |

### 3.2 Argument Parser Specification
Using Node's native `util.parseArgs`:
```javascript
const { parseArgs } = require('node:util');

const CLI_OPTIONS = {
  pdf: { type: 'string', short: 'p', default: 'fixtures/sample-notification.pdf' },
  keywords: { type: 'string', short: 'k', default: 'age,qualification,eligibility,vacancies,fee,dates' },
  mock: { type: 'boolean', short: 'm', default: false },
  preset: { type: 'string', default: 'UPSC' },
  candidate: { type: 'string', short: 'c', default: 'FULLY_QUALIFIED_GENERAL' },
  json: { type: 'boolean', short: 'j', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

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

    return { success: true, flags: values };
  } catch (err) {
    return {
      success: false,
      error: `Invalid CLI argument: ${err.message}. Use --help to view available options.`
    };
  }
}
```

### 3.3 Safe Environment Variable Loading
```javascript
function loadEnvironment() {
  try {
    require('dotenv').config();
  } catch {
    // Safe fallback if dotenv is unavailable or fails to read .env
  }
}
```

### 3.4 Target Resource Validation & Resolution

#### A. PDF Path Resolution & Validation
```javascript
function validatePdfPath(inputPath) {
  const resolved = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    return { valid: false, error: `PDF file not found: ${resolved}` };
  }
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    return { valid: false, error: `Expected a PDF file, but path is a directory: ${resolved}` };
  }
  if (stat.size === 0) {
    return { valid: false, error: `PDF file is empty (0 bytes): ${resolved}` };
  }
  return { valid: true, resolvedPath: resolved };
}
```

#### B. Preset Validation & Resolution
```javascript
const PRESET_MAP = {
  'UPSC': 'UPSC',
  'CSE': 'UPSC',
  'SSC_CGL': 'SSC_CGL',
  'SSC': 'SSC_CGL',
  'IBPS_PO': 'IBPS_PO',
  'IBPS': 'IBPS_PO',
  'BANK': 'IBPS_PO',
  'TECHNICAL_SERVICES': 'TECHNICAL_SERVICES',
  'TECH': 'TECHNICAL_SERVICES',
  'TECHNICAL': 'TECHNICAL_SERVICES'
};

function resolvePreset(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Preset name must be a non-empty string.' };
  }
  const normalized = name.trim().toUpperCase();
  const canonical = PRESET_MAP[normalized];
  if (!canonical) {
    return {
      valid: false,
      error: `Invalid preset "${name}". Supported presets: UPSC, SSC_CGL, IBPS_PO, TECHNICAL_SERVICES`
    };
  }
  return { valid: true, canonicalName: canonical, criteria: getBenchmarkCriteria(canonical) };
}
```

#### C. Candidate Profile Validation & Resolution
```javascript
const CANDIDATE_ALIASES = {
  'QUALIFIED': 'FULLY_QUALIFIED_GENERAL',
  'GENERAL': 'FULLY_QUALIFIED_GENERAL',
  'FULLY_QUALIFIED': 'FULLY_QUALIFIED_GENERAL',
  'UNDERAGE': 'UNDERAGE_CANDIDATE',
  'OVERAGE': 'OVERAGE_GENERAL_CANDIDATE',
  'OVERAGE_GENERAL': 'OVERAGE_GENERAL_CANDIDATE',
  'OVERAGE_SC': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'OVERAGE_SC_RELAXED': 'OVERAGE_SC_ELIGIBLE_WITH_RELAXATION',
  'OVERAGE_SC_EXCEEDED': 'OVERAGE_SC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'OVERAGE_OBC': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'OVERAGE_OBC_RELAXED': 'OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION',
  'OVERAGE_OBC_EXCEEDED': 'OVERAGE_OBC_DISQUALIFIED_EXCEEDING_RELAXATION',
  'PWBD': 'PWBD_ELIGIBLE_WITH_RELAXATION',
  'WRONG_STREAM': 'WRONG_STREAM_DISQUALIFIED',
  'STREAM_MISMATCH': 'WRONG_STREAM_DISQUALIFIED',
  'MISSING_EDUCATION': 'MISSING_MANDATORY_EDUCATION_DISQUALIFIED',
  'MIN_AGE_BOUNDARY': 'EXACT_BOUNDARY_MIN_AGE',
  'MAX_AGE_BOUNDARY': 'EXACT_BOUNDARY_MAX_AGE',
  'FEMALE_EXEMPT': 'FEMALE_EXEMPT_FEE_CANDIDATE'
};

function resolveCandidate(arg) {
  if (!arg || arg.trim().toLowerCase() === 'none' || arg.trim().toLowerCase() === 'null') {
    return { valid: true, candidate: null };
  }

  const raw = arg.trim();

  // Check 1: Inline JSON string
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      return { valid: true, candidate: parsed };
    } catch (e) {
      return { valid: false, error: `Malformed candidate JSON string: ${e.message}` };
    }
  }

  // Check 2: Path to JSON file
  if (raw.endsWith('.json') || fs.existsSync(raw)) {
    try {
      const content = fs.readFileSync(path.resolve(process.cwd(), raw), 'utf8');
      return { valid: true, candidate: JSON.parse(content) };
    } catch (e) {
      return { valid: false, error: `Failed to load candidate profile from file "${raw}": ${e.message}` };
    }
  }

  // Check 3: Exact key in MOCK_CANDIDATES
  const upper = raw.toUpperCase();
  if (MOCK_CANDIDATES[upper]) {
    return { valid: true, candidate: MOCK_CANDIDATES[upper] };
  }

  // Check 4: Alias map
  if (CANDIDATE_ALIASES[upper]) {
    return { valid: true, candidate: MOCK_CANDIDATES[CANDIDATE_ALIASES[upper]] };
  }

  // Check 5: Partial prefix matching on MOCK_CANDIDATES keys
  const match = Object.keys(MOCK_CANDIDATES).find(k => k.startsWith(upper) || k.includes(upper));
  if (match) {
    return { valid: true, candidate: MOCK_CANDIDATES[match] };
  }

  return {
    valid: false,
    error: `Invalid candidate profile "${arg}". Supported profiles: FULLY_QUALIFIED_GENERAL, UNDERAGE_CANDIDATE, OVERAGE_GENERAL_CANDIDATE, OVERAGE_SC_ELIGIBLE_WITH_RELAXATION, OVERAGE_OBC_ELIGIBLE_WITH_RELAXATION, PWBD_ELIGIBLE_WITH_RELAXATION, WRONG_STREAM_DISQUALIFIED, FEMALE_EXEMPT_FEE_CANDIDATE, none (or provide valid JSON / file path)`
  };
}
```

### 3.5 Execution Lifecycle (Step-by-Step)

```
Step 1: Argument Parsing
  - Call parseCliArgs(process.argv.slice(2)).
  - If --help / -h: print usage to stdout and exit(0).
  - If parsing error: print error message to stderr (or JSON if --json) and exit(1).

Step 2: Environment Initialization
  - Call loadEnvironment().
  - Check process.env.GEMINI_API_KEY.
  - Determine mockMode = flags.mock || !process.env.GEMINI_API_KEY.

Step 3: Resource Validation
  - Validate PDF path (exists, readable, non-empty).
  - Validate and resolve benchmark preset.
  - Validate and resolve candidate profile.
  - If any validation fails: print clean message and exit(1).

Step 4: Phase 1 — PDF Targeted Extraction
  - Call extractTargetedPdfText(resolvedPdfPath, { keywords }).
  - Surface reduction stats: raw tokens vs extracted tokens, character reduction %, matched pages.
  - If not --json: display Phase 1 Card.

Step 5: Phase 2 — AI Criteria Extraction
  - Call parseStructuredCriteria(targetedText, { mockMode, apiKey: process.env.GEMINI_API_KEY }).
  - Verify result.success.
  - If not --json: display Phase 2 Card (Exam title, organization, age limits, qualifications, vacancies, dates, fees).

Step 6: Phase 3 — Unity Verification & Candidate Matching
  - Assemble databaseCriteria: { ...presetCriteria, candidate }.
  - Call verifyUnity(aiResult.data, databaseCriteria).
  - If not --json: call printUnityReport(unityResult).

Step 7: Output & Exit
  - If --json: format unified output envelope and print to stdout with JSON.stringify(envelope, null, 2).
  - If not --json: print final summary line.
  - Call process.exit(0).
```

### 3.6 Machine-Readable JSON Output Structure (`--json`)
When `--json` is specified, the CLI outputs pure JSON without any banner text:
```json
{
  "success": true,
  "mode": "mock",
  "pdf": {
    "path": "fixtures/sample-notification.pdf",
    "totalPages": 4,
    "matchedPages": [2, 4],
    "rawTokens": 1649,
    "extractedTokens": 713,
    "reductionPercentage": 56.7,
    "sentenceCount": 19,
    "matchedKeywords": ["age", "qualification", "vacancies", "fee", "dates"]
  },
  "ai": {
    "success": true,
    "isMock": true,
    "modelUsed": "mock-rules-v1",
    "data": {
      "examTitle": "COMBINED CIVIL SERVICES EXAMINATION 2026",
      "organization": "UNION PUBLIC SERVICE COMMISSION",
      "eligibility": {
        "minAge": 21,
        "maxAge": 32,
        "ageRelaxation": [{ "category": "SC/ST", "years": 5 }, { "category": "OBC", "years": 3 }],
        "requiredEducation": ["Bachelor's degree in any discipline"],
        "eligibleStreams": []
      },
      "importantDates": {
        "applicationStartDate": "2026-01-10",
        "applicationEndDate": "2026-02-15",
        "examDate": null
      },
      "vacancies": 1056,
      "applicationFee": { "general": 100, "reserved": 0 },
      "status": "ACTIVE"
    }
  },
  "unity": {
    "overallVerdict": "PASS",
    "summary": {
      "totalChecks": 10,
      "passedChecks": 10,
      "failedChecks": 0,
      "warningChecks": 0,
      "passRate": 100
    },
    "evaluations": [
      {
        "field": "organization",
        "expected": "UNION PUBLIC SERVICE COMMISSION",
        "actual": "UNION PUBLIC SERVICE COMMISSION",
        "status": "PASS",
        "reason": "Organization matches 'UNION PUBLIC SERVICE COMMISSION'"
      }
    ],
    "candidateEligibility": {
      "isEligible": true,
      "disqualifications": [],
      "matchedQualifications": ["Age 25 satisfies requirement [21, 32]"]
    }
  }
}
```
If an execution error occurs in `--json` mode:
```json
{
  "success": false,
  "error": "PDF file not found: fixtures/missing.pdf"
}
```

---

## 4. Caveats

1. **Plural vs Singular Word Boundaries**: In `fixtures/sample-notification.pdf`, section headings use plural terms (`Age Limits`, `Minimum Educational Qualifications`, `Schedule and Important Dates`). Default CLI keywords must use stem words (`age`, `qualification`, `dates`, `fee`, `vacancies`) so word-boundary regex (`\b`) matches both singular and plural forms.
2. **Preset Whitelisting**: `fixtures/mock-criteria.js:getBenchmarkCriteria` defaults to `UPSC` on unknown presets. `parse-demo.js` must validate presets independently against the whitelist.
3. **Verdict vs Exit Code Distinction**: A verification failure (e.g. `--candidate underage` resulting in `DISQUALIFIED` verdict) is an expected evaluation outcome, **not** an execution error. The script execution succeeded, so it should exit with code `0`. Execution error (exit code `1`) is reserved for unrecoverable errors: missing PDF, malformed flags, invalid preset, invalid candidate profile, or runtime exceptions.
4. **Stdout Purity in JSON Mode**: Any console logs, banners, or debug statements must be completely silenced or sent to `stderr` when `--json` flag is active so stdout remains strictly parseable by `JSON.parse` or tools like `jq`.

---

## 5. Conclusion

1. **Flag Design**: Support `--pdf` (defaults to `fixtures/sample-notification.pdf`), `--keywords` (defaults to `'age,qualification,eligibility,vacancies,fee,dates'`), `--mock` (boolean), `--preset` (defaults to `UPSC`), `--candidate` (defaults to `FULLY_QUALIFIED_GENERAL`), `--json` (boolean), and `--help` / `-h` (boolean).
2. **Zero External Dependencies**: Native Node.js `node:util.parseArgs` (available in Node v24.13.0) provides clean, typed argument parsing with zero additional packages.
3. **Zero External Cloud Services**: Standalone execution uses only `src/services/pdf`, `src/services/ai` (with offline mock fallback), and `src/services/validator`. No Firestore, Firebase, or Resend libraries are required or loaded.
4. **Resilient Error Handling**: Missing files, invalid presets, and invalid candidate profiles are trapped with clean, actionable error messages and exit code 1, suppressing Node stack traces.
5. **Modular Architecture**: Exporting `parseCliArgs`, `resolvePreset`, `resolveCandidate`, `runPipeline`, and `main` enables clean end-to-end testing via both subprocess execution and programmatic module imports.

---

## 6. Verification Method

To independently verify all findings and the proposed implementation:

1. **Verify Native Argument Parser and Node Version**:
   ```powershell
   node -e "const { parseArgs } = require('node:util'); console.log(typeof parseArgs);"
   ```
   *Expected output*: `function`

2. **Verify 3-Module Pipeline Integration on Fixture PDF**:
   ```powershell
   node -e "
   const { extractTargetedPdfText } = require('./src/services/pdf');
   const { parseStructuredCriteria } = require('./src/services/ai');
   const { verifyUnity } = require('./src/services/validator');
   const { getBenchmarkCriteria, MOCK_CANDIDATES } = require('./fixtures/mock-criteria');

   async function test() {
     const pdf = await extractTargetedPdfText('fixtures/sample-notification.pdf', {
       keywords: ['age', 'qualification', 'eligibility', 'vacancies', 'fee', 'dates']
     });
     const ai = await parseStructuredCriteria(pdf.targetedText, { mockMode: true });
     const criteria = getBenchmarkCriteria('UPSC');
     criteria.candidate = MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL;
     const unity = verifyUnity(ai.data, criteria);
     console.log('Verdict:', unity.overallVerdict, '| Pass Rate:', unity.summary.passRate + '%');
   }
   test();
   "
   ```
   *Expected output*: `Verdict: PASS | Pass Rate: 100%`

3. **Verify Candidate Disqualification Behavior**:
   Change `criteria.candidate = MOCK_CANDIDATES.UNDERAGE_CANDIDATE;` in the snippet above.
   *Expected output*: `Verdict: FAIL | isEligible: false`

4. **Verify Existing Project Test Suite**:
   ```powershell
   npm test
   ```
   *Expected output*: All 189 tests pass cleanly across all 5 tiers.
