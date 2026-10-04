# Remediation Blueprint: Failure 1 (Buffer Detachment & Mutation)

> **Author**: `m1_iter2_explorer_1` (teamwork_preview_explorer)  
> **Workspace**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
> **Date**: 2026-09-13T17:55:00Z  
> **Target Module**: `src/services/pdf/adapters/unpdf-adapter.js`  
> **Related Test File**: `test/pdf-extractor.test.js`  

---

## 1. Problem Definition & Root Cause Analysis

### 1.1 Verbatim Failure
In `challenge_harness.js` (Test 7.9):
```
[FAIL] Challenge 7 > 7.9 Caller Buffer immutability: Buffer is not detached/mutated by UnpdfAdapter
       Error: Caller buffer byteLength mutated from 8089 to 0
```

When a caller passes a Node.js `Buffer` to `extractTargetedPdfText(buffer, ...)`:
- Prior to extraction: `callerBuffer.byteLength = 8089`, `callerBuffer.length = 8089`.
- After extraction: `callerBuffer.byteLength = 0`, `callerBuffer.length = 0`.
- Any subsequent operation or extraction attempt throws:
  `PdfError: PDF Buffer is empty (0 bytes) [code: EMPTY_PDF]`.

### 1.2 Underlying Mechanism (V8 & Mozilla PDF.js Transferable Semantics)
1. **Mozilla PDF.js Worker Transfer**:
   `unpdf` wraps Mozilla PDF.js (`pdfjs-dist`). When `extractText` is called, PDF.js inspects the incoming data. When passed a `Uint8Array` whose underlying `ArrayBuffer` has `byteOffset === 0` and `byteLength === buffer.byteLength`, PDF.js places the underlying `ArrayBuffer` into the transfer list of its worker thread communication (`worker.postMessage({ data: ... }, [data.buffer])`).
2. **ECMAScript ArrayBuffer Detachment**:
   Per ECMA-262 specifications, transferring an `ArrayBuffer` neuters/detaches it. Once detached:
   - `arrayBuffer.detached === true`
   - `arrayBuffer.byteLength === 0`
   - All `TypedArray` views (including `Buffer` instances) referencing that `ArrayBuffer` immediately have their `byteLength` and `length` set to `0`.
3. **Flawed Implementation in `unpdf-adapter.js`**:
   Lines 63–68 of `src/services/pdf/adapters/unpdf-adapter.js`:
   ```javascript
   // Case 2: Node.js Buffer
   if (Buffer.isBuffer(input)) {
     if (input.length === 0) {
       throw new PdfError('PDF Buffer is empty (0 bytes)', 'EMPTY_PDF');
     }
     return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
   }
   ```
   The constructor `new Uint8Array(input.buffer, input.byteOffset, input.byteLength)` creates a **shared view** pointing to the exact same `ArrayBuffer` as the caller's `Buffer`.
   When PDF.js transfers and detaches that `ArrayBuffer`, the caller's buffer in memory is permanently destroyed.

### 1.3 Secondary Vulnerability: `input instanceof Uint8Array`
Lines 71–76 of `src/services/pdf/adapters/unpdf-adapter.js`:
```javascript
   // Case 3: Uint8Array
   if (input instanceof Uint8Array) {
     if (input.byteLength === 0) {
       throw new PdfError('PDF Uint8Array is empty (0 bytes)', 'EMPTY_PDF');
     }
     return input;
   }
```
Returning `input` directly returns the caller's exact instance!
Empirical testing confirmed:
```
Initial u8.byteLength: 8089
After extractText with direct u8 (unprotected):
u8.byteLength: 0
```
Callers passing standard `Uint8Array` instances (common in cross-platform/fetch-based workflows) experience identical data loss and detachment mutation.

---

## 2. Remediation Strategy

### 2.1 The Solution: Isolated Copy via `new Uint8Array(input)`
In ECMAScript §23.2.5.1, the constructor `new TypedArray(typedArray)`:
- Evaluates when `input` is an existing `TypedArray` (Node.js `Buffer` is an instance of `Uint8Array`).
- Allocates a **brand-new, independent `ArrayBuffer`** of length `input.byteLength`.
- Copies all byte values from `input` into the newly allocated buffer.
- Does **NOT** share `input.buffer`.

When PDF.js subsequently transfers and detaches the copy's `ArrayBuffer`:
- Only the ephemeral copy's `ArrayBuffer` is detached and reclaimed by the PDF.js worker.
- The caller's `Buffer` / `Uint8Array` retains its original, untouched `ArrayBuffer`.
- `input.byteLength`, `input.length`, and all byte contents remain 100% intact.

### 2.2 Empirical Verification Results
| Scenario | Unsafe View Result | Safe Copy (`new Uint8Array(input)`) Result |
|---|---|---|
| Node.js Buffer (8089 bytes) | `byteLength: 0` (Detached) | `byteLength: 8089` (Preserved) |
| Uint8Array (8089 bytes) | `byteLength: 0` (Detached) | `byteLength: 8089` (Preserved) |
| Sliced Buffer with Offset | `byteLength: 8089` | `byteLength: 8089` (Both slice & parent preserved) |
| 3x Repeated Invocations on Same Buffer | Fails on Run 2 (`EMPTY_PDF`) | All 3 runs succeed identically (`totalPages: 4`) |
| Byte Equality (`Buffer.compare`) | N/A (Buffer destroyed) | `Buffer.compare(callerBuf, freshBuf) === 0` |

### 2.3 Performance Impact Assessment
- Memory Allocation: Copying 8KB (sample notification PDF) takes **~0.001ms (1 microsecond)**.
- For a 10MB PDF: Copying 10MB takes **~1.2ms**, while PDF.js parsing takes **200–500ms**.
- The relative overhead is **< 0.5%** of extraction latency.
- Memory is immediately reclaimed when the PDF.js worker finishes parsing.

---

## 3. Exact Code Changes Specification

### Target File
`src/services/pdf/adapters/unpdf-adapter.js`

### 3.1 JSDoc Update (Line 34)
#### Before:
```javascript
  /**
   * Resolves input into a zero-copy Uint8Array.
   * @param {string|Buffer|Uint8Array} input
   * @returns {Promise<Uint8Array>}
   */
```
#### After:
```javascript
  /**
   * Resolves input into an isolated Uint8Array copy to protect caller buffers
   * against ArrayBuffer detachment during PDF.js worker execution.
   * @param {string|Buffer|Uint8Array} input
   * @returns {Promise<Uint8Array>}
   */
```

### 3.2 Case 1: File Path String (Line 58–60)
#### Before:
```javascript
      const buffer = await fs.promises.readFile(resolvedPath);
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
```
#### After:
```javascript
      const buffer = await fs.promises.readFile(resolvedPath);
      return new Uint8Array(buffer);
```

### 3.3 Case 2: Node.js Buffer (Lines 62–68)
#### Before:
```javascript
    // Case 2: Node.js Buffer
    if (Buffer.isBuffer(input)) {
      if (input.length === 0) {
        throw new PdfError('PDF Buffer is empty (0 bytes)', 'EMPTY_PDF');
      }
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
```
#### After:
```javascript
    // Case 2: Node.js Buffer
    if (Buffer.isBuffer(input)) {
      if (input.length === 0) {
        throw new PdfError('PDF Buffer is empty (0 bytes)', 'EMPTY_PDF');
      }
      return new Uint8Array(input);
    }
```

### 3.4 Case 3: Uint8Array (Lines 70–76)
#### Before:
```javascript
    // Case 3: Uint8Array
    if (input instanceof Uint8Array) {
      if (input.byteLength === 0) {
        throw new PdfError('PDF Uint8Array is empty (0 bytes)', 'EMPTY_PDF');
      }
      return input;
    }
```
#### After:
```javascript
    // Case 3: Uint8Array
    if (input instanceof Uint8Array) {
      if (input.byteLength === 0) {
        throw new PdfError('PDF Uint8Array is empty (0 bytes)', 'EMPTY_PDF');
      }
      return new Uint8Array(input);
    }
```

---

## 4. Regression Test Specifications

Add a dedicated test block to `test/pdf-extractor.test.js`:

```javascript
// =========================================================================
// Category 10: Buffer & TypedArray Immutability & Reusability (Failure 1 Regression)
// =========================================================================
describe('Category 10: Buffer & TypedArray Immutability & Reusability', () => {
  it('10.1 preserves caller Buffer instance without mutation or detachment, allowing repeated extractions', async () => {
    const buffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const initialByteLength = buffer.byteLength;
    const initialLength = buffer.length;
    const initialFirstByte = buffer[0];
    const initialLastByte = buffer[buffer.length - 1];

    // First extraction run
    const result1 = await extractTargetedPdfText(buffer, {
      keywords: ['eligibility']
    });
    assert.equal(result1.success, true);
    assert.ok(result1.extractedStats.sentenceCount > 0);

    // Verify buffer was not mutated or detached
    assert.equal(buffer.byteLength, initialByteLength, 'Buffer.byteLength must not become 0');
    assert.equal(buffer.length, initialLength, 'Buffer.length must not become 0');
    assert.equal(buffer[0], initialFirstByte, 'Buffer first byte must be preserved');
    assert.equal(buffer[buffer.length - 1], initialLastByte, 'Buffer last byte must be preserved');

    // Second extraction run on the identical buffer instance
    const result2 = await extractTargetedPdfText(buffer, {
      keywords: ['vacancies']
    });
    assert.equal(result2.success, true);
    assert.ok(result2.extractedStats.sentenceCount > 0);

    // Third extraction run on the identical buffer instance
    const result3 = await extractTargetedPdfText(buffer, {
      keywords: ['educational qualifications']
    });
    assert.equal(result3.success, true);
    assert.ok(result3.extractedStats.sentenceCount > 0);

    // Verify buffer remains intact after 3 runs
    assert.equal(buffer.byteLength, initialByteLength);
  });

  it('10.2 preserves caller Uint8Array instance without mutation or detachment, allowing repeated extractions', async () => {
    const rawBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const u8 = new Uint8Array(rawBuffer);
    const initialByteLength = u8.byteLength;
    const initialFirstByte = u8[0];
    const initialLastByte = u8[u8.byteLength - 1];

    // First extraction run
    const result1 = await extractTargetedPdfText(u8, {
      keywords: ['eligibility']
    });
    assert.equal(result1.success, true);
    assert.ok(result1.extractedStats.sentenceCount > 0);

    // Verify Uint8Array was not detached
    assert.equal(u8.byteLength, initialByteLength, 'Uint8Array.byteLength must not become 0');
    assert.equal(u8[0], initialFirstByte, 'Uint8Array first byte must be preserved');
    assert.equal(u8[u8.byteLength - 1], initialLastByte, 'Uint8Array last byte must be preserved');

    // Second extraction run on identical Uint8Array
    const result2 = await extractTargetedPdfText(u8, {
      keywords: ['vacancies']
    });
    assert.equal(result2.success, true);
    assert.ok(result2.extractedStats.sentenceCount > 0);
  });

  it('10.3 preserves sliced Buffer (subarray with offset) and its parent buffer without detachment', async () => {
    const rawPdf = fs.readFileSync(SAMPLE_PDF_PATH);
    const prefix = Buffer.from('PADDING_PREFIX_1234567890');
    const suffix = Buffer.from('PADDING_SUFFIX_0987654321');
    const parent = Buffer.concat([prefix, rawPdf, suffix]);
    const sliced = parent.subarray(prefix.length, prefix.length + rawPdf.length);

    const initialParentLen = parent.byteLength;
    const initialSlicedLen = sliced.byteLength;

    const result = await extractTargetedPdfText(sliced, {
      keywords: ['eligibility']
    });

    assert.equal(result.success, true);
    assert.ok(result.extractedStats.sentenceCount > 0);
    assert.equal(parent.byteLength, initialParentLen, 'Parent buffer must not be detached');
    assert.equal(sliced.byteLength, initialSlicedLen, 'Sliced buffer must not be detached');

    // Reusing the slice must succeed
    const result2 = await extractTargetedPdfText(sliced, {
      keywords: ['vacancies']
    });
    assert.equal(result2.success, true);
  });

  it('10.4 UnpdfAdapter directly preserves caller Buffer and Uint8Array across repeated calls', async () => {
    const adapter = new UnpdfAdapter();
    const buffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const u8 = new Uint8Array(buffer);

    const resBuf1 = await adapter.extractPages(buffer);
    assert.equal(resBuf1.totalPages, 4);
    assert.equal(buffer.byteLength, 8089, 'Buffer byteLength preserved on run 1');

    const resBuf2 = await adapter.extractPages(buffer);
    assert.equal(resBuf2.totalPages, 4);
    assert.equal(buffer.byteLength, 8089, 'Buffer byteLength preserved on run 2');

    const resU8_1 = await adapter.extractPages(u8);
    assert.equal(resU8_1.totalPages, 4);
    assert.equal(u8.byteLength, 8089, 'Uint8Array byteLength preserved on run 1');

    const resU8_2 = await adapter.extractPages(u8);
    assert.equal(resU8_2.totalPages, 4);
    assert.equal(u8.byteLength, 8089, 'Uint8Array byteLength preserved on run 2');
  });
});
```

---

## 5. Verification Commands & Acceptance Criteria

1. **Adversarial Harness Test**:
   ```bash
   node .agents/m1_challenger_2/challenge_harness.js
   ```
   **Acceptance**: Test `7.9 Caller Buffer immutability: Buffer is not detached/mutated by UnpdfAdapter` must output `[PASS]`.
2. **Project Test Suite**:
   ```bash
   node --test test/pdf-extractor.test.js
   ```
   **Acceptance**: All 38 existing tests + 4 new Category 10 tests must pass (42/42).
