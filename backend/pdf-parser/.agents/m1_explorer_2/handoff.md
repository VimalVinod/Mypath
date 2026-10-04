# Handoff Report: PDF Adapter Subsystem Architecture & Installation Strategy

> **Author**: `m1_explorer_2` (Teamwork Explorer)  
> **Target Path**: `src/services/pdf/adapters/` & `src/services/pdf/index.js`  
> **Deliverable Plan**: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_2\plan_adapters.md`  
> **Status**: Complete (Hard Handoff)  

---

## 1. Observation

1. **Environment State**:
   - Command: `node -v; npm -v`
   - Output: `v24.13.0`, `11.6.2` (Windows x64).
2. **Current `package.json`**:
   - Inspected `c:\Users\sindh\Documents\codes\mypath-scraper\package.json`:
     ```json
     "dependencies": {
       "cheerio": "^1.2.0",
       "dotenv": "^17.4.2",
       "resend": "^6.26.0"
     }
     ```
   - Neither `unpdf` nor `pdf-lib` is currently declared or installed in root `package.json`.
3. **`unpdf` Package Metadata & Engine Requirements**:
   - Command: `npm info unpdf version engines peerDependencies peerDependenciesMeta`
   - Output:
     ```
     version = '1.8.1'
     engines = { node: '>=22' }
     peerDependencies = { '@napi-rs/canvas': '^0.1.69 || ^1.0.0' }
     peerDependenciesMeta = { '@napi-rs/canvas': { optional: true } }
     ```
   - Exports map:
     ```javascript
     exports: {
       '.': {
         import: { types: './dist/index.d.mts', default: './dist/index.mjs' },
         require: { types: './dist/index.d.cts', default: './dist/index.cjs' }
       }
     }
     ```
   - Runtime dependencies: `dependencies: {}` (zero external dependencies). Inlines the serverless Mozilla `pdfjs-dist` core compiled with Rolldown.
4. **`pdf-lib` Package Metadata**:
   - Command: `npm info pdf-lib version engines dependencies`
   - Output:
     ```
     version = '1.17.1'
     dependencies = { '@pdf-lib/standard-fonts': '^1.0.0', '@pdf-lib/upng': '^1.0.1', pako: '^1.0.11', tslib: '^1.11.1' }
     ```
5. **Node 24 Empirical Execution Tests**:
   - CommonJS loading test:
     `const unpdf = require('./.agents/m1_explorer_2/package/dist/index.cjs');` loaded with zero errors on Node 24.13.0.
   - Buffer vs. Uint8Array test:
     Passing a native Node `Buffer` directly to `unpdf.extractText(buffer)` produced:
     `Error: Please provide binary data as 'Uint8Array', rather than 'Buffer'.`
     Passing `new Uint8Array(buffer)` successfully invoked PDF.js.
   - Error behavior on invalid / empty Uint8Array:
     - Empty buffer: throws `InvalidPDFException | The PDF file is empty, i.e. its size is zero bytes.`
     - Non-PDF buffer (`hello world`): throws `InvalidPDFException | Invalid PDF structure.`
   - Minimal single-page PDF test:
     `extractText(uint8, { mergePages: false })` returned `{"totalPages": 1, "text": [""]}` for an empty page.

---

## 2. Logic Chain

1. **Package Installation Safety** (derived from Observations 2, 3, 4):
   - `package.json` currently has `cheerio`, `dotenv`, and `resend`.
   - Running `npm install unpdf pdf-lib` (or `npm install unpdf@^1.8.1 pdf-lib@^1.17.1`) cleanly appends `unpdf` and `pdf-lib` to `"dependencies"` without removing or modifying existing entries.
   - `unpdf` has zero runtime dependencies, preventing version collisions. `pdf-lib` brings pure JS helpers (`pako`, `tslib`, `@pdf-lib/standard-fonts`, `@pdf-lib/upng`) with no conflicts against `cheerio` or `dotenv`.
   - Node engine requirement (`>=22`) is satisfied by Node `v24.13.0`.
   - Optional peer dependency `@napi-rs/canvas` prevents npm from requiring C++ build tools on Windows.

2. **Binary Conversion Requirement in `unpdf-adapter.js`** (derived from Observation 5):
   - Because `unpdf` explicitly rejects Node `Buffer` with `Error: Please provide binary data as 'Uint8Array', rather than 'Buffer'`, the adapter MUST convert any `Buffer` to `Uint8Array` before passing to `unpdf`:
     `new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)`.
   - File paths must be resolved, checked with `fs.promises.stat` for existence and non-zero size, and read via `fs.promises.readFile` before converting to `Uint8Array`.

3. **Standard Output Structure Compliance** (derived from Requirement & Observation 5):
   - Calling `extractText(uint8, { mergePages: false })` yields `{ totalPages: number, text: string[] }`.
   - Mapping `text.map((t, i) => ({ pageNumber: i + 1, text: t || '' }))` guarantees the exact contract requested:
     `{ totalPages: number, pages: Array<{ pageNumber: number, text: string }> }`.
   - Empty pages (such as blank pages or scanned images without OCR) return `""` rather than throwing or producing undefined, cleanly populating `emptyPages: [pageNum]`.

4. **In-Memory Mock Adapter (`mock-adapter.js`)** (derived from testing requirements):
   - Fast unit tests need zero disk I/O and deterministic outputs.
   - `MockPdfAdapter` implements the identical `extractPages` / `extractText` contract, accepting mock page strings/objects, supporting error injection (`setSimulateError`), and tracking call history.

5. **Export & Wiring (`src/services/pdf/index.js`)**:
   - `createPdfAdapter(typeOrInstance, options)` acts as a polymorphic factory: accepts string name (`'unpdf'`, `'mock'`) or an existing adapter instance (for dependency injection during tests).
   - Downstream extractor (`pdf-extractor.js`) calls `adapter.extractPages(input, options)` to obtain standardized page arrays.

---

## 3. Caveats

1. **Scanned Documents (OCR)**:
   - `unpdf` only extracts digital text streams embedded in PDFs. If a PDF consists exclusively of scanned raster images without embedded OCR text, `unpdf` returns empty strings (`""`) for those pages. The adapter flags these in `emptyPages` and sets `hasText: false`. OCR capabilities (e.g. Tesseract) are outside the scope of Milestone 1.
2. **Password Protected PDFs**:
   - Encrypted PDFs without a provided password will throw `ENCRYPTED_PDF`. The pipeline is designed to catch and report this error clearly.
3. **`pdf-lib` Usage Scope**:
   - `pdf-lib` is primarily needed for programmatic generation of test fixtures (`fixtures/generate-sample-pdf.js`). While `unpdf` is used in production extraction, having both in `dependencies` avoids missing-module issues in standalone CLI execution.

---

## 4. Conclusion

1. The dependency strategy `npm install unpdf pdf-lib` is 100% verified on Node v24.13.0 and Windows x64.
2. `UnpdfAdapter` must convert input buffers to `Uint8Array` using `new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)` to avoid PDF.js buffer rejection.
3. Both `UnpdfAdapter` and `MockPdfAdapter` output the strict required structure:
   `{ totalPages: number, pages: Array<{ pageNumber: number, text: string }> }`.
4. The complete implementation code and error handling design are finalized in `plan_adapters.md`.

---

## 5. Verification Method

To verify the design independently:
1. **Package Installation Check**:
   ```bash
   npm install unpdf pdf-lib
   node -e "require('unpdf'); require('pdf-lib'); console.log('Dependencies load OK');"
   ```
2. **Adapter Unit & Integration Tests**:
   Run the test suite that implements the cases from `plan_adapters.md` §8:
   ```bash
   node --test test/pdf-adapters.test.js
   ```
3. **Inspect Output Files**:
   - Blueprint: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_2\plan_adapters.md`
   - Progress: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_2\progress.md`
   - Handoff: `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_explorer_2\handoff.md`
