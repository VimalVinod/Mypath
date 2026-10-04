const UpscScraper = require('../../src/scrapers/upsc-scraper');
const SscScraper = require('../../src/scrapers/ssc-scraper');
const { ScraperManager } = require('../../src/scrapers/index');

async function testAll() {
  console.log('--- 1. Testing UpscScraper with mock HTML ---');
  const upsc = new UpscScraper();

  const mockIndexHtml = `
  <div class="view-content">
    <div class="views-row views-row-1">
      <div class="views-field views-field-field-exam-name">
        <div class="field-content">
          <a href="/examinations/Combined%20Geo-Scientist%20%28Preliminary%29%20Examination%2C%202027">
            <ul class="arrows"><li>Combined Geo-Scientist (Preliminary) Examination, 2027</li></ul>
          </a>
        </div>
      </div>
    </div>
  </div>
  `;

  const mockDetailHtml = `
  <div>
    <table class="views-table cols-6">
      <caption>Name of Examination: Combined Geo-Scientist (Preliminary) Examination, 2027</caption>
      <tbody>
        <tr><td>Date of Notification</td><td>02/09/2026</td></tr>
        <tr><td>Date of Commencement of Examination</td><td>10/01/2027</td></tr>
        <tr><td>Duration of Examination</td><td>One Day</td></tr>
        <tr><td>Last Date for Receipt of Applications</td><td>22/09/2026 - 6:00pm</td></tr>
        <tr><td>Date of Upload</td><td>02/09/2026</td></tr>
        <tr><td>Download Notification</td><td><a href="https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf">Notice (1.48 MB)</a></td></tr>
      </tbody>
    </table>
  </div>
  `;

  const entries = upsc.parseIndexHtml(mockIndexHtml);
  console.log('Parsed Index Entries:', entries.length);
  if (entries.length !== 1) throw new Error('Expected 1 entry');

  const detailUrl = entries[0].detailUrl;
  const detailRecord = upsc.parseDetailHtml(mockDetailHtml, detailUrl, entries[0].title);
  console.log('UPSC Record:');
  console.log(JSON.stringify(detailRecord, null, 2));

  if (detailRecord.examName !== 'Combined Geo-Scientist (Preliminary) Examination, 2027') throw new Error('ExamName mismatch');
  if (detailRecord.organization !== 'UPSC') throw new Error('Org mismatch');
  if (detailRecord.importantDates.notificationDate !== '02/09/2026') throw new Error('Notif date mismatch');
  if (detailRecord.importantDates.examDate !== '10/01/2027') throw new Error('Exam date mismatch');
  if (detailRecord.importantDates.applicationEndDate !== '22/09/2026 - 6:00pm') throw new Error('Deadline mismatch');
  if (!detailRecord.officialNotificationUrl.includes('.pdf')) throw new Error('Missing PDF url');

  console.log('--- 2. Testing UpscScraper RSS fallback ---');
  const mockRssXml = `
  <rss version="2.0">
    <channel>
      <title>UPSC Notifications</title>
      <item>
        <title>Civil Services Examination 2026</title>
        <link>https://www.upsc.gov.in/sites/default/files/Notif-CSP-2026.pdf</link>
        <pubDate>Wed, 04 Feb 2026 00:00:00 +0530</pubDate>
      </item>
    </channel>
  </rss>
  `;
  const rssRecords = upsc.parseRssXml(mockRssXml);
  console.log('Parsed RSS items:', rssRecords.length);
  if (rssRecords.length !== 1) throw new Error('Expected 1 RSS record');
  if (rssRecords[0].examName !== 'Civil Services Examination 2026') throw new Error('RSS exam name mismatch');

  console.log('--- 3. Testing SscScraper with mock JSON ---');
  const ssc = new SscScraper();
  const mockSscPayload = {
    statusCode: "200",
    statusMessage: "Document Found!",
    data: [
      {
        id: "nh3ahrp5ztg63ds2",
        examId: "s40d16naqchsl26",
        examYear: "2026",
        examCode: "CHSL",
        examName: "Combined Higher Secondary Level (10+2) Examination 2026",
        applicationStartDate: "2026-09-07",
        applicationEndDate: "2026-10-07T17:30:00.000Z",
        lastDateForFee: "2026-10-08T17:30:00.000Z",
        correctionStartDate: "2026-10-14",
        correctionEndDate: "2026-10-16T17:30:00.000Z",
        fee: "100",
        minAge: 18,
        maxAge: 27,
        isActive: true,
        navigationUrl: "/ApplicationForm/chslform"
      }
    ]
  };

  const sscRecords = ssc.parseLiveExamsJson(mockSscPayload);
  console.log('SSC Record:');
  console.log(JSON.stringify(sscRecords[0], null, 2));

  if (sscRecords.length !== 1) throw new Error('Expected 1 SSC record');
  if (sscRecords[0].organization !== 'SSC') throw new Error('Org mismatch');
  if (sscRecords[0].examCode !== 'CHSL') throw new Error('ExamCode mismatch');
  if (sscRecords[0].importantDates.applicationEndDate !== '2026-10-07T17:30:00.000Z') throw new Error('Deadline mismatch');
  if (sscRecords[0].fee !== 100) throw new Error('Fee mismatch');

  console.log('--- 4. Testing ScraperManager with error isolation ---');
  const manager = new ScraperManager();

  // Create a failing mock scraper
  class FailingScraper extends UpscScraper {
    async scrape() {
      throw new Error('Simulated network timeout 504 Gateway Error');
    }
  }
  manager.registerScraper('failing_portal', new FailingScraper());

  // Manager should isolate the error and not crash
  const detailed = await manager.scrapeAllDetailed({
    source: 'failing_portal,ssc',
    scraperOptions: {
      ssc: { jsonData: mockSscPayload }
    }
  });

  console.log('ScrapeAllDetailed results:', {
    recordCount: detailed.records.length,
    errorCount: detailed.errors.length,
    errors: detailed.errors
  });

  if (detailed.records.length !== 1) throw new Error('Expected 1 surviving record from SSC');
  if (detailed.errors.length !== 1) throw new Error('Expected 1 isolated error from failing_portal');
  if (detailed.errors[0].source !== 'failing_portal') throw new Error('Error source mismatch');

  console.log('--- ALL MOCK UNIT CHECKS PASSED! ---');
}

testAll().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
