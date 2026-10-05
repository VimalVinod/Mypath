# Milestone 1 Challenger Handoff Report: Scraper Adversarial Review

**Agent**: `teamwork_preview_challenger_m1_1`  
**Milestone**: M1 - Exam Scraping Engine  
**Verdict**: **`REJECT`**  
**Date**: 2026-09-08T20:38:00Z  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_challenger_m1_1`  

---

## Challenge Summary

**Overall risk assessment**: **HIGH**  
**Verdict**: **REJECT**

While the scrapers perform adequately on happy-path fixtures and basic live endpoints, comprehensive fuzzing, network fault injection, and boundary testing revealed **4 test failures in `node --test`** and uncovered **5 concrete vulnerabilities** that lead to entire batch drops, deduplication ID collisions for non-English exams, and unhandled promise rejections.

---

## 1. Observation

### 1.1 Test Suite Execution Results
- Executed `node --test` on Node.js v24.13.0 across the entire repository:
  - Command: `node --test`
  - Result:
    ```
    ℹ tests 170
    ℹ suites 43
    ℹ pass 166
    ℹ fail 4
    ℹ cancelled 0
    ℹ skipped 0
    ℹ todo 0
    ℹ duration_ms 2091.6067
    ```
- Executed adversarial fuzzer and stress suite:
  - Command: `node --test tests/adversarial/scraper-fuzz-stress.test.js`
  - Result: 55/55 passed across 15 suites in 1342ms.

### 1.2 Observed Failure 1: BaseScraper.slugify ID Collisions on Non-ASCII / Bilingual Titles
- File: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\base-scraper.js:101-108`
- Code:
  ```javascript
  slugify(text) {
    if (!text) return 'exam';
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }
  ```
- Observed Behavior:
  - When `text` is composed of Devanagari/Hindi characters (e.g. `'सहायक निदेशक परीक्षा'` or `'वैज्ञानिक अधिकारी परीक्षा'`), `text.replace(/[^a-z0-9]+/g, '-')` converts all characters to `'-'`, and `replace(/^-+|-+$/g, '')` strips them to an empty string `''`.
  - When `normalizeRecord` is called (`base-scraper.js:148`):
    `id: partialRecord.id || `${this.sourceName}_${this.slugify(partialRecord.examName)}``
    both exams produce the identical deterministic ID: `"UPSC_"`.
  - Verbatim Test Failure (`tests/e2e/challenger-m1.test.js:612`):
    ```
    ✖ C3.8 - BaseScraper.slugify must generate distinct non-empty IDs for distinct Devanagari/Hindi exam titles (0.2964ms)
      AssertionError [ERR_ASSERTION]: Slug must not be empty string for valid Hindi title
    ```

### 1.3 Observed Failure 2: Single Malformed Field Crashes Entire Batch in SSC Scraper
- File: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\ssc-scraper.js:69-127`
- Code:
  ```javascript
  for (const item of examList) {
    if (!item || typeof item !== 'object') continue;
    ...
    const record = this.normalizeRecord({ ... });
    records.push(record);
  }
  ```
- Observed Behavior:
  - When the SSC live exams endpoint returns an array containing 5 items where 4 are completely valid and 1 has a numeric timestamp for `applicationEndDate` (e.g. `1728000000000`) or a non-string `attachmentUrl`:
  - `this.normalizeRecord` invokes `validateRecord`, which throws:
    `[SSC] Validation error: "importantDates.applicationEndDate" is required and must be a string`.
  - Because there is no per-item `try ... catch` block inside the loop, the entire method throws and drops all surviving, valid exams in the batch.
  - Verbatim Test Failure (`tests/e2e/challenger-m1.test.js:593`):
    ```
    ✖ C3.7 - SSC batch resilience when 1 of 5 items has numeric timestamp applicationEndDate (0.8329ms)
      AssertionError [ERR_ASSERTION]: Single item error crashed entire batch: [SSC] Validation error: "importantDates.applicationEndDate" is required and must be a string
    ```

### 1.4 Observed Failure 3: Unhandled TypeError on Falsy Error in ScraperManager
- File: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\index.js:113-119`
- Code:
  ```javascript
  } catch (err) {
    errors.push({
      source: key,
      error: err.message || String(err)
    });
    console.error(`[ScraperManager] Scraper "${key}" failed gracefully: ${err.message}`);
  }
  ```
- Observed Behavior:
  - If a scraper rejects with `null`, `undefined`, or a falsy non-object (e.g. `return Promise.reject(null)`), `err.message` throws `TypeError: Cannot read properties of null (reading 'message')`.
  - Because this occurs inside an async arrow function passed to `targets.map`, the rejected promise causes `errors.push` to never complete.
  - Verbatim Test Failure (`tests/e2e/challenger-m1.test.js:344`):
    ```
    ✖ C2.7 - Scraper rejecting with null or undefined (0.442ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      0 !== 1
    ```

### 1.5 Observed Failure 4: Infinite Retry on HTTP 404 Client Errors in BaseScraper
- File: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\base-scraper.js:70-88`
- Code:
  ```javascript
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      ...
      if (!response.ok) {
        if (response.status >= 500 || response.status === 429) {
          throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
        }
        // If 404 or other 4xx, throw non-retriable error
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      return response;
    } catch (err) {
      lastError = err;
      const isLast = attempt === maxAttempts;
      if (!isLast) {
        const delay = this.options.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  ```
- Observed Behavior:
  - The developer intended 404 client errors to be non-retriable (as documented in comments).
  - However, throwing inside the `try` block routes execution directly into the `catch (err)` block, which sleeps and retries for all `maxAttempts` (4 requests total).
  - Verbatim Test Failure (`tests/e2e/challenger-m1.test.js:129`):
    ```
    ✖ C1.4 - fetchWithRetry does not retry 404 client errors endlessly (171.5436ms)
      AssertionError [ERR_ASSERTION]: 404 should not be retried
      4 !== 1
    ```

---

## 2. Logic Chain

1. **Premise 1 (ID Uniqueness & Deduplication)**:
   - `PROJECT.md` dictates that `NormalizedExamRecord.id` must be a deterministic unique identifier used by `DedupStore` to track and prevent duplicate email notifications.
   - Observation 1.2 demonstrates that any examination titled in Hindi/Devanagari or special symbols yields `slugify() === ''`, causing `id === 'UPSC_'`.
   - In a production system tracking Indian exams, two distinct UPSC Hindi exam notices will generate the identical ID `"UPSC_"`. The second exam will be filtered out by `DedupStore.filterNewExams()`, and aspirants will never receive the alert.

2. **Premise 2 (Batch Fault Isolation)**:
   - Government REST endpoints frequently change minor field types (e.g. millisecond epoch vs ISO string for dates, or numeric ID in notice attachment).
   - Observation 1.3 proves that a single malformed item in `payload.data` throws an unhandled error in `parseLiveExamsJson()`, dropping 100% of all valid records returned in that batch.

3. **Premise 3 (Graceful Error Handling in Aggregator)**:
   - `ScraperManager` is documented as providing "full error isolation" so that "if one portal scraper throws an error or times out, others continue and return results".
   - Observation 1.4 proves that if an error is thrown without a `.message` property (e.g. `reject(null)`), `err.message` throws an unhandled `TypeError`, breaking error isolation.

4. **Premise 4 (Network Efficiency & Retry Discipline)**:
   - Observation 1.5 demonstrates that HTTP 404 responses are repeatedly retried with exponential backoff rather than terminating immediately, wasting network sockets and delaying scrape runs.

5. **Conclusion**:
   - Because 4 tests in the test suite fail and real-world failure modes compromise deduplication and batch resilience, Milestone 1 cannot be approved in its current state.

---

## 3. Caveats

1. **Happy-Path Operation**:
   - The scrapers function correctly when parsing well-formed English fixtures and live responses (`upsc.gov.in` and `ssc.gov.in` live tests succeed under ideal network conditions).
2. **Review-Only Constraint**:
   - As an Empirical Challenger, implementation code was not modified. All 5 issues are reported as actionable findings for the worker to fix.
3. **No Downstream Blocking**:
   - Milestone 2 (Email Service) can develop independently in parallel, but Milestone 3 (Pipeline & Dedup) will be severely impacted if ID collisions and batch drops are not resolved.

---

## 4. Conclusion & Actionable Mitigations

### Verdict: **`REJECT`**

The worker must address the following 5 items before Milestone 1 can be certified:

1. **Fix `BaseScraper.prototype.slugify`**:
   - If `text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')` results in an empty string, generate a deterministic hash fallback:
     ```javascript
     const cleaned = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
     if (!cleaned) {
       const hash = crypto.createHash('md5').update(String(text)).digest('hex').slice(0, 10);
       return `exam-${hash}`;
     }
     return cleaned;
     ```
2. **Add Per-Item Error Isolation in `SscScraper.prototype.parseLiveExamsJson`**:
   - Wrap each item conversion in `try ... catch`:
     ```javascript
     for (const item of examList) {
       try {
         // normalization and record push
       } catch (itemErr) {
         console.warn(`[SSC] Skipping malformed item ${item?.examCode}: ${itemErr.message}`);
       }
     }
     ```
   - Also coerce numeric timestamps: `typeof item.applicationEndDate === 'number' ? new Date(item.applicationEndDate).toISOString() : ...`
3. **Guard Falsy Errors in `ScraperManager.prototype.scrapeAllDetailed`**:
   - Protect error extraction on line 115:
     ```javascript
     const errorMsg = err?.message || String(err || 'Unknown error');
     errors.push({ source: key, error: errorMsg });
     ```
4. **Fix 404 Non-Retriable Exit in `BaseScraper.prototype.fetchWithRetry`**:
   - Mark non-retriable errors or check `response.status === 404` to rethrow or return without entering retry backoff.
5. **Normalize Internal Whitespace in `UpscScraper.prototype.parseDetailHtml`**:
   - Change `const label = $(cells[0]).text().trim().toLowerCase();` to:
     ```javascript
     const label = $(cells[0]).text().replace(/\s+/g, ' ').trim().toLowerCase();
     ```

---

## 5. Verification Method

To independently reproduce all empirical findings:

1. **Run Full Test Suite**:
   ```powershell
   node --test
   ```
   - **Observed**: 166 pass, 4 fail (`tests/e2e/challenger-m1.test.js`).
2. **Run Challenger Adversarial Fuzzing Suite**:
   ```powershell
   node --test tests/adversarial/scraper-fuzz-stress.test.js
   ```
   - **Observed**: 55/55 pass (stress testing boundaries, concurrency, socket drops, timeouts).
3. **Run Specific Failing Test Cases**:
   ```powershell
   node --test --test-name-pattern="C1.4|C2.7|C3.7|C3.8"
   ```
   - **Observed**: 4 failed tests confirming the exact bugs reported above.
