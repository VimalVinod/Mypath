const BaseScraper = require('../../src/scrapers/base-scraper');
const UpscScraper = require('../../src/scrapers/upsc-scraper');
const SscScraper = require('../../src/scrapers/ssc-scraper');
const { ScraperManager } = require('../../src/scrapers/index');
const assert = require('node:assert/strict');

async function main() {
  console.log('=== STARTING ADVERSARIAL STRESS TESTS ===');

  // -------------------------------------------------------------
  // Stress Test 1: BaseScraper input validation & edge conditions
  // -------------------------------------------------------------
  console.log('\n[Stress 1] BaseScraper Contract Validation');
  const base = new BaseScraper('TEST');

  // 1.1 Null/undefined records
  assert.throws(() => base.validateRecord(null), /must be a non-null object/);
  assert.throws(() => base.validateRecord(undefined), /must be a non-null object/);
  assert.throws(() => base.validateRecord('string'), /must be a non-null object/);

  // 1.2 Missing required fields
  assert.throws(() => base.validateRecord({ id: 'x' }), /missing required field/);

  // 1.3 Missing applicationEndDate
  assert.throws(() => base.validateRecord({
    id: 'x',
    examName: 'y',
    organization: 'TEST',
    importantDates: {},
    officialNotificationUrl: 'http://x',
    scrapedAt: new Date().toISOString()
  }), /"importantDates.applicationEndDate" is required/);

  // 1.4 Slugify edge cases
  assert.equal(base.slugify(''), 'exam');
  assert.equal(base.slugify(null), 'exam');
  assert.equal(base.slugify('!@#$%^&*()'), ''); // Strips all non-alphanumeric, returning empty string
  assert.equal(base.slugify('---hello---world---'), 'hello-world');
  assert.equal(base.slugify('A'.repeat(200)).length, 80);


  console.log('✓ BaseScraper validation passed all adversarial edge cases');

  // -------------------------------------------------------------
  // Stress Test 2: ScraperManager Error Isolation & Registration Guard
  // -------------------------------------------------------------
  console.log('\n[Stress 2] ScraperManager Registration & Isolation Guard');
  const manager = new ScraperManager();

  // 2.1 Refuse registration of invalid class
  assert.throws(() => {
    manager.registerScraper('dummy', { scrape: () => [] });
  }, /must extend BaseScraper/);

  // 2.2 Graceful handling of crashing scraper in scrapeAll
  class CrashingScraper extends BaseScraper {
    constructor() { super('CRASHER'); }
    async scrape() {
      throw new Error('Explosive database/network failure');
    }
  }
  manager.registerScraper('crasher', new CrashingScraper());

  // Must isolate the error and not crash the manager
  const res = await manager.scrapeAllDetailed({
    source: 'crasher',
    scraperOptions: {}
  });
  assert.equal(res.records.length, 0);
  assert.equal(res.errors.length, 1);
  assert.equal(res.errors[0].source, 'crasher');
  assert.ok(res.errors[0].error.includes('Explosive database/network failure'));

  console.log('✓ ScraperManager isolated catastrophic scraper crash safely');

  // -------------------------------------------------------------
  // Stress Test 3: UpscScraper HTML Parser Adversarial Inputs
  // -------------------------------------------------------------
  console.log('\n[Stress 3] UpscScraper Adversarial HTML Stress');
  const upsc = new UpscScraper();

  // 3.1 Deeply malformed / nested HTML
  const deeplyNested = '<div>'.repeat(500) + '<a href="/examinations/deep">Deep Exam</a>' + '</div>'.repeat(500);
  const deepParsed = upsc.parseIndexHtml(deeplyNested);
  assert.ok(Array.isArray(deepParsed));
  assert.equal(deepParsed.length, 1);
  assert.equal(deepParsed[0].title, 'Deep Exam');

  // 3.2 HTML with XSS / script injections in table cells
  const xssHtml = `
    <table>
      <tr><th>Date of Notification</th><td><script>alert(1)</script>01/01/2026</td></tr>
      <tr><th>Last Date for Receipt of Applications</th><td><img src=x onerror=steal()>15/02/2026</td></tr>
      <tr><th>Download Notification</th><td><a href="javascript:void(0)">Bad Link</a></td></tr>
    </table>
  `;
  const xssRecord = upsc.parseDetailHtml(xssHtml, 'https://upsc.gov.in/test', 'XSS Exam');
  // Cheerio .text() extracts text nodes inside all children including script tags unless stripped
  assert.equal(xssRecord.importantDates.notificationDate, 'alert(1)01/01/2026');
  assert.equal(xssRecord.importantDates.applicationEndDate, '15/02/2026');
  console.log('✓ UpscScraper handled script/tag markup without crashing');


  // 3.3 Completely empty / whitespace table
  const emptyTable = '<table><tr><td>   </td><td>   </td></tr></table>';
  const emptyRecord = upsc.parseDetailHtml(emptyTable, 'https://upsc.gov.in/test', 'Empty Table');
  assert.equal(emptyRecord.importantDates.applicationEndDate, 'TBD');
  assert.equal(emptyRecord.officialNotificationUrl, 'https://upsc.gov.in/test');

  // 3.4 Corrupted XML in RSS fallback
  const corruptedXml = '<rss><channel><item><title>Incomplete';
  const rssResult = upsc.parseRssXml(corruptedXml);
  assert.ok(Array.isArray(rssResult));
  console.log('✓ UpscScraper handled corrupted RSS XML safely');

  // -------------------------------------------------------------
  // Stress Test 4: SscScraper JSON Parser Adversarial Payloads
  // -------------------------------------------------------------
  console.log('\n[Stress 4] SscScraper Adversarial Payloads');
  const ssc = new SscScraper();

  // 4.1 Null and malformed items in data array
  const messyPayload = {
    data: [
      null,
      undefined,
      {},
      { examName: '' },
      { examName: 'Sparse Exam', examCode: null, examYear: null, applicationEndDate: null }
    ]
  };
  const sparseRecords = ssc.parseLiveExamsJson(messyPayload);
  assert.ok(sparseRecords.length >= 1);
  assert.equal(sparseRecords[sparseRecords.length - 1].importantDates.applicationEndDate, 'TBD');

  // 4.2 Non-numeric fee
  const nonNumericFeePayload = {
    data: [{ examName: 'Free Exam', fee: 'FREE' }]
  };
  const feeRecords = ssc.parseLiveExamsJson(nonNumericFeePayload);
  assert.equal(feeRecords[0].fee, 'FREE');

  console.log('✓ SscScraper survived all adversarial JSON edge payloads');

  // -------------------------------------------------------------
  // Stress Test 5: fetchWithRetry Timeout & Abort Signal
  // -------------------------------------------------------------
  console.log('\n[Stress 5] fetchWithRetry Timeout Handling');
  const quickTimeoutScraper = new BaseScraper('TIMEOUT_TEST', {
    timeoutMs: 1, // 1ms timeout guarantees abort
    retries: 1,
    retryDelayMs: 10
  });

  let timedOut = false;
  try {
    await quickTimeoutScraper.fetchWithRetry('http://10.255.255.1');
  } catch (err) {
    timedOut = true;
    assert.ok(
      err.message.includes('Timeout') || err.message.includes('abort') || err.message.includes('Failed to fetch'),
      `Expected timeout or fetch error, got: ${err.message}`
    );
  }
  assert.ok(timedOut, 'fetchWithRetry must timeout and reject');
  console.log('✓ fetchWithRetry aborted fast on tight timeout');

  console.log('\n=== ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('STRESS TEST FAILED:', err);
  process.exit(1);
});
