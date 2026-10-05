# Dispatch for teamwork_preview_worker_m3_1

## Identity
- Role: Milestone 3 Implementation Worker (Standalone CLI & Pipeline Integration)
- TypeName: teamwork_preview_worker
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m3_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read:
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
- Survey Reports 1, 2, and 3:
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_1\handoff.md`
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md`
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3\handoff.md`

### Write Ownership
You EXCLUSIVELY own:
- `src/services/storage/**` (`src/services/storage/dedup-store.js`)
- `src/scripts/pipeline.js`
- `src/scripts/scrape.js`
- `.env.example`
- `package.json` (add `"scrape": "node src/scripts/scrape.js --dry-run"`, `"scrape:notify": "node src/scripts/scrape.js --notify"`)
Do NOT edit files in `src/scrapers/**` or `src/services/email/**`.

### Responsibilities:
1. Implement `src/services/storage/dedup-store.js`:
   - `DedupStore` class managing `data/notified-exams.json` (auto-creating `data/` directory).
   - Generates deterministic 16-char sha256 key from `${exam.organization}:${exam.id || exam.title || exam.examName}:${exam.applicationEndDate || exam.importantDates?.applicationEndDate}`.
   - `filterNewExams(exams)`: Returns array of exams not yet recorded in store.
   - `markAsNotified(exams)`: Adds exams to store with ISO timestamp and writes atomically/safely.
   - Graceful recovery: If the JSON file is corrupt or empty, handles syntax errors gracefully and resets to empty store `{}` without crashing.
2. Implement `src/scripts/pipeline.js`:
   - `runPipeline(options)`: Ties together scrapers, dedup store, and email notification service:
     - Scrapes exams via `ScraperManager`.
     - Filters new unnotified exams via `DedupStore` (unless `options.force` is set).
     - If `--notify` is true, sends notification via `EmailService.sendExamNotification()`.
     - Marks notified exams in `DedupStore`.
     - Returns `{ scrapedCount, newCount, notifiedCount, skippedCount, emailResult, timestamp }`.
3. Implement `src/scripts/scrape.js`:
   - CLI runner runnable via `npm run scrape` or `node src/scripts/scrape.js`.
   - Uses native `node:util.parseArgs` with flags:
     - `-s, --source <source>` (default: `'all'`)
     - `-n, --notify` (send email alerts for new exams)
     - `-e, --email <address>` (recipient email override)
     - `--dry-run` (preview mode, prints JSON to stdout and saves preview without calling Resend API)
     - `-f, --force` (bypass dedup store)
     - `-o, --output <path>` (save output JSON to file)
     - `-h, --help`
   - Interoperates cleanly with `node --test` (exposing test hook when `isTestRunner`).
4. Create `.env.example`:
   - Template with `RESEND_API_KEY`, `SENDER_EMAIL`, `NOTIFICATION_RECIPIENT_EMAIL`, `PORT`.
5. Update `package.json`:
   - Add `"scrape": "node src/scripts/scrape.js --dry-run"` and `"scrape:notify": "node src/scripts/scrape.js --notify"`.
6. Verify your implementation:
   - Run `node src/scripts/scrape.js --dry-run`
   - Run `node src/scripts/scrape.js --help`
   - Run `npm run scrape`
   - Run `node --test tests/unit/dedup.test.js`
   - Run `node --test` across the entire repository to ensure 100% tests pass.
7. Document all commands and outputs in `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m3_1\handoff.md` and notify parent.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-08T22:02:00Z
Received dispatch request to implement Milestone 3: Standalone CLI & Scraper-to-Email Pipeline Integration.
- Implement src/services/storage/dedup-store.js
- Implement src/scripts/pipeline.js
- Implement src/scripts/scrape.js
- Create .env.example
- Update package.json scripts (scrape, scrape:notify)
- Verify with unit tests and full node --test suite.
