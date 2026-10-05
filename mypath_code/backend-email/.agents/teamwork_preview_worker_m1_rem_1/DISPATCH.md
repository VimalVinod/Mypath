# Dispatch for teamwork_preview_worker_m1_rem_1

## Identity
- Role: Milestone 1 Remediation Worker
- TypeName: teamwork_preview_worker
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_rem_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read ORIGINAL_REQUEST.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
Read PROJECT.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read Challenger Reports:
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_challenger_m1_1\handoff.md`
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_challenger_m1_2\handoff.md`

### Write Ownership
You EXCLUSIVELY own:
- `src/scrapers/base-scraper.js`
- `src/scrapers/upsc-scraper.js`
- `src/scrapers/ssc-scraper.js`
- `src/scrapers/index.js`

### Responsibilities:
Fix the 5 specific vulnerabilities identified by Challenger 1 and Challenger 2:
1. `BaseScraper.prototype.fetchWithRetry` (`src/scrapers/base-scraper.js`):
   - When `!response.ok`, if `response.status === 404` or any non-retriable 4xx (except 429), do NOT retry and do NOT sleep in retry backoff. Throw immediately or break out of the retry loop.
2. `BaseScraper.prototype.slugify` (`src/scrapers/base-scraper.js`):
   - When text consists of Devanagari/Hindi or special characters, `replace(/[^a-z0-9]+/g, '-')` strips everything into `""`.
   - Add fallback: if `cleaned` is empty, compute a deterministic 10-char hash: `const hash = crypto.createHash('md5').update(String(text)).digest('hex').slice(0, 10); return 'exam-' + hash;`.
3. `SscScraper.prototype.parseLiveExamsJson` (`src/scrapers/ssc-scraper.js`):
   - Wrap each item in the parsing loop inside a `try ... catch (itemErr)` block so one malformed item never drops the entire batch of exams. Log a warning and continue processing remaining items.
   - Support numeric timestamp deadline dates: if `typeof item.applicationEndDate === 'number'`, coerce via `new Date(item.applicationEndDate).toISOString()`.
4. `ScraperManager.prototype.scrapeAllDetailed` (`src/scrapers/index.js`):
   - Handle falsy/null/undefined error rejections safely:
     `const errorMsg = (err && typeof err === 'object' && err.message) ? err.message : String(err || 'Unknown error');`
     `errors.push({ source: key, error: errorMsg });`
5. `UpscScraper.prototype.parseDetailHtml` (`src/scrapers/upsc-scraper.js`):
   - Normalize internal whitespace when reading cell labels:
     `const label = $(cells[0]).text().replace(/\s+/g, ' ').trim().toLowerCase();`

### Verification:
Run:
```bash
node --test tests/e2e/challenger-m1.test.js
node --test tests/adversarial/scraper-fuzz-stress.test.js
node --test
```
Ensure 100% of all tests pass (0 failures).
Document commands and outputs in `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_rem_1\handoff.md` and notify parent.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-09T02:07:21Z
You are teamwork_preview_worker_m1_rem_1.
Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_rem_1
Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

Your mission:
Fix the 5 specific vulnerabilities in `src/scrapers/**`:
1. 404/non-retriable 4xx client errors in `BaseScraper.fetchWithRetry`.
2. Devanagari/Hindi fallback in `BaseScraper.slugify`.
3. Per-item try/catch isolation & timestamp coercion in `SscScraper.parseLiveExamsJson`.
4. Falsy/null error handling in `ScraperManager.scrapeAllDetailed`.
5. Whitespace normalization in `UpscScraper.parseDetailHtml`.

Verify by running `node --test tests/e2e/challenger-m1.test.js` and `node --test`.
Write handoff report to `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m1_rem_1\handoff.md` and notify parent.
