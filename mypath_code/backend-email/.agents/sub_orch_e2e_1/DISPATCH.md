# Dispatch: E2E Testing Track Orchestrator

## Identity
- Role: E2E Testing Track Orchestrator
- TypeName: teamwork_preview_orchestrator
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\sub_orch_e2e_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
You are the Sub-Orchestrator for the **E2E Testing Track** in `mypath-backend`.
Read the following authoritative documents:
- Original Request: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
- Project Master Plan: `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
- Survey Reports:
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_1\handoff.md`
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md`
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3\handoff.md`

### Responsibilities:
1. Create `TEST_INFRA.md` at project root (`c:\Users\sindh\Documents\codes\mypath-backend\TEST_INFRA.md`) detailing the opaque-box test architecture, runner commands, fixtures, and coverage goals.
2. Design and create offline mock fixtures (`tests/fixtures/upsc-active-exams.html`, `tests/fixtures/upsc-detail-sample.html`, `tests/fixtures/ssc-live-exams.json`) so tests can run deterministically without internet flakiness.
3. Design and implement the 4-tier test suite using Node's native test runner (`node --test`):
   - **Tier 1: Feature Coverage (>=5 per feature)**: Isolated tests verifying scrapers (UPSC, SSC, Base), email templates, dedup store, CLI runner, and pipeline.
   - **Tier 2: Boundary & Corner Cases (>=5 per feature)**: Malformed HTML, missing dates, expired deadlines, empty API responses, special characters, network timeouts, invalid email addresses.
   - **Tier 3: Cross-Feature Combinations**: Scraper -> dedup store interaction; scraper -> email template rendering; dedup filter -> email dispatch; CLI flags combinations.
   - **Tier 4: Real-World Scenarios**: Complete flow running mock scraping -> deduplicating -> generating multi-exam digest email -> verifying output.
4. Exclusively own: `TEST_INFRA.md`, `TEST_READY.md`, `tests/fixtures/**`, `tests/e2e/**`, `tests/unit/**`.
5. When all test suites are written, verified, and passing against mock fixtures, publish `c:\Users\sindh\Documents\codes\mypath-backend\TEST_READY.md` summarizing the test runner command and tier counts.

Write your milestone handoff report to:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\sub_orch_e2e_1\handoff.md`
and notify parent.
