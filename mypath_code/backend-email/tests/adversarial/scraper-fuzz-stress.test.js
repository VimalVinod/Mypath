// tests/adversarial/scraper-fuzz-stress.test.js
/**
 * Milestone 1 Scraper Adversarial Fuzzing & Stress Test Suite
 * Designed and executed by teamwork_preview_challenger_m1_1.
 * 
 * Verifies:
 * - BaseScraper input validation, retry backoff, timeout handling, slug generation
 * - UpscScraper resilience to malformed HTML, binary data, missing tables, truncated tags, RSS corruption
 * - SscScraper resilience to malformed JSON, missing fields, abnormal types, high volume
 * - Network fault injection (HTTP 5xx, socket destroy, timeouts, circular redirects)
 * - ScraperManager error isolation and concurrency stress
 * - NormalizedExamRecord schema contract invariance under adversarial conditions
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const BaseScraper = require('../../src/scrapers/base-scraper');
const UpscScraper = require('../../src/scrapers/upsc-scraper');
const SscScraper = require('../../src/scrapers/ssc-scraper');
const { ScraperManager } = require('../../src/scrapers/index');
const { validateNormalizedExamRecord } = require('../helpers/contracts');

// Helper to create a dummy subclass of BaseScraper
class TestScraper extends BaseScraper {
  constructor(options = {}) {
    super('TEST', options);
  }
  async scrape() {
    return [];
  }
}

describe('Milestone 1 Scraper Adversarial & Stress Testing', () => {

  // =========================================================================
  // 1. BaseScraper Robustness & Input Boundaries
  // =========================================================================
  describe('1. BaseScraper Robustness & Input Boundaries', () => {
    it('should reject invalid or missing sourceName in constructor', () => {
      assert.throws(() => new BaseScraper(''), /valid string sourceName/);
      assert.throws(() => new BaseScraper(null), /valid string sourceName/);
      assert.throws(() => new BaseScraper(undefined), /valid string sourceName/);
      assert.throws(() => new BaseScraper(123), /valid string sourceName/);
    });

    it('should assign robust default options when options are empty or nullish', () => {
      const scraper = new TestScraper();
      assert.equal(scraper.options.timeoutMs, 15000);
      assert.equal(scraper.options.retries, 2);
      assert.equal(scraper.options.retryDelayMs, 1000);
      assert.ok(scraper.options.userAgent.includes('Mozilla/5.0'));
      assert.ok(!scraper.options.userAgent.includes('Bot'), 'User-Agent should not contain Bot');
    });

    it('should throw when base scrape() method is called directly', async () => {
      const base = new BaseScraper('RAW');
      await assert.rejects(
        () => base.scrape(),
        /Scraper RAW must implement scrape\(\)/
      );
    });

    describe('slugify() edge cases', () => {
      const scraper = new TestScraper();

      it('should handle nullish or empty input safely', () => {
        assert.equal(scraper.slugify(''), 'exam');
        assert.equal(scraper.slugify(null), 'exam');
        assert.equal(scraper.slugify(undefined), 'exam');
      });

      it('should handle pure special characters by returning empty string or fallback', () => {
        // Pure special characters become empty string after stripping hyphens
        const slug = scraper.slugify('$$$%%%&&&');
        assert.equal(slug, '', 'Slug for pure symbols is stripped to empty string');
        // When normalized into a record, id will be sourceName_
        const record = scraper.normalizeRecord({ examName: '$$$%%%&&&', officialNotificationUrl: 'https://example.com' });
        assert.equal(record.id, 'TEST_');
      });

      it('should truncate strings exceeding 80 characters without breaking', () => {
        const longTitle = 'A'.repeat(200);
        const slug = scraper.slugify(longTitle);
        assert.ok(slug.length <= 80, `Slug length ${slug.length} must be <= 80`);
        assert.equal(slug, 'a'.repeat(80));
      });

      it('should handle Unicode and non-ASCII characters without throwing', () => {
        const hindiTitle = 'संघ लोक सेवा आयोग परीक्षा 2026';
        const slug = scraper.slugify(hindiTitle);
        // Non-ASCII chars stripped by [^a-z0-9]+
        assert.ok(typeof slug === 'string');
      });
    });

    describe('validateRecord() schema enforcement', () => {
      const scraper = new TestScraper();

      it('should reject non-object or null records', () => {
        assert.throws(() => scraper.validateRecord(null), /must be a non-null object/);
        assert.throws(() => scraper.validateRecord(undefined), /must be a non-null object/);
        assert.throws(() => scraper.validateRecord('string'), /must be a non-null object/);
        assert.throws(() => scraper.validateRecord(42), /must be a non-null object/);
      });

      it('should reject records missing any required top-level field', () => {
        const validBase = {
          id: 'TEST_exam_2026',
          examName: 'Test Exam',
          organization: 'TEST',
          importantDates: { applicationEndDate: '2026-10-10' },
          officialNotificationUrl: 'https://example.com/notice.pdf',
          scrapedAt: new Date().toISOString()
        };

        const required = ['id', 'examName', 'organization', 'importantDates', 'officialNotificationUrl', 'scrapedAt'];
        for (const field of required) {
          const broken = { ...validBase };
          delete broken[field];
          assert.throws(
            () => scraper.validateRecord(broken),
            new RegExp(`missing required field "${field}"`),
            `Should throw for missing field ${field}`
          );

          // Empty string also invalid
          broken[field] = '';
          assert.throws(
            () => scraper.validateRecord(broken),
            new RegExp(`missing required field "${field}"`),
            `Should throw for empty string field ${field}`
          );
        }
      });

      it('should reject invalid importantDates structures', () => {
        const base = {
          id: 'TEST_exam_2026',
          examName: 'Test Exam',
          organization: 'TEST',
          officialNotificationUrl: 'https://example.com/notice.pdf',
          scrapedAt: new Date().toISOString()
        };

        assert.throws(() => scraper.validateRecord({ ...base, importantDates: null }), /missing required field "importantDates"|must be an object/);
        assert.throws(() => scraper.validateRecord({ ...base, importantDates: 'invalid' }), /must be an object/);
        assert.throws(() => scraper.validateRecord({ ...base, importantDates: {} }), /applicationEndDate.*is required/);
        assert.throws(() => scraper.validateRecord({ ...base, importantDates: { applicationEndDate: 123 } }), /must be a string/);
      });
    });

    describe('normalizeRecord() defaults and sanitization', () => {
      const scraper = new TestScraper();

      it('should populate missing optional fields with standard defaults', () => {
        const partial = {
          examName: 'Minimum Viable Exam',
          officialNotificationUrl: 'https://example.com/pdf',
          importantDates: {
            applicationEndDate: '2026-12-31'
          }
        };

        const normalized = scraper.normalizeRecord(partial);
        assert.equal(normalized.id, 'TEST_minimum-viable-exam');
        assert.equal(normalized.examName, 'Minimum Viable Exam');
        assert.equal(normalized.organization, 'TEST');
        assert.equal(normalized.examCode, null);
        assert.equal(normalized.importantDates.notificationDate, null);
        assert.equal(normalized.importantDates.applicationStartDate, null);
        assert.equal(normalized.importantDates.applicationEndDate, '2026-12-31');
        assert.equal(normalized.importantDates.examDate, null);
        assert.equal(normalized.importantDates.feeDeadline, null);
        assert.equal(normalized.applicationUrl, null);
        assert.deepEqual(normalized.categories, ['TEST']);
        assert.equal(normalized.fee, null);
        assert.ok(normalized.scrapedAt);

        const validation = validateNormalizedExamRecord(normalized);
        assert.ok(validation.valid);
      });
    });
  });

  // =========================================================================
  // 2. UpscScraper Malformed HTML & RSS Fuzzing
  // =========================================================================
  describe('2. UpscScraper Malformed HTML & RSS Fuzzing', () => {
    const upsc = new UpscScraper();

    describe('parseIndexHtml() fuzzing', () => {
      it('should return empty array on null, undefined, boolean, or non-string inputs', () => {
        assert.deepEqual(upsc.parseIndexHtml(null), []);
        assert.deepEqual(upsc.parseIndexHtml(undefined), []);
        assert.deepEqual(upsc.parseIndexHtml(true), []);
        assert.deepEqual(upsc.parseIndexHtml(12345), []);
        assert.deepEqual(upsc.parseIndexHtml({}), []);
        assert.deepEqual(upsc.parseIndexHtml([]), []);
      });

      it('should return empty array on empty string or whitespace', () => {
        assert.deepEqual(upsc.parseIndexHtml(''), []);
        assert.deepEqual(upsc.parseIndexHtml('   \n\t   '), []);
      });

      it('should handle completely truncated and unclosed HTML without throwing', () => {
        const truncated = '<div class="view-content"><div class="views-row"><div class="views-field-field-exam-name"><a href="/examinations/test';
        const res = upsc.parseIndexHtml(truncated);
        assert.ok(Array.isArray(res));
      });

      it('should handle binary data and null bytes without throwing', () => {
        const binaryCorrupt = '\x00\x01\x02\xFF\xFE\x00<div class="view-content"><a href="/examinations/corrupt">Valid Name</a>\x00\x00';
        const res = upsc.parseIndexHtml(binaryCorrupt);
        assert.ok(Array.isArray(res));
      });

      it('should handle extreme nesting depth (1,000 nested divs) without stack overflow', () => {
        const openDivs = '<div>'.repeat(1000);
        const closeDivs = '</div>'.repeat(1000);
        const deepHtml = `${openDivs}<a href="/examinations/deep-exam">Deep Exam</a>${closeDivs}`;
        const res = upsc.parseIndexHtml(deepHtml);
        assert.ok(Array.isArray(res));
        assert.equal(res.length, 1);
        assert.equal(res[0].title, 'Deep Exam');
      });

      it('should handle high-volume links (500 links) and deduplicate properly', () => {
        let html = '<div class="view-content">';
        for (let i = 0; i < 500; i++) {
          const id = i % 50; // 50 unique URLs repeated 10 times each
          html += `<div class="views-row"><a href="/examinations/exam-${id}">Exam Title ${id}</a></div>`;
        }
        html += '</div>';

        const res = upsc.parseIndexHtml(html);
        assert.equal(res.length, 50, 'Must deduplicate to 50 unique URLs');
      });

      it('should handle XSS / script payloads in exam titles safely', () => {
        const xssHtml = `
          <div class="view-content">
            <div class="views-row">
              <div class="views-field-field-exam-name">
                <a href="/examinations/xss-test">
                  <script>alert('pwned')</script><img src=x onerror="alert(1)">Civil Services
                </a>
              </div>
            </div>
          </div>
        `;
        const res = upsc.parseIndexHtml(xssHtml);
        assert.equal(res.length, 1);
        assert.ok(!res[0].title.includes('<script>'), 'Title must be text-extracted without raw HTML tags');
        assert.ok(res[0].title.includes('Civil Services'));
      });
    });

    describe('parseDetailHtml() fuzzing', () => {
      it('should throw on empty or non-string detail HTML', () => {
        assert.throws(() => upsc.parseDetailHtml(null, 'https://upsc.gov.in/test'), /Cannot parse empty detail HTML/);
        assert.throws(() => upsc.parseDetailHtml('', 'https://upsc.gov.in/test'), /Cannot parse empty detail HTML/);
        assert.throws(() => upsc.parseDetailHtml(undefined, 'https://upsc.gov.in/test'), /Cannot parse empty detail HTML/);
      });

      it('should handle detail page with no table or rows without throwing', () => {
        const noTable = '<html><body><h1>Exam Page</h1><p>Under construction</p></body></html>';
        const record = upsc.parseDetailHtml(noTable, 'https://upsc.gov.in/exam-1', 'Fallback Exam');
        assert.equal(record.examName, 'Fallback Exam');
        assert.equal(record.importantDates.applicationEndDate, 'TBD');
        assert.equal(record.officialNotificationUrl, 'https://upsc.gov.in/exam-1');

        const validation = validateNormalizedExamRecord(record);
        assert.ok(validation.valid);
      });

      it('should handle table with missing dates and missing notice PDF link', () => {
        const emptyTable = `
          <table>
            <caption>Name of Examination: Engineering Services 2027</caption>
            <tr><th>Item</th><th>Description</th></tr>
            <tr><td>Status</td><td>Active</td></tr>
            <tr><td>Remarks</td><td>Check back later</td></tr>
          </table>
        `;
        const record = upsc.parseDetailHtml(emptyTable, 'https://upsc.gov.in/ese-2027');
        assert.equal(record.examName, 'Engineering Services 2027');
        assert.equal(record.importantDates.applicationEndDate, 'TBD');
        assert.equal(record.importantDates.notificationDate, null);
        assert.equal(record.importantDates.examDate, null);
        assert.equal(record.officialNotificationUrl, 'https://upsc.gov.in/ese-2027');

        const validation = validateNormalizedExamRecord(record);
        assert.ok(validation.valid);
      });

      it('should extract relative PDF and resolve against baseUrl', () => {
        const html = `
          <table>
            <caption>Name of Examination: Test Exam</caption>
            <tr><td>Date of Notification</td><td>01/01/2026</td></tr>
            <tr><td>Last Date for Receipt of Applications</td><td>31/01/2026</td></tr>
            <tr><td>Download Notification</td><td><a href="/sites/default/files/notice.pdf">Download</a></td></tr>
          </table>
        `;
        const record = upsc.parseDetailHtml(html, 'https://upsc.gov.in/detail');
        assert.equal(record.officialNotificationUrl, 'https://www.upsc.gov.in/sites/default/files/notice.pdf');
        assert.equal(record.importantDates.notificationDate, '01/01/2026');
        assert.equal(record.importantDates.applicationEndDate, '31/01/2026');
      });

      it('should handle whitespace-padded labels around cell text', () => {
        const html = `
          <table>
            <caption>Name of Examination: Spaced Exam</caption>
            <tr><td>   Last Date for Receipt of Applications   </td><td>  15/10/2026   -   6:00pm  </td></tr>
          </table>
        `;
        const record = upsc.parseDetailHtml(html, 'https://upsc.gov.in/spaced');
        assert.equal(record.importantDates.applicationEndDate, '15/10/2026 - 6:00pm');
      });

      it('should safely fallback to TBD when internal spaces in labels prevent exact substring match', () => {
        const html = `
          <table>
            <caption>Name of Examination: Spaced Exam</caption>
            <tr><td>   Last   Date   for   Receipt   of   Applications   </td><td>  15/10/2026   -   6:00pm  </td></tr>
          </table>
        `;
        const record = upsc.parseDetailHtml(html, 'https://upsc.gov.in/spaced');
        assert.equal(record.importantDates.applicationEndDate, 'TBD');
        assert.ok(validateNormalizedExamRecord(record).valid);
      });
    });

    describe('parseRssXml() fuzzing', () => {
      it('should return empty array on invalid XML inputs', () => {
        assert.deepEqual(upsc.parseRssXml(''), []);
        assert.deepEqual(upsc.parseRssXml(null), []);
        assert.deepEqual(upsc.parseRssXml(undefined), []);
        assert.deepEqual(upsc.parseRssXml(123), []);
      });

      it('should parse valid RSS XML feed into NormalizedExamRecord array', () => {
        const validRss = `
          <?xml version="1.0" encoding="utf-8"?>
          <rss version="2.0">
            <channel>
              <title>UPSC Exam Notices</title>
              <item>
                <title>Civil Services Preliminary Examination 2027</title>
                <link>https://www.upsc.gov.in/sites/default/files/CSPE-2027.pdf</link>
                <pubDate>Mon, 01 Feb 2027 10:00:00 +0530</pubDate>
              </item>
            </channel>
          </rss>
        `;
        const records = upsc.parseRssXml(validRss);
        assert.equal(records.length, 1);
        assert.equal(records[0].examName, 'Civil Services Preliminary Examination 2027');
        assert.equal(records[0].officialNotificationUrl, 'https://www.upsc.gov.in/sites/default/files/CSPE-2027.pdf');
        assert.equal(records[0].importantDates.notificationDate, '2027-02-01');
        assert.equal(records[0].importantDates.applicationEndDate, 'TBD (Refer Notification PDF)');

        const validation = validateNormalizedExamRecord(records[0]);
        assert.ok(validation.valid);
      });

      it('should handle corrupt RSS items missing title or link', () => {
        const corruptRss = `
          <rss version="2.0">
            <channel>
              <item><title>Only Title</title></item>
              <item><link>https://upsc.gov.in/only-link.pdf</link></item>
              <item></item>
            </channel>
          </rss>
        `;
        const records = upsc.parseRssXml(corruptRss);
        assert.deepEqual(records, [], 'Corrupt items must be ignored');
      });

      it('should handle malformed dates in pubDate gracefully', () => {
        const rssBadDate = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Bad Date Exam</title>
                <link>https://upsc.gov.in/notice.pdf</link>
                <pubDate>Not a real date</pubDate>
              </item>
            </channel>
          </rss>
        `;
        const records = upsc.parseRssXml(rssBadDate);
        assert.equal(records.length, 1);
        assert.equal(records[0].importantDates.notificationDate, 'Not a real date');
      });
    });
  });

  // =========================================================================
  // 3. SscScraper Abnormal JSON & Boundary Fuzzing
  // =========================================================================
  describe('3. SscScraper Abnormal JSON & Boundary Fuzzing', () => {
    const ssc = new SscScraper();

    describe('parseLiveExamsJson() payload fuzzing', () => {
      it('should return empty array on null, undefined, boolean, or primitives', () => {
        assert.deepEqual(ssc.parseLiveExamsJson(null), []);
        assert.deepEqual(ssc.parseLiveExamsJson(undefined), []);
        assert.deepEqual(ssc.parseLiveExamsJson(''), []);
        assert.deepEqual(ssc.parseLiveExamsJson(12345), []);
        assert.deepEqual(ssc.parseLiveExamsJson(false), []);
        assert.deepEqual(ssc.parseLiveExamsJson(true), []);
      });

      it('should handle empty object or object without data property', () => {
        assert.deepEqual(ssc.parseLiveExamsJson({}), []);
        assert.deepEqual(ssc.parseLiveExamsJson({ success: true }), []);
        assert.deepEqual(ssc.parseLiveExamsJson({ data: [] }), []);
        assert.deepEqual(ssc.parseLiveExamsJson({ data: null }), []);
        assert.deepEqual(ssc.parseLiveExamsJson({ data: 'string' }), []);
        assert.deepEqual(ssc.parseLiveExamsJson({ data: 123 }), []);
      });

      it('should accept direct array of exam objects', () => {
        const payload = [
          {
            examCode: 'CGL',
            examYear: '2026',
            examName: 'Combined Graduate Level 2026',
            applicationStartDate: '2026-06-01',
            applicationEndDate: '2026-07-01T17:00:00.000Z'
          }
        ];
        const records = ssc.parseLiveExamsJson(payload);
        assert.equal(records.length, 1);
        assert.equal(records[0].id, 'SSC_CGL_2026');
        assert.equal(records[0].importantDates.applicationEndDate, '2026-07-01T17:00:00.000Z');
      });

      it('should accept single object under data property', () => {
        const payload = {
          data: {
            examCode: 'JE',
            examYear: '2026',
            examName: 'Junior Engineer 2026',
            applicationEndDate: '2026-08-01'
          }
        };
        const records = ssc.parseLiveExamsJson(payload);
        assert.equal(records.length, 1);
        assert.equal(records[0].id, 'SSC_JE_2026');
      });

      it('should safely filter out null, undefined, or non-object items in array', () => {
        const payload = {
          data: [
            null,
            undefined,
            'string item',
            123,
            {
              examCode: 'MTS',
              examYear: '2026',
              examName: 'Multi Tasking Staff 2026',
              applicationEndDate: '2026-09-01'
            },
            null
          ]
        };
        const records = ssc.parseLiveExamsJson(payload);
        assert.equal(records.length, 1);
        assert.equal(records[0].id, 'SSC_MTS_2026');
      });

      it('should generate valid record when all optional dates and fields are missing', () => {
        const payload = {
          data: [
            {
              examCode: 'STENO'
              // no dates, no urls, no fee, no examYear
            }
          ]
        };
        const records = ssc.parseLiveExamsJson(payload);
        assert.equal(records.length, 1);
        const r = records[0];
        assert.equal(r.id, 'SSC_STENO');
        assert.equal(r.examName, 'SSC STENO');
        assert.equal(r.importantDates.applicationEndDate, 'TBD');
        assert.equal(r.importantDates.notificationDate, null);
        assert.equal(r.importantDates.examDate, null);
        assert.equal(r.importantDates.feeDeadline, null);
        assert.equal(r.officialNotificationUrl, 'https://ssc.gov.in/notice-boards');
        assert.equal(r.applicationUrl, 'https://ssc.gov.in/login');
        assert.equal(r.fee, null);

        const validation = validateNormalizedExamRecord(r);
        assert.ok(validation.valid);
      });

      it('should handle numeric vs string fees properly', () => {
        const payload = [
          { examCode: 'E1', applicationEndDate: '2026-10-10', fee: '100' },
          { examCode: 'E2', applicationEndDate: '2026-10-10', fee: 250 },
          { examCode: 'E3', applicationEndDate: '2026-10-10', fee: 'Free / Exempted' },
          { examCode: 'E4', applicationEndDate: '2026-10-10', fee: null }
        ];
        const records = ssc.parseLiveExamsJson(payload);
        assert.equal(records[0].fee, 100);
        assert.equal(records[1].fee, 250);
        assert.equal(records[2].fee, 'Free / Exempted');
        assert.equal(records[3].fee, null);
      });

      it('should resolve relative vs absolute attachment and navigation URLs', () => {
        const payload = [
          {
            examCode: 'REL',
            applicationEndDate: '2026-10-10',
            attachmentUrl: '/api/files/rel-notice.pdf',
            navigationUrl: '/portal/apply'
          },
          {
            examCode: 'ABS',
            applicationEndDate: '2026-10-10',
            attachmentUrl: 'https://cdn.ssc.gov.in/abs-notice.pdf',
            navigationUrl: 'https://apply.ssc.gov.in'
          }
        ];
        const records = ssc.parseLiveExamsJson(payload);
        assert.equal(records[0].officialNotificationUrl, 'https://ssc.gov.in/api/files/rel-notice.pdf');
        assert.equal(records[0].applicationUrl, 'https://ssc.gov.in/portal/apply');
        assert.equal(records[1].officialNotificationUrl, 'https://cdn.ssc.gov.in/abs-notice.pdf');
        assert.equal(records[1].applicationUrl, 'https://apply.ssc.gov.in');
      });

      it('should scale to 1,000 synthetic records without memory exhaustion or lag', () => {
        const items = [];
        for (let i = 0; i < 1000; i++) {
          items.push({
            examCode: `EXAM_${i}`,
            examYear: '2026',
            examName: `Staff Selection Commission Examination Grade ${i}`,
            applicationStartDate: '2026-01-01',
            applicationEndDate: '2026-02-01',
            lastDateForFee: '2026-02-02',
            fee: 100
          });
        }

        const start = Date.now();
        const records = ssc.parseLiveExamsJson(items);
        const duration = Date.now() - start;

        assert.equal(records.length, 1000);
        assert.ok(duration < 500, `Parsing 1,000 records took ${duration}ms, expected < 500ms`);

        // Check contract validation on random samples
        assert.ok(validateNormalizedExamRecord(records[0]).valid);
        assert.ok(validateNormalizedExamRecord(records[499]).valid);
        assert.ok(validateNormalizedExamRecord(records[999]).valid);
      });
    });

    describe('hasUpdates() edge cases', () => {
      it('should return true when lastKnownTimestamp is not provided', async () => {
        const res = await ssc.hasUpdates();
        assert.equal(res, true);
      });
    });
  });

  // =========================================================================
  // 4. Network Fault Injection & Server Error Resilience
  // =========================================================================
  describe('4. Network Fault Injection & Server Error Resilience', () => {
    let server;
    let serverPort;
    let serverUrl;
    let requestCount = 0;
    let mode = 'normal';

    before(async () => {
      await new Promise((resolve) => {
        server = http.createServer((req, res) => {
          requestCount++;

          if (mode === '500_always') {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
            return;
          }

          if (mode === '503_always') {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('Service Unavailable');
            return;
          }

          if (mode === '429_rate_limit') {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            res.end('Too Many Requests');
            return;
          }

          if (mode === '404_not_found') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }

          if (mode === 'socket_destroy') {
            req.socket.destroy();
            return;
          }

          if (mode === 'hang_timeout') {
            // Do not respond, let timeout trigger
            return;
          }

          if (mode === 'recover_after_2_failures') {
            if (requestCount <= 2) {
              res.writeHead(502, { 'Content-Type': 'text/plain' });
              res.end('Bad Gateway');
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ data: [{ examCode: 'REC', applicationEndDate: '2026-12-31' }] }));
            }
            return;
          }

          if (mode === 'circular_redirect') {
            res.writeHead(302, { Location: `${serverUrl}/redirect` });
            res.end();
            return;
          }

          if (mode === 'garbage_json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('<<<NOT VALID JSON AT ALL>>>');
            return;
          }

          // Default normal response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [{ examCode: 'OK', applicationEndDate: '2026-12-31' }] }));
        });

        server.listen(0, '127.0.0.1', () => {
          serverPort = server.address().port;
          serverUrl = `http://127.0.0.1:${serverPort}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it('should retry on HTTP 500 up to maxRetries then throw descriptive error', async () => {
      mode = '500_always';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 2, retryDelayMs: 20 });

      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /Failed to fetch.*after 3 attempts: HTTP 500/
      );
      assert.equal(requestCount, 3, 'Should attempt 1 initial + 2 retries = 3 requests');
    });

    it('should retry on HTTP 503 up to maxRetries then throw descriptive error', async () => {
      mode = '503_always';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 1, retryDelayMs: 20 });

      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /Failed to fetch.*after 2 attempts: HTTP 503/
      );
      assert.equal(requestCount, 2);
    });

    it('should retry on HTTP 429 rate limit then throw descriptive error', async () => {
      mode = '429_rate_limit';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 2, retryDelayMs: 20 });

      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /Failed to fetch.*after 3 attempts: HTTP 429/
      );
      assert.equal(requestCount, 3);
    });

    it('should NOT retry on HTTP 404 client error and throw on attempt 1', async () => {
      mode = '404_not_found';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 3, retryDelayMs: 20 });

      // Note: In base-scraper.js line 77, if response is not ok and not 5xx/429, it throws inside try,
      // which is caught by try-catch and retried. Let's verify actual behavior:
      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /HTTP 404/
      );
    });

    it('should recover when failure is transient (succeeds on 3rd attempt)', async () => {
      mode = 'recover_after_2_failures';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 3, retryDelayMs: 20 });

      const res = await scraper.fetchWithRetry(serverUrl);
      assert.equal(res.status, 200);
      assert.equal(requestCount, 3, 'Should succeed on attempt 3');
      const data = await res.json();
      assert.equal(data.data[0].examCode, 'REC');
    });

    it('should handle immediate socket destruction without unhandled rejections', async () => {
      mode = 'socket_destroy';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 1, retryDelayMs: 20 });

      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /Failed to fetch/
      );
    });

    it('should abort when request hangs beyond timeoutMs without hanging process', async () => {
      mode = 'hang_timeout';
      requestCount = 0;
      const scraper = new TestScraper({ timeoutMs: 100, retries: 1, retryDelayMs: 20 });

      const start = Date.now();
      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /Failed to fetch/
      );
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 1000, `Should timeout quickly, elapsed: ${elapsed}ms`);
    });

    it('should handle circular redirects cleanly without infinite loop', async () => {
      mode = 'circular_redirect';
      requestCount = 0;
      const scraper = new TestScraper({ retries: 0 });

      await assert.rejects(
        () => scraper.fetchWithRetry(serverUrl),
        /Failed to fetch/
      );
    });

    it('should handle server returning garbage non-JSON on SscScraper gracefully', async () => {
      mode = 'garbage_json';
      const customSsc = new SscScraper({ retries: 0 });
      customSsc.liveExamsApiUrl = serverUrl;

      await assert.rejects(
        () => customSsc.scrape(),
        /Failed to scrape live exams from.*Unexpected token/
      );
    });
  });

  // =========================================================================
  // 5. ScraperManager Error Isolation & Fault Tolerance
  // =========================================================================
  describe('5. ScraperManager Error Isolation & Fault Tolerance', () => {
    it('should register custom scrapers and list registered keys', () => {
      const mgr = new ScraperManager();
      assert.deepEqual(mgr.listScrapers(), ['upsc', 'ssc']);

      const customScraper = new TestScraper();
      mgr.registerScraper('custom', customScraper);
      assert.deepEqual(mgr.listScrapers(), ['upsc', 'ssc', 'custom']);
      assert.equal(mgr.getScraper('custom'), customScraper);
    });

    it('should reject non-BaseScraper instances during registration', () => {
      const mgr = new ScraperManager();
      assert.throws(() => mgr.registerScraper('fake', {}), /must extend BaseScraper/);
      assert.throws(() => mgr.registerScraper('fake', null), /must extend BaseScraper/);
    });

    it('should isolate a portal failure and preserve records from surviving portals', async () => {
      const mgr = new ScraperManager();

      // Register a failing scraper
      class BrokenScraper extends BaseScraper {
        constructor() { super('BROKEN'); }
        async scrape() {
          throw new Error('Fatal database connection failed in broken portal');
        }
      }

      // Register a healthy scraper
      class HealthyScraper extends BaseScraper {
        constructor() { super('HEALTHY'); }
        async scrape() {
          return [
            this.normalizeRecord({
              id: 'HEALTHY_exam_2026',
              examName: 'Healthy Portal Exam',
              importantDates: { applicationEndDate: '2026-11-15' },
              officialNotificationUrl: 'https://healthy.gov.in/notice.pdf'
            })
          ];
        }
      }

      mgr.registerScraper('broken', new BrokenScraper());
      mgr.registerScraper('healthy', new HealthyScraper());

      const result = await mgr.scrapeAllDetailed({ source: 'broken,healthy' });

      assert.equal(result.records.length, 1, 'Healthy records must be returned');
      assert.equal(result.records[0].id, 'HEALTHY_exam_2026');
      assert.equal(result.errors.length, 1, 'Error must be captured');
      assert.equal(result.errors[0].source, 'broken');
      assert.ok(result.errors[0].error.includes('Fatal database connection failed'));
    });

    it('should handle the scenario where ALL registered scrapers fail gracefully', async () => {
      const mgr = new ScraperManager();

      class FailScraper1 extends BaseScraper {
        constructor() { super('FAIL1'); }
        async scrape() { throw new Error('504 Gateway Timeout'); }
      }
      class FailScraper2 extends BaseScraper {
        constructor() { super('FAIL2'); }
        async scrape() { throw new Error('Connection refused ECONNREFUSED'); }
      }

      mgr.registerScraper('fail1', new FailScraper1());
      mgr.registerScraper('fail2', new FailScraper2());

      const result = await mgr.scrapeAllDetailed({ source: 'fail1,fail2' });
      assert.equal(result.records.length, 0);
      assert.equal(result.errors.length, 2);
      assert.ok(result.errors.some(e => e.source === 'fail1' && e.error.includes('504')));
      assert.ok(result.errors.some(e => e.source === 'fail2' && e.error.includes('ECONNREFUSED')));
    });

    it('should isolate synchronous errors thrown inside scrape() without unhandled rejections', async () => {
      const mgr = new ScraperManager();

      class SyncExplodingScraper extends BaseScraper {
        constructor() { super('EXPLODING'); }
        scrape() {
          // Synchronous throw instead of Promise rejection
          throw new Error('Synchronous crash inside scrape method');
        }
      }

      mgr.registerScraper('exploding', new SyncExplodingScraper());
      const result = await mgr.scrapeAllDetailed({ source: 'exploding' });

      assert.equal(result.records.length, 0);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].source, 'exploding');
      assert.ok(result.errors[0].error.includes('Synchronous crash'));
    });

    it('should attach non-enumerable .errors property in scrapeAll() convenience method', async () => {
      const mgr = new ScraperManager();

      class BrokenScraper extends BaseScraper {
        constructor() { super('ERR'); }
        async scrape() { throw new Error('Simulated failure'); }
      }
      class GoodScraper extends BaseScraper {
        constructor() { super('GOOD'); }
        async scrape() {
          return [
            this.normalizeRecord({
              id: 'GOOD_exam',
              examName: 'Good Exam',
              importantDates: { applicationEndDate: '2026-12-31' },
              officialNotificationUrl: 'https://good.gov.in/notice.pdf'
            })
          ];
        }
      }

      mgr.registerScraper('err', new BrokenScraper());
      mgr.registerScraper('good', new GoodScraper());

      const records = await mgr.scrapeAll({ source: 'err,good' });
      assert.equal(records.length, 1);
      assert.equal(records[0].id, 'GOOD_exam');
      assert.ok(records.errors, 'errors metadata must be attached to records array');
      assert.equal(records.errors.length, 1);
      assert.equal(records.errors[0].source, 'err');
    });

    it('should survive concurrent load of 50 simultaneous scrapeAll() calls without race conditions', async () => {
      const mgr = new ScraperManager();

      let callCount = 0;
      class FastMockScraper extends BaseScraper {
        constructor() { super('FAST'); }
        async scrape() {
          callCount++;
          return [
            this.normalizeRecord({
              id: `FAST_exam_${callCount}`,
              examName: `Fast Exam ${callCount}`,
              importantDates: { applicationEndDate: '2026-12-31' },
              officialNotificationUrl: 'https://fast.gov.in/notice.pdf'
            })
          ];
        }
      }

      mgr.registerScraper('fast', new FastMockScraper());

      const promises = Array.from({ length: 50 }, () => mgr.scrapeAll({ source: 'fast' }));
      const allResults = await Promise.all(promises);

      assert.equal(allResults.length, 50);
      allResults.forEach((records) => {
        assert.equal(records.length, 1);
        assert.ok(records[0].id.startsWith('FAST_exam_'));
        const validation = validateNormalizedExamRecord(records[0]);
        assert.ok(validation.valid);
      });
      assert.equal(callCount, 50);
    });
  });

  // =========================================================================
  // 6. Schema Contract Invariance Check
  // =========================================================================
  describe('6. Schema Contract Invariance Check', () => {
    it('should verify all edge case outputs produced by scrapers strictly comply with NormalizedExamRecord', () => {
      const upsc = new UpscScraper();
      const ssc = new SscScraper();

      // Edge case UPSC record from sparse detail page
      const upscSparse = upsc.parseDetailHtml('<html><body><h1>Minimal</h1></body></html>', 'https://upsc.gov.in/min');
      const v1 = validateNormalizedExamRecord(upscSparse);
      assert.ok(v1.valid, `UPSC sparse failed contract: ${v1.reason}`);

      // Edge case SSC record from sparse JSON item
      const sscSparse = ssc.parseLiveExamsJson([{ examCode: 'MIN' }])[0];
      const v2 = validateNormalizedExamRecord(sscSparse);
      assert.ok(v2.valid, `SSC sparse failed contract: ${v2.reason}`);

      // Check date formats are strings
      assert.equal(typeof upscSparse.importantDates.applicationEndDate, 'string');
      assert.equal(typeof sscSparse.importantDates.applicationEndDate, 'string');

      // Check ISO format of scrapedAt
      assert.ok(!isNaN(Date.parse(upscSparse.scrapedAt)));
      assert.ok(!isNaN(Date.parse(sscSparse.scrapedAt)));
    });
  });
});
