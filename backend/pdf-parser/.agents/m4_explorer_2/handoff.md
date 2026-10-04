# Milestone 4 Pipeline Data Flow & Architecture Exploration Report

## 1. Observation

### 1.1 Module 1: Targeted PDF Parsing Service (`src/services/pdf/`)
- **Facade File**: `src/services/pdf/index.js` (lines 8-55) re-exports:
  - `extractTargetedPdfText`, `compileKeywords`, `calculateMetrics`, `resolveAdapter`, `createPdfAdapter`, `extractPdfPages`, `segmentSentences`, `cleanPdfText`, `UnpdfAdapter`, `MockPdfAdapter`.
- **Core Implementation**: `src/services/pdf/pdf-extractor.js` (lines 124-293).
  - Signature: `extractTargetedPdfText(input, options)`
  - Options accepted:
    - `keywords`: Array of search strings or comma-separated string (default: `[]`).
    - `contextBefore`: Number of preceding context sentences (default: `1`).
    - `contextAfter`: Number of following context sentences (default: `1`).
    - `mode`: `'sentence'` (default) or `'page'`.
    - `wholeWord`: Boolean (default: `true`).
    - `minSentenceLength`: Minimum characters for a sentence (default: `3`).
    - `adapter`: Adapter instance or name `'unpdf'` | `'mock'` (default: `'unpdf'`).
  - Output Envelope (lines 271-292):
    ```javascript
    {
      success: true,
      rawStats: {
        totalPages: number,
        rawCharCount: number,
        rawWordCount: number,
        estimatedRawTokens: number // Math.ceil(rawCharCount / 4)
      },
      extractedStats: {
        matchedPages: number[],
        sentenceCount: number,
        extractedCharCount: number,
        extractedWordCount: number,
        estimatedTokens: number, // Math.ceil(extractedCharCount / 4)
        reductionPercentage: number, // ((raw - extracted) / raw) * 100
        matchedKeywords: string[],
        unmatchedKeywords: string[],
        keywordHits: Record<string, number>
      },
      targetedText: string, // Formatted with "--- [Page N] ---\n..."
      sections: Array<{ pageNumber: number, sentences: string[] }>
    }
    ```
- **Live Test on Sample Fixture** (`fixtures/sample-notification.pdf`):
  - Command:
    ```bash
    node -e "const { extractTargetedPdfText } = require('./src/services/pdf'); const path = require('path'); (async () => { const res = await extractTargetedPdfText(path.join(__dirname, 'fixtures/sample-notification.pdf'), { keywords: ['minimum age', 'vacancies', 'last date', 'application fee'], contextBefore: 1, contextAfter: 1 }); console.log(JSON.stringify({ rawStats: res.rawStats, extractedStats: res.extractedStats }, null, 2)); })()"
    ```
  - Result:
    - Raw: 4 pages, 6,593 chars, 972 words, 1,649 estimated tokens.
    - Extracted: Matched pages `[2, 4]` (pages 1 and 3 completely eliminated as noise).
    - Extracted chars: 1,720, extracted tokens: 430.
    - `reductionPercentage`: **73.9%** (up to **77.9%** with `['minimum age', 'vacancies', 'application fee']`, and **86.5%** with `['eligibility', 'vacancies']`).
- **Keyword Boundary Finding**:
  In `pdf-extractor.js` lines 58-59, `wholeWord=true` enforces `\b` word boundaries. Keywords like `'age limit'` do not match plural `'Age Limits'` (`/\\bage\\s+limit\\b/i.test("Age Limits") === false`). Therefore, keywords should either be plural-tolerant (e.g. `'age'`, `'age limits'`, `'qualification'`, `'qualifications'`) or include variants.

---

### 1.2 Module 2: Gemini Criteria Extraction Service (`src/services/ai/`)
- **Facade File**: `src/services/ai/index.js` (lines 8-62) re-exports:
  - `parseStructuredCriteria`, `normalizeCriteriaData`, `normalizeExtractedData`, `parseJsonSafely`, `CRITERIA_SCHEMA`, `EXAM_CRITERIA_SCHEMA`, `examSchema`, `Type`, `SYSTEM_INSTRUCTION`, `buildExtractionPrompt`, `buildPrompt`, `DEFAULT_EXTRACTION_CONFIG`, `extractMockCriteria`, `getMockExtraction`, `generateMockResponse`, `getEmptyCriteria`, `MOCK_NOTIFICATION_FIXTURE`.
- **Core Implementation**: `src/services/ai/gemini-parser.js` (lines 203-304).
  - Signature: `parseStructuredCriteria(targetedText, options)`
  - Options accepted:
    - `apiKey`: String (default: `process.env.GEMINI_API_KEY`).
    - `model`: String (default: `'gemini-2.5-flash'`).
    - `mockMode`: Boolean (`true` forces mock, `false` requires key, `undefined` auto-arbitrates).
    - `fallbackToMockOnError`: Boolean (default: `false`).
    - `client`: Injected SDK client instance for testing.
- **Offline Mock Fallback Arbitration** (`src/services/ai/gemini-parser.js` lines 220-225):
  ```javascript
  const isExplicitMock = opts.mockMode === true;
  const isAutoMock = !apiKey && opts.mockMode !== false && !opts.client;

  if (isExplicitMock || isAutoMock) {
    return generateMockResponse(targetedText, { ...opts, modelUsed: 'mock-rules-v1' });
  }
  ```
  - When `GEMINI_API_KEY` is not present in `.env` or `process.env`, `isAutoMock` is automatically `true` and the engine executes offline mock extraction without throwing.
  - Returns envelope conforming to Interface Contract #2:
    ```javascript
    {
      success: true,
      isMock: true, // or false when live
      modelUsed: 'mock-rules-v1', // or 'gemini-2.5-flash'
      data: {
        examTitle: string | null,
        organization: string | null,
        eligibility: {
          minAge: number | null,
          maxAge: number | null,
          ageRelaxation: Array<{ category: string, years: number }>,
          requiredEducation: string[],
          eligibleStreams: string[]
        },
        importantDates: {
          applicationStartDate: string | null,
          applicationEndDate: string | null,
          examDate: string | null
        },
        vacancies: number | null,
        applicationFee: { general: number | null, reserved: number | null },
        status: string
      },
      rawResponse: Object | null
    }
    ```

---

### 1.3 Module 3: Unity / Database Checking Service (`src/services/validator/`)
- **Facade File**: `src/services/validator/index.js` (lines 9-24) exports:
  - `verifyUnity`, `evaluateCandidateEligibility`, `formatUnityReport`, `printUnityReport`, `rules`.
- **Benchmark Presets & Mock Criteria Location**:
  - `fixtures/mock-criteria.js` exports:
    - Presets: `BENCHMARK_CRITERIA` (alias for `UPSC_BENCHMARK_CRITERIA`), `SSC_CGL_BENCHMARK_CRITERIA`, `IBPS_PO_BENCHMARK_CRITERIA`, `TECHNICAL_SERVICES_BENCHMARK_CRITERIA`.
    - Factory: `getBenchmarkCriteria(presetName)` ('UPSC' | 'SSC' | 'IBPS' | 'TECH').
    - Candidate Profiles: `MOCK_CANDIDATES` (15 distinct profiles covering eligible, underage, overage, relaxed SC/OBC, wrong stream, sub-degree, boundary cases).
- **Core Verification**: `src/services/validator/unity-checker.js` (lines 50-386).
  - Signature: `verifyUnity(extractedData, databaseCriteria)`
  - Envelope Unwrapping (lines 72-76):
    ```javascript
    let rawData = extractedData;
    if (rawData.data && typeof rawData.data === 'object' && !rawData.examTitle && !rawData.eligibility) {
      rawData = rawData.data;
    }
    const normData = normalizeCriteriaData ? normalizeCriteriaData(rawData) : rawData;
    ```
    `verifyUnity` accepts either the unwrapped `data` object OR the full top-level Gemini result envelope `{ success, isMock, data: { ... } }`.
  - Candidate Integration (lines 353-357):
    If `databaseCriteria.candidate` is supplied, `verifyUnity` evaluates candidate eligibility (`evaluateCandidateEligibility`) and appends candidate checks directly into the evaluations matrix.
  - Output Envelope:
    ```javascript
    {
      overallVerdict: 'PASS' | 'FAIL' | 'WARNING',
      summary: { totalChecks, passedChecks, failedChecks, warningChecks, passRate },
      evaluations: Array<{ field, expected, actual, status: 'PASS'|'FAIL'|'WARNING', reason }>,
      candidateEligibility: { isEligible: boolean, disqualifications: string[], matchedQualifications: string[] }
    }
    ```
- **Built-in CLI Formatters**:
  - `formatUnityReport(result, { noColor, color })` (lines 419-528): Formats a high-contrast ANSI box report.
  - `printUnityReport(result, options)` (lines 535-541): Logs report to standard output safely.

---

### 1.4 Zero External Service Guarantee Audit
- **Files Inspected**:
  - `package.json` (lines 12-19): Contains `@google/genai`, `cheerio`, `dotenv`, `pdf-lib`, `resend`, `unpdf`.
  - `.env` (lines 1-4): Contains legacy `RESEND_API_KEY`, `NOTIFICATION_RECIPIENT_EMAIL`, `SENDER_EMAIL`. No `GEMINI_API_KEY`.
- **Grep Audit across Services & Fixtures**:
  - `firestore` in `src/services/pdf/`, `src/services/ai/`, `src/services/validator/`, `fixtures/`: **0 matches**.
  - `firebase` in `src/services/pdf/`, `src/services/ai/`, `src/services/validator/`, `fixtures/`: **0 matches**.
  - `resend` in `src/services/pdf/`, `src/services/ai/`, `src/services/validator/`, `fixtures/`: **0 matches** (only present in legacy `src/services/email/` and `src/scripts/`).
- **Conclusion**: None of the 3 modules (PDF, AI, Validator) depend on Firestore or Resend. `parse-demo.js` can run 100% standalone without network, Firebase, or email services.

---

## 2. Logic Chain

1. **Extraction to AI Pipeline Connection**:
   - `extractTargetedPdfText` consumes `fixtures/sample-notification.pdf` and outputs `targetedText`.
   - `targetedText` separates pages with markdown headers (`--- [Page 2] ---`), which preserves section context without confusing downstream NLP or regex matching.
   - `parseStructuredCriteria` takes `targetedText` directly as a string. In live mode, this text is passed into `@google/genai` prompt template. In offline mock mode, `extractMockCriteria` parses the string via deterministic regexes.
   - Therefore, the integration between Module 1 and Module 2 is a direct parameter handoff: `const aiResult = await parseStructuredCriteria(pdfResult.targetedText, aiOptions);`.

2. **Token and Character Reduction Surfacing**:
   - Total document cost without targeted extraction: 6,593 characters / ~1,649 tokens.
   - Irrelevant sections (gazette preamble on page 1, center locations & syllabus on page 3) account for ~50% of the pages and ~55-65% of the text.
   - Filtering with recruitment keywords isolates pages 2 and 4.
   - Within pages 2 and 4, sentence segmentation and context windowing (1 before, 1 after) isolate the exact clauses for eligibility, vacancies, dates, and fees.
   - The resulting text is 1,455 to 1,720 characters / 364 to 430 tokens, representing a **73.9% to 77.9% reduction in tokens**.
   - `parse-demo.js` can surface this in a clean side-by-side comparison table (Raw vs Targeted vs Savings), demonstrating that token costs to Gemini are slashed by ~75%.

3. **AI to Unity Verification Connection**:
   - `parseStructuredCriteria` outputs a normalized object with guaranteed keys (`examTitle`, `organization`, `eligibility`, `importantDates`, `vacancies`, `applicationFee`, `status`).
   - `verifyUnity` receives `aiResult.data` and a benchmark criteria object from `fixtures/mock-criteria.js`.
   - By attaching candidate credentials (`criteria.candidate = selectedCandidate`), `verifyUnity` evaluates both document benchmark compliance (12 checks) and candidate eligibility (3 checks), yielding 15 field-level evaluations.
   - The existing `formatUnityReport` utility renders the full diagnostic scorecard with ANSI colored badges (`✔ PASS`, `✘ FAIL`, `⚠ WARN`), candidate status (`ELIGIBLE` / `DISQUALIFIED`), and reasons.

4. **Zero Cloud / External Service Guarantee**:
   - Milestone 4 requires no Firestore and no Resend.
   - Since `src/services/pdf`, `src/services/ai` (in mock mode), and `src/services/validator` have zero network I/O, `parse-demo.js` needs only local disk reads for the PDF fixture.
   - Neither `resend` nor Firebase SDK will be imported or initialized in `parse-demo.js`.

5. **Seamless Offline Fallback**:
   - When the user runs `node parse-demo.js` without any configuration, `process.env.GEMINI_API_KEY` is undefined.
   - `parseStructuredCriteria` automatically detects `!apiKey` and switches to `mock-rules-v1` without throwing an error.
   - `parse-demo.js` can display an informative status badge: `[ MODE: OFFLINE MOCK (Deterministic Regex Engine) ]`, guiding the user that they can supply `GEMINI_API_KEY` in `.env` to test live Gemini API.

---

## 3. Caveats

1. **Re-export of `getBenchmarkCriteria`**:
   - The user request mentions: `src/services/validator/index.js (verifyUnity, getBenchmarkCriteria, mock criteria)`.
   - In the existing codebase, `getBenchmarkCriteria` and mock candidate presets are defined and exported in `fixtures/mock-criteria.js`, not `src/services/validator/index.js`.
   - `src/services/validator/index.js` currently exports `verifyUnity`, `evaluateCandidateEligibility`, `formatUnityReport`, `printUnityReport`, `rules`.
   - For `parse-demo.js`, the builder should import `getBenchmarkCriteria` from `./fixtures/mock-criteria`. The builder could also optionally re-export `getBenchmarkCriteria` from `src/services/validator/index.js` for convenience.
2. **Whole Word Keyword Matching on Plural Forms**:
   - `compileKeywords` in `pdf-extractor.js` uses `\b` word boundaries by default. Keywords such as `'age limit'` do not match `'Age Limits'`. The default keyword list in `parse-demo.js` should specify `'age limits'` or `'age'` to ensure page 2 is matched reliably.
3. **Live Gemini API Quotas**:
   - In live mode (`--live` or when `GEMINI_API_KEY` is supplied), network or quota errors could occur. Setting `fallbackToMockOnError: true` in `parseStructuredCriteria` ensures the demo script always succeeds even if live API limits are hit.

---

## 4. Conclusion & Recommended Architecture for `parse-demo.js`

### 4.1 Recommended CLI Design Specification
The `parse-demo.js` CLI runner should be designed with the following structure:

```
parse-demo.js [options]

Options:
  --pdf <path>          Path to notification PDF (default: fixtures/sample-notification.pdf)
  --mock                Force offline mock extraction (default when GEMINI_API_KEY is absent)
  --live                Force live Gemini API extraction (fails if key absent)
  --key <api_key>       Supply Gemini API key directly via CLI
  --model <model>       Gemini model name (default: gemini-2.5-flash)
  --preset <name>       Database criteria benchmark: UPSC | SSC | IBPS | TECH (default: UPSC)
  --candidate <id>      Candidate profile to evaluate (default: FULLY_QUALIFIED_GENERAL)
  --all-candidates      Run batch eligibility test across all 15 mock candidate profiles
  --keywords <list>     Comma-separated search keywords
  --no-color            Disable terminal ANSI colors
  --json                Output full pipeline JSON envelope instead of visual dashboard
  -h, --help            Show CLI usage instructions and exit
```

### 4.2 End-to-End Pipeline Execution Flow (4 Stages)
1. **Header & Environment Stage**:
   - Read `.env` via `require('dotenv').config()`.
   - Inspect `process.env.GEMINI_API_KEY` and CLI flags.
   - Display banner with Mode indicator: `[ LIVE GEMINI (gemini-2.5-flash) ]` or `[ OFFLINE MOCK MODE (Deterministic Engine) ]`.
   - Verify zero external service guarantee: display `External Services: NONE (Zero Firestore, Zero Resend/Email)`.
2. **Stage 1: Targeted PDF Extraction**:
   - Call `extractTargetedPdfText(pdfPath, { keywords, contextBefore: 1, contextAfter: 1 })`.
   - Render **Token & Character Reduction Dashboard**:
     ```
     ================================================================================
                     STAGE 1: TARGETED PDF EXTRACTION & REDUCTION
     ================================================================================
     Target PDF File       : fixtures/sample-notification.pdf
     Total Document Pages  : 4 pages
     Matched Pages         : [ Page 2, Page 4 ] (2 pages retained, 2 pages noise-filtered)
     Sentences Extracted   : 14 sentences
     
     Metric                Raw PDF Document      Targeted Extract      Savings
     --------------------------------------------------------------------------------
     Character Count       6,593 chars           1,720 chars           -73.9%
     Word Count            972 words             278 words             -71.4%
     Estimated Tokens      1,649 tokens          430 tokens            -73.9% (1,219 tokens saved)
     
     >>> EFFICIENCY VERDICT: [ 73.9% TOKEN REDUCTION ACHIEVED ]
     ================================================================================
     ```
3. **Stage 2: Gemini Structured AI Extraction**:
   - Call `parseStructuredCriteria(pdfResult.targetedText, { apiKey, model, mockMode, fallbackToMockOnError: true })`.
   - Render structured JSON criteria or formatted property table:
     - Exam: Organization, Title, Status
     - Eligibility: Min Age, Max Age, Category Relaxations, Education, Streams
     - Dates: Application Window, Exam Date
     - Vacancies & Application Fees
4. **Stage 3 & 4: Unity Verification & Candidate Assessment**:
   - Retrieve preset via `getBenchmarkCriteria(presetName)`.
   - Attach candidate profile: `criteria.candidate = candidateProfile`.
   - Call `verifyUnity(aiResult.data, criteria)`.
   - Call `printUnityReport(unityResult, { color: !noColor })`.
5. **Exit Code**:
   - Exit with `0` on `PASS` or `WARNING`.
   - Exit with `1` on `FAIL` or unexpected runtime error.

---

## 5. Verification Method

To independently verify the pipeline integration and all claims in this report, run the following commands:

1. **Verify Entire Existing Test Suite (189 tests across PDF, AI, and Validator)**:
   ```bash
   npm test
   ```
   *Expected Output*: 189 passing tests, 0 failures, duration < 1.5s.

2. **Verify End-to-End Extraction, Reduction, Parsing, and Unity Verification**:
   ```bash
   node -e "
     const path = require('path');
     const { extractTargetedPdfText } = require('./src/services/pdf');
     const { parseStructuredCriteria } = require('./src/services/ai');
     const { verifyUnity, formatUnityReport } = require('./src/services/validator');
     const { getBenchmarkCriteria, MOCK_CANDIDATES } = require('./fixtures/mock-criteria');

     (async () => {
       const pdfPath = path.join(__dirname, 'fixtures/sample-notification.pdf');
       const keywords = ['minimum age', 'Bachelor', 'vacancies', 'last date', 'application fee'];
       
       // 1. PDF Extraction
       const pdfRes = await extractTargetedPdfText(pdfPath, { keywords, contextBefore: 1, contextAfter: 1 });
       console.log('PDF Reduction:', pdfRes.extractedStats.reductionPercentage + '%');
       console.log('Tokens Saved:', pdfRes.rawStats.estimatedRawTokens - pdfRes.extractedStats.estimatedTokens);
       
       // 2. AI Parsing (Offline Mock)
       const aiRes = await parseStructuredCriteria(pdfRes.targetedText, { mockMode: true });
       console.log('AI Extraction Status:', aiRes.success, 'isMock:', aiRes.isMock);
       
       // 3. Unity Verification
       const criteria = getBenchmarkCriteria('UPSC');
       criteria.candidate = MOCK_CANDIDATES.FULLY_QUALIFIED_GENERAL;
       const unityRes = verifyUnity(aiRes.data, criteria);
       
       console.log('Unity Verdict:', unityRes.overallVerdict);
       console.log('Pass Rate:', unityRes.summary.passRate + '%');
       console.log('Candidate Status:', unityRes.candidateEligibility.isEligible ? 'ELIGIBLE' : 'DISQUALIFIED');
     })();
   "
   ```
   *Expected Output*:
   - `PDF Reduction: ~66-78%`
   - `AI Extraction Status: true isMock: true`
   - `Unity Verdict: PASS`
   - `Pass Rate: 100%`
   - `Candidate Status: ELIGIBLE`

3. **Verify Zero External Service Guarantee (Absence of Firestore & Resend in Core Modules)**:
   ```bash
   node -e "
     const fs = require('fs');
     const files = [
       './src/services/pdf/index.js',
       './src/services/pdf/pdf-extractor.js',
       './src/services/ai/index.js',
       './src/services/ai/gemini-parser.js',
       './src/services/validator/index.js',
       './src/services/validator/unity-checker.js',
       './fixtures/mock-criteria.js'
     ];
     let violations = 0;
     for (const f of files) {
       const content = fs.readFileSync(f, 'utf8');
       if (/firestore|firebase|resend/i.test(content)) {
         console.error('VIOLATION in', f);
         violations++;
       }
     }
     if (violations === 0) console.log('CLEAN: Zero Firestore and Zero Resend dependencies in core pipeline!');
   "
   ```
   *Expected Output*: `CLEAN: Zero Firestore and Zero Resend dependencies in core pipeline!`

### Invalidation Conditions
- If `extractTargetedPdfText` fails to exclude pages 1 and 3 on `sample-notification.pdf`.
- If `parseStructuredCriteria` throws an error when `process.env.GEMINI_API_KEY` is not present.
- If `verifyUnity` fails to process the output of `parseStructuredCriteria` directly.
- If any Firestore, Firebase, or Resend module is required to execute `parse-demo.js`.
