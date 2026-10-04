const path = require('path');

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats ISO dates into clean, human-readable strings (e.g., "07 Oct 2026").
 */
function formatDate(isoString) {
  if (!isoString || isoString === 'Not specified') return 'Not announced';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return String(isoString);
  }
}

/**
 * Clean and normalize examination titles.
 */
function cleanTitle(rawTitle) {
  if (!rawTitle) return 'Government Examination';
  let title = String(rawTitle).trim();
  title = title.replace(/\s+/g, ' ');
  return escapeHtml(title);
}

/**
 * Renders an individual examination card:
 * Solid black box locked against dark mode inversion.
 */
function renderExamCardHtml(exam, candidate) {
  if (!exam) return '';
  const title = cleanTitle(exam.examName || exam.title);
  const org = escapeHtml(exam.organization || 'Central/State Body');
  const code = escapeHtml(exam.examCode || '');
  const dates = exam.importantDates || {};
  const deadline = formatDate(dates.applicationEndDate || exam.applicationEndDate);
  const notifUrl = exam.officialNotificationUrl || exam.notificationUrl || '#';
  const applyUrl = exam.applicationUrl || notifUrl;

  const edu = escapeHtml(candidate.education || candidate.degree || 'Graduate');
  const cat = escapeHtml(candidate.category || 'General');
  const age = candidate.age ? `${candidate.age} yrs` : '24 yrs';

  return `
    <div bgcolor="#000000" style="background-color: #000000 !important; background: #000000 !important; background-image: linear-gradient(#000000, #000000) !important; border-radius: 8px; padding: 26px 30px; margin-bottom: 22px; text-align: left;">
      
      <!-- Top Meta Row inside black box -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
        <tr>
          <td align="left" style="vertical-align: middle;">
            <span style="display: inline-block; background-color: #ffffff; color: #000000; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 4px 10px; border-radius: 4px;">
              ${org}${code ? ` · ${code}` : ''}
            </span>
          </td>
          <td align="right" style="vertical-align: middle;">
            <span style="display: inline-block; background-color: #1a1608; color: #facc15; border: 1px solid #3d3408; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px;">
              Deadline: <strong style="color: #fde047;">${deadline}</strong>
            </span>
          </td>
        </tr>
      </table>

      <!-- Exam Name -->
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #ffffff !important; line-height: 1.4; letter-spacing: -0.01em;">
        ${title}
      </h3>

      <!-- Point-wise Criteria Met -->
      <div style="margin: 0 0 22px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #a1a1aa !important; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
          Criteria Met
        </div>
        <div style="color: #e4e4e7 !important; font-size: 13px; line-height: 1.8;">
          <div>&bull; <span style="color: #a1a1aa !important;">Education:</span> <strong style="color: #ffffff !important;">${edu}</strong></div>
          <div>&bull; <span style="color: #a1a1aa !important;">Category:</span> <strong style="color: #ffffff !important;">${cat}</strong></div>
          <div>&bull; <span style="color: #a1a1aa !important;">Age:</span> <strong style="color: #ffffff !important;">${age}</strong></div>
        </div>
      </div>

      <!-- Action Row: Official Notification & Apply Button -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" style="vertical-align: middle;">
            <a href="${notifUrl}" target="_blank" style="color: #d4d4d8 !important; font-size: 13px; font-weight: 500; text-decoration: underline;">
              Official Notification &rarr;
            </a>
          </td>
          <td align="right" style="vertical-align: middle;">
            <a href="${applyUrl}" target="_blank" style="display: inline-block; background-color: #ffffff !important; color: #000000 !important; font-size: 12px; font-weight: 700; text-decoration: none; padding: 9px 20px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em;">
              Apply Portal
            </a>
          </td>
        </tr>
      </table>

    </div>
  `;
}

/**
 * Full HTML template locked for Dark Mode & Light Mode consistency across mobile & desktop.
 */
function renderFullEmailHtml(exams = [], options = {}) {
  const candidate = options.candidate || {};
  const name = escapeHtml(candidate.name || 'Candidate');
  const count = exams.length;

  const logoUrl = 'https://mypath0.web.app/logo_white_text.png';
  const dashboardUrl = 'https://mypath0.web.app/dashboard';
  const cardsHtml = exams.map((e) => renderExamCardHtml(e, candidate)).join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>MyPath — ${count} Verified Eligible Examinations</title>
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
    /* Lock white background and prevent dark mode invert on Android/iOS/Desktop */
    u + .body .force-white {
      background-color: #ffffff !important;
      background-image: linear-gradient(#ffffff, #ffffff) !important;
      color: #09090b !important;
    }
    @media (prefers-color-scheme: dark) {
      .force-white {
        background-color: #ffffff !important;
        background-image: linear-gradient(#ffffff, #ffffff) !important;
        color: #09090b !important;
      }
      .force-black {
        background-color: #000000 !important;
        background-image: linear-gradient(#000000, #000000) !important;
        color: #ffffff !important;
      }
      .force-text-dark {
        color: #09090b !important;
      }
      .force-text-gray {
        color: #52525b !important;
      }
    }
  </style>
</head>
<body class="body" style="margin: 0; padding: 0; background-color: #f2f2f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #09090b;">

  <!-- Outer Canvas Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f2f4" style="background-color: #f2f2f4 !important; width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="margin: 0; padding: 0;">
        
        <!-- Main Column: Width 660px -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; margin: 0 auto; border-collapse: collapse;">
          
          <!-- 1. Header Bar: Attached flush to the top edge -->
          <tr>
            <td bgcolor="#000000" class="force-black" style="background-color: #000000 !important; background-image: linear-gradient(#000000, #000000) !important; padding: 26px 48px; text-align: left;">
              <img src="${logoUrl}" alt="MyPath" height="32" style="display: block; height: 32px; width: auto; max-width: 140px; border: 0;" />
            </td>
          </tr>

          <!-- 2. Body Area: Strictly Locked Pure White (#ffffff) in both Light & Dark modes -->
          <tr>
            <td bgcolor="#ffffff" class="force-white" style="background-color: #ffffff !important; background: #ffffff !important; background-image: linear-gradient(#ffffff, #ffffff) !important; padding: 40px 48px 36px 48px; color: #09090b !important;">
              
              <!-- Salutation on Pure White Background -->
              <h1 class="force-text-dark" style="font-size: 26px; font-weight: 700; color: #09090b !important; margin: 0 0 10px 0; letter-spacing: -0.02em;">
                Hi, ${name}
              </h1>
              <p class="force-text-gray" style="font-size: 15px; color: #52525b !important; line-height: 1.6; margin: 0 0 30px 0;">
                Based on your profile, you are qualified for <strong style="color: #09090b !important;">${count} active examinations</strong>. All details are organized below.
              </p>

              <!-- Black Exam Cards inside White Area -->
              ${cardsHtml}

              <!-- View in Dashboard Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background-color: #000000 !important; color: #ffffff !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 15px 38px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                      View in Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 3. Footer Bar: Attached flush to the bottom -->
          <tr>
            <td bgcolor="#000000" class="force-black" style="background-color: #000000 !important; background-image: linear-gradient(#000000, #000000) !important; padding: 28px 48px; text-align: center;">
              <p style="font-size: 13px; color: #a1a1aa !important; margin: 0 0 6px 0; font-weight: 500;">
                &copy; ${new Date().getFullYear()} MyPath. All rights reserved.
              </p>
              <p style="font-size: 11px; color: #71717a !important; margin: 0;">
                All notifications are sourced directly from official government gazettes (UPSC &amp; SSC).
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
 * Plain text fallback.
 */
function renderEmailText(exams = [], options = {}) {
  const candidate = options.candidate || {};
  const name = candidate.name || 'Candidate';
  const count = exams.length;

  let text = `MyPath — Eligibility Report\n\n`;
  text += `Hi ${name},\n`;
  text += `Based on your profile, you qualify for ${count} active examinations:\n\n`;

  exams.forEach((exam, i) => {
    const title = exam.examName || exam.title;
    const org = exam.organization || 'Govt';
    const deadline = formatDate(exam.importantDates?.applicationEndDate || exam.applicationEndDate);
    const link = exam.officialNotificationUrl || exam.notificationUrl || '';
    text += `${i + 1}. ${title} (${org})\n`;
    text += `   Deadline: ${deadline}\n`;
    if (link) text += `   Notice: ${link}\n\n`;
  });

  text += `\nView all on Dashboard: https://mypath0.web.app/dashboard\n`;
  return text;
}

function generateSubject(exams = []) {
  return `MyPath — ${exams.length} Exams You're Eligible For`;
}

module.exports = {
  renderFullEmailHtml,
  renderEmailText,
  generateSubject
};