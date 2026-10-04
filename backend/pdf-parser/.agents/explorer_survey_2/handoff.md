# Handoff Report: Targeted PDF Parsing Architecture (Requirement 1)

> **Agent**: `explorer_survey_2`  
> **Target**: `teamwork_preview_orchestrator_1` (Conversation ID: `338ef4f2-0160-49fd-b08e-065ac5edfe72`)  
> **Working Directory**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\explorer_survey_2`  
> **Report Artifact**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\explorer_survey_2\survey_pdf.md`  

---

## 1. Observation

1. **User Request & Requirements**:
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md`, lines 18–20:
     > *"### R1. Targeted PDF Parsing*  
     > *Create a utility that reads a PDF file but does not just dump the entire text. It must be able to search the PDF for specific keywords and extract only the relevant pages or sentences containing those keywords to minimize token usage and noise."*
2. **Node.js Environment**:
   - Executed `node -v` in `c:\Users\sindh\Documents\codes\mypath-scraper`:
     ```
     v24.13.0
     ```
   - `package.json` specifies CommonJS by default (no `"type": "module"`), with dependencies `"cheerio": "^1.2.0"`, `"dotenv": "^17.4.2"`, `"resend": "^6.26.0"`.
3. **Library Ecosystem Status**:
   - `npm view unpdf --json` (v1.8.1): Engine `>=22`, exports `./dist/index.cjs` and `./dist/index.mjs`, bundles serverless `pdfjs-dist` with inlined worker, optional `@napi-rs/canvas` peer dependency (not needed for text extraction). Exposes `extractText(data, { mergePages: false })` returning `{ totalPages: number, text: string[] }`.
   - `npm view pdf-parse --json` (v2.4.5): Completely rewritten in TypeScript in late 2025 by Mehmet Kozan. Hard dependencies on `@napi-rs/canvas: 0.1.80` and `pdfjs-dist: 5.4.296`. Breaking class-based API (`new PDFParse(...)`). Classic v1.1.1 is unmaintained since 2020 and requires custom `pagerender` callback to extract page-by-page.
   - `npm view pdfjs-dist --json` (v6.3.289): Pure ESM in modern builds, requiring `GlobalWorkerOptions` configuration or legacy non-worker imports.
   - `npm view pdf2json --json` (v4.1.0): Event-driven callback AST, URL-encoded text glyphs, heavy geometric stitching needed to reconstruct sentences.
4. **Sentence Segmentation Behavior in V8/Node 24**:
   - Ran test on native `Intl.Segmenter('en', { granularity: 'sentence' })`:
     - Text: `'Mr. Smith visited the office on Jan. 15. The fee is 500 dollars. Is it true? Yes, it is.'`
     - Result: `["Mr.", "Smith visited the office on Jan.", "15.", "The fee is 500 dollars.", "Is it true?", "Yes, it is."]`
     - Observed premature fragmentation on common abbreviations (`"Mr."` and `"Jan. 15."`).
   - Ran test on custom 7-step abbreviation-aware segmenter (`.agents/explorer_survey_2/test-segment.js`):
     - Output kept `"Govt. of India"`, `"(e.g. B.Tech/B.E.)"`, `"31st Dec. 2026."`, `"01.01.2026."`, and `"Rs. 500"` intact as complete coherent sentences.
5. **Empirical Token Reduction**:
   - Ran multi-page recruitment notice simulation (`.agents/explorer_survey_2/test-segment.js`):
     - Full Document: 2,359 characters (342 words, ~455 tokens)
     - Page Mode: 804 characters (126 words, ~168 tokens) -> **65.9% reduction**
     - Sentence Mode with Context (1 before, 1 after): 597 characters (101 words, ~135 tokens) -> **74.7% reduction**
     - Strict Sentence Mode (0 context): 444 characters (73 words, ~98 tokens) -> **81.2% reduction**

---

## 2. Logic Chain

1. From **Observation 1 & 2**, the requirement demands a standalone Node.js (v24) utility that extracts targeted pages or sentences by keyword to minimize tokens sent to the Gemini API.
2. From **Observation 3**, comparing `unpdf`, `pdf-parse`, `pdfjs-dist`, and `pdf2json`:
   - `pdf-parse` v1 is deprecated/unmaintained and requires hacks (`pagerender` callback accumulation); `pdf-parse` v2 introduces native C++ canvas dependencies (`@napi-rs/canvas`) which risk Windows installation failures.
   - `pdfjs-dist` requires manual worker file configuration or dynamic ESM import wrapping.
   - `pdf2json` adds unnecessary AST overhead and URL decoding.
   - `unpdf` cleanly bundles `pdfjs-dist` with inlined workers, zero native dependencies, native page-by-page array extraction (`mergePages: false`), and dual ESM/CJS exports. Therefore, `unpdf` is the optimal foundation.
3. From **Observation 4**, standard `Intl.Segmenter` shatters sentences containing abbreviations, titles, and dates. Therefore, a custom text normalizer with an abbreviation protection mask (`Govt.`, `Mr.`, `Dr.`, `e.g.`, `i.e.`, `Rs.`, `Jan.`) must precede sentence boundary splitting.
4. From **Observation 5**, sentence-level extraction with context windowing (`contextBefore: 1, contextAfter: 1`) provides 74.7%–81.2% token reduction while preserving crucial heading context and condition antecedents. Merging overlapping context intervals avoids sentence duplication.
5. Therefore, structuring the module using an Adapter Pattern (`TargetedPdfParser` -> `IPdfExtractor` / `UnpdfExtractor` / `MockPdfExtractor`) provides testability, zero coupling, and clean execution for Milestone 1.

---

## 3. Caveats

- **Scanned/Image PDFs**: `unpdf` (and all text-based PDF parsers) extracts text layers from vector/digital PDFs. Scanned image-only PDFs without an embedded OCR text layer will return empty strings and require OCR (which is out of scope for standard text PDFs).
- **Tabular Data**: Multi-column tables in PDFs can interleave text across columns if read purely sequentially. `extractTextItems` in `unpdf` provides x/y coordinates if tabular reading order reconstruction is needed in the future.
- **Node.js Version**: `unpdf` requires Node >= 22. This is satisfied by the local environment (`v24.13.0`), but any deployment container must run Node 22+.

---

## 4. Conclusion

1. **Adopt `unpdf` (v1.8.x)** as the PDF extraction library. It provides native page-by-page text extraction without native compilation or worker setup.
2. **Implement Hybrid Sentence-Level Filtering with Context Windowing** (`contextBefore: 1, contextAfter: 1`), achieving >75% token reduction while safeguarding sentence semantics.
3. **Use the 7-stage abbreviation-aware sentence boundary detection algorithm** to prevent text fragmentation.
4. **Implement Adapter Pattern (`IPdfExtractor`)** with `UnpdfExtractor` for production and `MockPdfExtractor` for unit tests.
5. **Generate a 4-page test PDF fixture** using `pdf-lib` (positive keywords on Page 2 and 4, negative controls on Page 1 and 3) to verify both positive and negative filtering.

Full technical survey report is documented at:  
`c:\Users\sindh\Documents\codes\mypath-scraper\.agents\explorer_survey_2\survey_pdf.md`.

---

## 5. Verification Method

To verify these findings and reproduce the algorithmic metrics independently:

1. **Inspect Survey Report**:
   ```bash
   cat c:\Users\sindh\Documents\codes\mypath-scraper\.agents\explorer_survey_2\survey_pdf.md
   ```
2. **Run the Sentence Segmentation and Token Reduction Simulation**:
   ```powershell
   node c:\Users\sindh\Documents\codes\mypath-scraper\.agents\explorer_survey_2\test-segment.js
   ```
   - Verify that output demonstrates:
     - Abbreviation preservation (`Govt. OF INDIA`, `(e.g. B.Tech/B.E.)`, `31st Dec. 2026.`, `Rs. 500`).
     - Page Mode reduction = `65.9%`.
     - Sentence Mode reduction = `74.7%` (with context 1) and `81.2%` (strict).
3. **Verify `unpdf` package metadata**:
   ```powershell
   npm view unpdf versions engines exports main --json
   ```
   - Verify `engines.node` is `>=22` and `exports` includes both CommonJS (`./dist/index.cjs`) and ESM.

### Invalidation Conditions
- If the target PDFs are non-OCR scanned images, direct text extraction will yield empty text.
- If Node.js is downgraded below version 22, `unpdf` will not run without polyfills.
