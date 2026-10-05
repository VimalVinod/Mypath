# ScrapperMan — AI-Powered Scraper Watchdog for MyPath
## Complete Build Specification for Another AI to Implement

---

## 1. WHAT IS SCRAPPERMAN?

ScrapperMan is a self-healing AI monitoring program for the MyPath project. It acts as a **Security Guard + Part-Time Technician + Mailman** for the web scraping system. Its job is to:

1. **PATROL** — Run after every scrape and check if results look healthy
2. **DIAGNOSE** — When something looks wrong, use Gemini AI to figure out what broke
3. **SELF-FIX** — Automatically fix minor problems (retry URLs, switch to backups, clear corrupt cache)
4. **REPORT** — For major problems it cannot fix, email a full diagnostic report to the admin

---

## 2. WHERE THIS CODE LIVES

### Project Root
```
c:\Users\sindh\Documents\codes\mypath\
```

### ScrapperMan should be built as a new module inside the existing pdf-parser backend:
```
c:\Users\sindh\Documents\codes\mypath\backend\pdf-parser\src\services\scrapperman\
├── index.js                  # Main entry point — exports all ScrapperMan functions
├── patrol.js                 # The "Security Guard" — health checks after every scrape
├── diagnose.js               # The "Doctor" — uses Gemini AI to analyze failures
├── self-fix.js               # The "Technician" — auto-fixes minor problems
├── report.js                 # The "Mailman" — sends admin SOS alerts via Resend
├── health-rules.js           # Dataset of all known failure patterns and their fixes
├── scraper-registry.js       # Registry of all scraper URLs, expected behaviors, backups
└── history.js                # Tracks health history over time (JSON file-based)
```

### Data files ScrapperMan manages:
```
c:\Users\sindh\Documents\codes\mypath\backend\pdf-parser\data\
├── notified-exams.json       # (Already exists) Dedup store
├── scrapperman-history.json  # NEW — Health check history log
└── scrapperman-last-run.json # NEW — Last successful run snapshot
```

---

## 3. EXISTING CODEBASE CONTEXT (What Already Exists)

The AI building this MUST understand the existing architecture. Here is every relevant file:

### 3.1 Scraper System (What ScrapperMan monitors)

**Base Class:** `backend-cronjob/src/scrapers/base-scraper.js`
- Abstract class all scrapers extend
- Provides `fetchWithRetry(url, options)` — HTTP fetcher with retry + exponential backoff
- Provides `normalizeRecord(partialRecord)` — validates scraped data against NormalizedExamRecord schema
- Provides `slugify(text)` — generates deterministic IDs
- Constructor options: `timeoutMs` (default 15000), `retries` (default 2), `retryDelayMs` (default 1000)

**UPSC Scraper:** `backend-cronjob/src/scrapers/upsc-scraper.js`
- Currently scrapes: `https://www.upsc.gov.in/examinations/active-exams`
- IMPORTANT: Should ALSO scrape the "What's New" page: `https://www.upsc.gov.in/whats-new` (this is where ALL notices appear, not just active exams)
- RSS fallback: `https://www.upsc.gov.in/rss.php`
- Two-tier crawl: index page → detail pages (extracts PDF links from tables)
- Uses Cheerio for HTML parsing
- Has `parseIndexHtml(html)`, `parseDetailHtml(html, url, title)`, `parseRssXml(xml)` methods

**SSC Scraper:** `backend-cronjob/src/scrapers/ssc-scraper.js`
- Currently scrapes REST API: `https://ssc.gov.in/api/admin/5.1/liveExams`
- IMPORTANT: Should ALSO scrape the Notice Board page: `https://ssc.gov.in/home/notice-board` (this is where cancellations, schedule changes, answer keys, and ALL notices appear)
- Secondary API: `https://ssc.gov.in/api/general-website/portal/lastUpdates`
- Has `hasUpdates(lastKnownTimestamp)` for quick change detection
- Has `parseLiveExamsJson(payload)` method

**Scraper Manager:** `backend-cronjob/src/scrapers/index.js`
- `ScraperManager` class that orchestrates all scrapers
- `scrapeAll({ source: 'all' | 'upsc' | 'ssc' })` — runs all or specific scrapers
- `scrapeAllDetailed(options)` — returns `{ records: [], errors: [] }`
- Has built-in error isolation: if one scraper fails, others continue

### 3.2 NormalizedExamRecord Schema (The output format of scrapers)

```javascript
{
  id: "SSC_CHSL_2026",                    // Unique deterministic key
  examName: "Combined Higher Secondary Level Examination 2026",
  organization: "SSC",                     // "UPSC" or "SSC"
  examCode: "CHSL" | null,
  importantDates: {
    notificationDate: "2026-09-07" | null,
    applicationStartDate: "2026-09-07" | null,
    applicationEndDate: "2026-10-07T17:30:00.000Z",  // REQUIRED field
    examDate: null,
    feeDeadline: "2026-10-08T17:30:00.000Z" | null
  },
  officialNotificationUrl: "https://...",  // Direct URL to PDF or notice
  applicationUrl: "https://..." | null,
  categories: ["SSC", "Central Govt"],
  fee: 100 | null,
  scrapedAt: "2026-10-02T04:11:09.611Z"   // ISO timestamp
}
```

### 3.3 PDF Parsing Service (downstream of scrapers)

**Location:** `backend-cronjob/src/services/pdf/`
- `extractTargetedPdfText(inputPathOrBuffer)` — downloads a PDF, extracts text, applies heuristic keyword filtering to reduce token count by ~92%
- Uses `unpdf` library for PDF-to-text conversion
- Has mock adapter for testing: `backend-cronjob/src/services/pdf/adapters/mock-adapter.js`

### 3.4 Gemini AI Service (downstream of PDF parser)

**Location:** `backend-cronjob/src/services/ai/`
- `parseStructuredCriteria(text)` — sends filtered PDF text to Google Gemini, returns structured JSON
- Uses `@google/genai` SDK
- Schema defined in `schema.js` — outputs: examTitle, organization, eligibility (minAge, maxAge, ageRelaxation, requiredEducation, eligibleStreams), importantDates, vacancies, applicationFee, status
- Has mock for testing: `mock-gemini.js` with `extractMockCriteria()`

### 3.5 Unity Checker (downstream of Gemini)

**Location:** `backend-cronjob/src/services/validator/`
- `verifyUnity(extractedData, databaseCriteria)` — compares Gemini output against user profile
- Returns: `{ overallVerdict: 'PASS'|'FAIL'|'WARNING', summary, evaluations, candidateEligibility }`
- `formatUnityReport(result)` — generates colored terminal dashboard

### 3.6 Email Service

**Location:** `backend-email/`
- Uses Resend API (`resend` npm package) for sending emails
- `EmailService` class in `src/services/email/email-service.js`
- HTML template generator in `src/services/email/template.js`
- ScrapperMan should reuse this same email service for admin alerts

### 3.7 Dedup Store

**Location:** `backend-cronjob/src/services/storage/dedup-store.js`
- `DedupStore` class — file-based JSON store at `data/notified-exams.json`
- `filterNewExams(exams)` — returns only exams not previously notified
- `markAsNotified(exams)` — persists exam IDs after notification

### 3.8 Environment Variables (in `backend-cronjob/.env`)

```
GEMINI_API_KEY=...            # Google Gemini API key (for diagnose.js)
RESEND_API_KEY=...            # Resend API key (for report.js admin alerts)
NOTIFICATION_RECIPIENT_EMAIL=sindhusachu2004123@gmail.com  # Admin email
```

### 3.9 Existing Dependencies (in `backend-cronjob/package.json`)

```json
{
  "@google/genai": "^2.22.0",
  "cheerio": "^1.2.0",
  "dotenv": "^17.4.2",
  "firebase": "^12.19.0",
  "pdf-lib": "^1.17.1",
  "resend": "^6.26.0",
  "unpdf": "^1.8.1"
}
```

No new npm packages should be needed. ScrapperMan uses the existing dependencies.

---

## 4. SCRAPPERMAN MODULE SPECIFICATIONS

### 4.1 `scraper-registry.js` — Registry of All Scraper Endpoints

This file contains the dataset of every URL ScrapperMan monitors, what "healthy" looks like, and backup URLs.

```javascript
module.exports = {
  upsc: {
    name: "Union Public Service Commission",
    primary: {
      url: "https://www.upsc.gov.in/examinations/active-exams",
      type: "html",
      parser: "cheerio",
      expectedMinResults: 3,    // UPSC always has at least 3 active exams
      expectedMaxResults: 25,
      healthyResponseCodes: [200],
      healthyContentContains: ["examination", "active"],  // HTML must contain these words
      maxResponseTimeMs: 15000
    },
    secondary: {
      url: "https://www.upsc.gov.in/whats-new",
      type: "html",
      parser: "cheerio",
      expectedMinResults: 5,
      healthyContentContains: ["notice", "advt", "posts"],
      maxResponseTimeMs: 15000
    },
    fallback: {
      url: "https://www.upsc.gov.in/rss.php",
      type: "xml",
      parser: "cheerio-xml"
    },
    pdfDomain: "www.upsc.gov.in",
    applicationPortal: "https://upsconline.nic.in"
  },
  ssc: {
    name: "Staff Selection Commission",
    primary: {
      url: "https://ssc.gov.in/api/admin/5.1/liveExams",
      type: "json-api",
      parser: "json",
      expectedMinResults: 1,
      expectedMaxResults: 15,
      healthyResponseCodes: [200],
      healthyContentType: "application/json",
      maxResponseTimeMs: 10000
    },
    secondary: {
      url: "https://ssc.gov.in/home/notice-board",
      type: "html",
      parser: "cheerio",
      expectedMinResults: 5,
      healthyContentContains: ["notice", "board", "examination"],
      maxResponseTimeMs: 15000
    },
    fallback: {
      url: "https://ssc.gov.in/api/general-website/portal/lastUpdates",
      type: "json-api",
      parser: "json"
    },
    pdfDomain: "ssc.gov.in",
    applicationPortal: "https://ssc.gov.in/login"
  }
};
```

### 4.2 `health-rules.js` — Dataset of Known Failure Patterns

This is the "training data" — every known way a government website scraper can break, how to detect it, what severity it is, and what the automated fix is.

```javascript
module.exports = [
  // ═══════════════════════════════════════════════════
  // CATEGORY 1: NETWORK & CONNECTIVITY FAILURES
  // ═══════════════════════════════════════════════════
  {
    id: "NET_TIMEOUT",
    name: "Request Timeout",
    severity: "MEDIUM",
    detect: (error) => error.message && (error.message.includes("timeout") || error.message.includes("ETIMEDOUT") || error.message.includes("AbortError")),
    autoFix: "RETRY_WITH_LONGER_TIMEOUT",
    description: "The government server took too long to respond. Often happens during peak hours (10 AM - 2 PM IST).",
    maxAutoRetries: 3
  },
  {
    id: "NET_CONNECTION_REFUSED",
    name: "Connection Refused",
    severity: "HIGH",
    detect: (error) => error.message && (error.message.includes("ECONNREFUSED") || error.message.includes("ECONNRESET")),
    autoFix: "SWITCH_TO_FALLBACK",
    description: "The server actively refused the connection. The portal may be down for maintenance."
  },
  {
    id: "NET_DNS_FAILURE",
    name: "DNS Resolution Failed",
    severity: "CRITICAL",
    detect: (error) => error.message && (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")),
    autoFix: "ALERT_ADMIN_IMMEDIATELY",
    description: "Cannot resolve the domain name. Either the internet is down or the government changed their domain."
  },

  // ═══════════════════════════════════════════════════
  // CATEGORY 2: HTTP STATUS CODE ANOMALIES
  // ═══════════════════════════════════════════════════
  {
    id: "HTTP_403_FORBIDDEN",
    name: "Access Forbidden (Bot Blocked)",
    severity: "HIGH",
    detect: (result) => result.httpStatus === 403,
    autoFix: "ROTATE_USER_AGENT",
    description: "The government website detected our scraper as a bot and blocked it. Try rotating User-Agent headers."
  },
  {
    id: "HTTP_404_NOT_FOUND",
    name: "Page Not Found",
    severity: "CRITICAL",
    detect: (result) => result.httpStatus === 404,
    autoFix: "ALERT_ADMIN_IMMEDIATELY",
    description: "The target URL no longer exists. The government likely restructured their website."
  },
  {
    id: "HTTP_429_RATE_LIMITED",
    name: "Rate Limited",
    severity: "MEDIUM",
    detect: (result) => result.httpStatus === 429,
    autoFix: "WAIT_AND_RETRY",
    description: "We are sending too many requests. Wait 60 seconds and retry.",
    retryDelayMs: 60000
  },
  {
    id: "HTTP_500_SERVER_ERROR",
    name: "Government Server Internal Error",
    severity: "MEDIUM",
    detect: (result) => result.httpStatus >= 500 && result.httpStatus < 600,
    autoFix: "RETRY_WITH_BACKOFF",
    description: "The government server had an internal error. This is usually temporary."
  },
  {
    id: "HTTP_503_MAINTENANCE",
    name: "Server Under Maintenance",
    severity: "MEDIUM",
    detect: (result) => result.httpStatus === 503,
    autoFix: "SCHEDULE_RETRY_30MIN",
    description: "The government portal is under scheduled maintenance. Retry in 30 minutes."
  },

  // ═══════════════════════════════════════════════════
  // CATEGORY 3: DATA QUALITY ANOMALIES
  // ═══════════════════════════════════════════════════
  {
    id: "DATA_ZERO_RESULTS",
    name: "Zero Results Scraped",
    severity: "HIGH",
    detect: (result) => result.scrapedCount === 0 && !result.networkError,
    autoFix: "DIAGNOSE_WITH_GEMINI",
    description: "The scraper successfully connected but found 0 exams. This is highly suspicious — the website layout likely changed."
  },
  {
    id: "DATA_BELOW_MINIMUM",
    name: "Suspiciously Few Results",
    severity: "MEDIUM",
    detect: (result, registry) => result.scrapedCount > 0 && result.scrapedCount < registry.primary.expectedMinResults,
    autoFix: "DIAGNOSE_WITH_GEMINI",
    description: "The scraper returned fewer results than the historical minimum. Some exam listings may be missing."
  },
  {
    id: "DATA_ABOVE_MAXIMUM",
    name: "Suspiciously Many Results",
    severity: "LOW",
    detect: (result, registry) => result.scrapedCount > registry.primary.expectedMaxResults,
    autoFix: "LOG_WARNING",
    description: "The scraper returned more results than expected. Could be duplicates or a change in how exams are listed."
  },
  {
    id: "DATA_ALL_SAME_DATE",
    name: "All Exams Have Identical Dates",
    severity: "MEDIUM",
    detect: (result) => {
      if (!result.records || result.records.length < 2) return false;
      const dates = result.records.map(r => r.scrapedAt);
      const uniqueDates = new Set(dates);
      return uniqueDates.size === 1 && result.records.length > 3;
    },
    autoFix: "LOG_WARNING",
    description: "All scraped records have the exact same timestamp. The data may be cached or stale."
  },
  {
    id: "DATA_MISSING_PDF_LINKS",
    name: "Exam Records Without PDF Links",
    severity: "MEDIUM",
    detect: (result) => {
      if (!result.records) return false;
      const noPdf = result.records.filter(r =>
        !r.officialNotificationUrl ||
        r.officialNotificationUrl === r.applicationUrl ||
        !r.officialNotificationUrl.includes('.pdf')
      );
      return noPdf.length > result.records.length * 0.5; // More than 50% missing PDFs
    },
    autoFix: "LOG_WARNING",
    description: "More than half the scraped exams are missing direct PDF notification links."
  },
  {
    id: "DATA_DUPLICATE_IDS",
    name: "Duplicate Exam IDs Detected",
    severity: "MEDIUM",
    detect: (result) => {
      if (!result.records) return false;
      const ids = result.records.map(r => r.id);
      return ids.length !== new Set(ids).size;
    },
    autoFix: "DEDUPLICATE_RECORDS",
    description: "Multiple exam records share the same ID. The scraper is producing duplicates."
  },

  // ═══════════════════════════════════════════════════
  // CATEGORY 4: PDF LINK VERIFICATION FAILURES
  // ═══════════════════════════════════════════════════
  {
    id: "PDF_LINK_BROKEN",
    name: "PDF Download Link Returns 404",
    severity: "MEDIUM",
    detect: (linkCheck) => linkCheck.httpStatus === 404,
    autoFix: "FLAG_BROKEN_LINK",
    description: "A specific PDF notification link is broken (404). The government may have moved or renamed the file."
  },
  {
    id: "PDF_LINK_NOT_PDF",
    name: "PDF Link Does Not Return a PDF",
    severity: "MEDIUM",
    detect: (linkCheck) => linkCheck.contentType && !linkCheck.contentType.includes("pdf"),
    autoFix: "FLAG_WRONG_CONTENT",
    description: "The URL labeled as a PDF notification actually returns HTML or another format."
  },
  {
    id: "PDF_LINK_EMPTY",
    name: "PDF File Is Empty (0 bytes)",
    severity: "HIGH",
    detect: (linkCheck) => linkCheck.contentLength === 0,
    autoFix: "FLAG_EMPTY_PDF",
    description: "The PDF file exists but is 0 bytes. The government may have uploaded a placeholder."
  },

  // ═══════════════════════════════════════════════════
  // CATEGORY 5: WEBSITE LAYOUT CHANGES
  // ═══════════════════════════════════════════════════
  {
    id: "LAYOUT_NO_TABLE",
    name: "Expected HTML Table Missing",
    severity: "HIGH",
    detect: (htmlContent, source) => {
      if (source !== 'upsc') return false;
      return htmlContent && !htmlContent.includes('<table') && !htmlContent.includes('<TABLE');
    },
    autoFix: "DIAGNOSE_WITH_GEMINI",
    description: "The UPSC page no longer contains an HTML table. They may have switched to a card/list layout."
  },
  {
    id: "LAYOUT_NO_JSON_BODY",
    name: "API Endpoint No Longer Returns JSON",
    severity: "CRITICAL",
    detect: (result, source) => {
      if (source !== 'ssc') return false;
      return result.contentType && !result.contentType.includes('json');
    },
    autoFix: "ALERT_ADMIN_IMMEDIATELY",
    description: "The SSC API endpoint is no longer returning JSON. They may have changed or deprecated the API."
  },
  {
    id: "LAYOUT_REDIRECT",
    name: "URL Redirecting to Different Page",
    severity: "HIGH",
    detect: (result) => result.redirected === true,
    autoFix: "DIAGNOSE_WITH_GEMINI",
    description: "The target URL is redirecting to a different page. The government may have moved the content."
  }
];
```

### 4.3 `patrol.js` — The Security Guard

This module runs AFTER every scrape and performs health checks.

**Input:** The result of `ScraperManager.scrapeAllDetailed()`
**Output:** A `HealthReport` object

```javascript
/**
 * patrol.js — The Security Guard
 *
 * Runs after every scrape. Evaluates the scrape results against health rules.
 *
 * FUNCTION: runPatrol(scrapeResult, options)
 *
 * @param {Object} scrapeResult — Output of ScraperManager.scrapeAllDetailed()
 *   scrapeResult.records: NormalizedExamRecord[]
 *   scrapeResult.errors: Array<{ source: string, error: string }>
 *
 * @param {Object} options
 *   options.validatePdfLinks: boolean (default: true) — Whether to HEAD-request every PDF URL
 *   options.registry: Object — The scraper-registry.js data
 *
 * @returns {HealthReport}
 *   {
 *     timestamp: ISO string,
 *     overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL",
 *     scrapedCount: number,
 *     sources: {
 *       upsc: { status, count, responseTimeMs, issues: [] },
 *       ssc:  { status, count, responseTimeMs, issues: [] }
 *     },
 *     issues: [
 *       {
 *         ruleId: "DATA_ZERO_RESULTS",
 *         severity: "HIGH",
 *         source: "upsc",
 *         description: "...",
 *         suggestedFix: "DIAGNOSE_WITH_GEMINI",
 *         details: {}
 *       }
 *     ],
 *     pdfLinkChecks: [
 *       { url: "https://...", status: 200, ok: true, contentType: "application/pdf" },
 *       { url: "https://...", status: 404, ok: false, issue: "PDF_LINK_BROKEN" }
 *     ],
 *     comparison: {
 *       previousRunCount: number | null,
 *       delta: number,
 *       newExamIds: string[],
 *       missingExamIds: string[]
 *     }
 *   }
 *
 * BEHAVIOR:
 * 1. Iterate through all health-rules.js entries
 * 2. For each rule, call rule.detect() with the scrape result
 * 3. If the rule triggers, add it to the issues array
 * 4. If options.validatePdfLinks is true, send HTTP HEAD requests to every
 *    officialNotificationUrl in the records array. Check for 404, wrong content-type, 0 bytes.
 * 5. Compare current scrape results against the last known good run (from scrapperman-last-run.json)
 *    to detect newly appeared or suddenly disappeared exams.
 * 6. Determine overallStatus:
 *    - "HEALTHY" if zero issues
 *    - "DEGRADED" if issues exist but none are CRITICAL
 *    - "CRITICAL" if any CRITICAL issue exists
 * 7. Save the HealthReport to scrapperman-history.json (append to array, keep last 100 entries)
 * 8. If status is HEALTHY, update scrapperman-last-run.json with current records snapshot
 */
```

### 4.4 `diagnose.js` — The Doctor (Uses Gemini AI)

When patrol.js detects a `DIAGNOSE_WITH_GEMINI` issue, it calls this module.

```javascript
/**
 * diagnose.js — The Doctor
 *
 * Uses the Google Gemini API to analyze why a scraper broke.
 * It fetches the raw HTML/JSON of the broken page, sends it to Gemini
 * with a diagnostic prompt, and returns Gemini's analysis.
 *
 * IMPORTANT: Reuse the existing Gemini client from:
 *   backend-cronjob/src/services/ai/gemini-parser.js
 *   (specifically the @google/genai SDK and GEMINI_API_KEY from .env)
 *
 * FUNCTION: diagnoseFailure(source, issue, options)
 *
 * @param {string} source — "upsc" or "ssc"
 * @param {Object} issue — The triggered issue from patrol.js
 * @param {Object} options
 *   options.registry: Object — scraper-registry.js data for this source
 *   options.previousHtml: string | null — Last known good HTML (from history)
 *
 * @returns {DiagnosticReport}
 *   {
 *     source: "upsc",
 *     issueId: "DATA_ZERO_RESULTS",
 *     geminiAnalysis: {
 *       rootCause: "The website switched from a table layout to a card-based grid",
 *       suggestedCssSelector: ".card-exam-listing a[href*='/examinations/']",
 *       suggestedFix: "Update parseIndexHtml() to look for .card-exam-listing instead of .view-content .views-row",
 *       confidence: "HIGH",
 *       layoutChanged: true,
 *       newStructureDescription: "The page now uses Bootstrap cards with class 'card-exam-listing'"
 *     },
 *     rawHtmlSnippet: "...(first 2000 chars of the broken page)...",
 *     timestamp: ISO string
 *   }
 *
 * GEMINI PROMPT TO USE:
 * =====================
 * You are ScrapperMan, a diagnostic AI for the MyPath web scraping system.
 * A scraper that was previously working has stopped returning results.
 *
 * SOURCE: {source} ({registry.name})
 * EXPECTED URL: {registry.primary.url}
 * ISSUE DETECTED: {issue.name} — {issue.description}
 *
 * Here is the current raw HTML/JSON response from the government website:
 * ```
 * {rawContent (first 5000 characters)}
 * ```
 *
 * Previously, the scraper was looking for these CSS selectors/patterns:
 * - UPSC: `.view-content .views-row`, `a[href*="/examinations/"]`, `table tr`
 * - SSC: JSON response with `data` array containing `examCode`, `examName`, `applicationEndDate`
 *
 * Please analyze and respond in this exact JSON format:
 * {
 *   "rootCause": "One sentence explaining why the scraper broke",
 *   "suggestedCssSelector": "New CSS selector that would find the exam listings",
 *   "suggestedFix": "Specific code change recommendation",
 *   "confidence": "HIGH | MEDIUM | LOW",
 *   "layoutChanged": true | false,
 *   "newStructureDescription": "Description of the new page structure"
 * }
 * =====================
 *
 * BEHAVIOR:
 * 1. Fetch the raw HTML/JSON from the broken URL using BaseScraper.fetchWithRetry()
 * 2. Truncate to first 5000 characters (to stay within Gemini token limits)
 * 3. Send the diagnostic prompt to Gemini
 * 4. Parse Gemini's JSON response
 * 5. Return the DiagnosticReport
 * 6. If Gemini itself fails, return a report with geminiAnalysis = null and a fallback message
 */
```

### 4.5 `self-fix.js` — The Technician

Handles automated fixes for minor problems.

```javascript
/**
 * self-fix.js — The Technician
 *
 * Attempts to automatically fix minor scraper issues without human intervention.
 *
 * FUNCTION: attemptAutoFix(issue, source, options)
 *
 * @param {Object} issue — The triggered issue from patrol.js
 * @param {string} source — "upsc" or "ssc"
 * @param {Object} options
 *   options.registry: Object — scraper-registry.js entry for this source
 *   options.scraperManager: ScraperManager instance
 *
 * @returns {FixResult}
 *   {
 *     attempted: true,
 *     fixType: "RETRY_WITH_LONGER_TIMEOUT",
 *     success: boolean,
 *     message: "Retried with 30s timeout — got 5 results",
 *     newRecords: NormalizedExamRecord[] | null
 *   }
 *
 * SUPPORTED AUTO-FIX ACTIONS:
 *
 * "RETRY_WITH_LONGER_TIMEOUT":
 *   - Re-run the scraper with timeoutMs doubled (30000ms instead of 15000ms)
 *   - If it succeeds, return the new records
 *
 * "SWITCH_TO_FALLBACK":
 *   - For UPSC: Try scraping the RSS feed (rss.php) instead of active-exams page
 *   - For SSC: Try the lastUpdates API instead of liveExams API
 *   - Use the fallback URL from scraper-registry.js
 *
 * "ROTATE_USER_AGENT":
 *   - Re-run the scraper with a different User-Agent string
 *   - Maintain a list of 5 common browser User-Agent strings
 *   - Cycle through them on each retry
 *
 * "WAIT_AND_RETRY":
 *   - Wait for the specified retryDelayMs (from health-rules.js)
 *   - Then re-run the scraper normally
 *
 * "DEDUPLICATE_RECORDS":
 *   - Filter the records array to remove entries with duplicate IDs
 *   - Keep the first occurrence of each ID
 *
 * "RETRY_WITH_BACKOFF":
 *   - Retry up to 3 times with exponential backoff (2s, 4s, 8s)
 *
 * "LOG_WARNING":
 *   - No fix needed. Just log the warning to history.
 *   - Return { attempted: false, message: "Logged as warning" }
 *
 * "FLAG_BROKEN_LINK" / "FLAG_WRONG_CONTENT" / "FLAG_EMPTY_PDF":
 *   - Mark the specific record's officialNotificationUrl as "BROKEN" in the health report
 *   - Do not remove the record (the exam itself is valid, just the PDF link is bad)
 *
 * "DIAGNOSE_WITH_GEMINI":
 *   - This is NOT handled by self-fix.js
 *   - The main orchestrator (index.js) should call diagnose.js instead
 *   - Return { attempted: false, fixType: "REQUIRES_DIAGNOSIS" }
 *
 * "ALERT_ADMIN_IMMEDIATELY":
 *   - This is NOT handled by self-fix.js
 *   - The main orchestrator (index.js) should call report.js instead
 *   - Return { attempted: false, fixType: "REQUIRES_ADMIN" }
 */
```

### 4.6 `report.js` — The Mailman

Sends admin SOS alerts when ScrapperMan cannot fix a problem itself.

```javascript
/**
 * report.js — The Mailman
 *
 * Sends diagnostic email reports to the admin when ScrapperMan detects
 * issues it cannot fix automatically.
 *
 * IMPORTANT: Reuse the existing Resend email service from:
 *   backend-cronjob/src/services/email/email-service.js
 *   and the RESEND_API_KEY from .env
 *   and the NOTIFICATION_RECIPIENT_EMAIL from .env (this is the admin)
 *
 * FUNCTION: sendAdminReport(healthReport, diagnosticReport, options)
 *
 * @param {HealthReport} healthReport — Output of patrol.js
 * @param {DiagnosticReport|null} diagnosticReport — Output of diagnose.js (null if diagnosis was skipped)
 * @param {Object} options
 *   options.adminEmail: string (defaults to NOTIFICATION_RECIPIENT_EMAIL)
 *   options.dryRun: boolean (if true, write HTML to file instead of sending)
 *
 * @returns {ReportResult}
 *   {
 *     sent: boolean,
 *     messageId: string | null,
 *     previewPath: string | null
 *   }
 *
 * EMAIL CONTENT MUST INCLUDE:
 * 1. Subject line: "🚨 ScrapperMan Alert: {overallStatus} — {primary issue name}"
 * 2. Timestamp of when the issue was detected
 * 3. Which source (UPSC/SSC) is affected
 * 4. The specific issue name and description from health-rules.js
 * 5. How many exams were successfully scraped vs expected
 * 6. If diagnose.js was run: include Gemini's rootCause and suggestedFix
 * 7. List of any broken PDF links found during patrol
 * 8. Comparison with last known good run (what exams appeared/disappeared)
 *
 * EMAIL FORMAT:
 * - Use a clean, professional HTML template (similar to exam notification emails)
 * - Color-code by severity: 🟢 GREEN (HEALTHY), 🟡 YELLOW (DEGRADED), 🔴 RED (CRITICAL)
 * - Include a "Raw Data" section at the bottom with the JSON health report for debugging
 */
```

### 4.7 `history.js` — Health History Tracker

```javascript
/**
 * history.js — Health History Tracker
 *
 * Manages the persistent JSON files that track ScrapperMan's health checks over time.
 *
 * DATA FILES:
 *   data/scrapperman-history.json — Array of HealthReport objects (last 100 entries)
 *   data/scrapperman-last-run.json — Snapshot of the last HEALTHY scrape result
 *
 * FUNCTIONS:
 *
 * saveHealthReport(report):
 *   - Append the HealthReport to scrapperman-history.json
 *   - Keep only the last 100 entries (FIFO queue)
 *   - Create the file if it doesn't exist
 *
 * getLastHealthReport():
 *   - Return the most recent HealthReport from history, or null
 *
 * saveLastGoodRun(records):
 *   - Save the current records array to scrapperman-last-run.json
 *   - Only call this when the patrol status is "HEALTHY"
 *
 * getLastGoodRun():
 *   - Return the last known good records array, or null
 *   - Used by patrol.js to compare current vs previous results
 *
 * getHealthTrend(n):
 *   - Return the last N health reports
 *   - Used to detect degradation trends (e.g., 3 consecutive DEGRADED = alert admin)
 *
 * NOTE: Use synchronous fs.readFileSync / fs.writeFileSync for simplicity.
 *       The data files are small (< 1MB) and this runs in a cron job, not a web server.
 */
```

### 4.8 `index.js` — Main Orchestrator

```javascript
/**
 * index.js — ScrapperMan Main Orchestrator
 *
 * This is the single entry point that ties all modules together.
 * It is called after the normal scraping pipeline completes.
 *
 * FUNCTION: runScrapperMan(scrapeResult, options)
 *
 * @param {Object} scrapeResult — Output of ScraperManager.scrapeAllDetailed()
 * @param {Object} options
 *   options.validatePdfLinks: boolean (default: true)
 *   options.enableAutoFix: boolean (default: true)
 *   options.enableDiagnosis: boolean (default: true)
 *   options.enableAdminAlerts: boolean (default: true)
 *   options.adminEmail: string (default: process.env.NOTIFICATION_RECIPIENT_EMAIL)
 *   options.dryRun: boolean (default: false)
 *
 * @returns {ScrapperManResult}
 *   {
 *     healthReport: HealthReport,
 *     diagnosticReports: DiagnosticReport[],
 *     fixResults: FixResult[],
 *     adminAlertSent: boolean,
 *     finalRecords: NormalizedExamRecord[] (the possibly-fixed records to use downstream)
 *   }
 *
 * ORCHESTRATION FLOW:
 *
 * 1. Run patrol.js → get HealthReport
 *
 * 2. For each issue in HealthReport.issues:
 *    a. If issue.suggestedFix === "DIAGNOSE_WITH_GEMINI" AND options.enableDiagnosis:
 *       → Call diagnose.js
 *       → Store DiagnosticReport
 *
 *    b. Else if issue.suggestedFix !== "ALERT_ADMIN_IMMEDIATELY":
 *       → Call self-fix.js with the issue
 *       → If fix succeeds and returns new records, merge them into finalRecords
 *       → Store FixResult
 *
 * 3. Determine if admin alert is needed:
 *    - If overallStatus is "CRITICAL" → always alert
 *    - If overallStatus is "DEGRADED" for 3+ consecutive runs → alert
 *    - If any fix failed → alert
 *    - If any issue has suggestedFix === "ALERT_ADMIN_IMMEDIATELY" → alert
 *
 * 4. If admin alert needed AND options.enableAdminAlerts:
 *    → Call report.js to send the email
 *
 * 5. Save HealthReport to history
 *
 * 6. If status is HEALTHY (possibly after auto-fixes):
 *    → Save current records as last good run
 *
 * 7. Return the complete ScrapperManResult
 *
 * CONSOLE OUTPUT:
 * Print a colored summary to the terminal:
 *   ┌─────────────────────────────────────┐
 *   │      SCRAPPERMAN HEALTH CHECK       │
 *   ├─────────────────────────────────────┤
 *   │ Status:  🟢 HEALTHY / 🟡 DEGRADED / 🔴 CRITICAL
 *   │ UPSC:    ✅ 10 exams scraped (3.2s)
 *   │ SSC:     ✅ 1 exam scraped (1.1s)
 *   │ Issues:  0 detected
 *   │ Fixes:   0 attempted
 *   │ Alert:   Not needed
 *   └─────────────────────────────────────┘
 */
```

---

## 5. INTEGRATION POINT

ScrapperMan should be called from the existing pipeline. The pipeline file is at:
`backend-cronjob/src/scripts/pipeline.js`

After the scraping step completes, add:

```javascript
// After scraping, run ScrapperMan health check
const { runScrapperMan } = require('../services/scrapperman');
const scrapperManResult = await runScrapperMan(scrapeDetailedResult, {
  validatePdfLinks: true,
  enableAutoFix: true,
  enableDiagnosis: true,
  enableAdminAlerts: !options.dryRun,
  dryRun: options.dryRun
});

// Use ScrapperMan's possibly-fixed records for the rest of the pipeline
const finalRecords = scrapperManResult.finalRecords || scrapeDetailedResult.records;
```

---

## 6. MANUAL TESTING SCRIPT

Create a standalone test script at:
`backend/manual_testing/2_test_scrapperman.js`

```javascript
// This script runs ScrapperMan independently so the admin can test it from the terminal.
// Usage: node 2_test_scrapperman.js
//
// It should:
// 1. Run the scrapers (live)
// 2. Run ScrapperMan patrol on the results
// 3. Print the full health report to the terminal
// 4. If any issues found, show the auto-fix attempts
// 5. If diagnosis was needed, show Gemini's analysis
// 6. End with the colored summary dashboard
```

---

## 7. IMPORTANT REQUIREMENTS

1. **DO NOT install any new npm packages.** Use only what is already in package.json.
2. **DO NOT modify existing scraper files** (upsc-scraper.js, ssc-scraper.js, base-scraper.js) unless absolutely necessary. ScrapperMan is a monitoring layer that wraps around them.
3. **Reuse the existing Gemini client** from `src/services/ai/` for diagnosis.
4. **Reuse the existing Resend email client** from `src/services/email/` for admin alerts.
5. **All file paths must use the existing project structure.** The data directory is at `backend-cronjob/data/`.
6. **Handle all errors gracefully.** ScrapperMan itself should never crash the pipeline. If ScrapperMan fails internally, it should log the error and let the pipeline continue normally.
7. **The health-rules.js detect functions must work.** They receive real runtime data — make sure the parameter shapes match what patrol.js actually passes to them.
8. **Console output should use ANSI colors** for terminal readability (green for healthy, yellow for degraded, red for critical). Respect `NO_COLOR` environment variable.

---

## 8. SUMMARY

ScrapperMan is a 7-file module that acts as an autonomous watchdog for MyPath's web scraping system. It patrols, diagnoses, self-heals, and reports. It uses a dataset of 16+ known failure patterns, the Google Gemini API for unknown failures, and the Resend email API for admin alerts. It stores health history in JSON files and runs after every scrape as part of the existing pipeline.

**Build all 7 files. Build the manual testing script. Integrate into the pipeline. Make it production-ready.**

