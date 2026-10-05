'use strict';
/**
 * report.js — The Mailman
 * Sends admin SOS alerts via Resend when ScrapperMan detects CRITICAL issues.
 */

const { Resend } = require('resend');

/**
 * @param {Object} healthReport - Output of patrol.js
 * @param {Object|null} diagnosticReport - Output of diagnose.js (if any)
 * @param {Object} options - { adminEmail, dryRun }
 * @returns {Promise<Object>}
 */
async function sendAdminReport(healthReport, diagnosticReport, options = {}) {
  const adminEmail = options.adminEmail || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'admin@example.com';
  const apiKey = process.env.RESEND_API_KEY;
  const isDryRun = options.dryRun || false;

  const result = {
    sent: false,
    messageId: null,
    error: null
  };

  if (!apiKey && !isDryRun) {
    result.error = 'RESEND_API_KEY is not set';
    return result;
  }

  const resend = isDryRun ? null : new Resend(apiKey);
  const color = healthReport.overallStatus === 'CRITICAL' ? '#d32f2f' : '#f57c00'; // Red or Orange

  let diagnosisHtml = '';
  if (diagnosticReport && diagnosticReport.success) {
    diagnosisHtml = `
      <h3>🤖 Gemini AI Diagnosis</h3>
      <p><strong>Root Cause:</strong> ${diagnosticReport.rootCause}</p>
      <p><strong>Suggested Fix:</strong> ${diagnosticReport.suggestedFix}</p>
      <p><strong>Confidence:</strong> ${diagnosticReport.confidence}</p>
    `;
  }

  let issuesHtml = '<ul>';
  for (const issue of (healthReport.issues || [])) {
    issuesHtml += `<li><strong>[${issue.source.toUpperCase()}] ${issue.name}</strong> (${issue.severity}): ${issue.description}</li>`;
  }
  issuesHtml += '</ul>';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-top: 5px solid ${color}; padding: 20px;">
      <h2 style="color: ${color}; margin-top: 0;">🚨 ScrapperMan System Alert</h2>
      <p><strong>Status:</strong> ${healthReport.overallStatus}</p>
      <p><strong>Timestamp:</strong> ${healthReport.timestamp}</p>
      <p><strong>Total Scraped:</strong> ${healthReport.scrapedCount}</p>
      
      <h3>⚠️ Detected Issues</h3>
      ${healthReport.issues?.length > 0 ? issuesHtml : '<p>No issues detected.</p>'}
      
      ${diagnosisHtml}
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">This is an automated alert from MyPath ScrapperMan Watchdog.</p>
    </div>
  `;

  if (isDryRun) {
    console.log('\n--- ADMIN SOS EMAIL PREVIEW ---');
    console.log(htmlContent.replace(/<[^>]*>?/gm, '')); // basic strip html for terminal
    result.sent = true;
    result.messageId = 'dry-run-message-id';
    return result;
  }

  try {
    const data = await resend.emails.send({
      from: 'MyPath Watchdog <watchdog@resend.dev>',
      to: adminEmail,
      subject: `[${healthReport.overallStatus}] ScrapperMan Watchdog Alert`,
      html: htmlContent
    });

    result.sent = true;
    result.messageId = data.id;
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

module.exports = { sendAdminReport };
