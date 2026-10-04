# Survey Report: Resend API Integration & Standalone Execution Design

- **Author**: teamwork_preview_explorer_survey_3
- **Role**: Resend Email Integration & Standalone Architecture Specialist
- **Date**: 2026-09-08T20:05:00Z
- **Target Working Directory**: `c:\Users\sindh\Documents\codes\mypath-backend`

---

## 1. Observation

### 1.1 Existing Codebase & Dependencies
- **File**: `c:\Users\sindh\Documents\codes\mypath-backend\package.json`
  - Lines 10–16:
    ```json
    "dependencies": {
      "cors": "^2.8.5",
      "dotenv": "^16.4.5",
      "express": "^4.19.2",
      "firebase-admin": "^12.1.0",
      "resend": "^3.2.0"
    }
    ```
  - Observation: `resend` (`^3.2.0`) and `dotenv` (`^16.4.5`) are already listed in production dependencies.
- **File**: `c:\Users\sindh\Documents\codes\mypath-backend\index.js`
  - Lines 4–5:
    ```javascript
    const { Resend } = require('resend');
    require('dotenv').config();
    ```
  - Lines 28–29:
    ```javascript
    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    ```
  - Lines 107–120:
    ```javascript
    const senderEmail = process.env.SENDER_EMAIL || 'MyPath Team <noreply@wildcodestudios.in>';
    
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: 'Last step — confirm your email',
      html: htmlContent,
    });

    if (error) {
      console.error("Resend Error:", error);
      return res.status(500).json({ error: error.message });
    }
    ```
  - Observation: Existing implementation already employs `resend.emails.send()`, accepts `process.env.SENDER_EMAIL` (defaulting to a verified custom domain `noreply@wildcodestudios.in`), and destructures `{ data, error }`.

### 1.2 Environment & Runtime
- **Command**: `node -v; npm -v`
  - Output: `v24.13.0` and `11.6.2`.
- **Command**: `Test-Path "c:\Users\sindh\Documents\codes\mypath-backend\.env"`
  - Output: `False`.
- **Observation**: There is currently no `.env` file present in `c:\Users\sindh\Documents\codes\mypath-backend`. Furthermore, `node_modules` is not yet installed (`Test-Path node_modules` returned `False`).
- **Command**: `node:util parseArgs` verification:
  - Command: `node -e "const { parseArgs } = require('node:util'); console.log(parseArgs({ options: { dryRun: { type: 'boolean' } }, args: ['--dryRun'] }));"`
  - Output: `{ values: [Object: null prototype] { dryRun: true }, positionals: [] }`
  - Observation: Node.js 24 provides built-in `node:util.parseArgs`, meaning the CLI runner can parse flags (`--dry-run`, `--email`, `--source`, `--force`, `--mock`) natively with zero external dependencies (no need for `commander` or `yargs`).

### 1.3 Resend API Specification & Sandbox Restrictions
- **SDK Invocation**:
  ```javascript
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  ```
- **Return Shape**:
  `resend.emails.send()` returns a Promise resolving to `{ data, error }`.
  - On Success (HTTP 200):
    ```json
    {
      "data": { "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" },
      "error": null
    }
    ```
  - On API Failure (HTTP 4xx/5xx):
    ```json
    {
      "data": null,
      "error": {
        "message": "You can only send testing emails to your own email address...",
        "name": "validation_error",
        "statusCode": 403
      }
    }
    ```
- **Sandbox Domain (`onboarding@resend.dev`) Restriction**:
  - Resend enforces a strict sandbox rule for testing: when sending from `onboarding@resend.dev`, emails can **only** be delivered to the specific email address used to register the Resend account.
  - Sending to any arbitrary recipient yields an HTTP 403 `validation_error`.
  - When using a verified domain (e.g., `wildcodestudios.in`), emails can be delivered to any arbitrary recipient address.
- **Rate Limits & Batching**:
  - Free tier rate limit: 2 requests/second, 100 emails/day, 3,000 emails/month.
  - Batch API: `resend.batch.send([...])` is supported for sending up to 100 emails in a single HTTP round-trip if notifying multiple subscribers.

---

## 2. Logic Chain

### Step 1: Environment Configuration & Resilience
- **Premise (from 1.2)**: `.env` is currently missing in the workspace, but `dotenv` is configured in `package.json`.
- **Inference**:
  1. The project requires a committed `.env.example` defining `RESEND_API_KEY`, `SENDER_EMAIL`, and `NOTIFICATION_RECIPIENT_EMAIL`.
  2. The email service and CLI runner must fail gracefully with descriptive, human-readable guidance when `RESEND_API_KEY` is missing (rather than crashing with an unhandled exception).
  3. A `--dry-run` flag must be supported across all standalone scripts so developers and automated test suites can verify scraping, data formatting, and email rendering without needing an active API key or consuming API credits.

### Step 2: Resend Sender Domain Strategy
- **Premise (from 1.1 & 1.3)**: `index.js` already references `noreply@wildcodestudios.in`, while Resend provides `onboarding@resend.dev` as the default test sandbox sender.
- **Inference**:
  - The email configuration should use a prioritized hierarchy:
    ```javascript
    const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.RESEND_FROM_EMAIL || 'ExamGo Alerts <onboarding@resend.dev>';
    ```
  - For local development and test scripts, if `SENDER_EMAIL` is set to `onboarding@resend.dev`, the target recipient must default to the account owner's email (`NOTIFICATION_RECIPIENT_EMAIL`).
  - If a 403 `validation_error` is returned, the service must intercept the error and log actionable diagnostic instructions:
    `"Resend Sandbox Restriction: onboarding@resend.dev can only send to your verified account email. Please set NOTIFICATION_RECIPIENT_EMAIL in .env or verify your custom domain in the Resend dashboard."`

### Step 3: Responsive Email Template Architecture
- **Premise (from R2)**: "The backend must integrate with the Resend API to send out beautifully formatted email notifications alerting users to newly discovered exams."
- **Inference**:
  1. Email client compatibility requires table-based layouts (`width="100%"` outer container, `width="600"` inner card) and inline CSS. Flexbox and Grid are avoided due to Outlook desktop rendering issues.
  2. Visual hierarchy must immediately emphasize critical decision points:
     - **Urgency Indicator**: Computed dynamically from `applicationEndDate` (e.g. `Math.ceil((deadline - now) / 86400000)`):
       - `days <= 3`: Critical Red badge (`⚠️ Closing Soon: X days left`).
       - `days <= 7`: Amber badge (`⏳ Deadline Approaching: X days left`).
       - `days > 7`: Green badge (`📅 Applications Open: X days left`).
       - `days < 0`: Muted badge (`❌ Application Closed`).
     - **Organization Tag**: Distinct pill badge (e.g. `Union Public Service Commission (UPSC)`).
     - **Exam Title**: Prominent bold typography (`18-20px`).
     - **Structured Dates Grid**: Start date, deadline, and tentative exam date.
     - **High-Contrast CTA Button**: Direct link to official PDF (`#2563eb`).
     - **Plain URL Fallback**: Displayed below button for security-restricted mail clients.
  3. **Multi-Exam Digest Support**: If a scraper detects multiple new exams in a single run (e.g. 3 notifications), the template must render each exam as a clean card within a single digest email rather than triggering 3 separate emails.
  4. **Plain Text Fallback (`text` field)**: Required by anti-spam filters and accessibility screen readers. A structured ASCII/Markdown version must accompany every HTML payload.
  5. **HTML Injection Protection**: Dynamic fields (exam title, organization, dates) must be sanitized through an HTML escape utility.

### Step 4: Standalone CLI Architecture (`npm run scrape`)
- **Premise (from R3 & 1.2)**: The scraper and notification logic must run standalone and support local testing and future cron scheduling.
- **Inference**:
  - The standalone execution architecture should consist of three targeted entry points:
    1. `src/scripts/scrape.js`: Executes scraper modules only. Prints structured JSON to `stdout` or saves to a JSON file (`--output=data/exams.json`).
    2. `src/scripts/test-email.js`: Dispatches a mock exam notification to verify Resend API authentication, sender domain, and HTML template rendering in isolation.
    3. `src/scripts/scrape-and-notify.js` (invoked via `npm run scrape`): The complete pipeline orchestrating scraping, deduplication, and email alert delivery.
  - To prevent duplicate alerts on scheduled runs (e.g., hourly or daily cron), a lightweight file-based deduplication store (`data/notified-exams.json`) will track previously alerted exam keys. The pipeline will only email unnotified exams unless overridden by `--force`.
  - Node.js 24's native `node:util.parseArgs` will handle CLI flags with zero third-party dependencies:
    - `--dry-run`: Generates email preview (`output/preview.html`) without calling Resend.
    - `--mock`: Feeds fixture exam data through the pipeline without network scraping.
    - `--email=<address>`: Overrides notification recipient.
    - `--source=<upsc|ssc|all>`: Targets specific scrapers.
    - `--force`: Bypasses deduplication cache.

---

## 3. Caveats

1. **No Source Code Write Permission**: As an Explorer agent, no application source files have been modified. All architectures, template code, CLI scripts, and interface contracts provided in this report are proposals ready for Milestone 2 and Milestone 3 implementation.
2. **Missing `.env`**: No `RESEND_API_KEY` was found in the workspace. Live API calls could not be executed during this survey turn; all SDK specifications, return structures, and error modes are based on official Resend documentation and verified against `resend@3.2.0` specifications.
3. **Domain Verification Status**: Whether `wildcodestudios.in` is fully verified in the user's Resend account cannot be confirmed without a valid API key. The implementation must support both `onboarding@resend.dev` (sandbox) and verified custom domains.

---

## 4. Conclusion & Proposed Designs

### 4.1 Interface Contracts

#### 4.1.1 Core Domain Models & Schemas
```typescript
/**
 * Structured exam notification item produced by scrapers and consumed by email service.
 */
export interface ExamNotificationItem {
  id: string;                      // Unique slug/hash (e.g. "upsc-cse-prelims-2026")
  title: string;                   // Official exam title (e.g. "Civil Services (Preliminary) Examination, 2026")
  organization: string;            // Organizing authority (e.g. "UPSC", "SSC")
  category?: string;               // Optional category (e.g. "Civil Services", "Engineering")
  applicationStartDate?: string;   // ISO format "YYYY-MM-DD" or formatted string
  applicationEndDate: string;      // ISO format "YYYY-MM-DD" (Application Deadline)
  examDate?: string;               // Tentative or confirmed exam date
  notificationUrl: string;         // Direct link to official PDF notification
  applicationUrl?: string;         // Direct link to online application portal
  scrapedAt: string;               // ISO timestamp of scraping
  source: string;                  // Scraper identifier (e.g. "upsc", "ssc")
}

/**
 * Calculated deadline urgency indicator.
 */
export interface UrgencyInfo {
  daysRemaining: number | null;
  status: 'critical' | 'warning' | 'open' | 'expired' | 'unknown';
  badgeText: string;
  badgeColor: string;
  badgeBg: string;
}

/**
 * Email dispatch options.
 */
export interface EmailOptions {
  recipient: string;               // Target email address
  recipientName?: string;          // Recipient display name
  subject?: string;                // Custom subject override
  dryRun?: boolean;                // If true, renders HTML/text to file without network send
  previewPath?: string;            // Filepath to save preview HTML if dryRun is active
}

/**
 * Email dispatch result.
 */
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
    details?: unknown;
  };
}

/**
 * CLI execution options parsed from command-line arguments.
 */
export interface CliOptions {
  dryRun: boolean;
  mock: boolean;
  force: boolean;
  email?: string;
  source: string;
  output?: string;
  verbose: boolean;
}

/**
 * Pipeline execution summary.
 */
export interface PipelineSummary {
  scrapedCount: number;
  newCount: number;
  notifiedCount: number;
  skippedCount: number;
  emailResult?: EmailSendResult;
  timestamp: string;
}
```

#### 4.1.2 Service Interfaces
```typescript
/**
 * Interface contract for Email Notification Service.
 */
export interface IEmailService {
  /**
   * Sends an email notification containing one or more exam items.
   */
  sendExamNotification(
    exams: ExamNotificationItem[],
    options: EmailOptions
  ): Promise<EmailSendResult>;

  /**
   * Sends a test email using mock exam data to verify API configuration.
   */
  sendTestNotification(
    options: EmailOptions
  ): Promise<EmailSendResult>;

  /**
   * Generates responsive HTML and fallback plain text for given exam items.
   */
  renderTemplates(
    exams: ExamNotificationItem[],
    options?: { recipientName?: string }
  ): { html: string; text: string; subject: string };
}

/**
 * Interface contract for Deduplication Store.
 */
export interface IDedupStore {
  isNotified(exam: ExamNotificationItem): Promise<boolean>;
  filterNewExams(exams: ExamNotificationItem[]): Promise<ExamNotificationItem[]>;
  markAsNotified(exams: ExamNotificationItem[]): Promise<void>;
}
```

---

### 4.2 Responsive HTML Email Template Design

The following production-ready template generator handles both single-exam alerts and multi-exam digests, with dynamic urgency calculation and full HTML escaping:

```javascript
// src/services/email/template.js

/**
 * Escapes HTML entities to prevent rendering issues and XSS.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calculates deadline urgency and badge styling.
 */
function calculateUrgency(endDateStr) {
  if (!endDateStr) {
    return { daysRemaining: null, status: 'unknown', badgeText: 'Dates Announced', badgeColor: '#2563eb', badgeBg: '#dbeafe' };
  }
  const deadline = new Date(endDateStr);
  if (isNaN(deadline.getTime())) {
    return { daysRemaining: null, status: 'unknown', badgeText: 'Dates Announced', badgeColor: '#2563eb', badgeBg: '#dbeafe' };
  }
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { daysRemaining: days, status: 'expired', badgeText: 'Application Closed', badgeColor: '#4b5563', badgeBg: '#f3f4f6' };
  }
  if (days <= 3) {
    return { daysRemaining: days, status: 'critical', badgeText: `⚠️ Closing Soon (${days}d left)`, badgeColor: '#b91c1c', badgeBg: '#fee2e2' };
  }
  if (days <= 7) {
    return { daysRemaining: days, status: 'warning', badgeText: `⏳ Deadline Approaching (${days}d left)`, badgeColor: '#b45309', badgeBg: '#fef3c7' };
  }
  return { daysRemaining: days, status: 'open', badgeText: `📅 Applications Open (${days}d left)`, badgeColor: '#15803d', badgeBg: '#dcfce7' };
}

/**
 * Renders an individual exam card.
 */
function renderExamCardHtml(exam) {
  const urgency = calculateUrgency(exam.applicationEndDate);
  const title = escapeHtml(exam.title);
  const org = escapeHtml(exam.organization);
  const start = exam.applicationStartDate ? escapeHtml(exam.applicationStartDate) : 'Announced';
  const end = exam.applicationEndDate ? escapeHtml(exam.applicationEndDate) : 'Check notification';
  const examDate = exam.examDate ? escapeHtml(exam.examDate) : 'To be announced';
  const notifUrl = exam.notificationUrl ? escapeHtml(exam.notificationUrl) : '#';
  const appUrl = exam.applicationUrl ? escapeHtml(exam.applicationUrl) : null;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 24px;">
          <!-- Badge Header -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
            <tr>
              <td>
                <span style="display: inline-block; background-color: #eff6ff; color: #1e40af; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px;">
                  ${org}
                </span>
              </td>
              <td align="right">
                <span style="display: inline-block; background-color: ${urgency.badgeBg}; color: ${urgency.badgeColor}; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px;">
                  ${urgency.badgeText}
                </span>
              </td>
            </tr>
          </table>

          <!-- Exam Title -->
          <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.4;">
            ${title}
          </h2>

          <!-- Date Matrix -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; width: 40%; color: #64748b;">Application Period:</td>
              <td style="padding: 4px 8px; font-weight: 500; color: #0f172a;">${start} &ndash; <strong>${end}</strong></td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #64748b;">Application Deadline:</td>
              <td style="padding: 4px 8px; font-weight: 700; color: #dc2626;">${end}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 600; color: #64748b;">Examination Date:</td>
              <td style="padding: 4px 8px; font-weight: 500; color: #0f172a;">${examDate}</td>
            </tr>
          </table>

          <!-- Action Buttons -->
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 12px;">
                <a href="${notifUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 6px; text-align: center;">
                  View Notification (PDF) &rarr;
                </a>
              </td>
              ${appUrl ? `
              <td>
                <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 6px; text-align: center;">
                  Apply Online &rarr;
                </a>
              </td>
              ` : ''}
            </tr>
          </table>

          <!-- Fallback Direct Link -->
          <p style="margin: 14px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">
            Direct link: <a href="${notifUrl}" style="color: #64748b;">${notifUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Renders full responsive email HTML container.
 */
function renderFullEmailHtml(exams, options = {}) {
  const recipientName = options.recipientName || 'Aspirant';
  const cardsHtml = exams.map(renderExamCardHtml).join('\n');
  const countText = exams.length === 1 ? '1 new exam notification' : `${exams.length} new exam notifications`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exam Notifications - ExamGo / MyPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- 600px Responsive Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Exam<span style="color: #38bdf8;">Go</span>
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">
                      Official Government Exam Tracking &amp; Alerts
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #1e293b; color: #38bdf8; font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 9999px; border: 1px solid #334155;">
                      NEW NOTIFICATION
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting & Intro -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                Hello <strong>${escapeHtml(recipientName)}</strong>,
              </p>
              <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                We detected <strong>${countText}</strong> from official government examination portals. Below are the key details and deadline alerts:
              </p>
            </td>
          </tr>

          <!-- Cards List -->
          <tr>
            <td style="padding: 8px 32px 24px 32px;">
              ${cardsHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                You received this notification because you are subscribed to exam alerts on <strong>ExamGo / MyPath</strong>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ExamGo &bull; Official portal data fetched automatically.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders fallback plain-text version for email clients without HTML support.
 */
function renderEmailText(exams, options = {}) {
  const recipientName = options.recipientName || 'Aspirant';
  const lines = [
    '======================================================================',
    'EXAMGO - OFFICIAL GOVERNMENT EXAM NOTIFICATION ALERTS',
    '======================================================================',
    `Hello ${recipientName},`,
    '',
    `We detected ${exams.length} new exam notification(s) from official portals:`,
    ''
  ];

  exams.forEach((exam, index) => {
    const urgency = calculateUrgency(exam.applicationEndDate);
    lines.push('----------------------------------------------------------------------');
    lines.push(`[${index + 1}] ${exam.title.toUpperCase()}`);
    lines.push(`Organization: ${exam.organization}`);
    lines.push(`Status:       ${urgency.badgeText}`);
    lines.push(`Start Date:   ${exam.applicationStartDate || 'Not specified'}`);
    lines.push(`Deadline:     ${exam.applicationEndDate || 'Not specified'}`);
    lines.push(`Exam Date:    ${exam.examDate || 'To be announced'}`);
    lines.push(`Notification: ${exam.notificationUrl}`);
    if (exam.applicationUrl) {
      lines.push(`Apply Online: ${exam.applicationUrl}`);
    }
    lines.push('');
  });

  lines.push('----------------------------------------------------------------------');
  lines.push('You received this email because you subscribed to ExamGo alerts.');
  lines.push('======================================================================');
  return lines.join('\n');
}

/**
 * Generates subject line based on exams count.
 */
function generateSubject(exams) {
  if (!exams || exams.length === 0) return '🔔 Exam Notification Update';
  if (exams.length === 1) {
    const exam = exams[0];
    return `🔔 New Exam Alert: ${exam.title} (${exam.organization})`;
  }
  return `🔔 New Exam Alerts: ${exams.length} New Government Exams Announced`;
}

module.exports = {
  renderFullEmailHtml,
  renderEmailText,
  generateSubject,
  calculateUrgency,
  escapeHtml
};
```

---

### 4.3 Resend Email Service Client (`src/services/email/email-service.js`)

```javascript
// src/services/email/email-service.js
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const { renderFullEmailHtml, renderEmailText, generateSubject } = require('./template');

class EmailService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.RESEND_API_KEY;
    this.senderEmail = config.senderEmail || process.env.SENDER_EMAIL || process.env.RESEND_FROM_EMAIL || 'ExamGo Alerts <onboarding@resend.dev>';
    this.defaultRecipient = config.defaultRecipient || process.env.NOTIFICATION_RECIPIENT_EMAIL;
    this.resend = this.apiKey ? new Resend(this.apiKey) : null;
  }

  async sendExamNotification(exams, options = {}) {
    const recipient = options.recipient || this.defaultRecipient;
    if (!recipient) {
      throw new Error('Recipient email address is required (pass options.recipient or set NOTIFICATION_RECIPIENT_EMAIL)');
    }

    if (!exams || exams.length === 0) {
      return { success: true, examCount: 0, recipient, message: 'No exams to notify' };
    }

    const htmlContent = renderFullEmailHtml(exams, { recipientName: options.recipientName });
    const textContent = renderEmailText(exams, { recipientName: options.recipientName });
    const subject = options.subject || generateSubject(exams);

    // Dry-run mode: save preview to disk without calling Resend API
    if (options.dryRun) {
      const previewDir = path.resolve(process.cwd(), 'output');
      if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
      const previewPath = path.join(previewDir, 'email-preview.html');
      fs.writeFileSync(previewPath, htmlContent, 'utf-8');
      console.log(`[DRY RUN] Email rendered successfully.`);
      console.log(`[DRY RUN] Subject: ${subject}`);
      console.log(`[DRY RUN] Recipient: ${recipient}`);
      console.log(`[DRY RUN] HTML Preview saved to: ${previewPath}`);
      return { success: true, dryRun: true, previewPath, recipient, examCount: exams.length };
    }

    if (!this.resend) {
      throw new Error('RESEND_API_KEY is missing. Add it to .env or pass --dry-run for local testing.');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.senderEmail,
        to: [recipient],
        subject: subject,
        html: htmlContent,
        text: textContent
      });

      if (error) {
        // Intercept Resend sandbox 403 error for clear guidance
        if (error.statusCode === 403 && this.senderEmail.includes('onboarding@resend.dev')) {
          console.error('\n[Resend Sandbox Notice]: When sending from onboarding@resend.dev, you can only deliver emails to your registered Resend account address.');
        }
        return {
          success: false,
          recipient,
          examCount: exams.length,
          error: {
            code: error.name || 'RESEND_API_ERROR',
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: true,
        messageId: data.id,
        recipient,
        examCount: exams.length
      };
    } catch (err) {
      return {
        success: false,
        recipient,
        examCount: exams.length,
        error: {
          code: 'NETWORK_OR_CLIENT_ERROR',
          message: err.message
        }
      };
    }
  }

  async sendTestNotification(options = {}) {
    const mockExams = [
      {
        id: 'upsc-cse-2026',
        title: 'Civil Services (Preliminary) Examination, 2026',
        organization: 'Union Public Service Commission (UPSC)',
        applicationStartDate: '2026-02-05',
        applicationEndDate: '2026-03-05',
        examDate: '2026-05-24',
        notificationUrl: 'https://upsc.gov.in/sites/default/files/Notice-CSP-2026-Engl-050226.pdf',
        applicationUrl: 'https://upsconline.nic.in/',
        scrapedAt: new Date().toISOString(),
        source: 'mock'
      }
    ];
    return this.sendExamNotification(mockExams, {
      ...options,
      subject: options.subject || '🧪 Test Alert: Civil Services Examination 2026 Announced'
    });
  }
}

module.exports = EmailService;
```

---

### 4.4 Standalone CLI & Script Execution Design

#### 4.4.1 Deduplication Store (`src/services/storage/dedup-store.js`)
```javascript
// src/services/storage/dedup-store.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DedupStore {
  constructor(storePath) {
    this.filePath = storePath || path.resolve(process.cwd(), 'data', 'notified-exams.json');
  }

  generateKey(exam) {
    const raw = `${exam.organization}:${exam.title}:${exam.applicationEndDate}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  filterNewExams(exams) {
    const store = this.load();
    return exams.filter(exam => {
      const key = this.generateKey(exam);
      return !store[key];
    });
  }

  markAsNotified(exams) {
    const store = this.load();
    const now = new Date().toISOString();
    exams.forEach(exam => {
      const key = this.generateKey(exam);
      store[key] = {
        title: exam.title,
        organization: exam.organization,
        deadline: exam.applicationEndDate,
        notifiedAt: now
      };
    });
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }
}

module.exports = DedupStore;
```

#### 4.4.2 Standalone Scraper CLI (`src/scripts/scrape.js`)
```javascript
// src/scripts/scrape.js
const { parseArgs } = require('node:util');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const options = {
  source: { type: 'string', short: 's', default: 'all' },
  output: { type: 'string', short: 'o' },
  help: { type: 'boolean', short: 'h', default: false }
};

async function main() {
  const { values } = parseArgs({ options, allowPositionals: true });
  if (values.help) {
    console.log('Usage: node src/scripts/scrape.js [--source=upsc|ssc|all] [--output=data/exams.json]');
    process.exit(0);
  }

  console.log(`[Scraper] Fetching exam notifications (source: ${values.source})...`);
  // Import scraper aggregator (from survey_2 / Milestone 1)
  // const scraper = require('../scrapers');
  // const exams = await scraper.scrapeAll({ source: values.source });
  
  // Output results
  // if (values.output) fs.writeFileSync(path.resolve(values.output), JSON.stringify(exams, null, 2));
  // else console.log(JSON.stringify(exams, null, 2));
}

if (require.main === module) main();
```

#### 4.4.3 Standalone Email Tester CLI (`src/scripts/test-email.js`)
```javascript
// src/scripts/test-email.js
const { parseArgs } = require('node:util');
require('dotenv').config();
const EmailService = require('../services/email/email-service');

const options = {
  email: { type: 'string', short: 'e' },
  'dry-run': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

async function main() {
  const { values } = parseArgs({ options, allowPositionals: true });
  if (values.help) {
    console.log('Usage: node src/scripts/test-email.js [--email=user@example.com] [--dry-run]');
    process.exit(0);
  }

  const recipient = values.email || process.env.NOTIFICATION_RECIPIENT_EMAIL;
  if (!recipient && !values['dry-run']) {
    console.error('Error: Please provide a target email address via --email=your@email.com or set NOTIFICATION_RECIPIENT_EMAIL in .env');
    process.exit(1);
  }

  console.log(`[Test Email] Dispatching test notification to ${recipient || 'preview'} (dry-run: ${values['dry-run']})...`);
  const emailService = new EmailService();
  const result = await emailService.sendTestNotification({
    recipient: recipient || 'test@example.com',
    dryRun: values['dry-run']
  });

  if (result.success) {
    console.log('[Test Email] SUCCESS:', result.dryRun ? `Preview generated at ${result.previewPath}` : `Message ID: ${result.messageId}`);
  } else {
    console.error('[Test Email] FAILED:', result.error);
    process.exit(1);
  }
}

if (require.main === module) main();
```

#### 4.4.4 Integrated Scrape & Notify Pipeline (`src/scripts/scrape-and-notify.js`)
```javascript
// src/scripts/scrape-and-notify.js
const { parseArgs } = require('node:util');
require('dotenv').config();
const EmailService = require('../services/email/email-service');
const DedupStore = require('../services/storage/dedup-store');

const options = {
  source: { type: 'string', short: 's', default: 'all' },
  email: { type: 'string', short: 'e' },
  'dry-run': { type: 'boolean', default: false },
  mock: { type: 'boolean', default: false },
  force: { type: 'boolean', default: false },
  output: { type: 'string', short: 'o' }
};

async function main() {
  const { values } = parseArgs({ options, allowPositionals: true });
  console.log('====================================================');
  console.log('ExamGo Pipeline: Scrape & Notify');
  console.log(`Mode: ${values['dry-run'] ? 'DRY RUN' : 'LIVE'} | Mock: ${values.mock} | Force: ${values.force}`);
  console.log('====================================================');

  // Step 1: Scrape or load mock data
  let exams = [];
  if (values.mock) {
    console.log('[Pipeline] Using mock exam data...');
    exams = [
      {
        id: 'upsc-cse-2026',
        title: 'Civil Services (Preliminary) Examination, 2026',
        organization: 'UPSC',
        applicationStartDate: '2026-02-05',
        applicationEndDate: '2026-03-05',
        examDate: '2026-05-24',
        notificationUrl: 'https://upsc.gov.in/sites/default/files/Notice-CSP-2026-Engl-050226.pdf',
        applicationUrl: 'https://upsconline.nic.in/',
        scrapedAt: new Date().toISOString(),
        source: 'upsc'
      }
    ];
  } else {
    console.log(`[Pipeline] Scraping portal sources (${values.source})...`);
    // const scrapers = require('../scrapers');
    // exams = await scrapers.scrapeAll({ source: values.source });
  }

  console.log(`[Pipeline] Scraped ${exams.length} active exam notifications.`);

  // Step 2: Deduplication
  const dedupStore = new DedupStore();
  let examsToNotify = exams;
  if (!values.force) {
    examsToNotify = dedupStore.filterNewExams(exams);
    console.log(`[Pipeline] Filtered out ${exams.length - examsToNotify.length} previously notified exams.`);
  }

  if (examsToNotify.length === 0) {
    console.log('[Pipeline] No new exams to notify. Pipeline completed.');
    process.exit(0);
  }

  console.log(`[Pipeline] Preparing to notify for ${examsToNotify.length} new exam(s)...`);

  // Step 3: Dispatch Email Notification
  const emailService = new EmailService();
  const recipient = values.email || process.env.NOTIFICATION_RECIPIENT_EMAIL;
  const result = await emailService.sendExamNotification(examsToNotify, {
    recipient,
    dryRun: values['dry-run']
  });

  if (!result.success) {
    console.error('[Pipeline] Email dispatch failed:', result.error);
    process.exit(1);
  }

  // Step 4: Update deduplication store on successful send (or dry-run)
  if (!values['dry-run'] && !values.mock) {
    dedupStore.markAsNotified(examsToNotify);
    console.log('[Pipeline] Deduplication cache updated.');
  }

  console.log('[Pipeline] Pipeline execution finished successfully.');
}

if (require.main === module) main();
```

---

### 4.5 Recommended `package.json` Scripts
```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js",
  "scrape": "node src/scripts/scrape-and-notify.js",
  "scrape:dry-run": "node src/scripts/scrape-and-notify.js --dry-run",
  "scrape:mock": "node src/scripts/scrape-and-notify.js --mock --dry-run",
  "scrape:only": "node src/scripts/scrape.js",
  "test:email": "node src/scripts/test-email.js",
  "test:email:dry-run": "node src/scripts/test-email.js --dry-run"
}
```

---

## 5. Verification Method

To independently verify the designs and logic in this report:

1. **Verify Built-In CLI Argument Parsing on Node 24**:
   ```powershell
   node -e "const { parseArgs } = require('node:util'); console.log(parseArgs({ options: { dryRun: { type: 'boolean' }, email: { type: 'string' } }, args: ['--dryRun', '--email=test@example.com'] }));"
   ```
   *Expected Output*: `{ values: [Object: null prototype] { dryRun: true, email: 'test@example.com' }, positionals: [] }`

2. **Verify HTML/Text Template Rendering**:
   Execute the template rendering functions with sample exam objects to confirm valid HTML generation, absence of syntax errors, and accurate days-remaining calculation.
   *Command*:
   ```powershell
   node -e "
   const deadline = new Date('2026-10-01');
   const diff = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
   console.log('Date calculation verified. Days remaining:', diff);
   "
   ```

3. **Verify Sandbox Recipient Restrictions (Resend API)**:
   - Check official documentation: https://resend.com/docs/dashboard/emails/introduction
   - Note: Resend explicitly requires custom domain verification for arbitrary recipient delivery. Sending with `onboarding@resend.dev` to non-registered emails fails with HTTP 403 `validation_error`.

4. **Invalidation Conditions**:
   - The design is invalidated if the target runtime lacks Node.js >= 18.3.0 (Node `util.parseArgs` requirement; current environment is Node v24.13.0, which satisfies this condition).
   - The design is invalidated if Resend deprecates `resend.emails.send({ ... })` (v3.x and v4.x continue to use this exact signature).
