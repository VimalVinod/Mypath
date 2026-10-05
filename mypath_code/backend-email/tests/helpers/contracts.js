// tests/helpers/contracts.js
/**
 * Authoritative interface contracts, reference implementations, and validators
 * based on PROJECT.md and Explorer Survey Reports.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');

/**
 * Validates whether an object strictly adheres to NormalizedExamRecord schema.
 */
function validateNormalizedExamRecord(record) {
  if (!record || typeof record !== 'object') return { valid: false, reason: 'Record must be an object' };
  if (!record.id || typeof record.id !== 'string') return { valid: false, reason: 'id is required string' };
  if (!record.examName || typeof record.examName !== 'string') return { valid: false, reason: 'examName is required string' };
  if (!record.organization || typeof record.organization !== 'string') return { valid: false, reason: 'organization is required string' };
  if (!record.importantDates || typeof record.importantDates !== 'object') return { valid: false, reason: 'importantDates is required object' };
  if (typeof record.importantDates.applicationEndDate !== 'string') return { valid: false, reason: 'importantDates.applicationEndDate is required string' };
  if (!record.officialNotificationUrl || typeof record.officialNotificationUrl !== 'string') return { valid: false, reason: 'officialNotificationUrl is required string' };
  if (!record.scrapedAt || typeof record.scrapedAt !== 'string') return { valid: false, reason: 'scrapedAt is required ISO string' };
  return { valid: true };
}

/**
 * Escapes HTML entities to prevent XSS.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calculates deadline urgency indicator.
 */
function calculateUrgency(endDateStr, referenceDate = new Date()) {
  if (!endDateStr) {
    return { daysRemaining: null, status: 'unknown', badgeText: 'Dates Announced', badgeColor: '#2563eb', badgeBg: '#dbeafe' };
  }
  const deadline = new Date(endDateStr);
  if (isNaN(deadline.getTime())) {
    return { daysRemaining: null, status: 'unknown', badgeText: 'Dates Announced', badgeColor: '#2563eb', badgeBg: '#dbeafe' };
  }
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
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
 * Renders individual exam card HTML.
 */
function renderExamCardHtml(exam, referenceDate = new Date()) {
  const urgency = calculateUrgency(exam.importantDates?.applicationEndDate || exam.applicationEndDate, referenceDate);
  const title = escapeHtml(exam.examName || exam.title || '');
  const org = escapeHtml(exam.organization || '');
  const dates = exam.importantDates || {};
  const start = escapeHtml(dates.applicationStartDate || exam.applicationStartDate || 'Announced');
  const end = escapeHtml(dates.applicationEndDate || exam.applicationEndDate || 'Check notification');
  const examDate = escapeHtml(dates.examDate || exam.examDate || 'To be announced');
  const notifUrl = escapeHtml(exam.officialNotificationUrl || exam.notificationUrl || '#');
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
 * Renders full responsive 600px email HTML.
 */
function renderFullEmailHtml(exams, options = {}, referenceDate = new Date()) {
  const recipientName = options.recipientName || 'Aspirant';
  const cardsHtml = exams.map(e => renderExamCardHtml(e, referenceDate)).join('\n');
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
 * Plain-text fallback for email.
 */
function renderEmailText(exams, options = {}, referenceDate = new Date()) {
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
    const dates = exam.importantDates || {};
    const urgency = calculateUrgency(dates.applicationEndDate || exam.applicationEndDate, referenceDate);
    const title = exam.examName || exam.title || '';
    lines.push('----------------------------------------------------------------------');
    lines.push(`[${index + 1}] ${title.toUpperCase()}`);
    lines.push(`Organization: ${exam.organization}`);
    lines.push(`Status:       ${urgency.badgeText}`);
    lines.push(`Start Date:   ${dates.applicationStartDate || exam.applicationStartDate || 'Not specified'}`);
    lines.push(`Deadline:     ${dates.applicationEndDate || exam.applicationEndDate || 'Not specified'}`);
    lines.push(`Exam Date:    ${dates.examDate || exam.examDate || 'To be announced'}`);
    lines.push(`Notification: ${exam.officialNotificationUrl || exam.notificationUrl}`);
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
 * Generates subject line.
 */
function generateSubject(exams) {
  if (!exams || exams.length === 0) return '🔔 Exam Notification Update';
  if (exams.length === 1) {
    const exam = exams[0];
    const name = exam.examName || exam.title || 'Government Examination';
    return `🔔 New Exam Alert: ${name} (${exam.organization})`;
  }
  return `🔔 New Exam Alerts: ${exams.length} New Government Exams Announced`;
}

/**
 * Reference Deduplication Store
 */
class ReferenceDedupStore {
  constructor(filePath) {
    this.filePath = filePath || path.resolve(process.cwd(), 'data', 'notified-exams.json');
  }

  generateKey(exam) {
    const dates = exam.importantDates || {};
    const deadline = dates.applicationEndDate || exam.applicationEndDate || '';
    const title = exam.examName || exam.title || '';
    const raw = `${exam.organization}:${title}:${deadline}`;
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
      const dates = exam.importantDates || {};
      store[key] = {
        title: exam.examName || exam.title,
        organization: exam.organization,
        deadline: dates.applicationEndDate || exam.applicationEndDate,
        notifiedAt: now
      };
    });
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }
}

/**
 * Reference Email Service
 */
class ReferenceEmailService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.RESEND_API_KEY;
    this.senderEmail = config.senderEmail || process.env.SENDER_EMAIL || 'ExamGo Alerts <onboarding@resend.dev>';
    this.defaultRecipient = config.defaultRecipient || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'aspirant@example.com';
  }

  async sendExamNotification(exams, options = {}) {
    const recipient = options.recipient || this.defaultRecipient;
    if (!recipient) {
      throw new Error('Recipient email address is required');
    }

    if (!exams || exams.length === 0) {
      return { success: true, examCount: 0, recipient, message: 'No exams to notify' };
    }

    const htmlContent = renderFullEmailHtml(exams, { recipientName: options.recipientName });
    const textContent = renderEmailText(exams, { recipientName: options.recipientName });
    const subject = options.subject || generateSubject(exams);

    if (options.dryRun) {
      const previewDir = path.resolve(process.cwd(), 'output');
      if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
      const previewPath = options.previewPath || path.join(previewDir, 'email-preview.html');
      fs.writeFileSync(previewPath, htmlContent, 'utf-8');
      return {
        success: true,
        dryRun: true,
        previewPath,
        recipient,
        examCount: exams.length,
        subject,
        htmlLength: htmlContent.length,
        textLength: textContent.length
      };
    }

    if (!this.apiKey) {
      throw new Error('RESEND_API_KEY is missing');
    }

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      recipient,
      examCount: exams.length
    };
  }

  async sendTestNotification(options = {}) {
    const mockExams = [
      {
        id: 'UPSC_civil-services-2026',
        examName: 'Civil Services (Preliminary) Examination, 2026',
        organization: 'UPSC',
        importantDates: {
          applicationStartDate: '2026-02-05',
          applicationEndDate: '2026-03-05',
          examDate: '2026-05-24'
        },
        officialNotificationUrl: 'https://upsc.gov.in/sites/default/files/Notice-CSP-2026-Engl-050226.pdf',
        applicationUrl: 'https://upsconline.nic.in/',
        scrapedAt: new Date().toISOString()
      }
    ];
    return this.sendExamNotification(mockExams, options);
  }
}

/**
 * Reference UPSC Scraper Parser (works with or without cheerio)
 */
class ReferenceUpscScraper {
  constructor(options = {}) {
    this.sourceName = 'UPSC';
    this.options = options;
  }

  parseActiveExamsList(html) {
    return this.parseIndexHtml(html);
  }

  parseIndexHtml(html) {
    if (!html || typeof html !== 'string') return [];
    const exams = [];
    const rowMatches = html.matchAll(/<div class="views-field views-field-field-exam-name">[\s\S]*?<a href="([^"]+)">[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>[\s\S]*?<\/a>/gi);
    for (const match of rowMatches) {
      const href = match[1].trim();
      const examName = match[2].replace(/<[^>]+>/g, '').trim();
      if (examName) {
        exams.push({
          examName,
          title: examName,
          detailPath: href,
          detailUrl: href.startsWith('http') ? href : `https://www.upsc.gov.in${href}`
        });
      }
    }
    return exams;
  }

  parseExamDetail(detailHtml, examName, detailUrl) {
    return this.parseDetailHtml(detailHtml, detailUrl, examName);
  }

  parseDetailHtml(detailHtml, detailUrl, fallbackTitle = '') {
    const examName = fallbackTitle;
    if (!detailHtml || typeof detailHtml !== 'string') {
      return {
        id: `UPSC_${String(examName || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
        examName: examName || 'Unknown Examination',
        organization: 'UPSC',
        importantDates: { applicationEndDate: 'TBD' },
        officialNotificationUrl: detailUrl || 'https://www.upsc.gov.in',
        scrapedAt: new Date().toISOString()
      };
    }

    const rows = [...detailHtml.matchAll(/<tr[^>]*>[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>[\s\S]*?<\/tr>/gi)];
    const data = {};
    for (const row of rows) {
      const key = row[1].replace(/<[^>]+>/g, '').trim();
      const val = row[2].replace(/<[^>]+>/g, ' ').trim();
      data[key] = val;
    }

    // PDF URL extraction
    const pdfMatch = detailHtml.match(/<a[^>]+href="([^"]+\.pdf)"[^>]*>/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : (detailUrl || 'https://www.upsc.gov.in');

    const notifDate = data['Date of Notification'] || null;
    const examDate = data['Date of Commencement of Examination'] || null;
    const endDateRaw = data['Last Date for Receipt of Applications'] || 'TBD';

    const slug = String(examName || 'exam').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

    return {
      id: `UPSC_${slug}`,
      examName: examName || 'UPSC Examination',
      organization: 'UPSC',
      importantDates: {
        notificationDate: notifDate,
        applicationEndDate: endDateRaw,
        examDate: examDate
      },
      officialNotificationUrl: pdfUrl.startsWith('http') ? pdfUrl : `https://www.upsc.gov.in${pdfUrl}`,
      applicationUrl: 'https://upsconline.nic.in',
      categories: ['UPSC', 'Central Govt'],
      scrapedAt: new Date().toISOString()
    };
  }
}

/**
 * Reference SSC Scraper Parser
 */
class ReferenceSscScraper {
  constructor(options = {}) {
    this.sourceName = 'SSC';
    this.options = options;
  }

  parseLiveExamsJson(json) {
    if (!json || !Array.isArray(json.data)) return [];
    return json.data.map(item => {
      const year = item.examYear || new Date().getFullYear();
      const code = item.examCode || 'EXAM';
      return {
        id: `SSC_${code}_${year}`,
        examName: item.examName || `SSC ${code} Examination ${year}`,
        organization: 'SSC',
        examCode: item.examCode || null,
        importantDates: {
          applicationStartDate: item.applicationStartDate || null,
          applicationEndDate: item.applicationEndDate || '',
          feeDeadline: item.lastDateForFee || null,
          correctionWindow: item.correctionStartDate ? {
            startDate: item.correctionStartDate,
            endDate: item.correctionEndDate
          } : null
        },
        officialNotificationUrl: `https://ssc.gov.in/api/attachment/${item.id || ''}`,
        applicationUrl: item.navigationUrl ? `https://ssc.gov.in${item.navigationUrl}` : 'https://ssc.gov.in',
        fee: item.fee || null,
        ageLimit: item.minAge ? { min: item.minAge, max: item.maxAge } : null,
        categories: ['SSC', 'Staff Selection'],
        scrapedAt: new Date().toISOString()
      };
    });
  }
}

/**
 * Reference Pipeline
 */
async function runReferencePipeline(options = {}) {
  const dedupStore = new ReferenceDedupStore(options.storePath);
  const emailService = new ReferenceEmailService({
    apiKey: options.apiKey || process.env.RESEND_API_KEY || (options.mock ? 're_mock_test_key' : null)
  });

  let exams = [];
  if (options.mock) {
    exams = options.mockData || [
      {
        id: 'SSC_CHSL_2026',
        examName: 'Combined Higher Secondary Level (10+2) Examination 2026',
        organization: 'SSC',
        importantDates: {
          applicationStartDate: '2026-09-07',
          applicationEndDate: '2026-10-07T17:30:00.000Z'
        },
        officialNotificationUrl: 'https://ssc.gov.in/api/attachment/chsl2026.pdf',
        applicationUrl: 'https://ssc.gov.in/ApplicationForm/chslform',
        scrapedAt: new Date().toISOString()
      },
      {
        id: 'UPSC_geo-scientist-2027',
        examName: 'Combined Geo-Scientist (Preliminary) Examination, 2027',
        organization: 'UPSC',
        importantDates: {
          notificationDate: '02/09/2026',
          applicationEndDate: '22/09/2026 - 6:00pm',
          examDate: '10/01/2027'
        },
        officialNotificationUrl: 'https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf',
        applicationUrl: 'https://upsconline.nic.in',
        scrapedAt: new Date().toISOString()
      }
    ];
  }

  const newExams = options.force ? exams : dedupStore.filterNewExams(exams);
  let emailResult = null;

  if (newExams.length > 0) {
    emailResult = await emailService.sendExamNotification(newExams, {
      recipient: options.email || 'aspirant@example.com',
      dryRun: options.dryRun !== false,
      previewPath: options.previewPath
    });

    if (!options.dryRun) {
      dedupStore.markAsNotified(newExams);
    }
  }

  return {
    scrapedCount: exams.length,
    newCount: newExams.length,
    notifiedCount: newExams.length > 0 && emailResult?.success ? newExams.length : 0,
    skippedCount: exams.length - newExams.length,
    emailResult,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateNormalizedExamRecord,
  escapeHtml,
  calculateUrgency,
  renderExamCardHtml,
  renderFullEmailHtml,
  renderEmailText,
  generateSubject,
  ReferenceDedupStore,
  ReferenceEmailService,
  ReferenceUpscScraper,
  ReferenceSscScraper,
  runReferencePipeline
};
