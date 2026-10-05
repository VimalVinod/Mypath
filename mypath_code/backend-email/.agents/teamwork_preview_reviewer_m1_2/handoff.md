# Milestone 1 Code Review & Adversarial Critic Report: Exam Scraping Engine

**Reviewer**: `teamwork_preview_reviewer_m1_2`  
**Roles**: reviewer, critic  
**Date**: 2026-09-08T20:31:00Z  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_reviewer_m1_2`  
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Source Files Inspected
The following Milestone 1 implementation files were examined directly in `c:\Users\sindh\Documents\codes\mypath-backend`:
1. `src/scrapers/base-scraper.js` (172 lines)
   - `BaseScraper` class constructor (`lines 18-33`): Configurable `timeoutMs` (default 15000), `retries` (default 2), `retryDelayMs` (default 1000), `userAgent` (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36`).
   - `fetchWithRetry(url, fetchOptions)` (`lines 49-94`): Loop over `maxAttempts = 1 + retries`. Injects browser headers (`User-Agent`, `Accept`, `Accept-Language`). Abort signal with `AbortSignal.timeout(this.options.timeoutMs)`. Retries 5xx and 429 status codes with exponential backoff delay `retryDelayMs * Math.pow(2, attempt - 1)`.
   - `slugify(text)` (`lines 101-108`): Regex lowercasing and character sanitization `text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)`.
   - `validateRecord(record)` (`lines 116-139`): Verifies required contract properties: `id`, `examName`, `organization`, `importantDates`, `importantDates.applicationEndDate`, `officialNotificationUrl`, `scrapedAt`.
   - `normalizeRecord(partialRecord)` (`lines 146-168`): Fills default fallbacks, guarantees ISO `scrapedAt`, and invokes `validateRecord`.

2. `src/scrapers/upsc-scraper.js` (332 lines)
   - Subclasses `BaseScraper('UPSC')`.
   - `parseIndexHtml(html)` (`lines 35-83`): Two-tier extraction strategy: primary selector `.view-content .views-row .views-field-field-exam-name a`, fallback selector `a[href*="/examinations/"]`. Resolves relative URLs to `https://www.upsc.gov.in`. Deduplicates by `detailUrl`.
   - `parseDetailHtml(html, detailUrl, fallbackTitle)` (`lines 92-173`): Cheerio table parser scanning rows (`table tr, .views-table tr`). Maps table headers to `notificationDate`, `applicationStartDate`, `examDate`, `applicationEndDate`, and resolves PDF notification URLs.
   - `parseRssXml(xml)` (`lines 180-225`): XML parser for `https://www.upsc.gov.in/rss.php` extracting item titles, links, pubDate.
   - `scrape(options)` (`lines 250-328`): Fetches index page, handles pagination/limiting with `maxExams` (default 10), introduces sequential request throttle delay `delayMs` (default 250ms), isolates detail-page fetch errors, and falls back to `scrapeRssFallback()` if index fails or returns zero entries.

3. `src/scrapers/ssc-scraper.js` (160 lines)
   - Subclasses `BaseScraper('SSC')`.
   - Endpoints: Live exams API `https://ssc.gov.in/api/admin/5.1/liveExams`, check endpoint `https://ssc.gov.in/api/general-website/portal/lastUpdates`.
   - `hasUpdates(lastKnownTimestamp)` (`lines 32-48`): Performs lightweight check against `lastUpdates` endpoint to avoid unnecessary scrapes.
   - `parseLiveExamsJson(payload)` (`lines 55-130`): Normalizes raw JSON API payload into `NormalizedExamRecord[]`. Accurately maps `examCode`, `examYear`, `applicationStartDate`, `applicationEndDate`, `examDate`, `feeDeadline`, `fee`, `officialNotificationUrl`, and `applicationUrl`.
   - `scrape(options)` (`lines 138-156`): Makes HTTP GET request to `liveExamsApiUrl` with `Referer: https://ssc.gov.in/` header; supports mock injection via `options.jsonData`.

4. `src/scrapers/index.js` (142 lines)
   - `ScraperManager` aggregator registering `upsc` and `ssc` instances.
   - `scrapeAllDetailed(options)` (`lines 84-128`): Concurrently executes scrapers using `Promise.allSettled`. Wraps executions in try/catch to isolate portal failures into `errors` array while preserving surviving results in `records`.
   - `scrapeAll(options)` (`lines 63-74`): Returns record array with non-enumerable `.errors` metadata.

5. `package.json` (`c:\Users\sindh\Documents\codes\mypath-backend\package.json:11`)
   - Verified dependency: `"cheerio": "^1.0.0"`.

### 1.2 Test Execution Results

#### Command 1: Unit & Contract Tests
`node --test tests/unit/scraper.test.js`
```
▶ Scraper Unit & Contract Tests
  ▶ UPSC List Parser
    ✔ should extract active exam list from realistic UPSC HTML fixture (18.5141ms)
    ✔ should handle HTML without exams by returning empty array (1.3505ms)
    ✔ should handle null or undefined input gracefully without throwing (0.2782ms)
  ✔ UPSC List Parser (21.0798ms)
  ▶ UPSC Detail Table Parser
    ✔ should extract dates and official PDF notice from detail sample fixture (7.5078ms)
    ✔ should fallback gracefully when detail page table is missing (0.6713ms)
  ✔ UPSC Detail Table Parser (8.4195ms)
  ▶ SSC Live Exams Parser
    ✔ should normalize live SSC API JSON payload into NormalizedExamRecord array (0.915ms)
    ✔ should return empty array if API returns empty data or error status (0.3509ms)
  ✔ SSC Live Exams Parser (1.5982ms)
✔ Scraper Unit & Contract Tests (31.8418ms)
ℹ tests 7, pass 7, fail 0
```

#### Command 2: Tier 2 Boundary & Corner Case Tests
`node --test tests/e2e/tier2-boundary.test.js`
```
▶ Tier 2: Boundary & Corner Cases (>=5 tests per feature)
  ▶ Boundary 1: Malformed HTML & Missing Tables (5 tests) - pass
  ▶ Boundary 2: Empty API & Abnormal JSON Payloads (5 tests) - pass
  ▶ Boundary 3: Missing & Invalid Date Formats (5 tests) - pass
  ▶ Boundary 4: Expired Deadlines & Urgency Boundaries (5 tests) - pass
  ▶ Boundary 5: Special Characters & XSS Defense (5 tests) - pass
  ▶ Boundary 6: Network Timeout & Retry Simulation (5 tests) - pass
✔ Tier 2: Boundary & Corner Cases (23.9222ms)
ℹ tests 30, pass 30, fail 0
```

#### Command 3: Full Repository Test Suite
`node --test`
```
ℹ tests 93
ℹ suites 24
ℹ pass 93
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 846.7235
```

#### Command 4: Live Network Scraping Verification Probe
`node .agents/teamwork_preview_worker_m1_1/test-live.js`
- Result: Exited with code 0.
- Successfully fetched live data from `ssc.gov.in`:
  - Exam: "Combined Higher Secondary Level (10+2) Examination 2026" (`SSC_CHSL_2026`)
  - Deadline: `2026-10-07T17:30:00.000Z`
  - Notification URL: `https://ssc.gov.in/notice-boards`
- Successfully fetched live data from `upsc.gov.in`:
  - Exam: "Combined Geo-Scientist (Preliminary) Examination, 2027" (`UPSC_combined-geo-scientist-preliminary-examination-2027`)
  - Deadline: `22/09/2026 - 6:00pm`
  - Notification URL: `https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf`
- Aggregated 3 total active exams via `ScraperManager` without blocking or error.

### 1.3 Forensic Integrity Check
- **Hardcoded outputs**: Source code files in `src/scrapers/**` were reviewed line by line. There are NO hardcoded fixtures or test mock outputs embedded in the scraper source files.
- **Facade implementations**: `BaseScraper`, `UpscScraper`, `SscScraper`, and `ScraperManager` implement real HTTP fetching, Cheerio DOM parsing, JSON traversal, retry backoffs, and regex parsing.
- **Shortcuts & external delegation**: The scrapers use standard `fetch` and `cheerio` without delegating to 3rd party SaaS or pre-baked cache stores.
- **No Integrity Violations found.**

---

## 2. Logic Chain

1. **Contract Conformance**:
   - `PROJECT.md` specifies `NormalizedExamRecord` requiring `id`, `examName`, `organization`, `importantDates` (with `applicationEndDate`), `officialNotificationUrl`, and `scrapedAt`.
   - `BaseScraper.validateRecord` directly enforces this schema at runtime.
   - Both `UpscScraper` and `SscScraper` route through `this.normalizeRecord()`, guaranteeing schema compliance.

2. **WAF & Anti-Bot Resilience**:
   - Indian government portals (NIC / Akamai) reject HTTP requests with "bot", "crawler", or "curl" tokens with HTTP 403 Forbidden.
   - `BaseScraper` uses a genuine modern desktop Chrome User-Agent and standard browser `Accept` and `Accept-Language` headers.
   - `SscScraper` provides `Referer: https://ssc.gov.in/`, preventing origin check rejection.
   - Live probe executed during review confirmed zero WAF blocking from both UPSC and SSC portals.

3. **Error Isolation & Fault Tolerance**:
   - In `UpscScraper`, detail page fetches are individually wrapped in `try / catch`, allowing subsequent active exams to be scraped even if one detail page encounters a 404 or formatting anomaly.
   - If the entire active exams index is unavailable, `UpscScraper` automatically falls back to `https://www.upsc.gov.in/rss.php`.
   - In `ScraperManager`, `Promise.allSettled` guarantees that if one portal fails (e.g. SSC API 500), other portals (e.g. UPSC) are returned intact without failing the entire scraper run.

---

## 3. Caveats

1. **UPSC Date Formatting Variability**:
   - UPSC detail pages present dates in text formats such as `22/09/2026 - 6:00pm` or `02/09/2026`. The scraper preserves this string as `importantDates.applicationEndDate` in accordance with the contract (`applicationEndDate: string; // ISO format or clear formatted date string`). Downstream consumer services (e.g., email urgency calculator) must continue to handle both ISO strings and localized date strings gracefully (which is verified in Tier 2 tests).
2. **Sequential Throttle**:
   - UPSC crawls employ a 250ms delay between detail fetches and cap default runs at `maxExams = 10`. This is necessary to avoid triggering rate limits on `upsc.gov.in`.

---

## 4. Conclusion

The Milestone 1 Scraper Engine implementation in `src/scrapers/**` is of high quality, architecturally sound, thoroughly tested, and conforms strictly to `PROJECT.md` and `ORIGINAL_REQUEST.md`.

- **Verdict**: **APPROVE**

---

## 5. Verification Method

To reproduce and verify this review independently:

1. **Unit & Contract Verification**:
   ```powershell
   node --test tests/unit/scraper.test.js
   ```
   *Expected: 7 passed, 0 failed.*

2. **Boundary Stress Testing**:
   ```powershell
   node --test tests/e2e/tier2-boundary.test.js
   ```
   *Expected: 30 passed, 0 failed.*

3. **Full Test Suite Run**:
   ```powershell
   node --test
   ```
   *Expected: 93 passed, 0 failed.*

4. **Live Scrape Target Verification**:
   ```powershell
   node .agents/teamwork_preview_worker_m1_1/test-live.js
   ```
   *Expected: Connects to UPSC and SSC live servers and logs parsed records with Exam Name, Organization, Deadline, and Notification URL.*

5. **Invalidation Conditions**:
   - Alteration of `NormalizedExamRecord` in `PROJECT.md` without corresponding updates in `BaseScraper.validateRecord`.
   - Modifying `BaseScraper`'s User-Agent to include bot tokens that trigger NIC WAF 403 blocks.
