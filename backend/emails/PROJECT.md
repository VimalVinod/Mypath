# Project: ExamGo / MyPath Backend Service (Exam Scraping & Resend Email Alerts)

## Architecture
A decoupled backend architecture supporting both serverless HTTP execution (Vercel) and standalone CLI / cron execution:

```
[Government Portals] 
  ├── UPSC (HTML Table Crawl)
  └── SSC (Live Exams REST API)
         │
         ▼
[Scraper Modules: BaseScraper, UpscScraper, SscScraper, ScraperManager]
         │ (NormalizedExamRecord[])
         ▼
[Deduplication Store: DedupStore (data/notified-exams.json)]
         │ (New Unnotified Exams)
         ▼
[Notification Service: EmailService + TemplateService]
         │ (Responsive HTML / Plain Text)
         ▼
[Resend API Client (RESEND_API_KEY)] ────► [Email Recipients]

[CLI Entry Points]
  ├── npm run scrape (src/scripts/scrape.js)
  └── npm run test:notify (src/scripts/test-email.js)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Normalized Exam Schema | Standardized `NormalizedExamRecord` and `ImportantDates` schema | M1 | Survey (Exp 2) |
| F2 | Base Scraper Contract | Abstract `BaseScraper` class with retry, timeout, user-agent | M1 | Survey (Exp 2) |
| F3 | UPSC Portal Scraper | Two-tier scraper for active exams on upsc.gov.in with PDF links | M1 | Survey (Exp 1, 2) |
| F4 | SSC Portal Scraper | Fast REST API scraper for live exams on ssc.gov.in | M1 | Survey (Exp 1, 2) |
| F5 | Scraper Aggregator | `ScraperManager` orchestrating all portal scrapers with error isolation | M1 | Survey (Exp 2) |
| F6 | Resend Client Wrapper | `EmailService` integrating `resend` SDK with error diagnosis & sandbox handling | M2 | Survey (Exp 3) |
| F7 | Responsive HTML Email Template | 600px table-based template with urgency badges, PDF CTA button, escapeHtml | M2 | Survey (Exp 3) |
| F8 | Plain-Text Email Fallback | Clean ASCII/Markdown plain-text email version for spam filter/accessibility | M2 | Survey (Exp 3) |
| F9 | Standalone Mock Email Script | `scripts/test-email.js` for standalone verification with mock data | M2 | Survey (Exp 3) |
| F10 | Deduplication Store | File-based `DedupStore` (`data/notified-exams.json`) preventing alert spam | M3 | Survey (Exp 3) |
| F11 | Standalone CLI Runner | `scripts/scrape.js` runnable via `npm run scrape` with native `node:util.parseArgs` | M3 | Survey (Exp 1, 3) |
| F12 | Pipeline Integration | Modular pipeline piping scraper output into dedup store and email sender | M3 | Survey (Exp 1, 2, 3) |
| F13 | Environment & Config | `.env.example` template, config validation, and dry-run fallbacks | M3 | Survey (Exp 1) |
| F14 | Express Route Integration | Non-breaking integration into `index.js` preserving Vercel exports | M3 | Survey (Exp 1) |
| F15 | E2E Test Suite (Tiers 1-4) | Comprehensive test suite covering features, boundaries, interactions, real-world | E2E Track | Requirements |
| F16 | Adversarial Hardening | Coverage audit, boundary stress-testing, and forensic integrity verification | M4 | Methodology |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test harness, mock fixtures, Tiers 1-4 opaque-box tests, TEST_READY.md | none | DONE |
| M1 | Exam Scraping Engine | BaseScraper, UpscScraper, SscScraper, ScraperManager, fixtures | none | DONE |
| M2 | Resend Email Service | EmailService, HTML & plain-text templates, test-email CLI | none | DONE |
| M3 | Standalone CLI & Pipeline | DedupStore, scrape.js (`npm run scrape`), pipeline integration, config | M1, M2 | IN_PROGRESS |
| M4 | Final E2E Pass & Hardening | Run 100% E2E tests, Challenger stress tests, Forensic Audit | E2E, M3 | PLANNED |

## Interface Contracts

### Scraper Output ↔ Pipeline Contract (`NormalizedExamRecord`)
```typescript
export interface ImportantDates {
  notificationDate?: string | null;
  applicationStartDate?: string | null;
  applicationEndDate: string; // ISO format or clear formatted date string
  examDate?: string | null;
  feeDeadline?: string | null;
}

export interface NormalizedExamRecord {
  id: string; // Unique deterministic key: e.g. "UPSC_combined-geo-scientist-2027" or "SSC_CHSL_2026"
  examName: string; // Official exam name
  organization: string; // Conducting body (e.g. "UPSC", "SSC")
  examCode?: string | null;
  importantDates: ImportantDates;
  officialNotificationUrl: string; // Direct URL to PDF or official notice
  applicationUrl?: string | null; // Direct link to online application form
  categories?: string[];
  fee?: string | number | null;
  scrapedAt: string; // ISO timestamp
}
```

### Email Service Contract (`IEmailService`)
```typescript
export interface EmailOptions {
  recipient: string;
  recipientName?: string;
  subject?: string;
  dryRun?: boolean;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  examCount: number;
  dryRun?: boolean;
  previewPath?: string;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
  };
}
```

### Deduplication Contract (`IDedupStore`)
```typescript
export interface IDedupStore {
  filterNewExams(exams: NormalizedExamRecord[]): Promise<NormalizedExamRecord[]>;
  markAsNotified(exams: NormalizedExamRecord[]): Promise<void>;
}
```

## Code Layout
```
c:\Users\sindh\Documents\codes\mypath-backend\
├── .env.example
├── index.js                     # Root Express app (Vercel serverless entry point)
├── package.json                 # Scripts: "scrape", "test:notify", "test"
├── vercel.json
├── data/
│   └── notified-exams.json      # Dedup store persistence
├── src/
│   ├── config/
│   │   └── env.js               # Environment variables and defaults
│   ├── scrapers/
│   │   ├── base-scraper.js      # BaseScraper class with retry & error handling
│   │   ├── upsc-scraper.js      # UPSC two-tier active exams scraper
│   │   ├── ssc-scraper.js       # SSC live exams REST API scraper
│   │   └── index.js             # ScraperManager aggregator
│   ├── services/
│   │   ├── email/
│   │   │   ├── template.js      # HTML & Plain text email generators
│   │   │   └── email-service.js # Resend API client
│   │   └── storage/
│   │       └── dedup-store.js   # DedupStore class
│   └── scripts/
│       ├── scrape.js            # Standalone CLI runner for `npm run scrape`
│       ├── test-email.js        # Standalone verification script for Resend email
│       └── pipeline.js          # Integrated pipeline: scrape -> dedup -> notify
└── tests/
    ├── fixtures/                # Mock HTML and JSON fixtures for offline testing
    │   ├── upsc-active-exams.html
    │   ├── upsc-detail-sample.html
    │   └── ssc-live-exams.json
    ├── unit/
    │   ├── scraper.test.js
    │   ├── template.test.js
    │   └── dedup.test.js
    └── e2e/
        ├── tier1-feature.test.js
        ├── tier2-boundary.test.js
        ├── tier3-combination.test.js
        └── tier4-realworld.test.js
```
