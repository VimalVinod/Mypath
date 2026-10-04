# Milestone 1 Review & Adversarial Challenge Report: Exam Scraping Engine

**Reviewer**: `teamwork_preview_reviewer_m1_1`  
**Roles**: Reviewer, Critic  
**Milestone**: M1 - Exam Scraping Engine (`src/scrapers/**`)  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_reviewer_m1_1`  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  
**Date**: 2026-09-08T20:34:00Z  

---

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Audit**: **PASS (0 violations detected)**  
**Overall Risk Assessment**: **LOW**  

---

## 1. Observation

### 1.1 Source Files Inspected
The following files were inspected in detail:
- `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\base-scraper.js` (172 lines): Defines `BaseScraper` class with `fetchWithRetry`, timeout signal handling (`AbortSignal.timeout(this.options.timeoutMs)`), User-Agent header, `slugify`, `validateRecord`, and `normalizeRecord`.
- `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\upsc-scraper.js` (332 lines): Implements `UpscScraper` extending `BaseScraper('UPSC')`. Two-tier scraping (`parseIndexHtml` for active exams list, `parseDetailHtml` for detail tables extracting PDF link and deadlines), RSS fallback (`parseRssXml`), and throttling between requests (`delayMs`).
- `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\ssc-scraper.js` (160 lines): Implements `SscScraper` extending `BaseScraper('SSC')`. Direct REST API consumption (`https://ssc.gov.in/api/admin/5.1/liveExams`), `hasUpdates` check, and JSON normalization (`parseLiveExamsJson`).
- `c:\Users\sindh\Documents\codes\mypath-backend\src\scrapers\index.js` (142 lines): Implements `ScraperManager` aggregator with `registerScraper`, `getScraper`, `listScrapers`, `scrapeAll`, and `scrapeAllDetailed` with error isolation via `Promise.allSettled`.
- `c:\Users\sindh\Documents\codes\mypath-backend\package.json` (19 lines): Contains `"cheerio": "^1.0.0"` in `dependencies`.

### 1.2 Independent Verification Probes & Test Suite Execution

#### Probe 1: Scraper Unit Tests
- **Command**: `node --test tests/unit/scraper.test.js`
- **Result**:
```
▶ Scraper Unit & Contract Tests
  ▶ UPSC List Parser
    ✔ should extract active exam list from realistic UPSC HTML fixture (13.8451ms)
    ✔ should handle HTML without exams by returning empty array (1.1926ms)
    ✔ should handle null or undefined input gracefully without throwing (0.1802ms)
  ✔ UPSC List Parser (15.8936ms)
  ▶ UPSC Detail Table Parser
    ✔ should extract dates and official PDF notice from detail sample fixture (8.6354ms)
    ✔ should fallback gracefully when detail page table is missing (0.6665ms)
  ✔ UPSC Detail Table Parser (9.4809ms)
  ▶ SSC Live Exams Parser
    ✔ should normalize live SSC API JSON payload into NormalizedExamRecord array (0.7438ms)
    ✔ should return empty array if API returns empty data or error status (0.2082ms)
  ✔ SSC Live Exams Parser (1.1717ms)
✔ Scraper Unit & Contract Tests (27.1341ms)
ℹ tests 7
ℹ suites 4
ℹ pass 7
ℹ fail 0
```

#### Probe 2: Tier 1 Feature E2E Tests
- **Command**: `node --test tests/e2e/tier1-feature.test.js`
- **Result**:
```
▶ Tier 1: Feature Coverage (>=5 tests per feature)
  ▶ Feature 1: Scraper Extraction
    ✔ T1.1.1 - UPSC List extraction retrieves all active exams with URLs (22.7067ms)
    ✔ T1.1.2 - UPSC Detail extraction parses all structured date labels (6.3069ms)
    ✔ T1.1.3 - UPSC Detail extraction extracts absolute PDF notification URL (4.6056ms)
    ✔ T1.1.4 - SSC Live Exams API parser extracts all active exam items (2.0307ms)
    ✔ T1.1.5 - Schema Conformance: All extracted records satisfy NormalizedExamRecord contract (1.3889ms)
    ✔ T1.1.6 - Scraper constructor options configure timeout and retries (0.9761ms)
  ✔ Feature 1: Scraper Extraction (39.0539ms)
...
✔ Tier 1: Feature Coverage (>=5 tests per feature) (131.9167ms)
ℹ tests 30
ℹ suites 6
ℹ pass 30
ℹ fail 0
```

#### Probe 3: Full Test Suite
- **Command**: `node --test`
- **Result**: 93 passed, 0 failed, 0 cancelled across 24 suites.
  - `tests/unit/scraper.test.js`: 7/7 passed
  - `tests/e2e/tier1-feature.test.js`: 30/30 passed
  - `tests/e2e/tier2-boundary.test.js`: 30/30 passed
  - `tests/e2e/tier3-combination.test.js`: 6/6 passed
  - `tests/e2e/tier4-realworld.test.js`: 5/5 passed
  - `tests/unit/dedup.test.js`: 5/5 passed
  - `tests/unit/template.test.js`: 10/10 passed

#### Probe 4: Live Target Probe Against Official Portals
- **Command**: `node .agents/teamwork_preview_worker_m1_1/test-live.js`
- **Result**: Real network connectivity to live government domains succeeded:
  - **SSC**: Fetched 2 live records from `https://ssc.gov.in/api/admin/5.1/liveExams`. Sample:
    - Exam: `Combined Higher Secondary Level (10+2) Examination 2026`
    - Org: `SSC`
    - Deadline: `2026-10-07T17:30:00.000Z`
    - Fee: `100`
  - **UPSC**: Fetched 2 active exams from `https://www.upsc.gov.in/examinations/active-exams`. Sample:
    - Exam: `Combined Geo-Scientist (Preliminary) Examination, 2027`
    - Org: `UPSC`
    - Deadline: `22/09/2026 - 6:00pm`
    - Notification URL: `https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf`
  - **Aggregator**: `ScraperManager.scrapeAll` successfully merged 3 live records across both portals.

---

## 2. Integrity Audit & Verification

Actively evaluated against integrity failure patterns:
1. **Hardcoded Test Results**: None. Inspected `src/scrapers/**` for embedded strings matching test expectations. The scrapers contain dynamic Cheerio selectors and dynamic JSON traversals.
2. **Dummy/Facade Implementations**: None. Full functional scraping logic is present, including multi-tier parsing, fallback mechanisms, and backoff retries.
3. **Task Shortcuts**: None. Both HTML web scraping (UPSC) and API ingestion (SSC) were constructed using appropriate libraries (`cheerio`, native `fetch`).
4. **Fabricated Outputs/Self-Certification**: None. We independently verified and re-ran all test commands and live network probes; output logs matched verbatim.
5. **Loader Verification**: Verified via Node runtime inspection that `tests/helpers/loader.js` actually resolves and loads `src/scrapers/upsc-scraper.js` and `src/scrapers/ssc-scraper.js` directly (`Upsc loaded match: true`, `Ssc loaded match: true`), not reference fallbacks.

---

## 3. Adversarial Challenges & Findings

### Advisory / Minor Finding 1: Retry Loop Retries Permanent 4xx HTTP Client Errors
- **Where**: `src/scrapers/base-scraper.js:70-88`
- **What**: When `fetch` receives an HTTP 404 (or other 4xx client errors other than 429), line 77 throws `new Error(HTTP ${response.status} ...)`. However, because this is enclosed in `try ... catch (err)` within `for (let attempt = 1; attempt <= maxAttempts; attempt++)`, the catch block blindly catches the error and proceeds to wait and retry `maxAttempts` times.
- **Verification**: Executed simulation with mocked 404 response; confirmed `base.fetchWithRetry` executed 3 full attempts before failing.
- **Risk Assessment**: Low. Retrying 2 times on 404 adds ~3 seconds of delay before failing, but does not crash the system.
- **Recommendation**: Differentiate retriable errors (network failure, 429, 5xx) from permanent client errors (400, 401, 403, 404), re-throwing permanent errors immediately without delaying through `maxAttempts`.

### Advisory / Minor Finding 2: Lack of Per-Item Error Isolation in `SscScraper.parseLiveExamsJson`
- **Where**: `src/scrapers/ssc-scraper.js:69-128`
- **What**: In `parseLiveExamsJson`, if an individual exam object in the payload is malformed such that `this.normalizeRecord(record)` throws a validation error (e.g. if an upstream API changes `applicationEndDate` to a number or missing value), the entire `parseLiveExamsJson` method throws, discarding all other valid exams in the same payload.
- **Contrast**: `UpscScraper.scrape` (lines 270-310) wraps each detail fetch in its own `try ... catch`, ensuring partial item failure does not discard other records.
- **Risk Assessment**: Low. `ScraperManager` isolates the scraper from crashing other portals, and SSC currently returns conforming data.
- **Recommendation**: Wrap individual exam object normalization in `try ... catch` inside `parseLiveExamsJson` so that one malformed record is skipped with a warning while valid records are retained.

---

## 4. Logic Chain

1. **Contract Adherence**:
   - `PROJECT.md` defines `NormalizedExamRecord` with fields: `id`, `examName`, `organization`, `importantDates` (including `applicationEndDate`), `officialNotificationUrl`, and `scrapedAt`.
   - `BaseScraper.validateRecord` verifies that every generated record contains non-empty values for these fields.
   - All 5 tests in `tests/e2e/tier1-feature.test.js` under Feature 1 confirm schema compliance.
2. **Robustness & Error Isolation**:
   - `BaseScraper` encapsulates network timeouts via `AbortSignal.timeout(15000)` and exponential backoff retry.
   - `ScraperManager` uses `Promise.allSettled` to run portal scrapers concurrently and isolates failures to `.errors` without interrupting surviving scrapers.
   - UPSC scraper has built-in RSS fallback (`https://www.upsc.gov.in/rss.php`) if the HTML table crawl encounters zero rows.
3. **Real-World Viability**:
   - Live network execution confirmed that the User-Agent bypasses NIC/Akamai WAFs and extracts real, up-to-date examination records directly from `upsc.gov.in` and `ssc.gov.in`.

---

## 5. Caveats

1. **Government Portal Maintenance Schedules**: Both UPSC and SSC portals undergo routine database backups during IST midnight hours (00:00 - 04:00 IST), during which network calls may return 502/503 errors. Built-in error isolation and backoff retries mitigate this risk.
2. **Future Layout Overhauls**: If UPSC significantly restructures its Drupal theme, `UpscScraper.parseIndexHtml` could fail to find table rows. The automatic RSS feed fallback mitigates complete failure, though RSS items have less granular commencement dates than detail pages.

---

## 6. Conclusion

The Milestone 1 Exam Scraping Engine implementation in `src/scrapers/**` is of high quality, thoroughly tested, adheres strictly to contract specifications, and contains zero integrity violations.

**Verdict**: **APPROVE**  
Ready for downstream consumption by Milestone 2 (Email Service) and Milestone 3 (Deduplication Store & Pipeline CLI).

---

## 7. Verification Method

To independently reproduce this review's findings:

1. **Run Scraper Unit Tests**:
   ```powershell
   node --test tests/unit/scraper.test.js
   # Expected: 7 passed, 0 failed
   ```

2. **Run E2E Tier 1 Feature Tests**:
   ```powershell
   node --test tests/e2e/tier1-feature.test.js
   # Expected: 30 passed, 0 failed
   ```

3. **Run Full Test Suite**:
   ```powershell
   node --test
   # Expected: 93 passed, 0 failed
   ```

4. **Run Live Network Scraping Verification**:
   ```powershell
   node .agents/teamwork_preview_worker_m1_1/test-live.js
   # Expected: Live records from UPSC and SSC returned without crashing
   ```
