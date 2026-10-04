# Remediation Blueprint: Failure 2 (Null Options Crash) & Failure 3 (NaN Context Options Dropping Matches)

**Author**: `m1_iter2_explorer_2` (teamwork_preview_explorer)  
**Target Component**: `src/services/pdf/pdf-extractor.js` & `test/pdf-extractor.test.js`  
**Workspace**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
**Date**: 2026-09-13  
**Status**: Ready for Implementation by Worker  

---

## 1. Executive Summary

Empirical testing conducted by `m1_challenger_2` (`.agents/m1_challenger_2/challenge_harness.js`) identified two functional defects in `src/services/pdf/pdf-extractor.js`:
- **Failure 2 (Medium Severity)**: Calling `extractTargetedPdfText(input, null)` crashes with an uncaught `TypeError: Cannot read properties of null (reading 'adapter')` (Challenge 7.5).
- **Failure 3 (Low-Medium Severity)**: Calling `extractTargetedPdfText(input, { contextBefore: NaN, keywords: [...] })` drops all target sentence matches, returning `sentenceCount: 0` because `typeof NaN === 'number'`, which injects `NaN` into interval calculations (Challenge 1.5).

This blueprint provides the complete, mathematically sound remediation strategy, exact before/after code modifications, and comprehensive regression test suites for both failures.

---

## 2. Root Cause Analysis

### 2.1 Failure 2: Explicit `null` Options Crash
- **Location**: `src/services/pdf/pdf-extractor.js:123, 129`
- **Vulnerable Code**:
  ```javascript
  123: async function extractTargetedPdfText(input, options = {}) {
  ...
  129:   const adapter = resolveAdapter(options.adapter, options);
  ```
- **Mechanism**:
  1. In JavaScript/ECMAScript, default parameter syntax (`options = {}`) is triggered **only** when the passed argument is `undefined` or omitted.
  2. When a caller explicitly passes `null` (e.g., `extractTargetedPdfText(samplePath, null)`), `options` retains the value `null`.
  3. At line 129, `options.adapter` attempts to read property `.adapter` from `null`, throwing:
     `TypeError: Cannot read properties of null (reading 'adapter')`.
  4. Even if line 129 were bypassed, downstream code at lines 132, 148, 149, 150, 151, 152, and 154 similarly dereference properties from `options`.
  5. In addition, helper function `resolveAdapter(adapterOption, options = {})` at line 19 also relies on `options = {}` and passes `options` to constructors `MockPdfAdapter(options)` and `UnpdfAdapter(options)`.

### 2.2 Failure 3: `NaN` Context Window Drops Target Matches
- **Location**: `src/services/pdf/pdf-extractor.js:149-150, 207-210, 232-236`
- **Vulnerable Code**:
  ```javascript
  149: const contextBefore = typeof options.contextBefore === 'number' ? Math.max(0, options.contextBefore) : 1;
  150: const contextAfter = typeof options.contextAfter === 'number' ? Math.max(0, options.contextAfter) : 1;
  ```
- **Mechanism**:
  1. In JavaScript, `typeof NaN === 'number'`.
  2. Calling `Math.max(0, NaN)` produces `NaN`.
  3. Consequently, `contextBefore` and/or `contextAfter` evaluate to `NaN`.
  4. At lines 207–210, intervals are computed for each matching sentence index:
     ```javascript
     const intervals = matchingIndices.map(matchIdx => ({
       start: Math.max(0, matchIdx - contextBefore),
       end: Math.min(pageSentences.length - 1, matchIdx + contextAfter)
     }));
     ```
     Because `matchIdx - NaN === NaN` and `Math.max(0, NaN) === NaN`, `span.start` and `span.end` become `NaN`.
  5. In lines 232–236, sentences are extracted via:
     ```javascript
     for (const span of mergedIntervals) {
       for (let sIdx = span.start; sIdx <= span.end; sIdx++) {
         pageExtractedSentences.push(pageSentences[sIdx]);
       }
     }
     ```
     With `span.start = NaN` and `span.end = NaN`, the loop condition `sIdx <= span.end` checks `NaN <= NaN`. In JavaScript, `NaN <= NaN` is **always `false`**.
  6. The extraction loop immediately terminates without running a single iteration. `pageExtractedSentences` remains empty (`[]`), discarding the matched sentence entirely.

---

## 3. Remediation Strategy & Normalization Logic

### 3.1 Normalization for Failure 2
At the very beginning of `extractTargetedPdfText`, normalize `options` into a local constant:
```javascript
const opts = options || {};
```
And replace all occurrences of `options` inside `extractTargetedPdfText` with `opts`.
Furthermore, guard `resolveAdapter` defensively with `const opts = options || {};` to ensure zero runtime exceptions when called independently with `null`.

### 3.2 Normalization for Failure 3
Replace `typeof opts.contextBefore === 'number'` with `Number.isFinite(opts.contextBefore)`:
```javascript
const contextBefore = Number.isFinite(opts.contextBefore)
  ? Math.max(0, Math.floor(opts.contextBefore))
  : 1;

const contextAfter = Number.isFinite(opts.contextAfter)
  ? Math.max(0, Math.floor(opts.contextAfter))
  : 1;
```

#### Why `Number.isFinite(...)`?
1. **Strict Type & Finite Check**: `Number.isFinite(NaN)` returns `false`. It also returns `false` for `null`, `undefined`, strings (e.g. `'1'`), `Infinity`, and `-Infinity`.
2. **Safe Default Fallback**: When `false`, the ternary evaluates to default context `1`, guaranteeing the matched sentence and surrounding context are never dropped.
3. **Integer Truncation (`Math.floor`)**: Prevents fractional sentence counts (e.g., `contextBefore: 2.7` becomes `2`), avoiding non-integer array index access.
4. **Boundary Clamping (`Math.max(0, ...)`)**: Clamps negative numbers (e.g., `-5`) to `0`, ensuring only the matched sentence is extracted.

Defensively apply the same pattern to `minSentenceLength`:
```javascript
const minSentenceLength = Number.isFinite(opts.minSentenceLength)
  ? Math.max(1, Math.floor(opts.minSentenceLength))
  : 3;
```

---

## 4. Exact Before / After Code Specifications

### 4.1 Target File: `src/services/pdf/pdf-extractor.js`

#### Change 1: `resolveAdapter` (Lines 19–30)
**Before**:
```javascript
function resolveAdapter(adapterOption, options = {}) {
  if (adapterOption && typeof adapterOption.extractPages === 'function') {
    return adapterOption;
  }
  if (adapterOption === 'mock') {
    return new MockPdfAdapter(options);
  }
  if (adapterOption === 'unpdf' || !adapterOption) {
    return new UnpdfAdapter(options);
  }
  throw new Error(`Unsupported PDF adapter type: "${adapterOption}". Valid options are "unpdf" or "mock".`);
}
```

**After**:
```javascript
function resolveAdapter(adapterOption, options = {}) {
  const opts = options || {};
  if (adapterOption && typeof adapterOption.extractPages === 'function') {
    return adapterOption;
  }
  if (adapterOption === 'mock') {
    return new MockPdfAdapter(opts);
  }
  if (adapterOption === 'unpdf' || !adapterOption) {
    return new UnpdfAdapter(opts);
  }
  throw new Error(`Unsupported PDF adapter type: "${adapterOption}". Valid options are "unpdf" or "mock".`);
}
```

#### Change 2: `extractTargetedPdfText` (Lines 123–155)
**Before**:
```javascript
async function extractTargetedPdfText(input, options = {}) {
  if (!input) {
    throw new Error('Invalid PDF input: expected a non-empty file path, Buffer, or Uint8Array');
  }

  // 1. Resolve adapter
  const adapter = resolveAdapter(options.adapter, options);

  // 2. Extract pages via adapter
  const adapterResult = await adapter.extractPages(input, options);
  const totalPages = typeof adapterResult.totalPages === 'number'
    ? adapterResult.totalPages
    : (adapterResult.pages ? adapterResult.pages.length : 0);

  // Normalize pages format
  const normalizedPages = (adapterResult.pages || []).map((page, idx) => {
    if (typeof page === 'string') {
      return { pageNumber: idx + 1, text: page };
    }
    return {
      pageNumber: page.pageNumber || idx + 1,
      text: typeof page.text === 'string' ? page.text : ''
    };
  });

  const mode = options.mode === 'page' ? 'page' : 'sentence';
  const contextBefore = typeof options.contextBefore === 'number' ? Math.max(0, options.contextBefore) : 1;
  const contextAfter = typeof options.contextAfter === 'number' ? Math.max(0, options.contextAfter) : 1;
  const wholeWord = options.wholeWord !== false;
  const minSentenceLength = typeof options.minSentenceLength === 'number' ? options.minSentenceLength : 3;

  const compiledKeywords = compileKeywords(options.keywords, wholeWord);
```

**After**:
```javascript
async function extractTargetedPdfText(input, options = {}) {
  if (!input) {
    throw new Error('Invalid PDF input: expected a non-empty file path, Buffer, or Uint8Array');
  }

  const opts = options || {};

  // 1. Resolve adapter
  const adapter = resolveAdapter(opts.adapter, opts);

  // 2. Extract pages via adapter
  const adapterResult = await adapter.extractPages(input, opts);
  const totalPages = typeof adapterResult.totalPages === 'number'
    ? adapterResult.totalPages
    : (adapterResult.pages ? adapterResult.pages.length : 0);

  // Normalize pages format
  const normalizedPages = (adapterResult.pages || []).map((page, idx) => {
    if (typeof page === 'string') {
      return { pageNumber: idx + 1, text: page };
    }
    return {
      pageNumber: page.pageNumber || idx + 1,
      text: typeof page.text === 'string' ? page.text : ''
    };
  });

  const mode = opts.mode === 'page' ? 'page' : 'sentence';
  const contextBefore = Number.isFinite(opts.contextBefore)
    ? Math.max(0, Math.floor(opts.contextBefore))
    : 1;
  const contextAfter = Number.isFinite(opts.contextAfter)
    ? Math.max(0, Math.floor(opts.contextAfter))
    : 1;
  const wholeWord = opts.wholeWord !== false;
  const minSentenceLength = Number.isFinite(opts.minSentenceLength)
    ? Math.max(1, Math.floor(opts.minSentenceLength))
    : 3;

  const compiledKeywords = compileKeywords(opts.keywords, wholeWord);
```

---

## 5. Regression Test Specifications

### 5.1 New Tests for `test/pdf-extractor.test.js`

#### Addition to Category 4: Context Windowing
```javascript
  it('4.6 handles non-finite (NaN, Infinity) and floating point context window values safely', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0. Sentence 1. Target keyword match on sentence 2. Sentence 3. Sentence 4.'
    ]);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['Target keyword match'],
      contextBefore: 1.8,
      contextAfter: NaN
    });
    assert.equal(result.success, true);
    assert.equal(result.sections[0].sentences.length, 3);
    assert.equal(result.sections[0].sentences[0], 'Sentence 1.');
    assert.equal(result.sections[0].sentences[1], 'Target keyword match on sentence 2.');
    assert.equal(result.sections[0].sentences[2], 'Sentence 3.');
  });
```

#### Addition to Category 8: Boundary & Error Handling
```javascript
  it('8.5 gracefully handles options === null without throwing TypeError', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, null);
    assert.equal(result.success, true);
    assert.equal(result.extractedStats.sentenceCount, 0);
    assert.deepEqual(result.extractedStats.matchedPages, []);
    assert.equal(result.targetedText, '');
  });

  it('8.6 gracefully handles options === undefined without throwing', async () => {
    const result = await extractTargetedPdfText(SAMPLE_PDF_PATH, undefined);
    assert.equal(result.success, true);
    assert.equal(result.extractedStats.sentenceCount, 0);
    assert.deepEqual(result.extractedStats.matchedPages, []);
    assert.equal(result.targetedText, '');
  });

  it('8.7 recovers from NaN contextBefore and contextAfter without dropping target matches', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0. Sentence 1. Target keyword match on sentence 2. Sentence 3. Sentence 4.'
    ]);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['Target keyword match'],
      contextBefore: NaN,
      contextAfter: NaN
    });
    assert.equal(result.success, true);
    assert.ok(result.extractedStats.sentenceCount >= 1, 'Target sentence must not be dropped when context is NaN');
    assert.equal(result.sections[0].sentences.length, 3, 'Should fallback to default context 1 (sentences 1, 2, 3)');
    assert.equal(result.sections[0].sentences[1], 'Target keyword match on sentence 2.');
  });

  it('8.8 handles mixed NaN and valid context options correctly', async () => {
    const mockAdapter = new MockPdfAdapter([
      'Sentence 0. Sentence 1. Target keyword match on sentence 2. Sentence 3. Sentence 4.'
    ]);
    const result = await extractTargetedPdfText('mock', {
      adapter: mockAdapter,
      keywords: ['Target keyword match'],
      contextBefore: NaN,
      contextAfter: 0
    });
    assert.equal(result.success, true);
    assert.equal(result.sections[0].sentences.length, 2, 'Fallback contextBefore: 1, explicit contextAfter: 0');
    assert.equal(result.sections[0].sentences[0], 'Sentence 1.');
    assert.equal(result.sections[0].sentences[1], 'Target keyword match on sentence 2.');
  });
```

---

## 6. Verification & Invalidation Matrix

| Verification Target | Command / Check | Expected Behavior | Invalidation Condition |
|---------------------|-----------------|-------------------|------------------------|
| **Failure 2 Resolution** | `node .agents/m1_challenger_2/challenge_harness.js` (Test 7.5) | `[PASS] Challenge 7 > 7.5 null options does not throw TypeError` | If calling with `null` throws `TypeError: Cannot read properties of null` |
| **Failure 3 Resolution** | `node .agents/m1_challenger_2/challenge_harness.js` (Test 1.5) | `[PASS] Challenge 1 > 1.5 NaN context window handled gracefully without dropping target match` | If calling with `contextBefore: NaN` produces `sentenceCount: 0` |
| **Full Test Suite** | `node --test test/pdf-extractor.test.js` | All 43+ tests pass (original 38 + 5 new regression tests) | Any test failure or assertion error |
| **Zero Side-Effects** | All existing tests (1.1 - 9.4) | 100% backward compatible; no regressions in context windowing, reduction metrics, or page mode | Any regression in existing test categories |

---

## 7. Patch Reference
The machine-applicable patch containing all changes to `src/services/pdf/pdf-extractor.js` and `test/pdf-extractor.test.js` is saved at:
`c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m1_iter2_explorer_2\remediation.patch`
