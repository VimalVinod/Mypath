# Dispatch for teamwork_preview_worker_m1_1

## Identity
- Role: Milestone 1 Implementation Worker (Scraping Engine)
- TypeName: teamwork_preview_worker
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read ORIGINAL_REQUEST.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
Read PROJECT.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read Explorer Survey Reports:
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_1\handoff.md`
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md`

### Write Ownership
You EXCLUSIVELY own:
- `package.json` (for adding dependencies `cheerio` and running `npm install`)
- `src/scrapers/**` (`src/scrapers/base-scraper.js`, `src/scrapers/upsc-scraper.js`, `src/scrapers/ssc-scraper.js`, `src/scrapers/index.js`)
Do NOT modify files owned by testing (`tests/**`, `TEST_INFRA.md`) or email (`src/services/email/**`).

### Responsibilities:
1. Install necessary dependencies: install `cheerio` (`^1.0.0`) and ensure `npm install` runs successfully.
2. Implement `src/scrapers/base-scraper.js`:
   - Abstract `BaseScraper` class with retry logic, configurable timeout, custom headers (User-Agent), error wrapping, and `NormalizedExamRecord` validation.
3. Implement `src/scrapers/upsc-scraper.js`:
   - Canonical URL `https://www.upsc.gov.in/examinations/active-exams`.
   - Two-tier crawler extracting exam title, detail link, notification date, application deadline (`Last Date for Receipt of Applications`), exam commencement date, and official notification PDF URL.
   - Resilient against HTML formatting changes, handles relative URLs.
   - Includes fallback RSS parsing if active-exams HTML structure changes.
4. Implement `src/scrapers/ssc-scraper.js`:
   - Fast REST API scraper hitting `https://ssc.gov.in/api/admin/5.1/liveExams`.
   - Extracts active exams into `NormalizedExamRecord` with exam code, title, dates, fee, and links.
5. Implement `src/scrapers/index.js` (`ScraperManager`):
   - Aggregates all portal scrapers.
   - Provides `scrapeAll({ source })` with error isolation (if one portal fails, others still return).
6. Verify your implementation by running a test script or node command that scrapes against target portals / local HTML, prints structured JSON containing Exam Name, Organization, and Deadline without crashing or blocking.
7. Document all test commands and verified outputs in your handoff report at `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_1\handoff.md` and send message to parent.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-08T20:15:14Z
You are teamwork_preview_worker_m1_1.
Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_1
Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

Read your dispatch instructions:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_1\DISPATCH.md`
Read `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
1. Install dependencies (`cheerio` in `package.json`, run `npm install`).
2. Implement `src/scrapers/base-scraper.js`, `src/scrapers/upsc-scraper.js`, `src/scrapers/ssc-scraper.js`, `src/scrapers/index.js`.
3. Verify live scraping and mock scraping outputs structured JSON containing Exam Name, Organization, Dates/Deadline without crashing.
4. Document commands and outputs in `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_1\handoff.md` and notify parent.

