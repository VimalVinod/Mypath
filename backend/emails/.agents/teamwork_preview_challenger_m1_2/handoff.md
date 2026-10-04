# Milestone 1 Empirical Challenger Handoff Report

**Agent**: `teamwork_preview_challenger_m1_2`  
**Milestone**: M1 - Exam Scraping Engine (`src/scrapers/**`)  
**Date**: 2026-09-08T20:36:00Z  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  
**Verdict**: **`REJECT`**  

---

## 1. Observation

### 1.1 Empirical Challenge Test Suite Execution
Created empirical test suite `c:\Users\sindh\Documents\codes\mypath-backend\tests\e2e\challenger-m1.test.js` containing 22 targeted empirical stress tests.
Executed command:
```powershell
node --test tests/e2e/challenger-m1.test.js
```

**Verbatim Output**:
```
▶ Milestone 1 Empirical Challenger Suite
  ▶ Dimension 1: Network Edge Cases & Timeout Handling
    ✔ C1.1 - fetchWithRetry should abort promptly when timeoutMs is exceeded (217.4846ms)
    ✔ C1.2 - fetchWithRetry succeeds after transient 503 errors via exponential backoff (186.3264ms)
    ✔ C1.3 - fetchWithRetry exhausts all retries and throws descriptive error on persistent 500 (81.1586ms)
    ✖ C1.4 - fetchWithRetry does not retry 404 client errors endlessly (167.1181ms)
    ✔ C1.5 - Unreachable DNS / host throws clean error without hanging (14.4772ms)
    ✔ C1.6 - UpscScraper detail page failure gracefully falls back to stub record (9.6074ms)
    ✔ C1.7 - UpscScraper activates RSS fallback when index returns 0 exams (3.0139ms)
  ✖ Dimension 1: Network Edge Cases & Timeout Handling (692.6335ms)
  ▶ Dimension 2: Concurrency, Error Isolation & Manager Robustness
    ✔ C2.1 - 25 concurrent scrapeAll calls produce zero state leakage or collisions (31.787ms)
    ✔ C2.2 - Asymmetric failure: 1 failing portal does not drop surviving portals (0.6626ms)
    ✔ C2.3 - Scraper rejecting with string error is safely caught and formatted (0.332ms)
    ✖ C2.7 - Scraper rejecting with null or undefined (0.6493ms)
    ✔ C2.4 - High volume aggregation handles 2,000 records smoothly (5.54ms)
    ✔ C2.5 - Source filtering handles subset and invalid keys gracefully (0.3503ms)
    ✔ C2.6 - registerScraper rejects invalid instances not extending BaseScraper (0.2925ms)
  ✖ Dimension 2: Concurrency, Error Isolation & Manager Robustness (40.0776ms)
  ▶ Dimension 3: Boundary Exam Fields, Unicode & Dates
    ✔ C3.1 - BaseScraper.slugify handles non-Latin Unicode / Hindi characters (0.4337ms)
    ✔ C3.2 - Multi-line exam title with newlines and carriage returns is normalized (0.2538ms)
    ✔ C3.3 - UPSC detail table parser handles varied date formats and extra whitespace (6.0952ms)
    ✔ C3.4 - SSC JSON parser handles boundary data types (fees, missing fields, nulls) (0.6189ms)
    ✔ C3.5 - Extremely long exam title (500+ chars) generates bounded slug and valid record (0.4858ms)
    ✔ C3.6 - validateRecord strictly enforces all required fields and rejects malformed objects (0.3482ms)
    ✖ C3.7 - SSC batch resilience when 1 of 5 items has numeric timestamp applicationEndDate (0.3903ms)
    ✖ C3.8 - BaseScraper.slugify must generate distinct non-empty IDs for distinct Devanagari/Hindi exam titles (0.2579ms)
  ✖ Dimension 3: Boundary Exam Fields, Unicode & Dates (9.3184ms)
✖ Milestone 1 Empirical Challenger Suite (743.1616ms)
ℹ tests 22
ℹ suites 4
ℹ pass 18
ℹ fail 4
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1550.7492
```

---

### 1.2 Verbatim Defect Reproductions

#### Defect 1: Unconditional Retry of Non-Retriable 4xx Client Errors in `BaseScraper.fetchWithRetry`
- **Location**: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\base-scraper.js:70-89`
- **Source Code**:
  ```javascript
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
  ```
- **Observed Failure in Test C1.4**:
  ```
  ✖ C1.4 - fetchWithRetry does not retry 404 client errors endlessly (167.1181ms)
    AssertionError [ERR_ASSERTION]: 404 should not be retried
    4 !== 1
  ```
- **Empirical Impact**: When encountering HTTP 404 (e.g., deleted notification PDF or changed URL) or HTTP 403 (forbidden), `fetchWithRetry` retries 4 times with exponential backoff rather than failing immediately. This amplifies request volume 4x against government portals and incurs pointless latency.

---

#### Defect 2: Uncaught `TypeError` in `ScraperManager` Catch Block on `null`/`undefined`
- **Location**: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\index.js:114-118`
- **Source Code**:
  ```javascript
  } catch (err) {
    errors.push({
      source: key,
      error: err.message || String(err)
    });
    console.error(`[ScraperManager] Scraper "${key}" failed gracefully: ${err.message}`);
  }
  ```
- **Observed Failure in Test C2.7**:
  ```
  ✖ C2.7 - Scraper rejecting with null or undefined (0.6493ms)
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    0 !== 1
  ```
- **Empirical Impact**: If a scraper rejects with `null` or `undefined` (e.g. `Promise.reject(null)` or third-party scraper failure), `err.message` evaluates on line 115 and line 118, throwing `TypeError: Cannot read properties of null (reading 'message')`. Because this occurs inside `catch (err)`, `errors.push` is bypassed, the promise in `targets.map` rejects unhandled, and `errors` array remains empty (`0 !== 1`), silently dropping error reporting.

---

#### Defect 3: Batch Poisoning in `SscScraper.parseLiveExamsJson`
- **Location**: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\ssc-scraper.js:69-127`
- **Source Code**:
  ```javascript
  for (const item of examList) {
    if (!item || typeof item !== 'object') continue;
    ...
    const record = this.normalizeRecord({ ... });
    records.push(record);
  }
  ```
- **Observed Failure in Test C3.7**:
  ```
  ✖ C3.7 - SSC batch resilience when 1 of 5 items has numeric timestamp applicationEndDate (0.3903ms)
    AssertionError [ERR_ASSERTION]: Single item error crashed entire batch: [SSC] Validation error: "importantDates.applicationEndDate" is required and must be a string
  ```
- **Empirical Impact**: If a single exam in the SSC REST API payload has an unexpected data type (such as a numeric epoch timestamp `1728000000000` or invalid dates), `this.normalizeRecord` throws a validation exception. Because there is no per-item try-catch, the entire loop terminates immediately and all subsequent valid exams in the feed are completely dropped.

---

#### Defect 4: Deterministic ID Collision on Non-Latin / Devanagari Exam Titles
- **Location**: `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\base-scraper.js:101-108, 148`
- **Source Code**:
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
- **Node Execution**:
  ```powershell
  node -e "
  const BaseScraper = require('./src/scrapers/base-scraper');
  const b = new BaseScraper('UPSC');
  console.log('slug1:', b.slugify('सहायक निदेशक परीक्षा'));
  console.log('slug2:', b.slugify('वैज्ञानिक अधिकारी परीक्षा'));
  const rec1 = b.normalizeRecord({ examName: 'सहायक निदेशक परीक्षा', importantDates: { applicationEndDate: '2026-10-01' }, officialNotificationUrl: 'http://test' });
  const rec2 = b.normalizeRecord({ examName: 'वैज्ञानिक अधिकारी परीक्षा', importantDates: { applicationEndDate: '2026-10-01' }, officialNotificationUrl: 'http://test' });
  console.log('rec1.id:', rec1.id, 'rec2.id:', rec2.id, 'Collided:', rec1.id === rec2.id);
  "
  ```
  Output:
  ```
  slug1: ""
  slug2: ""
  rec1.id: UPSC_ rec2.id: UPSC_ Collided: true
  ```
- **Observed Failure in Test C3.8**:
  ```
  ✖ C3.8 - BaseScraper.slugify must generate distinct non-empty IDs for distinct Devanagari/Hindi exam titles (0.2579ms)
    AssertionError [ERR_ASSERTION]: Slug must not be empty string for valid Hindi title
    '' !== ''
  ```
- **Empirical Impact**: Indian central government exam portals publish notifications in both English and Hindi. When Hindi titles are scraped, `slugify` strips all Devanagari characters, returning `""`. `normalizeRecord` generates the identical ID `"UPSC_"` for all such exams. When processed by `DedupStore`, one exam will overwrite or discard the other.

---

## 2. Logic Chain

1. **Premise 1 (Network Policy)**: `BaseScraper` contract requires intelligent retry logic: retrying transient 5xx server errors and 429 rate limits, while failing non-retriable 4xx client errors immediately.
   - *Observation 1.2, Defect 1*: `fetchWithRetry` catches all thrown errors and unconditionally executes retry delays for 404s. This causes 4x redundant network traffic against government servers.

2. **Premise 2 (Aggregator Error Isolation)**: `ScraperManager` contract requires strict error isolation so that any failure in one scraper does not crash the process or swallow diagnostic error records.
   - *Observation 1.2, Defect 2*: When a scraper rejects with `null` or `undefined`, accessing `err.message` in the catch block throws an unhandled `TypeError`, crashing the async worker and leaving `detailed.errors` completely empty.

3. **Premise 3 (Batch Resiliency)**: In live government APIs (like SSC REST API), data schemas can contain occasional irregularities (e.g. integer timestamps or partial records).
   - *Observation 1.2, Defect 3*: A single malformed record halts the entire `parseLiveExamsJson` loop, discarding all valid examinations in the same payload.

4. **Premise 4 (Unique Identification & Deduplication)**: `PROJECT.md:70` specifies `NormalizedExamRecord.id` as a "Unique deterministic key".
   - *Observation 1.2, Defect 4*: Non-Latin / Devanagari titles result in empty slugs (`""`), causing all Hindi exams to collapse to `"UPSC_"`, creating deterministic ID collisions that corrupt deduplication stores.

5. **Logical Deduction**: Because the scraping engine exhibits retry amplification, batch poisoning, unhandled crash vectors, and ID collision vulnerabilities under empirical edge conditions, Milestone 1 cannot be approved in its current state.

---

## 3. Caveats

1. **Live Network Probes**: Live scraping probes against `https://www.upsc.gov.in/examinations/active-exams` and `https://ssc.gov.in/api/admin/5.1/liveExams` currently return HTTP 200 and valid data when using standard browser headers.
2. **Happy Path Tests**: The existing 88 baseline unit and boundary tests all pass because they only test English exam titles and well-formed mock payloads without triggering the edge-case branches identified above.
3. **Review-Only Constraint**: As per challenger instructions, no production source code in `src/scrapers/**` was modified.

---

## 4. Conclusion

**Verdict: `REJECT`**

Milestone 1 is **REJECTED** pending resolution of the following 4 required fixes:
1. **Fix in `BaseScraper.fetchWithRetry`**: Check if error is non-retriable (e.g. 4xx other than 429) or check response status before retrying; do not retry 404/403 errors.
2. **Fix in `ScraperManager`**: Safely extract error messages using `err?.message || String(err || 'Unknown error')` and prevent uncaught exceptions inside the catch block.
3. **Fix in `SscScraper.parseLiveExamsJson`**: Wrap each item normalization in an individual try-catch or coerce `applicationEndDate` to string (`String(item.applicationEndDate)` or ISO conversion) so one faulty record does not crash the entire batch.
4. **Fix in `BaseScraper.slugify`**: Fall back to hash or alphanumeric fallback when `slugify` returns empty string (e.g. `crypto.createHash('md5').update(text).digest('hex').slice(0, 12)`), ensuring unique non-empty IDs for Devanagari titles.

---

## 5. Verification Method

To independently verify these findings, run:

1. **Run the Empirical Challenger Test Suite**:
   ```powershell
   node --test tests/e2e/challenger-m1.test.js
   ```
   - **Expected Result**: 18 passed, 4 failed (demonstrating Defects 1, 2, 3, and 4 verbatim).

2. **Run the Hindi ID Collision Verification**:
   ```powershell
   node -e "const BaseScraper = require('./src/scrapers/base-scraper'); const b = new BaseScraper('UPSC'); console.log(b.normalizeRecord({ examName: 'सहायक निदेशक परीक्षा', importantDates: { applicationEndDate: '2026-10-01' }, officialNotificationUrl: 'http://test' }).id);"
   ```
   - **Expected Result**: Prints `UPSC_` (empty slug).

3. **Invalidation Conditions**:
   - Updates to `BaseScraper.fetchWithRetry` stopping retries on 404.
   - Safe error handling in `ScraperManager` for `null`/`undefined`.
   - Per-record error isolation or type coercion in `SscScraper.parseLiveExamsJson`.
   - Fallback hashing for non-ASCII titles in `BaseScraper.slugify`.
