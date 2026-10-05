# Test Infrastructure & Opaque-Box Testing Strategy

## Overview
This document defines the testing architecture, methodology, and verification commands for **ExamGo / MyPath Backend Service**. The test suite employs an **opaque-box, requirement-driven testing strategy** based strictly on acceptance criteria, interface contracts (`PROJECT.md`), and government portal data specifications.

All tests are implemented using the native Node.js test runner (`node --test`) and built-in assertion module (`node:assert/strict`), ensuring zero third-party testing dependencies, ultra-fast sub-second execution, and complete cross-platform compatibility (Node.js >= 18, verified on Node.js v24.13.0).

---

## 4-Tier Test Architecture

The testing suite is structured into four progressive tiers, designed to isolate features, stress boundaries, verify complex cross-module pipelines, and validate real-world operational scenarios:

```
tests/
├── fixtures/                           # Offline static HTML & JSON fixtures
│   ├── upsc-active-exams.html          # Realistic UPSC active exams index crawl
│   ├── upsc-detail-sample.html         # Realistic UPSC exam detail table & PDF notice
│   └── ssc-live-exams.json             # Realistic SSC live exams API response
├── helpers/                            # Shared test helpers, contract shims, and loaders
│   ├── contracts.js                    # Interface contract implementations & validators
│   ├── loader.js                       # Progressive module loader (src/ vs reference contract)
│   └── fixtures.js                     # Synchronous fixture file readers
├── unit/                               # Fast isolated contract unit tests
│   ├── scraper.test.js                 # Parser contract tests (UPSC & SSC)
│   ├── template.test.js                # HTML/Text email template unit tests
│   └── dedup.test.js                   # Deduplication store unit tests
└── e2e/                                # 4-Tier End-to-End Test Suite
    ├── tier1-feature.test.js           # Tier 1: Feature Coverage (>=5 per feature)
    ├── tier2-boundary.test.js          # Tier 2: Boundary & Corner Cases (>=5 per feature)
    ├── tier3-combination.test.js       # Tier 3: Cross-Feature Combinations
    └── tier4-realworld.test.js         # Tier 4: Real-World Scenarios
```

---

## Tier Breakdown & Coverage Matrix

| Tier | Category | Minimum Target | Scope & Features Covered |
|---|---|---|---|
| **Tier 1** | **Feature Coverage** | $\ge 5$ tests per feature | • **Scraper Extraction**: UPSC list, UPSC detail table, SSC REST API, schema conformance (`NormalizedExamRecord`), link resolution.<br>• **Email Templates**: Single exam card, multi-exam digest, urgency badges, HTML escaping, ASCII plain-text fallback.<br>• **Dedup Store**: Key hashing (`sha256`), new exam filtering, notification recording, file persistence, corrupted file safety.<br>• **Standalone CLI**: Argument parsing (`node:util.parseArgs`), `--dry-run`, `--mock`, `--source`, `--email`.<br>• **Integration Pipeline**: Scraper $\to$ Dedup $\to$ Email service data flow, summary generation. |
| **Tier 2** | **Boundary & Corner Cases** | $\ge 5$ tests per feature | • **Malformed HTML**: Empty markup, missing `.view-content`, truncated tags, missing table rows, unexpected table structure.<br>• **Empty API & Abnormal Payloads**: `data: []`, missing `data` field, 404/500 JSON, non-JSON strings, null array items.<br>• **Missing/Invalid Dates**: Missing start date, non-parseable date strings, null exam dates, non-standard whitespace formats.<br>• **Expired Deadlines**: Negative days left, deadline today (0 days), urgency thresholds (3d critical, 7d warning, >7d open).<br>• **Special Characters & XSS**: Script tag injection in exam title, quote attribute escaping, ampersand handling, Unicode emojis.<br>• **Network & Retries**: Simulated timeout abort, retry loop up to limit, error isolation across sources, custom User-Agent headers. |
| **Tier 3** | **Cross-Feature Combinations** | Cross-feature flows | • **Scraper $\to$ Dedup $\to$ Email Pipeline**: End-to-end integration without mock boundaries.<br>• **Mixed Valid and Malformed Exams**: Parsing and rendering digests where some items lack optional fields.<br>• **CLI Flags Combination**: `--mock` + `--dry-run` + `--email` multi-flag execution.<br>• **Multi-Portal Aggregation**: Concurrent UPSC + SSC scraping and merged deduplicated notification.<br>• **Incremental Polling**: Subsequent scrape runs with partially overlapping exam sets. |
| **Tier 4** | **Real-World Scenarios** | Operational simulations | • **Simulated Daily Scrape Run**: Day 1 finds 2 exams $\to$ alerts $\to$ updates dedup. Day 2 finds same 2 exams $\to$ 0 alerts.<br>• **Urgent 48-Hour Exam Announcement**: Deadline within 2 days triggers critical red alert badge and urgent email subject.<br>• **Corrupted Dedup Cache Recovery**: Automatic recovery and safe state reset when local JSON store is corrupted.<br>• **Partial Portal Outage**: UPSC succeeds while SSC fails network request; pipeline isolates failure and dispatches partial alerts.<br>• **High-Volume Digest**: Digest rendering with 10+ exams without layout breakage or rendering anomalies. |

---

## Offline Test Fixtures

Testing against live government portals during CI/CD or local test runs is non-deterministic due to network latency, portal maintenance, and dynamic exam cycles. Offline fixtures located in `tests/fixtures/` provide stable, repeatable, and authoritative test inputs:

1. **`tests/fixtures/upsc-active-exams.html`**:
   - Exact markup extracted from `https://www.upsc.gov.in/examinations/active-exams`.
   - Includes Drupal 7/9 CSS containers (`.view-content`, `.views-row`), exam titles, and relative links.
2. **`tests/fixtures/upsc-detail-sample.html`**:
   - Sample detail page table (`Combined Geo-Scientist (Preliminary) Examination, 2027`).
   - Contains structured date rows (`Date of Notification`, `Commencement Date`, `Last Date for Receipt of Applications`) and PDF download link.
3. **`tests/fixtures/ssc-live-exams.json`**:
   - Exact JSON structure returned by `https://ssc.gov.in/api/admin/5.1/liveExams`.
   - Contains active exam entries (CHSL 2026, CGL 2026) with ISO date strings, fee, age limits, and navigation URLs.

---

## Test Execution Commands

All tests use Node.js v24 built-in runner (`node --test`).

### Run Entire Test Suite
```bash
node --test tests/**/*.test.js
```

### Run Unit Tests Only
```bash
node --test tests/unit/*.test.js
```

### Run Specific E2E Tiers
```bash
# Tier 1: Feature Coverage
node --test tests/e2e/tier1-feature.test.js

# Tier 2: Boundary & Corner Cases
node --test tests/e2e/tier2-boundary.test.js

# Tier 3: Cross-Feature Combinations
node --test tests/e2e/tier3-combination.test.js

# Tier 4: Real-World Scenarios
node --test tests/e2e/tier4-realworld.test.js
```

### Run All E2E Tests
```bash
node --test tests/e2e/*.test.js
```

---

## Progressive Testability & Module Resolution

The test suite is designed with progressive testability. `tests/helpers/loader.js` checks if production modules in `src/` have been implemented:
- When implementation modules exist in `src/` (e.g. after Milestones 1, 2, 3), the test suite automatically loads and verifies the production code.
- If implementation modules are under construction or run in isolation, the test suite falls back to authoritative interface contracts (`tests/helpers/contracts.js`) derived from `PROJECT.md` specifications.

This guarantees tests can be verified independently without being blocked by in-progress development work.
