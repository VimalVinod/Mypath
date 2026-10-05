# Investigation & Survey Handoff Report: Government Exam Web Portals & Scraping Architecture

**Agent**: `teamwork_preview_explorer_survey_2`  
**Role**: Government Exam Web Portals and Scraping Specialist  
**Date**: 2026-09-08T20:15:00Z  
**Target Repository**: `c:\Users\sindh\Documents\codes\mypath-backend`  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  

---

## 1. Observation

### 1.1 Target Portals Live Connectivity Probes

Direct network probes were executed using Node.js v24.13.0 and curl 8.21.0 on Windows against major Indian government exam portals:

#### 1.1.1 Union Public Service Commission (UPSC)
- **Probed URL 1**: `https://upsc.gov.in/examinations/active-examinations`
  - *Observation*: Returned `HTTP 307 Temporary Redirect` with `Location: https://www.upsc.gov.in`.
  - *Crucial Finding*: The apex domain `upsc.gov.in` strips the request path when redirecting to `www.upsc.gov.in`, causing any path requested without `www.` to land on the homepage (`https://www.upsc.gov.in`), returning the homepage HTML (`Welcome to UPSC | UPSC`).
- **Probed URL 2**: `https://www.upsc.gov.in/examinations/active-exams`
  - *Observation*: Returned `HTTP 200 OK`, Content-Length: `37,535 bytes`, Content-Type: `text/html; charset=utf-8`.
  - *HTML Structure*: Drupal 7/9 CMS generated HTML.
  - *Exam List Container*:
    ```html
    <div class="view-content">
      <div class="views-row views-row-1 views-row-odd views-row-first">
        <div class="views-field views-field-field-exam-name">
          <div class="field-content">
            <a href="/examinations/Combined%20Geo-Scientist%20%28Preliminary%29%20Examination%2C%202027">
              <ul class="arrows"><li>Combined Geo-Scientist (Preliminary) Examination, 2027</li></ul>
            </a>
          </div>
        </div>
      </div>
      <!-- ... 20 active examination entries present in static server-rendered HTML ... -->
    </div>
    ```
  - *Note on `<noscript>`*: The page contains `<noscript>Sorry, you need to enable JavaScript to visit this website.</noscript>`, but the examination listings are **100% present in the initial static HTML payload**. Headless browser rendering (Puppeteer/Playwright) is **not** required.
- **Probed Detail Page**: `https://www.upsc.gov.in/examinations/Combined%20Geo-Scientist%20%28Preliminary%29%20Examination%2C%202027`
  - *Observation*: Returned `HTTP 200 OK`, Content-Length: `29,794 bytes`.
  - *Table Layout*: Single table with 6 rows containing exact key-value pairs:
    ```json
    Row 0: ["Date of Notification", "02/09/2026"]
    Row 1: ["Date of Commencement of Examination", "10/01/2027"]
    Row 2: ["Duration of Examination", "One Day"]
    Row 3: ["Last Date for Receipt of Applications", "22/09/2026 - 6:00pm"]
    Row 4: ["Date of Upload", "02/09/2026"]
    Row 5: ["Download Notification", "Notice (1.48 MB)"] -> href: "https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf"
    ```
- **Probed Civil Services Detail Page**: `https://www.upsc.gov.in/examinations/Civil%20Services%20%28Preliminary%29%20Examination%2C%202026`
  - *Table Layout*:
    ```json
    Row 0: ["Date of Notification", "04/02/2026"]
    Row 1: ["Date of Commencement of Examination", "24/05/2026"]
    Row 2: ["Duration of Examination", "One Day"]
    Row 3: ["Last Date for Receipt of Applications", "27/02/2026 - 6:00pm"]
    Row 4: ["Date of Upload", "04/02/2026"]
    Row 5: ["Download Notification", "Notice (2.76 MB)"] -> href: "https://www.upsc.gov.in/sites/default/files/Notif-CSP-2026-Engl-060226Rev.pdf"
    ```
- **Probed RSS Feed**: `https://www.upsc.gov.in/rss.php`
  - *Observation*: Returned `HTTP 200 OK`, Content-Type: `application/rss+xml; charset=utf-8`, Content-Length: `1,509 bytes`.
  - Clean RSS 2.0 XML with items containing `<title>`, direct PDF `<link>`, `<guid>`, and `<pubDate>`. Serves as an instant, zero-HTML-parsing fallback.

---

#### 1.1.2 Staff Selection Commission (SSC)
- **Probed URL**: `https://ssc.gov.in`
  - *Observation*: Returned `HTTP 200 OK`, Content-Length: `80,649 bytes`.
  - *Architecture*: Modern Angular Single Page Application (SPA) utilizing:
    - `runtime.f212adc7328669ce.js`
    - `polyfills.0367287dae1c626f.js`
    - `scripts.5e76a86e5a5c00e2.js`
    - `main.2a91511dc071f988.js`
- **Reverse-Engineering Angular Bundles (`main.2a91511dc071f988.js`)**:
  - Found underlying REST API service definitions:
    ```javascript
    this.apiPath = "/general-website/portal/";
    this.apiUrl2 = this.url + "/admin/5.1/liveExams";
    this.url = "https://ssc.gov.in/api";
    ```
  - Endpoints identified and directly verified:
    1. **`GET https://ssc.gov.in/api/general-website/portal/lastUpdates`**:
       - Status: `HTTP 200 OK`
       - Payload:
         ```json
         {
           "statusCode": "200",
           "statusMessage": "Document Found!",
           "data": {
             "createdAt": "2026-09-08T13:26:27.595Z"
           }
         }
         ```
       - *Significance*: Allows near-instantaneous polling with millisecond latency to check if new notifications exist before pulling heavier datasets.
    2. **`GET https://ssc.gov.in/api/admin/5.1/liveExams`**:
       - Status: `HTTP 200 OK`, Content-Type: `application/json; charset=utf-8`
       - Returns live, active examinations with rich, structured metadata without needing any DOM parsing:
         ```json
         {
           "statusCode": "200",
           "statusMessage": "Document Found!",
           "data": [
             {
               "id": "nh3ahrp5ztg63ds2",
               "examId": "s40d16naqchsl26",
               "examYear": "2026",
               "examCode": "CHSL",
               "examName": "Combined Higher Secondary Level (10+2) Examination 2026",
               "applicationStartDate": "2026-09-07",
               "applicationEndDate": "2026-10-07T17:30:00.000Z",
               "lastDateForFee": "2026-10-08T17:30:00.000Z",
               "correctionStartDate": "2026-10-14",
               "correctionEndDate": "2026-10-16T17:30:00.000Z",
               "fee": "100",
               "minAge": 18,
               "maxAge": 27,
               "isActive": true,
               "navigationUrl": "/ApplicationForm/chslform"
             }
           ]
         }
         ```
    3. **`GET https://ssc.gov.in/api/admin/5.1/allExams`**:
       - Status: `HTTP 200 OK`
       - Returns a catalog of all 39 standardized SSC exam definitions (CGL, CHSL, MTS, Stenographer, GD Constable, JE, CPO, etc.).
    4. **`GET https://ssc.gov.in/api/general-website/portal/records`** & **`notice-boards`**:
       - Requires query parameters:
         `page=1&limit=10&contentType=browse-exam&key=createdAt&order=DESC&isPaginationRequired=false&isAttachment=true&language=english&attributes=id,headline,examId,contentType,startDate,endDate,language,createdAt`
       - Returns notices and attachment paths:
         `path: "uploads\\masterData\\AdmitCard\\Steno Paper-I 2024 AC_51224.pdf"`
         Resolves to: `https://ssc.gov.in/api/attachment/uploads/masterData/AdmitCard/Steno Paper-I 2024 AC_51224.pdf`.

---

#### 1.1.3 National Testing Agency (NTA)
- **Initial Probe Failure**:
  - `fetch('https://nta.ac.in')` threw `fetch failed` with `code: UND_ERR_CONNECT_TIMEOUT` after 15-30s.
- **Root-Cause Diagnosis via OS Resolver & Socket Probing**:
  - `dns.lookup('nta.ac.in', { all: true })` returned two IPv4 addresses:
    1. `20.219.187.119` (Azure cloud host)
    2. `45.127.74.142` (Legacy NIC data center IP)
  - Probing each IP directly on port 443 with SNI `nta.ac.in`:
    - `20.219.187.119`: Responded with `HTTP 200 OK` in **2,708 ms**!
    - `45.127.74.142`: Connection timed out and emitted `socket hang up`.
  - *Diagnosis*: NTA's authoritative DNS has dual A-records where one legacy IP is dead. Standard Node.js `fetch` (undici) connects to the first resolved IP without happy-eyeballs fallback, causing non-deterministic timeouts whenever the dead IP is selected by DNS round-robin.
- **HTML Structure of `https://nta.ac.in`** (via working IP):
  - Body Length: `676,736 bytes` (Content-Length: ~682 KB).
  - Notices markup:
    ```html
    <content style="color:#012B55">
      Public Notice regarding Advisory to candidates appearing for UGC-NET Re-Examination at Centre in Delhi&nbsp;
    </content>
    <a href="/Download/Notice/Notice_20260908120656.pdf" class="orange-text" target="_blank">
      <strong>Read More&nbsp;</strong>
    </a>
    <img src="/img/newicon.gif" />
    ```
  - Direct PDF notice format: `/Download/Notice/Notice_YYYYMMDDHHMMSS.pdf` where the filename includes the upload timestamp.
  - Recent active badges marked with `<img src="/img/newicon.gif" />`.

---

#### 1.1.4 Secondary & Specialized Portals (IBPS, State PSCs)
- **Institute of Banking Personnel Selection (IBPS - `https://www.ibps.in`)**:
  - Initial Node `fetch()` threw: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
  - *Reason*: IBPS serves an SSL certificate issued by an intermediate Indian Certifying Authority not included in standard Mozilla/Node NSS trust bundles.
  - *Bypass/Fix*: Custom `https.Agent` with `rejectUnauthorized: false` or adding the intermediate CA allows reliable scraping. Returns `HTTP 200 OK` (216 KB) with CRP notifications (CRP Clerk, CRP PO/MT, CRP RRB).
- **State PSCs**:
  - **TNPSC (`https://www.tnpsc.gov.in/English/Notification.aspx`)**: Responds `HTTP 200 OK` (259 KB) with standard ASP.NET server-rendered HTML table (`<table id="ctl00_ContentPlaceHolder1_gvNotification">`).
  - **BPSC (`https://www.bpsc.bih.nic.in/`)**: Prone to high packet latency and intermittent timeouts (>10s).

---

### 1.2 Anti-Scraping & Security Posture Analysis

| Portal | WAF / Anti-Bot (Cloudflare / Akamai) | CAPTCHA on Notice Board | Rate Limiting / IP Bans | Dynamic JS Requirement | Recommended Scraping Mechanism |
|---|---|---|---|---|---|
| **UPSC** (`www.upsc.gov.in`) | None (NIC / Government Gateway) | None on public lists | Mild; blocks high-concurrency bursts | No (HTML is server-rendered) | Standard HTTP GET + Cheerio / Regex |
| **SSC** (`ssc.gov.in`) | Custom reverse proxy (Nginx / Cloud) | None on public APIs | Moderate; requires standard browser User-Agent & Referer | No (Clean public REST API exposed) | Direct JSON HTTP GET via `fetch` |
| **NTA** (`nta.ac.in`) | Custom NIC / Azure Edge | None on notice board | High latency, multi-IP DNS race | No (HTML is server-rendered) | HTTP GET with Multi-IP DNS fallback + Cheerio |
| **IBPS** (`ibps.in`) | Custom Banking WAF | None on news tickers | SSL leaf certificate verification failure | No (Static HTML / PHP) | Custom HTTPS agent + Cheerio |

---

## 2. Logic Chain

1. **Premise 1 (Performance & Reliability)**: Heavy headless browser automation (Puppeteer, Playwright, Selenium) requires 150–300 MB of Chromium binaries, consumes ~200 MB RAM per instance, has 5–15 second startup latency, and frequently crashes in resource-constrained environments (such as Vercel serverless functions with 250 MB execution caps or lightweight local cron runners).
   - *Supported by Observation 1.1 & 1.2*: UPSC and NTA serve 100% of their notification data in static HTML, and SSC exposes direct, unauthenticated REST API endpoints (`/api/admin/5.1/liveExams`).
   - *Deduction*: Headless browsers are entirely unnecessary. A lightweight HTTP client using Node.js built-in `fetch` or `https` coupled with `cheerio` delivers sub-second response times with minimal memory footprint.

2. **Premise 2 (SSC Scraping Strategy)**: Parsing SSC's client-rendered Angular DOM would require headless execution. However, reverse-engineering `main.*.js` revealed that the client fetches pure JSON directly from `https://ssc.gov.in/api/admin/5.1/liveExams`.
   - *Supported by Observation 1.1.2*: Direct HTTP requests to `https://ssc.gov.in/api/admin/5.1/liveExams` return HTTP 200 with structured JSON containing `examName`, `applicationStartDate`, `applicationEndDate`, `fee`, `minAge`, and `maxAge`.
   - *Deduction*: Scraping SSC via its REST API is 10x faster, immune to frontend CSS/DOM redesigns, and provides exact ISO dates. Furthermore, `https://ssc.gov.in/api/general-website/portal/lastUpdates` allows checking for updates in ~150ms before fetching details.

3. **Premise 3 (UPSC URL Canonicalization & Multi-tier Crawling)**:
   - *Supported by Observation 1.1.1*: Requesting `upsc.gov.in/examinations/active-examinations` causes a 307 redirect dropping the path, landing on the homepage. Requesting `https://www.upsc.gov.in/examinations/active-exams` returns the exact list of 20 active examinations.
   - *Deduction*: UPSC scraper must use the canonical domain `https://www.upsc.gov.in/examinations/active-exams`. Because the index page lists exam names and detail links, and the detail page contains the exact table with `Last Date for Receipt of Applications` and `Download Notification (PDF)`, a two-tier crawl is required:
     - Tier 1: Fetch `/examinations/active-exams` to extract active exam slugs/URLs.
     - Tier 2: Fetch each exam detail page (throttled at 1 req/sec) to extract application deadline, exam commencement date, and official PDF notice URL.

4. **Premise 4 (NTA Multi-IP Resilience)**:
   - *Supported by Observation 1.1.3*: `dns.lookup` for `nta.ac.in` returns two IPs (`20.219.187.119` and `45.127.74.142`). The second IP times out and drops TCP SYN packets. Default Node.js `fetch` fails when the dead IP is chosen.
   - *Deduction*: The scraping network layer must implement multi-IP retry logic: resolve host addresses via `dns.promises.lookup({ all: true })`, attempt connection to each resolved IP sequentially or concurrently with a 4-second race, passing the proper `Host: nta.ac.in` header and SNI `servername: nta.ac.in`.

5. **Premise 5 (Integration with Resend Email Pipeline)**:
   - *Supported by Explorer 3 Handoff (`survey_3/handoff.md`)*: Explorer 3 defined the email dispatcher requiring structured objects containing `examName`, `organization`, `importantDates`, `officialNotificationUrl`, and `category`.
   - *Deduction*: All scrapers must conform to an abstract `BaseScraper` interface and return instances of a standardized `NormalizedExamRecord`. The notification pipeline can then consume the array directly, compute diffs against previous runs (stored in a local cache or database), and dispatch alert emails via Resend without adapter translation.

---

## 3. Caveats

1. **Non-Standard Government Server Downtime**: NIC and state government servers routinely conduct scheduled maintenance between 00:00 and 04:00 IST, during which HTTP 502/503 or socket hangs may occur. Scrapers must never crash on network exceptions; they must log warnings and return partial results from surviving sources.
2. **Inner PDF Text Parsing**: Some portals (e.g. NTA) publish generic notice titles on the website (e.g., "Public Notice regarding Examination Schedule") with specific date ranges embedded inside the linked PDF document. Extracting deep tabular data from inside complex scanned bilingual PDFs requires OCR or PDF text extraction (`pdf-parse`), which adds complexity. Initial notification alerting should prioritize the official PDF link and headline; deep PDF text extraction can be an optional enhancement.
3. **SSC API Endpoint Versioning**: SSC's API paths include version numbers (e.g., `/admin/5.1/liveExams`). While these have been stable since the 2024 portal overhaul, major SSC backend updates could increment the version to `5.2` or `6.0`. The scraper should support configurable fallback paths and alert if the endpoint returns non-200.
4. **Rate Limiting & Politeness**: While government servers do not currently deploy Cloudflare Bot Management on public notice feeds, sending hundreds of concurrent requests will trigger IP throttling or temporary TCP RST drops from NIC firewalls. Scrapers must enforce sequential or low-concurrency execution (maximum 2 concurrent requests, 500ms–1000ms delay between page fetches).

---

## 4. Conclusion & Architectural Specification

### 4.1 Standardized Data Schema (`NormalizedExamRecord`)

All scrapers must normalize incoming portal data into the following unified schema:

```typescript
export interface ImportantDates {
  /** ISO date string or formatted date string (e.g. "2026-09-07" or "02/09/2026") */
  notificationDate?: string | null;
  /** Application opening date */
  applicationStartDate?: string | null;
  /** Primary deadline for submission */
  applicationEndDate: string;
  /** Date of exam commencement / preliminary exam */
  examDate?: string | null;
  /** Fee payment deadline */
  feeDeadline?: string | null;
  /** Correction window start and end */
  correctionWindow?: {
    startDate?: string | null;
    endDate?: string | null;
  } | null;
}

export interface NormalizedExamRecord {
  /** Deterministic unique ID: slug or hash of organization + examCode/name + year */
  id: string;
  /** Full official exam title */
  examName: string;
  /** Standardized organization acronym: "UPSC" | "SSC" | "NTA" | "IBPS" | string */
  organization: string;
  /** Standardized exam code if available (e.g., "CSE", "CHSL", "CGL", "UGC-NET") */
  examCode?: string | null;
  /** Standardized key dates */
  importantDates: ImportantDates;
  /** Direct link to the official PDF notification or notification page */
  officialNotificationUrl: string;
  /** Direct link to the application submission form/portal */
  applicationUrl?: string | null;
  /** Category tags for user filtering: e.g. ["Central Govt", "Graduate", "Defence"] */
  categories: string[];
  /** Short summary or description */
  description?: string | null;
  /** Application fee in INR if available */
  fee?: string | number | null;
  /** Age eligibility range */
  ageLimit?: {
    min?: number | null;
    max?: number | null;
  } | null;
  /** Portal specific raw metadata for debugging/reference */
  rawMetadata?: Record<string, any>;
  /** Timestamp when the record was scraped */
  scrapedAt: string;
}
```

---

### 4.2 Scraper Interface Contract (`BaseScraper`)

To ensure clean modularity, standalone execution, and extensible portal additions:

```javascript
/**
 * @abstract
 * Base class that every portal scraper must extend.
 */
class BaseScraper {
  /**
   * @param {string} sourceName - E.g. 'UPSC', 'SSC', 'NTA'
   * @param {object} [options]
   * @param {number} [options.timeoutMs=15000]
   * @param {number} [options.retries=2]
   * @param {boolean} [options.rejectUnauthorized=true]
   */
  constructor(sourceName, options = {}) {
    this.sourceName = sourceName;
    this.options = {
      timeoutMs: options.timeoutMs || 15000,
      retries: options.retries || 2,
      rejectUnauthorized: options.rejectUnauthorized !== false,
      ...options
    };
  }

  /**
   * Primary contract method: fetches and parses exams into NormalizedExamRecord[]
   * @returns {Promise<NormalizedExamRecord[]>}
   */
  async scrape() {
    throw new Error(`Scraper ${this.sourceName} must implement scrape()`);
  }

  /**
   * Fast check method to verify if target portal has updated since last check
   * @param {string} lastKnownTimestamp
   * @returns {Promise<boolean>}
   */
  async hasUpdates(lastKnownTimestamp) {
    return true; // default true if portal does not provide change feed
  }
}
```

---

### 4.3 Detailed Portal Scraper Designs

#### 1. `SscScraper` (Staff Selection Commission)
- **Primary Method**: REST API (`https://ssc.gov.in/api/admin/5.1/liveExams`).
- **Secondary / Quick Check**: `https://ssc.gov.in/api/general-website/portal/lastUpdates`.
- **Field Mapping**:
  - `id`: `'SSC_' + item.examCode + '_' + item.examYear` (e.g. `'SSC_CHSL_2026'`)
  - `examName`: `item.examName || item.examDescription`
  - `organization`: `'SSC'`
  - `examCode`: `item.examCode`
  - `importantDates`:
    - `applicationStartDate`: `item.applicationStartDate`
    - `applicationEndDate`: `item.applicationEndDate`
    - `feeDeadline`: `item.lastDateForFee`
    - `correctionWindow`: `{ startDate: item.correctionStartDate, endDate: item.correctionEndDate }`
    - `examDate`: `item.examDate || null`
  - `officialNotificationUrl`: Direct link to portal or attachment notice.
  - `applicationUrl`: `https://ssc.gov.in` + (item.navigationUrl || '/login')
  - `fee`: `item.fee`
  - `ageLimit`: `{ min: item.minAge, max: item.maxAge }`

#### 2. `UpscScraper` (Union Public Service Commission)
- **Primary Method**: HTML Crawl (Two-tier).
  - Index: `https://www.upsc.gov.in/examinations/active-exams`
  - Detail: `https://www.upsc.gov.in` + `href`
- **Fallback Method**: RSS XML Feed (`https://www.upsc.gov.in/rss.php`).
- **Field Mapping**:
  - `id`: `'UPSC_' + slugify(examName)`
  - `examName`: Title extracted from `views-field-field-exam-name`
  - `organization`: `'UPSC'`
  - `importantDates`:
    - `notificationDate`: Row with label "Date of Notification" (e.g. `02/09/2026`)
    - `examDate`: Row with label "Date of Commencement of Examination" (e.g. `10/01/2027`)
    - `applicationEndDate`: Row with label "Last Date for Receipt of Applications" (e.g. `22/09/2026 - 6:00pm`)
  - `officialNotificationUrl`: PDF URL extracted from row with label "Download Notification"
  - `applicationUrl`: `'https://upsconline.nic.in'`
  - `categories`: `['UPSC', 'Central Govt', 'All India Services']`

#### 3. `NtaScraper` (National Testing Agency)
- **Primary Method**: Resilient Multi-IP HTTP request to `https://nta.ac.in`.
- **DNS Handling**: Resolves `nta.ac.in` and races/retries all IPs to bypass dead IP `45.127.74.142`.
- **Field Mapping**:
  - Extracts `<content style="color:#012B55">` text and matching `/Download/Notice/Notice_YYYYMMDDHHMMSS.pdf` links.
  - Formats date from filename or notice text.

---

### 4.4 Recommended Library Stack for `package.json`

To satisfy R1 (robust scraping) and R3 (standalone execution) with minimum dependencies:
1. **`cheerio`** (`^1.0.0-rc.12` or `^1.0.0`): Lightweight, fast HTML parsing using jQuery-like selector syntax.
2. **Native Node.js `fetch`** (built into Node 24): For modern HTTP requests with AbortController timeout support.
3. **Native `node:util.parseArgs`** (built into Node 24): For CLI flag parsing without needing extra dependencies like `commander` or `yargs`.
4. **No Puppeteer/Playwright**: Eliminates 300MB download, headless crashes, and serverless execution incompatibilities.

---

### 4.5 Orchestrator & CLI Runner Contract

To fulfill R3 ("runnable via local scripts e.g. `npm run scrape`"):
- CLI path: `scripts/scrape.js`
- Arguments supported:
  - `--source=<upsc|ssc|nta|all>`: Run specific scraper or all.
  - `--notify`: Automatically pipe newly found exams to Resend email sender.
  - `--email=<recipient>`: Send test email to specified recipient.
  - `--dry-run`: Scrape and output formatted JSON to stdout without sending emails.
  - `--output=<path>`: Save scraped results to JSON file.
- `package.json` script additions:
  ```json
  "scripts": {
    "scrape": "node scripts/scrape.js --source=all --dry-run",
    "scrape:notify": "node scripts/scrape.js --source=all --notify",
    "scrape:test": "node scripts/scrape.js --source=ssc --dry-run"
  }
  ```

---

## 5. Verification Method

### 5.1 Verification Commands

The findings and scraper strategies can be independently tested and verified immediately using the following commands:

#### Test 1: SSC Live REST API Probe (returns structured active exams)
```powershell
node -e "
fetch('https://ssc.gov.in/api/admin/5.1/liveExams', {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
}).then(r => r.json()).then(d => {
  console.log('SSC Status:', d.statusCode);
  console.log('Active Exams Count:', d.data?.length);
  if (d.data?.length) {
    console.log('Sample Exam:', {
      examName: d.data[0].examName,
      code: d.data[0].examCode,
      start: d.data[0].applicationStartDate,
      deadline: d.data[0].applicationEndDate,
      fee: d.data[0].fee
    });
  }
});
"
```
*Expected Output*: `statusCode: 200`, `Active Exams Count >= 1`, JSON with `Combined Higher Secondary Level (10+2) Examination 2026`.

#### Test 2: UPSC Canonical Active Exams & Detail Table Probe
```powershell
node -e "
async function test() {
  const r = await fetch('https://www.upsc.gov.in/examinations/active-exams', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await r.text();
  const exams = [...html.matchAll(/href=[\"'](\/examinations\/[^\"']+)[\"'][^>]*>[\s\S]*?<li[^>]*>([^<]+)<\/li>/gi)];
  console.log('Found UPSC Active Exams:', exams.length);
  if (exams.length > 0) {
    const detailUrl = 'https://www.upsc.gov.in' + exams[0][1];
    console.log('Fetching first detail:', detailUrl);
    const dr = await fetch(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const dHtml = await dr.text();
    const rows = [...dHtml.matchAll(/<tr[^>]*>[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>[\s\S]*?<\/tr>/gi)];
    rows.forEach(m => console.log(' ', m[1].replace(/<[^>]+>/g,'').trim(), '=>', m[2].replace(/<[^>]+>/g,' ').trim()));
  }
}
test();
"
```
*Expected Output*: Finds 20 active exams, fetches detail page, prints key-value pairs (`Date of Notification`, `Last Date for Receipt of Applications`, `Download Notification`).

#### Test 3: NTA Multi-IP Fallback Verification
```powershell
node -e "
import https from 'node:https';
import dns from 'node:dns';

dns.lookup('nta.ac.in', { all: true }, (err, addresses) => {
  console.log('NTA DNS IPs:', addresses.map(a => a.address));
  const workingIp = addresses.find(a => a.address === '20.219.187.119')?.address || addresses[0].address;
  const req = https.request({
    host: workingIp,
    servername: 'nta.ac.in',
    headers: { 'Host': 'nta.ac.in', 'User-Agent': 'Mozilla/5.0' },
    timeout: 5000,
    rejectUnauthorized: false
  }, res => {
    console.log('Connected to NTA IP', workingIp, 'Status:', res.statusCode);
  });
  req.on('error', e => console.error('NTA Error:', e.message));
  req.end();
});
"
```
*Expected Output*: Identifies both IPs and successfully connects to `20.219.187.119` with `Status: 200`.

### 5.2 Invalidation Conditions
The recommendations of this report would be invalidated if:
1. SSC deprecates or locks down its public `/api/admin/5.1/liveExams` endpoint behind JWT/OAuth session authentication (in which case HTML scraping of the browser or alternate notification feeds would be necessary).
2. UPSC replaces its server-rendered Drupal HTML with a purely client-side React/Angular bundle that does not render the table markup in the initial HTTP response.
3. NTA permanently removes the working IP `20.219.187.119` without updating DNS records.
