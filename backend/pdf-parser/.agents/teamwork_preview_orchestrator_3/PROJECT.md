# Project: PDF Parsing and Validation Pipeline

## Architecture
The system is a standalone Node.js (CommonJS) backend pipeline that extracts targeted content from PDF documents, leverages the Gemini API (`@google/genai`) to parse structured criteria, and validates the criteria against database benchmarks using a deterministic unity-checking engine.

### High-Level Data Flow:
```
[PDF Document (file / buffer)]
       │
       ▼
[Targeted PDF Parser (unpdf / adapter)]
  - Page-level keyword filtering
  - 7-stage abbreviation-aware sentence segmentation
  - Context windowing (before/after sentences)
       │ (Reduced targeted text ~75-80% token savings)
       ▼
[Gemini Extraction Client (@google/genai)]
  - GoogleGenAI SDK client initialization
  - Structured JSON Schema (Type.OBJECT)
  - Grounded extraction prompt (zero hallucination, null fallbacks)
  - Offline Mock Mode fallback when GEMINI_API_KEY absent
       │ (Structured JSON Exam/Criteria Object)
       ▼
[Unity / Database Checking Engine]
  - Declarative validation rules (required, enum, range, min/max, dates)
  - Candidate qualification matching (age, education, stream)
  - Field-by-field verification matrix & diff explanation
       │
       ▼
[Standalone CLI Runner (parse-demo.js)]
  - Beautiful formatted console dashboard (extraction stats, Gemini output, unity verdict)
  - Standalone execution: Zero Firestore, zero Resend/email dependencies
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dependency & Fixture Foundation | Install `@google/genai`, `unpdf` (or `pdf-parse`), `pdf-lib` for fixtures; configure environment and package scripts | M1 | ORIGINAL_REQUEST §R1, R4 |
| 2 | Page-Level Keyword Filtering | Extract only pages containing specified keywords to avoid parsing irrelevant pages | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Abbreviation-Aware Sentence Segmentation | Segment page text into sentences while protecting abbreviations (`Govt.`, `Mr.`, `Rs. 500`, `Jan. 15.`) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Sentence-Level Keyword Extraction & Context Windowing | Extract only keyword-matched sentences plus configurable context window (1 before, 1 after) | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Token & Reduction Metrics Calculator | Calculate character, word, and estimated token savings between raw PDF and targeted extract | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Gemini SDK Client Initialization | Initialize official `@google/genai` client with API key from `process.env.GEMINI_API_KEY` | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Structured JSON Schema Definition | Define strict JSON schema using `Type` enum from `@google/genai` for structured exam criteria | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Grounded Extraction Prompt & Execution | Prompt Gemini model to extract structured criteria from targeted text with null safety | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Gemini Offline / Mock Mode | Graceful fallback when `GEMINI_API_KEY` is missing or `--mock` flag is passed | M2 | ORIGINAL_REQUEST §R4 |
| 10 | Declarative Database Criteria Model | Predefined schema rules & candidate qualification benchmarks (age, education, stream, fee, dates) | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Unity Verification Engine | Rule-based engine comparing structured data against criteria (required, range, enum, date, eligibility) | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Verification Diff & Diagnostic Reporting | Detailed field-by-field match/mismatch reporting with root-cause reasons and overall verdict | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Standalone CLI Runner (`parse-demo.js`) | CLI script executing end-to-end pipeline on sample PDF with zero external cloud dependencies | M4 | ORIGINAL_REQUEST §R4 |
| 14 | Formatted Console Dashboard | Log reduction stats, extracted JSON, and unity verification matrix clearly to console | M4 | ORIGINAL_REQUEST §R4 |
| 15 | Multi-Tier E2E Testing Suite | Comprehensive test suite (Tiers 1-4: Unit, boundary, combination, and realistic multi-page PDFs) | M5 | ORIGINAL_REQUEST §Acceptance |
| 16 | Adversarial Stress & Hardening (Tier 5) | Adversarial coverage testing for malformed PDFs, missing fields, extreme boundaries, and edge cases | M5 | Project Pattern Tier 5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Targeted PDF Parsing Module | `src/services/pdf/`: PDF text extraction, keyword search, sentence segmentation with context, token metrics, test fixture generator | none | DONE (40/40 unit tests pass, 29/29 challenger tests pass) |
| M2 | Gemini API Integration Module | `src/services/ai/`: Official `@google/genai` SDK integration, structured JSON schema, prompt engineering, mock fallback | M1 | DONE (129/129 unit tests pass, 34/34 challenger 1 pass, 58/58 challenger 2 pass, 30/30 deep stress pass; auditor CLEAN) |
| M3 | Unity / Database Checking Module | `src/services/validator/`: Database criteria rules, unity comparison engine, diff diagnostic generator | M2 | DONE (189/189 npm test pass, 45/45 challenger 1 pass, 65/65 challenger 2 pass; auditor CLEAN) |
| M4 | Standalone Execution & Demo | `parse-demo.js`: End-to-end integration, console formatting dashboard, zero Firestore/email dependencies | M1, M2, M3 | DONE (213/213 npm test pass, 36/36 challenger pass; reviewer APPROVE; auditor CLEAN) |
| M5 | E2E Testing & Hardening | `test/`: Tiers 1-4 opaque-box test suite + Tier 5 adversarial coverage hardening | M1, M2, M3, M4 | DONE (251/251 npm test pass across 39 suites, 38/38 E2E tests pass; reviewer APPROVE; final auditor CLEAN) |

## Interface Contracts

### 1. PDF Extractor ↔ Pipeline
- **Function**: `extractTargetedPdfText(input, options)`
- **Input**:
  - `input`: `string` (file path) or `Buffer`
  - `options`:
    - `keywords`: `string[]` (e.g. `['eligibility', 'age limit', 'qualification', 'fee', 'vacancy']`)
    - `contextBefore`: `number` (default: 1)
    - `contextAfter`: `number` (default: 1)
    - `mode`: `'sentence'` | `'page'` (default: `'sentence'`)
- **Output**:
  ```javascript
  {
    success: boolean,
    rawStats: { totalPages: number, rawCharCount: number, rawWordCount: number, estimatedRawTokens: number },
    extractedStats: { matchedPages: number[], sentenceCount: number, extractedCharCount: number, extractedWordCount: number, estimatedTokens: number, reductionPercentage: number },
    targetedText: string,
    sections: Array<{ pageNumber: number, sentences: string[] }>
  }
  ```

### 2. Gemini Parser ↔ Pipeline
- **Function**: `parseStructuredCriteria(targetedText, options)`
- **Input**:
  - `targetedText`: `string`
  - `options`:
    - `apiKey`: `string` (optional, falls back to `process.env.GEMINI_API_KEY`)
    - `model`: `string` (default: `'gemini-2.5-flash'`)
    - `mockMode`: `boolean` (default: false, auto-true if key absent)
- **Output**:
  ```javascript
  {
    success: boolean,
    isMock: boolean,
    modelUsed: string,
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
      applicationFee: {
        general: number | null,
        reserved: number | null
      },
      status: string
    },
    rawResponse?: any,
    error?: string
  }
  ```

### 3. Unity Checker ↔ Pipeline
- **Function**: `verifyUnity(extractedData, databaseCriteria)`
- **Input**:
  - `extractedData`: Object matching Gemini parser output `data`
  - `databaseCriteria`: Benchmark rules & candidate profile
- **Output**:
  ```javascript
  {
    overallVerdict: 'PASS' | 'FAIL' | 'WARNING',
    summary: { totalChecks: number, passedChecks: number, failedChecks: number, warningChecks: number, passRate: number },
    evaluations: Array<{
      field: string,
      expected: any,
      actual: any,
      status: 'PASS' | 'FAIL' | 'WARNING',
      reason: string
    }>,
    candidateEligibility: {
      isEligible: boolean,
      disqualifications: string[],
      matchedQualifications: string[]
    }
  }
  ```

## Code Layout
- `package.json`: CommonJS root package.
- `fixtures/`:
  - `fixtures/sample-notification.pdf`: Synthetic multi-page notification PDF.
  - `fixtures/generate-sample-pdf.js`: Deterministic script to generate the sample fixture.
  - `fixtures/mock-criteria.js`: Standard benchmark database criteria & candidate profiles.
- `src/services/pdf/`:
  - `pdf-extractor.js`: Main targeted extraction API.
  - `sentence-segmenter.js`: 7-stage abbreviation-aware sentence boundary detector.
  - `adapters/unpdf-adapter.js`: `unpdf` page extraction adapter.
  - `adapters/mock-adapter.js`: Fast in-memory adapter for unit testing.
- `src/services/ai/`:
  - `gemini-parser.js`: `@google/genai` integration with structured schema.
  - `schema.js`: `@google/genai` `Type` schema definition.
  - `prompt.js`: Grounded extraction prompts.
  - `mock-gemini.js`: Offline fallback fixture generator.
- `src/services/validator/`:
  - `unity-checker.js`: Comparison engine and candidate eligibility matcher.
  - `rules.js`: Rule evaluators (min, max, range, enum, date, candidate matching).
- `parse-demo.js`: Standalone CLI runner with formatted console logging.
- `test/`:
  - `pdf-extractor.test.js`: Unit & integration tests for PDF extraction.
  - `gemini-parser.test.js`: Tests for Gemini schema, prompt, and mock mode.
  - `unity-checker.test.js`: Tests for database criteria rules and diffs.
  - `e2e-pipeline.test.js`: End-to-end integration and standalone runner tests.
