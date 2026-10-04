# Architecture & Implementation Blueprint: PDF Adapter Subsystem

> **Module**: Milestone 1 — PDF Service Foundation & Architecture  
> **Author**: `m1_explorer_2` (Teamwork Explorer)  
> **Target Path**: `src/services/pdf/adapters/` & `src/services/pdf/index.js`  
> **Environment**: Node.js v24.13.0, npm 11.6.2, Windows x64  

---

## 1. Executive Summary & Adapter Strategy

The PDF adapter subsystem abstracts the underlying PDF extraction engine behind a unified, pluggable contract. This enables:
1. **Production extraction** powered by `unpdf` (v1.8.x), providing zero-native-dependency, inlined-worker PDF text extraction on Node 24 CommonJS.
2. **Deterministic, sub-millisecond unit testing** powered by `MockPdfAdapter`, eliminating disk I/O and file fixtures during core test runs.
3. **Strict standardized output**: `{ totalPages: number, pages: Array<{ pageNumber: number, text: string }> }`, guaranteeing consistent data structures for downstream sentence segmentation, keyword filtering, and Gemini prompt preparation.

---

## 2. Package Installation & Node 24 Compatibility Strategy

### 2.1 Existing Dependencies & Installation Command

Current `package.json`:
```json
{
  "name": "mypath-scraper",
  "version": "1.0.0",
  "dependencies": {
    "cheerio": "^1.2.0",
    "dotenv": "^17.4.2",
    "resend": "^6.26.0"
  }
}
```

#### Recommended Command:
```bash
npm install unpdf pdf-lib
```
Or with explicit semver pin:
```bash
npm install unpdf@^1.8.1 pdf-lib@^1.17.1
```

#### Dependency Breakdown:
- **`unpdf`** (`^1.8.1`): Production dependency (`dependencies`). Required at runtime by `src/services/pdf/adapters/unpdf-adapter.js`.
- **`pdf-lib`** (`^1.17.1`): Synthetic PDF fixture generator dependency (`dependencies` or `devDependencies`). Used by `fixtures/generate-sample-pdf.js` to build reproducible multi-page test PDFs.

#### Why Existing Dependencies Remain Intact:
1. `npm install <pkg>` cleanly appends new packages into the `"dependencies"` object without altering `"cheerio"`, `"dotenv"`, or `"resend"`.
2. Package namespace separation:
   - `unpdf` has **zero external runtime dependencies** (`"dependencies": {}` in its package manifest). It bundles its rolldown-compiled Mozilla PDF.js core.
   - `pdf-lib` relies on pure JavaScript packages (`pako`, `tslib`, `@pdf-lib/standard-fonts`, `@pdf-lib/upng`) with no version clashes with `cheerio` or `dotenv`.

---

### 2.2 Node.js 24 Compatibility Matrix

| Dimension | `unpdf` (v1.8.1) | `pdf-lib` (v1.17.1) | Verified Status on Node v24.13.0 |
| :--- | :--- | :--- | :--- |
| **Engine Requirement** | `engines: { "node": ">=22" }` | `engines: { "node": ">=8" }` | **100% Passed** (`v24.13.0` satisfies `>=22`) |
| **Build Target** | Built with Node `24.18.0` | Pure ES5/ES6 JS bundle | **Native match** |
| **Module Resolution** | Dual ESM (`.mjs`) & CJS (`.cjs`) | CommonJS (`cjs/index.js`) | **Native match** (`require('unpdf')` resolves cleanly) |
| **Worker Threads** | Inlined for serverless / Node | Not applicable (pure JS) | **Zero worker configuration required** |
| **Native C++ Compilers** | Zero native dependencies (`@napi-rs/canvas` is optional) | Pure JavaScript | **Zero C++ / node-gyp build tools needed** |
| **Binary Buffer Protocol** | Requires `Uint8Array` | Accepts `Uint8Array` / `ArrayBuffer` | **Requires explicit `Uint8Array` conversion** (see §2.3) |

---

### 2.3 Critical Node 24 Empirical Finding: The Buffer vs. Uint8Array Requirement

During empirical testing on Node v24.13.0, passing a raw Node.js `Buffer` directly to `unpdf.extractText(data)` resulted in the following error:
```
Error: Please provide binary data as `Uint8Array`, rather than `Buffer`.
```

#### Cause:
Although Node `Buffer` is an instance of `Uint8Array`, Mozilla PDF.js internally performs strict type checking:
```js
if (data instanceof Buffer) {
  throw new Error('Please provide binary data as `Uint8Array`, rather than `Buffer`.');
}
```

#### Adapter Solution:
In `unpdf-adapter.js`, all input buffers (whether read from disk via `fs.promises.readFile` or passed as a `Buffer` parameter) **must be converted** to a pure `Uint8Array`:
```javascript
const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
```
Using `buffer.buffer, buffer.byteOffset, buffer.byteLength` ensures zero-copy conversion and correctly respects sliced buffers from Node's internal buffer pool.

---

## 3. Standard Interface Contract

Every PDF adapter (whether `UnpdfAdapter`, `MockPdfAdapter`, or any future engine) must strictly adhere to the following interface:

### 3.1 Method Signatures
```typescript
interface IPdfAdapter {
  extractPages(
    input: string | Buffer | Uint8Array,
    options?: AdapterOptions
  ): Promise<StandardPdfResult>;

  // Alias for extractPages
  extractText(
    input: string | Buffer | Uint8Array,
    options?: AdapterOptions
  ): Promise<StandardPdfResult>;
}
```

### 3.2 Output Data Structure (`StandardPdfResult`)
```javascript
{
  totalPages: 3,
  pages: [
    { pageNumber: 1, text: "Recruitment Notification 2026. General guidelines..." },
    { pageNumber: 2, text: "Eligibility: Minimum age is 21 years..." },
    { pageNumber: 3, text: "" } // Empty page preserved with empty string
  ],
  hasText: true,       // Convenience boolean: true if >= 1 page contains text
  emptyPages: [3]      // 1-indexed list of pages with no extractable text
}
```

---

## 4. `src/services/pdf/adapters/unpdf-adapter.js` Architecture

### 4.1 Responsibilities
1. **Input Normalization**:
   - Accepts absolute path, relative path, `Buffer`, or `Uint8Array`.
   - Validates existence, read permissions, and non-zero byte size.
2. **Binary Conversion**:
   - Converts file/buffer into a zero-copy `Uint8Array`.
3. **Execution**:
   - Calls `unpdf.extractText(uint8Data, { mergePages: false })`.
4. **Error Normalization**:
   - Classifies low-level PDF.js exceptions into structured application errors (`FILE_NOT_FOUND`, `EMPTY_PDF`, `INVALID_PDF`, `ENCRYPTED_PDF`).
5. **Output Standardization**:
   - Formats raw page string array into `{ totalPages, pages: [{ pageNumber, text }] }`.
   - Cleans null characters (`\0`) and normalizes line endings (`\r\n` -> `\n`).

### 4.2 Error Handling & Classification Matrix

| Trigger | Originating Condition | Thrown Error Class | Error Code | Error Message Pattern |
| :--- | :--- | :--- | :--- | :--- |
| **Missing File** | File path does not exist on disk | `PdfError` | `FILE_NOT_FOUND` | `PDF file not found or not readable: <path>` |
| **Empty File (0 Bytes)** | `stat.size === 0` | `PdfError` | `EMPTY_PDF` | `PDF file is empty (0 bytes): <path>` |
| **Empty Buffer** | `buffer.length === 0` | `PdfError` | `EMPTY_PDF` | `PDF data is empty (0 bytes)` |
| **Invalid Input Type** | Input is number, boolean, null, undefined | `PdfError` | `INVALID_INPUT_TYPE` | `Invalid input: Expected a file path string, Buffer, or Uint8Array, received <type>` |
| **Corrupted Binary** | Garbage bytes or invalid PDF header | `PdfError` | `INVALID_PDF` | `Invalid or corrupted PDF structure: <detail>` |
| **Encrypted / Password PDF** | PDF.js throws `PasswordException` | `PdfError` | `ENCRYPTED_PDF` | `PDF is encrypted or password-protected and cannot be read without credentials` |
| **Blank / Scanned Page** | Page with 0 text glyphs | None (Handled gracefully) | N/A | Page returned with `text: ""`; `pageNumber` added to `emptyPages` array |

---

### 4.3 Proposed Implementation: `unpdf-adapter.js`

```javascript
/**
 * src/services/pdf/adapters/unpdf-adapter.js
 * Production PDF extraction adapter using unpdf (v1.8.x).
 */

const fs = require('fs');
const path = require('path');
const { extractText } = require('unpdf');

class PdfError extends Error {
  constructor(message, code, cause = null) {
    super(message);
    this.name = 'PdfError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

class UnpdfAdapter {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.trimPageText=false] Whether to trim whitespace on each page
   */
  constructor(options = {}) {
    this.options = {
      trimPageText: false,
      ...options
    };
  }

  /**
   * Resolves input into a zero-copy Uint8Array.
   * @param {string|Buffer|Uint8Array} input
   * @returns {Promise<Uint8Array>}
   */
  async _resolveBinaryData(input) {
    if (input === null || input === undefined) {
      throw new PdfError('Input cannot be null or undefined', 'INVALID_INPUT_TYPE');
    }

    // Case 1: File path string
    if (typeof input === 'string') {
      const resolvedPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);

      try {
        await fs.promises.access(resolvedPath, fs.constants.R_OK);
      } catch (err) {
        throw new PdfError(`PDF file not found or not readable: ${resolvedPath}`, 'FILE_NOT_FOUND', err);
      }

      const stat = await fs.promises.stat(resolvedPath);
      if (stat.size === 0) {
        throw new PdfError(`PDF file is empty (0 bytes): ${resolvedPath}`, 'EMPTY_PDF');
      }

      const buffer = await fs.promises.readFile(resolvedPath);
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }

    // Case 2: Node.js Buffer
    if (Buffer.isBuffer(input)) {
      if (input.length === 0) {
        throw new PdfError('PDF Buffer is empty (0 bytes)', 'EMPTY_PDF');
      }
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    // Case 3: Uint8Array
    if (input instanceof Uint8Array) {
      if (input.byteLength === 0) {
        throw new PdfError('PDF Uint8Array is empty (0 bytes)', 'EMPTY_PDF');
      }
      return input;
    }

    throw new PdfError(
      `Invalid input: Expected a file path string, Buffer, or Uint8Array, received ${typeof input}`,
      'INVALID_INPUT_TYPE'
    );
  }

  /**
   * Extracts text page-by-page from the PDF input.
   * @param {string|Buffer|Uint8Array} input
   * @param {Object} [overrideOptions]
   * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }>, hasText: boolean, emptyPages: number[] }>}
   */
  async extractPages(input, overrideOptions = {}) {
    const opts = { ...this.options, ...overrideOptions };
    const uint8Data = await this._resolveBinaryData(input);

    let rawResult;
    try {
      rawResult = await extractText(uint8Data, { mergePages: false });
    } catch (err) {
      this._handleUnpdfError(err);
    }

    if (!rawResult || typeof rawResult !== 'object') {
      throw new PdfError('Unexpected null or malformed result from PDF parser', 'PARSER_FAILURE');
    }

    const totalPages = typeof rawResult.totalPages === 'number' ? rawResult.totalPages : 0;
    const rawPages = Array.isArray(rawResult.text)
      ? rawResult.text
      : (rawResult.text != null ? [rawResult.text] : []);

    const emptyPages = [];
    const pages = [];

    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      let rawText = rawPages[i];
      let pageText = typeof rawText === 'string' ? rawText : '';

      // Normalize null bytes and line breaks
      pageText = pageText.replace(/\0/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      if (opts.trimPageText) {
        pageText = pageText.trim();
      }

      if (pageText.trim().length === 0) {
        emptyPages.push(pageNum);
      }

      pages.push({
        pageNumber: pageNum,
        text: pageText
      });
    }

    return {
      totalPages,
      pages,
      hasText: emptyPages.length < totalPages,
      emptyPages
    };
  }

  /**
   * Alias for extractPages to maintain compatibility.
   */
  async extractText(input, options = {}) {
    return this.extractPages(input, options);
  }

  /**
   * Maps underlying PDF.js/unpdf errors to standardized PdfError instances.
   * @param {Error} err
   */
  _handleUnpdfError(err) {
    const message = err.message || '';
    const name = err.name || '';

    // Encrypted / password-protected PDF
    if (name === 'PasswordException' || /password/i.test(message)) {
      throw new PdfError(
        'PDF is encrypted or password-protected and cannot be read without credentials',
        'ENCRYPTED_PDF',
        err
      );
    }

    // Invalid structure / corrupt binary
    if (name === 'InvalidPDFException' || /invalid pdf/i.test(message) || /PDFHeaderVersionNotPresent/i.test(message)) {
      throw new PdfError(
        `Invalid or corrupted PDF structure: ${message}`,
        'INVALID_PDF',
        err
      );
    }

    // Zero-byte PDF rejected by PDF.js
    if (/size is zero bytes/i.test(message) || /empty/i.test(message)) {
      throw new PdfError(
        'The PDF file is empty (0 bytes)',
        'EMPTY_PDF',
        err
      );
    }

    throw new PdfError(
      `PDF extraction failed: ${message}`,
      'EXTRACTION_FAILED',
      err
    );
  }
}

module.exports = {
  UnpdfAdapter,
  PdfError
};
```

---

## 5. `src/services/pdf/adapters/mock-adapter.js` Architecture

### 5.1 Responsibilities
1. **In-Memory Operation**: Eliminates disk I/O, file locks, and PDF parsing overhead during unit and integration test runs.
2. **Configurable Page Content**: Allows passing string arrays (`['Page 1', 'Page 2']`) or structured page objects.
3. **Deterministic Fault Injection**: Allows setting simulated errors (`FILE_NOT_FOUND`, `INVALID_PDF`, `ENCRYPTED_PDF`) to test pipeline error resilience.
4. **Call Inspection & Spying**: Tracks call count, received parameters, and timestamps for assertions in test suites.
5. **Simulated Latency**: Supports `delayMs` for testing timeout handling or async responsiveness.

---

### 5.2 Proposed Implementation: `mock-adapter.js`

```javascript
/**
 * src/services/pdf/adapters/mock-adapter.js
 * In-memory mock adapter for lightning-fast unit tests.
 */

class MockPdfAdapter {
  /**
   * @param {Object} [config]
   * @param {Array<string|{ pageNumber?: number, text: string }>} [config.pages] Pre-configured pages
   * @param {number} [config.totalPages] Total pages (inferred from pages if omitted)
   * @param {Error|string} [config.simulateError] Simulated error or error code to throw
   * @param {number} [config.delayMs=0] Simulated asynchronous delay in milliseconds
   */
  constructor(config = {}) {
    this.simulateError = config.simulateError || null;
    this.delayMs = config.delayMs || 0;
    this.calls = [];
    this.setPages(config.pages || []);
    if (typeof config.totalPages === 'number') {
      this.totalPages = config.totalPages;
    }
  }

  /**
   * Updates mock pages.
   * @param {Array<string|{ pageNumber?: number, text: string }>} pages
   */
  setPages(pages = []) {
    this.mockPages = pages.map((item, index) => {
      if (typeof item === 'string') {
        return { pageNumber: index + 1, text: item };
      }
      return {
        pageNumber: typeof item.pageNumber === 'number' ? item.pageNumber : index + 1,
        text: typeof item.text === 'string' ? item.text : ''
      };
    });
    this.totalPages = this.mockPages.length;
  }

  /**
   * Configures an error to throw on the next invocation.
   * @param {Error|string|null} err
   */
  setSimulateError(err) {
    this.simulateError = err;
  }

  /**
   * Clears call history and reset errors.
   */
  reset() {
    this.calls = [];
    this.simulateError = null;
  }

  /**
   * In-memory page extraction adhering to the IPdfAdapter interface.
   * @param {string|Buffer|Uint8Array} input
   * @param {Object} [options]
   * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }>, hasText: boolean, emptyPages: number[] }>}
   */
  async extractPages(input, options = {}) {
    this.calls.push({
      input,
      options,
      timestamp: Date.now()
    });

    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    if (this.simulateError) {
      if (typeof this.simulateError === 'string') {
        const err = new Error(`Mock simulated error: ${this.simulateError}`);
        err.code = this.simulateError;
        throw err;
      }
      throw this.simulateError;
    }

    const emptyPages = this.mockPages
      .filter(p => !p.text || p.text.trim().length === 0)
      .map(p => p.pageNumber);

    return {
      totalPages: this.totalPages,
      pages: this.mockPages.map(p => ({ ...p })),
      hasText: emptyPages.length < this.totalPages,
      emptyPages
    };
  }

  /**
   * Alias for extractPages.
   */
  async extractText(input, options = {}) {
    return this.extractPages(input, options);
  }

  // --- Static Helper Factories ---

  /**
   * Instantiates a mock adapter with an array of page strings.
   * @param {string[]} pages
   * @returns {MockPdfAdapter}
   */
  static fromStrings(pages) {
    return new MockPdfAdapter({ pages });
  }

  /**
   * Instantiates a mock adapter configured to fail with a specific error code.
   * @param {string} code ('FILE_NOT_FOUND', 'INVALID_PDF', 'ENCRYPTED_PDF', etc.)
   * @returns {MockPdfAdapter}
   */
  static createFailing(code) {
    return new MockPdfAdapter({ simulateError: code });
  }

  /**
   * Instantiates a mock adapter with N blank/empty pages.
   * @param {number} [count=3]
   * @returns {MockPdfAdapter}
   */
  static empty(count = 3) {
    const pages = Array.from({ length: count }, (_, i) => ({ pageNumber: i + 1, text: '' }));
    return new MockPdfAdapter({ pages, totalPages: count });
  }
}

module.exports = {
  MockPdfAdapter
};
```

---

## 6. Export and Wiring in `src/services/pdf/index.js`

### 6.1 Wiring Strategy
`src/services/pdf/index.js` serves as the primary façade and dependency injection hub:
1. Re-exports `UnpdfAdapter`, `MockPdfAdapter`, and `PdfError`.
2. Provides a polymorphic `createPdfAdapter(typeOrInstance, options)` factory.
3. Provides `extractPdfPages(input, options)` for direct page extraction.
4. Provides `extractTargetedPdfText(input, options)` (delegating to `pdf-extractor.js`), accepting `options.adapter` for zero-friction mock injection.

### 6.2 Proposed Implementation: `src/services/pdf/index.js`

```javascript
/**
 * src/services/pdf/index.js
 * Central entry point for the PDF parsing service.
 */

const { UnpdfAdapter, PdfError } = require('./adapters/unpdf-adapter');
const { MockPdfAdapter } = require('./adapters/mock-adapter');

/**
 * Factory creating or resolving a PDF adapter instance.
 * @param {'unpdf'|'mock'|Object} [typeOrInstance='unpdf'] Adapter name or existing adapter instance
 * @param {Object} [options={}] Configuration options for the adapter
 * @returns {UnpdfAdapter|MockPdfAdapter|Object}
 */
function createPdfAdapter(typeOrInstance = 'unpdf', options = {}) {
  // If caller supplied an existing adapter instance (e.g. in a unit test)
  if (typeOrInstance && typeof typeOrInstance.extractPages === 'function') {
    return typeOrInstance;
  }

  if (typeOrInstance === 'mock') {
    return new MockPdfAdapter(options);
  }

  if (typeOrInstance === 'unpdf' || !typeOrInstance) {
    return new UnpdfAdapter(options);
  }

  throw new Error(`Unsupported PDF adapter type: "${typeOrInstance}". Valid options are "unpdf" or "mock".`);
}

/**
 * Direct page extraction utility using the configured adapter.
 * @param {string|Buffer|Uint8Array} input
 * @param {Object} [options]
 * @param {'unpdf'|'mock'|Object} [options.adapter='unpdf']
 * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }>, hasText: boolean, emptyPages: number[] }>}
 */
async function extractPdfPages(input, options = {}) {
  const adapter = createPdfAdapter(options.adapter, options);
  return adapter.extractPages(input, options);
}

module.exports = {
  // Classes
  UnpdfAdapter,
  MockPdfAdapter,
  PdfError,

  // Factories & Utilities
  createPdfAdapter,
  extractPdfPages
};
```

---

## 7. Downstream Integration with `pdf-extractor.js`

In `src/services/pdf/pdf-extractor.js` (Milestone 1, Feature 1 & 4), the pipeline integrates with the adapter via:

```javascript
const { createPdfAdapter } = require('./index');
const { segmentSentences } = require('./sentence-segmenter');
const { matchKeywords } = require('./keyword-matcher');
const { calculateMetrics } = require('./metrics');

async function extractTargetedPdfText(input, options = {}) {
  const adapter = createPdfAdapter(options.adapter, options);
  
  // Step 1: Extract pages via adapter
  const { totalPages, pages, hasText } = await adapter.extractPages(input, options);

  if (!hasText) {
    return {
      success: true,
      rawStats: { totalPages, rawCharCount: 0, rawWordCount: 0, estimatedRawTokens: 0 },
      extractedStats: { matchedPages: [], sentenceCount: 0, extractedCharCount: 0, extractedWordCount: 0, estimatedTokens: 0, reductionPercentage: 0 },
      targetedText: '',
      sections: []
    };
  }

  // Step 2: Feed pages into sentence segmentation and keyword filtering...
  // (Handled by downstream pipeline modules)
}
```

---

## 8. Unit Testing & Verification Strategy

The test suite in `test/pdf-adapters.test.js` should cover the following cases:

### 8.1 `MockPdfAdapter` Tests (Zero I/O)
1. **String Array Input**: Verify `totalPages: 3` and pages array 1-indexed.
2. **Empty Pages Detection**: Verify `emptyPages: [2]` and `hasText: true` when page 2 has `""`.
3. **All Blank Pages**: Verify `hasText: false` when all pages are `""`.
4. **Fault Injection**: Assert that `setSimulateError('ENCRYPTED_PDF')` throws expected error.
5. **Call Spying**: Assert `calls.length === 1` and `calls[0].input === 'test.pdf'`.

### 8.2 `UnpdfAdapter` Unit & Integration Tests
1. **Missing File**: Assert `extractPages('nonexistent.pdf')` rejects with `code === 'FILE_NOT_FOUND'`.
2. **Empty Buffer**: Assert `extractPages(Buffer.alloc(0))` rejects with `code === 'EMPTY_PDF'`.
3. **Invalid Input Type**: Assert `extractPages(12345)` rejects with `code === 'INVALID_INPUT_TYPE'`.
4. **Corrupted Data**: Assert `extractPages(Buffer.from('not a pdf'))` rejects with `code === 'INVALID_PDF'`.
5. **Valid Multi-Page PDF**: Generate 3-page synthetic PDF with `pdf-lib` (page 1 text, page 2 text, page 3 empty) and verify:
   - `totalPages === 3`
   - `pages[0].pageNumber === 1`, text matches page 1
   - `pages[2].pageNumber === 3`, `pages[2].text === ""`
   - `emptyPages` contains `[3]`
   - `hasText === true`

---

## 9. Next Steps for Implementer (`m1_builder`)

1. Run `npm install unpdf pdf-lib`.
2. Create directories: `mkdir -p src/services/pdf/adapters test`.
3. Implement `src/services/pdf/adapters/unpdf-adapter.js` according to §4.3.
4. Implement `src/services/pdf/adapters/mock-adapter.js` according to §5.2.
5. Wire exports in `src/services/pdf/index.js` according to §6.2.
6. Create `test/pdf-adapters.test.js` using Node's native test runner (`node --test test/pdf-adapters.test.js`).
