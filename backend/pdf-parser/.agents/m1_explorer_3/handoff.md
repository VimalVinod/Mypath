# Handoff Report: Fixture Generator & Unit Test Suite Design

> **Author**: `m1_explorer_3` (Teamwork Explorer)  
> **Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_3`  
> **Parent Orchestrator**: `teamwork_preview_orchestrator_1` (ID: `338ef4f2-0160-49fd-b08e-065ac5edfe72`)  
> **Date**: 2026-09-13  
> **Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

1. **User Request and R1 Core Mandate**:
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md`, lines 18–20:
     > *"R1. Targeted PDF Parsing: Create a utility that reads a PDF file but does not just dump the entire text. It must be able to search the PDF for specific keywords and extract only the relevant pages or sentences containing those keywords to minimize token usage and noise."*
   - Lines 32–33 (Acceptance Criteria):
     > *"The script successfully reads a sample PDF and extracts only the text from pages or sentences containing specified keywords."*

2. **Project Interface Contracts & Output Schema**:
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_1\PROJECT.md`, lines 66–84:
     Specifies `extractTargetedPdfText(input, options)` interface:
     - `input`: `string` (path) or `Buffer`
     - `options`: `keywords: string[]`, `contextBefore?: number`, `contextAfter?: number`, `mode?: 'sentence' | 'page'`, `adapter?: Object`
     - Output:
       ```javascript
       {
         success: boolean,
         rawStats: { totalPages: number, rawCharCount: number, rawWordCount: number, estimatedRawTokens: number },
         extractedStats: { matchedPages: number[], sentenceCount: number, extractedCharCount: number, extractedWordCount: number, estimatedTokens: number, reductionPercentage: number },
         targetedText: string,
         sections: Array<{ pageNumber: number, sentences: string[] }>
       }
       ```

3. **Test Infrastructure Specification**:
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_1\TEST_INFRA.md`, lines 26–36:
     - Test Runner: Node.js native test runner (`node --test test/*.test.js`).
     - Exit code: 0 on all tests passing, >0 on failure.
     - Fixture generation: `fixtures/generate-sample-pdf.js` generates deterministic binary PDFs with known text layers.
     - Test Tiers: Tier 1 Feature Coverage (>=5 per feature), Tier 2 Boundary & Corner Cases (>=5 per feature), Tier 3 Combinations, Tier 4 Real-World Application Scenarios (UPSC 4-page notification).

4. **Environment & Runtime Verification**:
   - Ran `node -v` command: returned `v24.13.0`.
   - Node 24 provides native `node:test` and `node:assert/strict` with zero external test runners required.
   - `package.json` specifies `"test": "node --test"`.

5. **Peer Explorer Alignment**:
   - `m1_explorer_1` designed `src/services/pdf/sentence-segmenter.js` (7-stage pipeline) and `src/services/pdf/pdf-extractor.js` in `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_1\plan_segmenter_extractor.md`.
   - `m1_explorer_2` designed `src/services/pdf/adapters/unpdf-adapter.js`, `src/services/pdf/adapters/mock-adapter.js`, and package installation in `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_2\plan_adapters.md`.

---

## 2. Logic Chain

1. **Deterministic Multi-Page Fixture with Strict Positive & Negative Controls**:
   - *From Observation 1 & 3*: Testing targeted extraction requires a realistic test document where ground truth is known with 100% certainty.
   - *Reasoning*: Using `pdf-lib` to programmatically generate a 4-page civil service recruitment notification (`fixtures/sample-notification.pdf`) allows strict page-by-page control design:
     - **Page 1 (Strict Negative Control)**: Organization headers, general disclaimers, facilitation counter. Completely omits target keywords (`eligibility`, `age`, `qualification`, `fee`, `vacancy`).
     - **Page 2 (Positive Control - Eligibility & Age)**: Section II detailing Age Limits (21 to 32 years), Age Relaxation (SC/ST 5 years, OBC 3 years), and Educational Qualifications (Bachelor's degree in any discipline).
     - **Page 3 (Strict Negative Control)**: Section III detailing examination centers and preliminary exam syllabus. Zero target keywords.
     - **Page 4 (Positive Control - Dates, Vacancies, Fees)**: Section IV detailing Important Dates (2026-01-10 to 2026-02-15), Total Vacancies (1056 posts), and Application Fee (Rs. 100 for General/OBC, Nil for SC/ST/Female).
   - *Result*: Guarantees that query `['eligibility', 'fee']` must yield `matchedPages: [2, 4]` and completely exclude Pages 1 and 3.

2. **Opaque-Box Requirement-Driven Unit & Integration Test Suite**:
   - *From Observation 2 & 3*: Tests must verify all aspects of R1 without tight coupling to internal private methods.
   - *Reasoning*: Grouping tests into 9 distinct categories (34 total assertions) in `test/pdf-extractor.test.js`:
     1. Basic extraction & PROJECT.md schema compliance
     2. Page-level keyword filtering (`mode: 'page'`)
     3. Sentence-level keyword filtering (`mode: 'sentence'`)
     4. Context windowing (`contextBefore`, `contextAfter`) & overlapping interval union
     5. Token & character reduction metrics
     6. Keyword matching & sensitivity (case insensitivity, whole word boundaries, multi-word whitespace)
     7. Sentence segmentation & abbreviation preservation (`Govt.`, `Mr.`, `Rs. 100`, `01.08.2026`)
     8. Boundary & error handling (missing files, corrupt buffers, empty keywords, empty texts)
     9. Real-world multi-page fixture integration (Tier 4 end-to-end verification with `sample-notification.pdf`)
   - *Dual Execution Mode*: Unit tests use `MockPdfAdapter` for sub-millisecond execution, while Tier 4 integration tests parse the actual `sample-notification.pdf` generated by `pdf-lib`.

3. **Downstream Pipeline Interoperability (M2 Gemini & M3 Unity Checker)**:
   - *From Observation 2 & 3*: The text content generated in `generate-sample-pdf.js` must feed seamlessly into Milestone 2 (Gemini structured extraction) and Milestone 3 (Unity database checking).
   - *Reasoning*: By standardizing the exact notification figures (1056 vacancies, Rs. 100 fee, 21-32 age, Bachelor's degree, 2026-01-10 to 2026-02-15 dates) across `NOTIFICATION_DATA`, the same fixture serves as the ground-truth benchmark for all subsequent milestones.

---

## 3. Caveats

1. **`pdf-lib` Font Limitations**:
   - `pdf-lib`'s built-in `StandardFonts` (Helvetica, TimesRoman) do not embed full Unicode glyphs (e.g. non-ASCII bullet characters `\u2022` or Indian Rupee symbol `\u20B9`). To ensure 100% PDF encoding reliability and cross-platform compatibility, standard ASCII representations (e.g. `Rs. 100`, `1. `, `(A) `) are used throughout the fixture text.
2. **First Run Fixture Generation**:
   - The test suite `test/pdf-extractor.test.js` includes a `before()` hook that automatically generates `fixtures/sample-notification.pdf` if it does not already exist on disk. This prevents test failures in clean checkouts or fresh CI environments.

---

## 4. Conclusion

The design and complete implementation blueprint for both `fixtures/generate-sample-pdf.js` and `test/pdf-extractor.test.js` are fully documented in:
`c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_3\plan_fixtures_tests.md`

The deliverable provides:
1. Complete, production-grade source code for `fixtures/generate-sample-pdf.js` using `pdf-lib` to generate a 4-page realistic recruitment notification with strict positive and negative control pages.
2. Complete, production-grade source code for `test/pdf-extractor.test.js` with 34 tests covering all 9 requirement categories, runnable natively via `node --test test/pdf-extractor.test.js`.
3. Total alignment with `PROJECT.md` contracts, `m1_explorer_1` (sentence segmenter & extractor), and `m1_explorer_2` (adapters).

---

## 5. Verification Method

### How to independently verify:

1. **Inspect Blueprint File**:
   - Open and review `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_3\plan_fixtures_tests.md`.
   - Verify Section 2 (Fixture Generator code) and Section 3 (Unit Test Suite code).

2. **Execute Generation Command (Post-Implementation)**:
   ```powershell
   node fixtures/generate-sample-pdf.js
   ```
   - *Expected Output*: `fixtures/sample-notification.pdf` created, ~10-25 KB, exactly 4 pages.

3. **Execute Test Runner Command**:
   ```powershell
   node --test test/pdf-extractor.test.js
   ```
   - *Expected Output*: All 34 tests pass with exit code 0.

4. **Invalidation Conditions**:
   - Page 1 or Page 3 matches `eligibility`, `age`, `fee`, `vacancy`, or `qualification` (violating negative control contract).
   - Page 2 or Page 4 fails to match respective criteria (violating positive control contract).
   - Substring match: searching for `"age"` matches `"percentage"`.
   - Sentence segmenter splits on `"Govt."`, `"Rs. 100"`, or `"01.08.2026"`.
   - Context window creates duplicate sentences when adjacent sentences match.
   - Any test failure under `node --test`.
