const fs = require('fs');

const templateCode = 
const path = require('path');
const fs = require('fs');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderExamCardHtml(exam) {
  if (!exam) return '';
  const dates = exam.importantDates || {};
  const endDateRaw = dates.applicationEndDate || exam.applicationEndDate || 'Not specified';
  const title = escapeHtml(exam.examName || exam.title || 'Government Examination');
  const org = escapeHtml(exam.organization || 'GOVT');
  const notifUrl = exam.officialNotificationUrl || exam.notificationUrl || '#';

  return \\\
    <div style="text-align: left; background: #ffffff; border: 1px solid #eaeaea; padding: 24px; border-radius: 8px; margin-bottom: 16px;">
      <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #000000; line-height: 1.4; font-weight: 700;">\\\</h3>
      <p style="font-size: 14px; color: #666666; margin: 0 0 20px 0;">
        \\\ &nbsp;&bull;&nbsp; Deadline: <strong style="color: #000000;">\\\</strong>
      </p>
      <a href="\\\" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;">View details</a>
    </div>
  \\\;
}

function renderFullEmailHtml(exams = [], options = {}) {
  const candidate = options.candidate || {};
  const name = escapeHtml(candidate.name || 'there');
  const age = escapeHtml(candidate.age || 'N/A');
  const category = escapeHtml(candidate.category || 'N/A');
  const education = escapeHtml(candidate.education || 'N/A');
  const count = exams.length;

  let logoWhite = '';
  let logoBlack = '';
  try {
    const p1 = path.resolve(__dirname, '../../../../mypath/frontend/resources/branding/logo_white_text.png');
    const p2 = path.resolve(__dirname, '../../../../mypath/frontend/resources/branding/logo_black_text.png');
    logoWhite = 'data:image/png;base64,' + fs.readFileSync(p1).toString('base64');
    logoBlack = 'data:image/png;base64,' + fs.readFileSync(p2).toString('base64');
  } catch(e) {}

  const cardsHtml = exams.map(e => renderExamCardHtml(e)).join('');

  return \\\<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f6f6;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="background-color: #f6f6f6; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            
            <!-- Black Header -->
            <tr>
              <td align="center" style="background-color: #000000; padding: 32px 24px;">
                <img src="\\\" alt="MyPath" height="32" style="display: block; height: 32px; width: auto;" />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td align="center" style="padding: 48px 40px 24px 40px;">
                <!-- Main Center Logo -->
                <img src="\\\" alt="MyPath" height="48" style="display: block; margin-bottom: 32px; height: 48px; width: auto;" />
                
                <h1 style="font-size: 26px; font-weight: 800; color: #000000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Eligible Exams Found</h1>
                
                <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 32px 0;">
                  Hi <strong>\\\</strong>,<br/><br/>
                  Based on your profile eligibility criteria (<strong style="color:#000000;">Age: \\\, Category: \\\, Edu: \\\</strong>), you are currently eligible for <strong>\\\</strong> active examinations. Please review them below:
                </p>

                <!-- Exam Cards List -->
                \\\

              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 24px; background-color: #ffffff;">
                <p style="font-size: 12px; color: #999999; margin: 0;">&copy; \\\ MyPath</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>\\\;
}

function renderEmailText(exams = [], options = {}) {
  return 'MyPath Email Update';
}

function generateSubject(exams) {
  return \\\MyPath — \\\ Exams You're Eligible For\\\;
}

module.exports = { renderFullEmailHtml, renderEmailText, generateSubject };
;

fs.writeFileSync('src/services/email/template.js', templateCode);
console.log('Template completely overwritten to match minimalist design.');