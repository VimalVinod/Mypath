# Milestone 1 Empirical Challenge Report: PDF Extractor & Context Deduplication

> **Author**: `m1_challenger_2` (teamwork_preview_challenger)  
> **Target**: `teamwork_preview_orchestrator_1` (conversation ID: `338ef4f2-0160-49fd-b08e-065ac5edfe72`)  
> **Workspace**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
> **Date**: 2026-09-13T17:50:00Z  
> **Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

A standalone empirical adversarial harness was authored and executed at `.agents/m1_challenger_2/challenge_harness.js`. It ran 29 adversarial tests across 7 target dimensions.

```
Execution Command: node .agents/m1_challenger_2/challenge_harness.js
Harness Results: 26/29 Passed (3 Failed)
```

### 1.1 Passed Challenge Dimensions
- **Extreme Context Windows**:
  - `contextBefore: 100, contextAfter: 100` on a 15-sentence page clamped cleanly to `[0, 14]`, producing all 15 sentences with 0 duplicates.
  - `contextBefore: Number.MAX_SAFE_INTEGER, contextAfter: Number.MAX_SAFE_INTEGER` clamped without integer overflow.
  - Negative values `contextBefore: -5, contextAfter: -5` sanitized to 0 context before/after.
  - Zero context `contextBefore: 0, contextAfter: 0` captured exactly 1 sentence.
- **Asymmetric Context Windows**:
  - `contextBefore: 5, contextAfter: 0` extracted strictly preceding sentences and the match (indices `[1..6]`).
  - `contextBefore: 0, contextAfter: 5` extracted the match and strictly succeeding sentences (indices `[6..11]`).
  - Asymmetric window at index 1 clamped start index to 0 without underflow.
- **100% Keyword Density Across All Sentences**:
  - Extracted 5 of 5 sentences across 2 pages without duplication.
  - Calculated `reductionPercentage: 0.0%` accurately.
- **0% Keyword Density Across All Sentences**:
  - Mock and real PDF fixtures with non-matching keywords returned `success: true`, `targetedText: ""`, `sentenceCount: 0`, `matchedPages: []`, `reductionPercentage: 100%` without throwing.
- **Repeated Adjacent & Overlapping Matches (Interval Union)**:
  - Adjacent matches `[i, i+1]` merged into contiguous span without duplicate sentences.
  - Gap-of-1 matches `[i, i+2]` with context 1 merged at the shared boundary.
  - Multiple keywords matching the same sentence produced exactly one sentence entry.
  - 50 randomized permutations over 30 sentences verified invariants: 100% monotonic index order and 0 duplicates.
- **Performance & Latency Benchmark**:
  - 50-page document mock: 100 iterations executed in 187.7ms (avg **1.88ms/call**, well within the 15ms target); heap delta was **0.10MB** (within the 25MB target).
  - Real 4-page PDF fixture (`sample-notification.pdf`): 30 iterations executed in 380.4ms (avg **12.68ms/call**, well within the 40ms target).
- **Standard Fault Injection**:
  - Empty buffer rejected with `EMPTY_PDF`.
  - Corrupted buffer rejected with `INVALID_PDF`.
  - Missing file path rejected with `FILE_NOT_FOUND`.
  - Null input rejected with `Invalid PDF input`.
  - Undefined options defaulted to `{}` without error.
  - Regex special characters in keywords (`[Ref: *123+?]`) matched literally without `SyntaxError`.
  - Adapter simulated errors (`ENCRYPTED_PDF`) propagated cleanly.

---

### 1.2 Observed Failures & Vulnerabilities

#### Failure 1: Caller Buffer Mutated and Detached by `UnpdfAdapter` (Severity: HIGH)
- **Observed Behavior**: Passing a Node.js `Buffer` to `extractTargetedPdfText(buffer, ...)` causes `UnpdfAdapter` to detach the caller's underlying `ArrayBuffer`. The caller's `buffer.byteLength` and `buffer.length` mutate from 8089 to 0 bytes. Subsequent calls or operations on the caller's buffer immediately fail with `PdfError: PDF Buffer is empty (0 bytes)`.
- **Location**: `src/services/pdf/adapters/unpdf-adapter.js`, lines 63–68:
  ```javascript
  // Case 2: Node.js Buffer
  if (Buffer.isBuffer(input)) {
    if (input.length === 0) {
      throw new PdfError('PDF Buffer is empty (0 bytes)', 'EMPTY_PDF');
    }
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  ```
- **Verbatim Error & Reproduction Output**:
  ```
  Before run 1: 8089 8089 8089
  After run 1: 0 0 0
  Run 2 failed: PDF Buffer is empty (0 bytes)
  ```

#### Failure 2: Unhandled `TypeError` when `options === null` (Severity: MEDIUM)
- **Observed Behavior**: Calling `extractTargetedPdfText(input, null)` crashes with an uncaught `TypeError` instead of gracefully using default options.
- **Location**: `src/services/pdf/pdf-extractor.js`, lines 123 and 129:
  ```javascript
  async function extractTargetedPdfText(input, options = {}) {
    ...
    const adapter = resolveAdapter(options.adapter, options);
  ```
- **Verbatim Error**:
  ```
  TypeError: Cannot read properties of null (reading 'adapter')
      at extractTargetedPdfText (C:\Users\sindh\Documents\codes\mypath-scraper\src\services\pdf\pdf-extractor.js:129:34)
  ```

#### Failure 3: `NaN` Context Window Drops All Target Matches (Severity: LOW-MEDIUM)
- **Observed Behavior**: Calling `extractTargetedPdfText(input, { contextBefore: NaN, keywords: ['eligibility'] })` returns `sentenceCount: 0`, completely dropping the target sentence match.
- **Location**: `src/services/pdf/pdf-extractor.js`, lines 149–150 and 233:
  ```javascript
  const contextBefore = typeof options.contextBefore === 'number' ? Math.max(0, options.contextBefore) : 1;
  ```
  Since `typeof NaN === 'number'`, `Math.max(0, NaN)` yields `NaN`. In line 208, `span.start` and `span.end` become `NaN`. The loop condition `sIdx <= span.end` (`NaN <= NaN`) evaluates to `false`, discarding all matched sentences.

---

## 2. Logic Chain

1. **Premise 1 (Buffer Immutability)**: A library function that accepts a `Buffer` must not mutate or destroy the caller's buffer in-place.
2. **Observation 1**: `unpdf` uses Mozilla PDF.js internally, which uses web workers or transferable ArrayBuffers. When a `Uint8Array` view sharing the buffer (`new Uint8Array(input.buffer, input.byteOffset, input.byteLength)`) is passed into `unpdf.extractText`, PDF.js detaches the underlying `ArrayBuffer`.
3. **Deduction 1**: Because `UnpdfAdapter` shares `input.buffer` directly instead of copying the bytes (`new Uint8Array(input)`), the caller's buffer instance is permanently emptied (`byteLength = 0`). In Node.js applications where buffers are read from disk, cached, or allocated from `Buffer.poolSize`, this causes data loss, silent state corruption, and immediate failures on repeated calls.
4. **Premise 2 (Defensive Parameter Normalization)**: Default parameter syntax `options = {}` does not handle explicit `null` arguments (`options === null`).
5. **Observation 2**: Line 129 reads `options.adapter`. When `options` is `null`, Node.js throws `TypeError: Cannot read properties of null (reading 'adapter')`.
6. **Deduction 2**: A simple normalization `const opts = options || {};` at function entry is necessary to prevent runtime crashes when consumers pass `null`.
7. **Premise 3 (Numerical Robustness)**: In JavaScript, `typeof NaN === 'number'`.
8. **Observation 3**: `typeof options.contextBefore === 'number'` allows `NaN` to slip through, turning interval boundaries into `NaN` and silently dropping all keyword matches.
9. **Deduction 3**: Replacing `typeof x === 'number'` with `Number.isFinite(x)` prevents `NaN` from invalidating interval computations.

---

## 3. Caveats

- **Scanned / OCR-only PDFs**: As documented in the architecture, image-only PDFs without embedded glyphs return `hasText: false`. No OCR engine is tested.
- **Pass Through on Valid Inputs**: On all valid inputs, file paths, and when buffers are not reused across invocations, the module behaves correctly, meets performance benchmarks, and preserves sentence boundaries accurately.
- No other caveats.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

While the core sentence segmentation, abbreviation masking, interval union deduplication, and metrics calculation algorithms are well-designed, robust, and performant (1.88ms mock, 12.68ms real PDF), the implementation has two defects that require remediation by the worker before Milestone 1 can be certified:

1. **CRITICAL / HIGH**: Fix buffer detachment in `src/services/pdf/adapters/unpdf-adapter.js` by performing a safe copy (`new Uint8Array(input)`) rather than an unsafe zero-copy view of `input.buffer`.
2. **MEDIUM**: Fix `options === null` unhandled `TypeError` in `src/services/pdf/pdf-extractor.js` with `const opts = options || {};`.
3. **LOW-MEDIUM**: Replace `typeof options.contextBefore === 'number'` with `Number.isFinite(options.contextBefore)` to protect against `NaN`.

---

## 5. Verification Method

### 5.1 Run Empirical Challenge Harness
```bash
node .agents/m1_challenger_2/challenge_harness.js
```
**Current Result**: 26/29 Passed (3 Failed).  
**Remediation Target**: 29/29 Passed (0 Failed).

### 5.2 Standalone Reproduction Scripts

#### Reproduction 1: Buffer Detachment & Mutation
```javascript
const fs = require('fs');
const { extractTargetedPdfText } = require('./src/services/pdf');

(async () => {
  const buf = fs.readFileSync('fixtures/sample-notification.pdf');
  console.log('Initial length:', buf.length); // 8089
  await extractTargetedPdfText(buf, { keywords: ['eligibility'] });
  console.log('Length after extraction:', buf.length); // Currently prints: 0 (BUG)
  // Second call fails:
  await extractTargetedPdfText(buf, { keywords: ['eligibility'] }); // Throws EMPTY_PDF
})();
```

#### Reproduction 2: Null Options TypeError
```javascript
const { extractTargetedPdfText } = require('./src/services/pdf');

(async () => {
  // Currently crashes with TypeError: Cannot read properties of null (reading 'adapter')
  await extractTargetedPdfText('fixtures/sample-notification.pdf', null);
})();
```

#### Reproduction 3: NaN Context Option Matches Dropped
```javascript
const { extractTargetedPdfText } = require('./src/services/pdf');

(async () => {
  const res = await extractTargetedPdfText('fixtures/sample-notification.pdf', {
    keywords: ['eligibility'],
    contextBefore: NaN
  });
  console.log('Extracted sentences:', res.extractedStats.sentenceCount); // Currently prints: 0 (BUG)
})();
```

### 5.3 Invalidation Conditions
- If `new Uint8Array(input)` is used and `callerBuffer.byteLength` remains 8089 after extraction, Vulnerability 1 is resolved.
- If `extractTargetedPdfText(input, null)` returns `{ success: true, ... }`, Vulnerability 2 is resolved.
- If `contextBefore: NaN` defaults to 1 and extracts target sentences, Vulnerability 3 is resolved.
