const fs = require('fs');
const path = require('path');

const templateCode = `
const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderExamCardHtml(exam) {
  if (!exam) return '';
  const dates = exam.importantDates || {};
  const endDateRaw = dates.applicationEndDate || exam.applicationEndDate || 'Not specified';
  const title = escapeHtml(exam.examName || exam.title || 'Government Exam');
  const notifUrl = exam.officialNotificationUrl || exam.notificationUrl || '#';

  return \\\`
    <div style="border-bottom: 1px solid #eaeaea; padding: 12px 0; text-align: left;">
      <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">\\\${title}</h4>
      <p style="margin: 0; font-size: 12px; color: #666666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Deadline: <strong>\\\${endDateRaw}</strong> &nbsp;|&nbsp; <a href="\\\${notifUrl}" style="color: #000000; text-decoration: underline; font-weight: 600;">View &rarr;</a>
      </p>
    </div>
  \\\`;
}

function renderFullEmailHtml(exams = [], options = {}) {
  const candidate = options.candidate || {};
  const name = escapeHtml(candidate.name || 'there');
  const age = escapeHtml(candidate.age || 'N/A');
  const category = escapeHtml(candidate.category || 'N/A');
  const education = escapeHtml(candidate.education || 'N/A');
  const count = exams.length;

  let logoSrc = '';
  try {
    const logoPath = path.resolve(__dirname, '../../../../mypath/frontend/resources/branding/logo.png');
    logoSrc = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');
  } catch(e) {
    logoSrc = '';
  }

  const cardsHtml = exams.map(e => renderExamCardHtml(e)).join('');

  return \\\`<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="background-color: #f9f9f9; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #eaeaea;">
            
            <!-- Solid Black Header -->
            <tr>
              <td align="center" style="background-color: #000000; padding: 30px;">
                 <span style="color: #22c55e; font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 1px;">&lt;WC&gt;</span>
              </td>
            </tr>

            <!-- Minimal Body Content -->
            <tr>
              <td align="center" style="padding: 40px 30px;">
                
                <!-- Main Logo -->
                <img src="\\\${logoSrc}" alt="MyPath" height="40" style="display: block; margin-bottom: 24px; height: 40px; width: auto;" />
                
                <h1 style="font-size: 24px; font-weight: 700; color: #000000; margin: 0 0 12px 0;">Eligible Exams</h1>
                
                <p style="font-size: 14px; color: #555555; line-height: 1.6; margin: 0 0 32px 0; max-width: 450px;">
                  Thanks for using <strong>MyPath</strong>. Based on your profile (<strong>Age: \\\${age}, \\\${category}, \\\${education}</strong>), you are currently eligible for \\\${count} active exams.
                </p>

                <!-- Exam List (Centered container, left-aligned text) -->
                <div style="width: 100%; max-width: 400px; margin: 0 auto 32px auto; border-top: 1px solid #eaeaea;">
                  \\\${cardsHtml}
                </div>

                <!-- Black Button -->
                <a href="#" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 32px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;">VIEW ON DASHBOARD</a>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>\\\`;
}

function renderEmailText(exams = [], options = {}) {
  return 'MyPath Email Update';
}

function generateSubject(exams) {
  return \\\`MyPath — \\\${exams.length} Exams You're Eligible For\\\`;
}

module.exports = { renderFullEmailHtml, renderEmailText, generateSubject };
`;

fs.writeFileSync('src/services/email/template.js', templateCode);
console.log("Template generated successfully.");