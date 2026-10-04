const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { ScraperManager } = require('./src/scrapers');
const { renderFullEmailHtml } = require('./src/services/email/template');

const CANDIDATE = {
  name:       'Abhishek S Kumar',
  email:      'askumar2004123@gmail.com',
  dob:        '2002-03-15',
  age:        24,
  gender:     'Male',
  category:   'General',
  education:  'Graduate',
  degree:     'B.Tech Computer Science', 
  state:      'Kerala'
};

function isEligible(exam) {
  const ageLimits = { General: 32, OBC: 35, SC: 37, ST: 37, EWS: 32 };
  const maxAge = ageLimits[CANDIDATE.category] || 32;
  const minAge = 18;
  
  if (CANDIDATE.age < minAge || CANDIDATE.age > maxAge) return false;
  
  const eduLevels = ['Graduate', 'PG', 'PhD'];
  if (!eduLevels.includes(CANDIDATE.education)) return false;

  return true;
}

async function startLocalServer() {
  console.log('\n==================================================');
  console.log('  MyPath - Starting Local Web Preview on Port 3000');
  console.log('==================================================');

  const scraperManager = new ScraperManager();
  console.log('Fetching live exam updates...');
  const allExams = await scraperManager.scrapeAll({ source: 'all' });
  const eligibleExams = allExams.filter(isEligible);
  console.log(`Matched ${eligibleExams.length} / ${allExams.length} exams.`);

  // Render fresh HTML
  let currentHtml = renderFullEmailHtml(eligibleExams, { candidate: CANDIDATE });

  // Save preview.html locally as well
  const previewPath = path.resolve(__dirname, 'preview.html');
  fs.writeFileSync(previewPath, currentHtml, 'utf8');

  const PORT = 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(currentHtml);
  });

  server.listen(PORT, () => {
    console.log(`\nServer active at: http://localhost:${PORT}`);
    console.log('Launching browser at http://localhost:3000 ...\n');
    exec(`start http://localhost:${PORT}`);
  });

  // Keep process alive for local inspection
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is currently in use. Please close whatever is using port 3000 and retry.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

startLocalServer().catch(err => {
  console.error('Server startup failed:', err);
  process.exit(1);
});