const UpscScraper = require('../../src/scrapers/upsc-scraper');
const SscScraper = require('../../src/scrapers/ssc-scraper');
const crypto = require('crypto');
const assert = require('node:assert/strict');

console.log('=== STARTING DYNAMIC INTEGRITY PROBE ===');

const randomToken = crypto.randomBytes(6).toString('hex');
const testTitle = 'Forensic Random Exam ' + randomToken;
const testPdf = 'https://www.upsc.gov.in/sites/default/files/Notice-' + randomToken + '.pdf';
const testDate = '15/11/2028 - 5:00pm';

const customDetailHtml = `
  <html>
    <body>
      <h1>${testTitle}</h1>
      <table>
        <tr><th>Date of Notification</th><td>01/10/2028</td></tr>
        <tr><th>Date of Commencement of Examination</th><td>01/12/2028</td></tr>
        <tr><th>Last Date for Receipt of Applications</th><td>${testDate}</td></tr>
        <tr><th>Download Notification</th><td><a href="${testPdf}">Notice PDF</a></td></tr>
      </table>
    </body>
  </html>
`;

// 1. Test UPSC Scraper HTML parsing
const upsc = new UpscScraper();
const upscRecord = upsc.parseDetailHtml(customDetailHtml, 'https://www.upsc.gov.in/test-detail', testTitle);

assert.equal(upscRecord.examName, testTitle, 'Exam name must match dynamic HTML value');
assert.equal(upscRecord.importantDates.notificationDate, '01/10/2028');
assert.equal(upscRecord.importantDates.applicationEndDate, testDate);
assert.equal(upscRecord.importantDates.examDate, '01/12/2028');
assert.equal(upscRecord.officialNotificationUrl, testPdf);
console.log('✓ UPSC dynamic HTML parsing verified: extracted dynamic token ' + randomToken);

// 2. Test UPSC Index HTML parsing with custom random links
const customIndexHtml = `
  <div class="view-content">
    <div class="views-row">
      <div class="views-field-field-exam-name">
        <a href="/examinations/slug-${randomToken}">
          <li>Index Exam ${randomToken}</li>
        </a>
      </div>
    </div>
  </div>
`;
const indexEntries = upsc.parseIndexHtml(customIndexHtml);
assert.equal(indexEntries.length, 1);
assert.equal(indexEntries[0].title, 'Index Exam ' + randomToken);
assert.equal(indexEntries[0].detailUrl, 'https://www.upsc.gov.in/examinations/slug-' + randomToken);
console.log('✓ UPSC dynamic index HTML parsing verified');

// 3. Test UPSC RSS XML parsing with custom random items
const customRssXml = `
  <rss version="2.0">
    <channel>
      <item>
        <title>RSS Exam ${randomToken}</title>
        <link>https://www.upsc.gov.in/rss/${randomToken}.pdf</link>
        <pubDate>Mon, 01 Jan 2029 00:00:00 GMT</pubDate>
      </item>
    </channel>
  </rss>
`;
const rssEntries = upsc.parseRssXml(customRssXml);
assert.equal(rssEntries.length, 1);
assert.equal(rssEntries[0].examName, 'RSS Exam ' + randomToken);
assert.equal(rssEntries[0].officialNotificationUrl, 'https://www.upsc.gov.in/rss/' + randomToken + '.pdf');
console.log('✓ UPSC dynamic RSS XML parsing verified');

// 4. Test SSC Scraper JSON parsing
const ssc = new SscScraper();
const sscCode = 'CODE_' + randomToken.toUpperCase();
const customJson = {
  data: [
    {
      examCode: sscCode,
      examYear: '2029',
      examName: 'SSC Dynamic Exam ' + randomToken,
      applicationStartDate: '2029-01-01',
      applicationEndDate: '2029-02-01T23:59:59.000Z',
      lastDateForFee: '2029-02-02T23:59:59.000Z',
      fee: 350,
      attachmentUrl: 'https://ssc.gov.in/files/' + randomToken + '.pdf',
      navigationUrl: '/apply/' + randomToken
    }
  ]
};
const sscRecords = ssc.parseLiveExamsJson(customJson);
assert.equal(sscRecords.length, 1);
assert.equal(sscRecords[0].examCode, sscCode);
assert.equal(sscRecords[0].fee, 350);
assert.equal(sscRecords[0].importantDates.applicationEndDate, '2029-02-01T23:59:59.000Z');
assert.equal(sscRecords[0].officialNotificationUrl, 'https://ssc.gov.in/files/' + randomToken + '.pdf');
assert.equal(sscRecords[0].applicationUrl, 'https://ssc.gov.in/apply/' + randomToken);
console.log('✓ SSC dynamic JSON parsing verified: extracted dynamic code ' + sscCode);

console.log('=== ALL DYNAMIC PROBES PASSED CLEANLY ===');
