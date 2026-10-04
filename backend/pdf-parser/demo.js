require('dotenv').config();
const path = require('path');
const fs = require('fs');
const http = require('http');
const { exec } = require('child_process');
const { ScraperManager } = require('./src/scrapers');
const EmailService = require('./src/services/email/email-service');
const { renderFullEmailHtml } = require('./src/services/email/template');

// =============================================================================
// CANDIDATE PROFILE CONFIGURATION
// You can edit the values below to test how different profile inputs affect
// exam eligibility and what matches appear on your page and email.
// =============================================================================

const CANDIDATE = {
  name:       'Abhishek S Kumar',
  email:      process.env.NOTIFICATION_RECIPIENT_EMAIL || 'sindhusachu2004123@gmail.com',
  dob:        '2002-03-15',

  // ---------------------------------------------------------------------------
  // # AGE (in years):
  // Options to test:
  //   18  -> Young applicant (eligible for 10+2 / CHSL entry posts)
  //   24  -> Standard graduate age (eligible for almost all exams)
  //   33  -> Exceeds General limit (32), but ELIGIBLE if category is OBC or SC/ST
  //   45  -> Over-age for all standard exams (tests 0 matches / filter failure)
  // ---------------------------------------------------------------------------
  age:        24,

  // ---------------------------------------------------------------------------
  // # GENDER:
  // Options: 'Male' | 'Female' | 'Other'
  // ---------------------------------------------------------------------------
  gender:     'Male',

  // ---------------------------------------------------------------------------
  // # CATEGORY (Reservation / Age Relaxation):
  // Options to test:
  //   'General' -> Max Age: 32 (Standard unreserved criteria)
  //   'OBC'     -> Max Age: 35 (3 years relaxation)
  //   'SC'      -> Max Age: 37 (5 years relaxation)
  //   'ST'      -> Max Age: 37 (5 years relaxation)
  //   'EWS'     -> Max Age: 32 (Economically Weaker Section)
  // ---------------------------------------------------------------------------
  category:   'General',

  // ---------------------------------------------------------------------------
  // # EDUCATION LEVEL:
  // Options to test:
  //   '10th Pass'       -> Eligible only for Matric / Multi-Tasking (MTS) exams
  //   '12th Pass'       -> Eligible for 10+2 exams like SSC CHSL & Stenographer
  //   'Graduate'        -> Eligible for SSC CGL, UPSC Civil Services, CAPF, etc.
  //   'Post-Graduate'   -> Eligible for all Graduate exams + specialist positions
  // ---------------------------------------------------------------------------
  education:  'Graduate',

  // ---------------------------------------------------------------------------
  // # DEGREE / STREAM:
  // Options to test:
  //   'B.Tech Computer Science' -> Engineering & Technical Specialist posts
  //   'B.Sc Mathematics'       -> Statistical Investigator & General posts
  //   'B.Com'                  -> Audit Officer, Accounts & Commercial posts
  //   'B.A Economics'          -> Economic Service & General Administration
  // ---------------------------------------------------------------------------
  degree:     'B.Tech Computer Science',

  // ---------------------------------------------------------------------------
  // # STATE / REGION:
  // Options: 'Kerala' | 'Delhi' | 'Maharashtra' | 'Tamil Nadu'
  // ---------------------------------------------------------------------------
  state:      'Kerala'
};

// =============================================================================
// DYNAMIC ELIGIBILITY MATCHER
// Evaluates candidate credentials against scraped exam requirements.
// =============================================================================
function isEligible(exam) {
  // 1. Age relaxation check by category
  const ageLimits = { General: 32, OBC: 35, SC: 37, ST: 37, EWS: 32 };
  const maxAge = ageLimits[CANDIDATE.category] || 32;
  const minAge = 18;
  
  if (CANDIDATE.age < minAge || CANDIDATE.age > maxAge) {
    return false;
  }

  // 2. Education qualification check
  const examName = (exam.examName || exam.title || '').toLowerCase();
  const code = (exam.examCode || '').toLowerCase();

  if (CANDIDATE.education === '10th Pass') {
    return examName.includes('mts') || examName.includes('matric') || examName.includes('multi-tasking');
  } else if (CANDIDATE.education === '12th Pass') {
    return (
      examName.includes('chsl') ||
      examName.includes('10+2') ||
      examName.includes('higher secondary') ||
      examName.includes('stenographer') ||
      code === 'chsl'
    );
  } else if (CANDIDATE.education === 'Graduate' || CANDIDATE.education === 'Post-Graduate') {
    return true;
  }

  return false;
}

// =============================================================================
// RUNNER: SCRAPE -> MATCH -> BUILD PAGE -> SERVE PORT 3000 -> (OPTIONAL) SEND
// =============================================================================
async function run() {
  const args = process.argv.slice(2);
  const shouldSendEmail = args.includes('--send') || args.includes('-s');

  console.log('\n========================================================');
  console.log('  MyPath - Dynamic Eligibility Matching Engine');
  console.log('========================================================');
  console.log(`Candidate : ${CANDIDATE.name}`);
  console.log(`Profile   : ${CANDIDATE.age} yrs | ${CANDIDATE.category} | ${CANDIDATE.education} (${CANDIDATE.degree})`);
  console.log(`Mode      : ${shouldSendEmail ? 'LIVE SEND via Resend' : 'LOCAL WEB PREVIEW on Port 3000 (Quota Safe)'}`);

  const scraperManager = new ScraperManager();
  console.log('\nScraping latest official exam updates from UPSC & SSC...');
  const allExams = await scraperManager.scrapeAll({ source: 'all' });
  const eligibleExams = allExams.filter(isEligible);
  console.log(`\nEligibility evaluation complete:`);
  console.log(`Matched: ${eligibleExams.length} out of ${allExams.length} active examinations.`);

  // Generate the new HTML template
  const html = renderFullEmailHtml(eligibleExams, { candidate: CANDIDATE });
  const previewPath = path.resolve(__dirname, 'preview.html');
  fs.writeFileSync(previewPath, html, 'utf8');

  // Launch or update local server on Port 3000
  const PORT = 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(html);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\nPort ${PORT} is already running. You can refresh http://localhost:${PORT} in your browser.`);
      exec(`start http://localhost:${PORT}`);
    } else {
      console.error('Server error:', err.message);
    }
  });

  server.listen(PORT, () => {
    console.log(`\nLocal web preview active at: http://localhost:${PORT}`);
    console.log('Opening http://localhost:3000 in your browser...\n');
    exec(`start http://localhost:${PORT}`);
  });

  if (shouldSendEmail) {
    console.log(`[--send flag detected] Sending email to ${CANDIDATE.email}...`);
    const emailService = new EmailService({ apiKey: process.env.RESEND_API_KEY });
    const result = await emailService.sendExamNotification(eligibleExams, {
      recipient: CANDIDATE.email,
      candidate: CANDIDATE
    });

    if (result && result.success) {
      console.log(`SUCCESS: Notification delivered to ${CANDIDATE.email}`);
    } else {
      console.error('Email send failed:', result);
    }
  } else {
    console.log('[Safe Mode] Zero Resend quota used. To send via email when ready:');
    console.log('  node demo.js --send\n');
  }
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});