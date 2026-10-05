# Milestone 3 Handoff Report: Standalone CLI & Scraper-to-Email Pipeline Integration

**Agent**: `teamwork_preview_worker_m3_1`  
**Role**: Milestone 3 Implementation Worker (Standalone CLI & Pipeline Integration)  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  
**Date**: 2026-09-08T22:08:00Z  
**Target Repository**: `c:\Users\sindh\Documents\codes\mypath-backend`

---

## 1. Observation

### 1.1 Initial Repository State
1. **Files present before M3**:
   - `src/scrapers/`: `base-scraper.js`, `upsc-scraper.js`, `ssc-scraper.js`, `index.js` (ScraperManager aggregator).
   - `src/services/email/`: `email-service.js`, `template.js`.
   - `src/scripts/`: `test-email.js`.
   - `tests/helpers/`: `loader.js` (loaded reference fallbacks for `dedup-store.js` and `pipeline.js` when files were missing).
   - `tests/`: Tiers 1-4 E2E test suites, unit tests for scrapers, templates, and dedup.
2. **Missing components assigned to Milestone 3**:
   - `src/services/storage/dedup-store.js` (did not exist).
   - `src/scripts/pipeline.js` (did not exist).
   - `src/scripts/scrape.js` (did not exist).
   - `.env.example` (did not exist).
   - `package.json` scripts: `"scrape"` and `"scrape:notify"` were missing.

### 1.2 Implemented Components
1. **`src/services/storage/dedup-store.js`**:
   - Implemented `DedupStore` class managing `data/notified-exams.json` (auto-creates `data/` directory via `fs.mkdirSync(dir, { recursive: true })`).
   - `generateKey(exam)`: Deterministic 16-character sha256 hash using `crypto.createHash('sha256')` from format `${exam.organization}:${exam.id || exam.title || exam.examName}:${exam.applicationEndDate || exam.importantDates?.applicationEndDate}`.
   - `filterNewExams(exams)`: Returns unnotified exam records.
   - `markAsNotified(exams)`: Appends exam records with ISO timestamp and writes atomically via temporary file with direct fallback.
   - `isNotified(exam)`: Boolean lookup helper.
   - Graceful corruption recovery: Handles missing files, empty files, and syntax errors by defaulting to `{}` without throwing.

2. **`src/scripts/pipeline.js`**:
   - Exported `runPipeline(options)` orchestrating `ScraperManager` -> `DedupStore` -> `EmailService`.
   - Supports portal scraping (`options.source`), pre-scraped items (`options.exams`), and mock fixtures (`options.mock`, `options.mockData`).
   - Deduplication filtering via `DedupStore.filterNewExams()` unless `options.force` is true.
   - Dispatches or previews notifications via `EmailService.sendExamNotification()`.
   - Updates deduplication store upon successful live send (skips marking in dry-run mode unless forced).
   - Returns structured summary: `{ scrapedCount, newCount, notifiedCount, skippedCount, emailResult, timestamp, exams, newExams }`.

3. **`src/scripts/scrape.js`**:
   - CLI runner supporting `npm run scrape` or `node src/scripts/scrape.js`.
   - Native flag parsing with `node:util.parseArgs`:
     - `-s, --source <source>` (default: `'all'`)
     - `-n, --notify` (send email alerts for new exams via Resend)
     - `-e, --email <address>` (recipient email override)
     - `--dry-run` (preview mode, prints JSON to stdout and saves preview without calling Resend API)
     - `-f, --force` (bypass dedup store)
     - `-o, --output <path>` (save output JSON to file)
     - `--mock` (use mock exam fixtures instead of live network calls)
     - `-h, --help` (display CLI help)
   - Guarded by `if (require.main === module)` for clean test runner interop.

4. **`.env.example`**:
   - Documents `RESEND_API_KEY`, `SENDER_EMAIL`, `NOTIFICATION_RECIPIENT_EMAIL`, and `PORT`.
   - Explains Resend test sandbox recipient restrictions (`onboarding@resend.dev`) vs verified custom domain requirements.

5. **`package.json`**:
   - Added `"scrape": "node src/scripts/scrape.js --dry-run"`.
   - Added `"scrape:notify": "node src/scripts/scrape.js --notify"`.
   - Added `"test": "node --test"`.

6. **`tests/unit/pipeline.test.js`**:
   - Added 8 unit tests covering pipeline mock filtering, empty input handling, dedup filtering, force flag, file output, CLI arg parsing, help exit code, and dry-run execution.

### 1.3 Execution Verifications
- **Command**: `node --test tests/unit/dedup.test.js`
  - Output: `5 pass, 0 fail` (duration: 177ms).
- **Command**: `node --test tests/unit/pipeline.test.js`
  - Output: `8 pass, 0 fail` (duration: 468ms).
- **Command**: `node src/scripts/scrape.js --help`
  - Output: Printed full usage and options with exit code 0.
- **Command**: `node src/scripts/scrape.js --dry-run`
  - Output: Connected to live UPSC and SSC portals, scraped 12 live examinations, saved HTML preview to `output/email-preview.html`, printed structured JSON to stdout, and exited with code 0.
- **Command**: `npm run scrape`
  - Output: Executed `node src/scripts/scrape.js --dry-run`, successfully scraped 12 exams, generated email preview, exited with code 0.
- **Command**: `node --test` (Repository wide)
  - Output: `179 pass, 0 fail, 44 suites` (duration: 2045ms).
- **Verification of real class loading via loader**:
  - `DedupStore loaded is our real class: true`
  - `Pipeline loaded is our real pipeline: true`

---

## 2. Logic Chain

1. **Deterministic Hashing & Dedup Store Integrity**:
   - Observation 1.2.1 shows that each exam has an conducting organization, an identifier (id, examName, or title), and an application deadline.
   - Hashing `${exam.organization}:${exam.id || exam.title || exam.examName}:${deadline}` with SHA-256 and taking the first 16 hex characters produces a collision-resistant, compact string key.
   - Tests confirm identical exams produce identical keys (`key1 === key2`), different exams produce different keys (`key1 !== key2`), and different organizations for exams with identical titles produce distinct keys (`keyUPSC !== keySSC`).
   - Wrapping `fs.readFileSync` and `JSON.parse` in a try/catch block ensures that corrupted JSON or empty files gracefully reset to `{}` without terminating the process, satisfying the auto-healing requirement.

2. **Pipeline Integration & Dry-Run vs Live Mode**:
   - The original user request specifies standalone execution where results of the scraper are passed into the email notification sender.
   - In live mode (`--notify` without `--dry-run`), newly discovered exams are dispatched through `EmailService.sendExamNotification()` and recorded in `DedupStore`.
   - In dry-run mode (`--dry-run`), the HTML template is rendered and saved to `output/email-preview.html`, providing visual verification without expending Resend API credits or requiring live credentials.
   - In mock mode (`--mock`), pipeline execution bypasses network scraping and uses local fixtures, enabling offline testing.

3. **CLI Runner Modularity**:
   - `node:util.parseArgs` handles POSIX-compliant options (`-s`, `-n`, `-e`, `-f`, `-o`, `-h`, `--dry-run`, `--mock`).
   - Exporting `main`, `parseCliArgs`, and `cliOptionsSchema` allows other modules and unit test harnesses to inspect and execute CLI functionality without spawning child processes.
   - Protecting `main()` with `if (require.main === module)` prevents spurious execution when imported by test suites or other tools.

---

## 3. Caveats

1. **Resend API Key for Live Email Delivery**:
   - An actual `RESEND_API_KEY` is not present in `.env`. Live email dispatches require configuring `RESEND_API_KEY` in `c:\Users\sindh\Documents\codes\mypath-backend\.env`.
   - When using Resend's test sender `onboarding@resend.dev`, delivery is restricted by Resend to the email address registered with the Resend account.
2. **Government Portal Availability**:
   - Live scraping (`npm run scrape`) queries live UPSC and SSC websites over the public internet. If government servers undergo maintenance or throttle connections, the error isolation built into `ScraperManager` handles the failures gracefully.
   - For offline or air-gapped verification, `--mock` flag is available.

---

## 4. Conclusion

Milestone 3 is 100% complete and verified:
- `src/services/storage/dedup-store.js` provides deterministic SHA-256 deduplication and corruption resilience.
- `src/scripts/pipeline.js` seamlessly connects scrapers, dedup store, and email delivery.
- `src/scripts/scrape.js` provides the standalone CLI runner with full argument parsing.
- `.env.example` provides the environment configuration template.
- `package.json` includes `"scrape"`, `"scrape:notify"`, and `"test"` scripts.
- All 179 repository tests pass with 0 failures and 0 regressions.

---

## 5. Verification Method

To independently verify the implementation, execute the following commands in `c:\Users\sindh\Documents\codes\mypath-backend`:

1. **Verify DedupStore Unit Tests**:
   ```powershell
   node --test tests/unit/dedup.test.js
   ```
   *Expected*: 5 passing tests, 0 failures.

2. **Verify Pipeline & CLI Runner Unit Tests**:
   ```powershell
   node --test tests/unit/pipeline.test.js
   ```
   *Expected*: 8 passing tests, 0 failures.

3. **Verify CLI Help Screen**:
   ```powershell
   node src/scripts/scrape.js --help
   ```
   *Expected*: Displays usage instructions, options (`-s`, `-n`, `-e`, `--dry-run`, `-f`, `-o`, `--mock`, `-h`), exits with code 0.

4. **Verify Dry-Run Scrape Command (`npm run scrape`)**:
   ```powershell
   npm run scrape
   ```
   *Expected*: Connects to portals (or use `node src/scripts/scrape.js --dry-run --mock`), prints structured JSON to stdout, saves preview to `output/email-preview.html`, prints summary, exits with code 0.

5. **Verify Full Repository Test Suite**:
   ```powershell
   node --test
   ```
   *Expected*: 179 tests pass across 44 test suites, 0 failures.

6. **Invalidation Conditions**:
   - Changes would be invalidated if `data/notified-exams.json` schema is altered to be incompatible with `generateKey()`.
