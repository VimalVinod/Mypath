# Dispatch: Milestone 1 Sub-Orchestrator (Exam Scraping Engine)

## Identity
- Role: Milestone 1 Sub-Orchestrator (Exam Scraping Engine)
- TypeName: teamwork_preview_orchestrator
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\sub_orch_m1_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
You are the Sub-Orchestrator for **Milestone 1: Exam Scraping Engine** in `mypath-backend`.
Read the following authoritative documents:
- Original Request: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
- Project Master Plan: `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
- Survey Reports:
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_1\handoff.md`
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md`

### Responsibilities:
1. Ensure required scraping libraries are added (e.g. `cheerio`) and installed via npm if needed.
2. Implement `src/scrapers/base-scraper.js`:
   - Abstract `BaseScraper` class with retry logic, configurable timeout, custom headers (User-Agent), error wrapping, and `NormalizedExamRecord` validation.
3. Implement `src/scrapers/upsc-scraper.js`:
   - Canonical URL `https://www.upsc.gov.in/examinations/active-exams`.
   - Two-tier crawler extracting exam title, detail link, notification date, application deadline (`Last Date for Receipt of Applications`), exam commencement date, and official notification PDF URL.
   - Resilient against HTML formatting changes, handles relative URLs.
4. Implement `src/scrapers/ssc-scraper.js`:
   - Fast REST API scraper hitting `https://ssc.gov.in/api/admin/5.1/liveExams`.
   - Extracts active exams into `NormalizedExamRecord` with exam code, title, dates, fee, and links.
5. Implement `src/scrapers/index.js` (`ScraperManager`):
   - Aggregates all portal scrapers.
   - Provides `scrapeAll({ source })` with error isolation (if one portal fails, others still return).
6. Exclusively own: `src/scrapers/**`.
7. Verify functionality with unit tests / standalone test runs.
8. Run the sub-orchestrator iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor) to ensure quality and integrity.

Write your milestone handoff report to:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\sub_orch_m1_1\handoff.md`
and notify parent.
