// tests/e2e/challenger-m1.test.js
/**
 * Empirical Challenger Suite for Milestone 1 (src/scrapers/**)
 * Challenges:
 * 1. Network edge cases & timeouts (live network, retry backoff, timeout abort, 4xx/5xx).
 * 2. Concurrency & ScraperManager robustness (parallel runs, asymmetric failures, non-Error exceptions, high volume).
 * 3. Boundary exam fields (Unicode, multi-line titles, date formats, non-standard types).
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const BaseScraper = require('../../src/scrapers/base-scraper');
const UpscScraper = require('../../src/scrapers/upsc-scraper');
const SscScraper = require('../../src/scrapers/ssc-scraper');
const { ScraperManager, defaultManager } = require('../../src/scrapers');
const { validateNormalizedExamRecord } = require('../helpers/contracts');

describe('Milestone 1 Empirical Challenger Suite', () => {

  // =========================================================================
  // Challenge Dimension 1: Network Edge Cases & Timeout Handling
  // =========================================================================
  describe('Dimension 1: Network Edge Cases & Timeout Handling', () => {
    let mockServer;
    let mockServerPort;
    let requestCount = 0;
    let serverMode = 'normal';

    before((_, done) => {
      mockServer = http.createServer((req, res) => {
        requestCount++;
        if (serverMode === 'delay') {
          // Intentionally delay response by 1000ms
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: [] }));
          }, 1000);
        } else if (serverMode === 'transient-503') {
          // Fail twice with 503, succeed on 3rd attempt
          if (requestCount < 3) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('Service Unavailable');
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: [{ examCode: 'TEST', examYear: '2026', applicationEndDate: '2026-10-01' }] }));
          }
        } else if (serverMode === 'persistent-500') {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        } else if (serverMode === 'client-404') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [] }));
        }
      });

      mockServer.listen(0, '127.0.0.1', () => {
        mockServerPort = mockServer.address().port;
        done();
      });
    });

    after((_, done) => {
      mockServer.close(done);
    });

    it('C1.1 - fetchWithRetry should abort promptly when timeoutMs is exceeded', async () => {
      serverMode = 'delay';
      requestCount = 0;
      const scraper = new BaseScraper('TEST', {
        timeoutMs: 80,
        retries: 1,
        retryDelayMs: 20
      });

      const startTime = Date.now();
      await assert.rejects(
        async () => {
          await scraper.fetchWithRetry(`http://127.0.0.1:${mockServerPort}/delay`);
        },
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('after 2 attempts'));
          return true;
        }
      );
      const elapsed = Date.now() - startTime;
      // Should abort within reasonable time (< 800ms total for 2 attempts of 80ms timeout + 20ms delay)
      assert.ok(elapsed < 800, `Expected elapsed < 800ms, got ${elapsed}ms`);
      assert.equal(requestCount, 2, 'Should have attempted exactly 2 times (1 + 1 retry)');
    });

    it('C1.2 - fetchWithRetry succeeds after transient 503 errors via exponential backoff', async () => {
      serverMode = 'transient-503';
      requestCount = 0;
      const scraper = new BaseScraper('TEST', {
        timeoutMs: 2000,
        retries: 3,
        retryDelayMs: 50
      });

      const res = await scraper.fetchWithRetry(`http://127.0.0.1:${mockServerPort}/transient`);
      assert.equal(res.status, 200);
      assert.equal(requestCount, 3, 'Should have succeeded on 3rd attempt after 2 retries');
    });

    it('C1.3 - fetchWithRetry exhausts all retries and throws descriptive error on persistent 500', async () => {
      serverMode = 'persistent-500';
      requestCount = 0;
      const scraper = new BaseScraper('TEST', {
        timeoutMs: 1000,
        retries: 2,
        retryDelayMs: 20
      });

      await assert.rejects(
        async () => {
          await scraper.fetchWithRetry(`http://127.0.0.1:${mockServerPort}/error`);
        },
        /\[TEST\] Failed to fetch .* after 3 attempts: HTTP 500/
      );
      assert.equal(requestCount, 3);
    });

    it('C1.4 - fetchWithRetry does not retry 404 client errors endlessly', async () => {
      serverMode = 'client-404';
      requestCount = 0;
      const scraper = new BaseScraper('TEST', {
        timeoutMs: 1000,
        retries: 3,
        retryDelayMs: 20
      });

      await assert.rejects(
        async () => {
          await scraper.fetchWithRetry(`http://127.0.0.1:${mockServerPort}/notfound`);
        },
        /HTTP 404/
      );
      // Client 404 should throw immediately without retrying all 3 times
      assert.equal(requestCount, 1, '404 should not be retried');
    });

    it('C1.5 - Unreachable DNS / host throws clean error without hanging', async () => {
      const scraper = new BaseScraper('TEST', {
        timeoutMs: 500,
        retries: 0
      });

      await assert.rejects(
        async () => {
          await scraper.fetchWithRetry('http://non-existent-domain-xyz-404-challenger.invalid');
        },
        /\[TEST\] Failed to fetch/
      );
    });

    it('C1.6 - UpscScraper detail page failure gracefully falls back to stub record', async () => {
      const scraper = new UpscScraper();
      // Provide an index with 1 exam whose detail page will fail
      const mockIndexHtml = `
        <div class="view-content">
          <div class="views-row">
            <div class="views-field views-field-field-exam-name">
              <a href="http://127.0.0.1:${mockServerPort}/unreachable-detail">
                <li>Civil Services Preliminary Examination 2026</li>
              </a>
            </div>
          </div>
        </div>
      `;

      serverMode = 'client-404';
      const records = await scraper.scrape({
        indexHtml: mockIndexHtml,
        maxExams: 1,
        delayMs: 0
      });

      assert.equal(records.length, 1);
      assert.equal(records[0].examName, 'Civil Services Preliminary Examination 2026');
      assert.equal(records[0].organization, 'UPSC');
      assert.equal(records[0].importantDates.applicationEndDate, 'TBD');
      assert.ok(validateNormalizedExamRecord(records[0]).valid);
    });

    it('C1.7 - UpscScraper activates RSS fallback when index returns 0 exams', async () => {
      const scraper = new UpscScraper();
      const emptyIndexHtml = '<html><body><div>No exams currently active</div></body></html>';
      
      const mockRssXml = `<?xml version="1.0" encoding="utf-8"?>
        <rss version="2.0">
          <channel>
            <title>UPSC Exams</title>
            <item>
              <title>National Defence Academy Examination 2026</title>
              <link>https://www.upsc.gov.in/sites/default/files/nda-2026.pdf</link>
              <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      // Intercept fetchWithRetry for RSS url
      const originalFetch = scraper.fetchWithRetry.bind(scraper);
      scraper.fetchWithRetry = async (url, opts) => {
        if (url.includes('rss.php')) {
          return {
            text: async () => mockRssXml
          };
        }
        return originalFetch(url, opts);
      };

      const records = await scraper.scrape({ indexHtml: emptyIndexHtml });
      assert.equal(records.length, 1);
      assert.equal(records[0].examName, 'National Defence Academy Examination 2026');
      assert.equal(records[0].officialNotificationUrl, 'https://www.upsc.gov.in/sites/default/files/nda-2026.pdf');
      assert.ok(validateNormalizedExamRecord(records[0]).valid);
    });
  });

  // =========================================================================
  // Challenge Dimension 2: Concurrency, Error Isolation & Manager Robustness
  // =========================================================================
  describe('Dimension 2: Concurrency, Error Isolation & Manager Robustness', () => {

    it('C2.1 - 25 concurrent scrapeAll calls produce zero state leakage or collisions', async () => {
      const manager = new ScraperManager();
      
      // Use mock scrapers with slight random async jitter
      class MockScraperA extends BaseScraper {
        constructor() { super('MOCK_A'); }
        async scrape() {
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20)));
          return [this.normalizeRecord({
            id: 'MOCK_A_1',
            examName: 'Exam Alpha',
            organization: 'MOCK_A',
            importantDates: { applicationEndDate: '2026-12-01' },
            officialNotificationUrl: 'https://example.com/alpha'
          })];
        }
      }

      class MockScraperB extends BaseScraper {
        constructor() { super('MOCK_B'); }
        async scrape() {
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20)));
          return [this.normalizeRecord({
            id: 'MOCK_B_1',
            examName: 'Exam Beta',
            organization: 'MOCK_B',
            importantDates: { applicationEndDate: '2026-12-15' },
            officialNotificationUrl: 'https://example.com/beta'
          })];
        }
      }

      manager.registerScraper('mock_a', new MockScraperA());
      manager.registerScraper('mock_b', new MockScraperB());

      // Launch 25 concurrent invocations
      const promises = Array.from({ length: 25 }, () => manager.scrapeAllDetailed({ source: 'mock_a,mock_b' }));
      const results = await Promise.all(promises);

      for (const res of results) {
        assert.equal(res.records.length, 2, 'Each run must contain exactly 2 records');
        assert.equal(res.errors.length, 0, 'No run should have errors');
        const ids = res.records.map(r => r.id).sort();
        assert.deepEqual(ids, ['MOCK_A_1', 'MOCK_B_1']);
      }
    });

    it('C2.2 - Asymmetric failure: 1 failing portal does not drop surviving portals', async () => {
      const manager = new ScraperManager();

      class GoodScraper1 extends BaseScraper {
        constructor() { super('GOOD1'); }
        async scrape() {
          return [this.normalizeRecord({
            id: 'GOOD1_exam',
            examName: 'Good Exam 1',
            organization: 'GOOD1',
            importantDates: { applicationEndDate: '2026-11-01' },
            officialNotificationUrl: 'https://example.com/1'
          })];
        }
      }

      class BadScraper extends BaseScraper {
        constructor() { super('BAD'); }
        async scrape() {
          throw new Error('504 Gateway Timeout: Portal upstream unreachable');
        }
      }

      class GoodScraper2 extends BaseScraper {
        constructor() { super('GOOD2'); }
        async scrape() {
          return [this.normalizeRecord({
            id: 'GOOD2_exam',
            examName: 'Good Exam 2',
            organization: 'GOOD2',
            importantDates: { applicationEndDate: '2026-11-10' },
            officialNotificationUrl: 'https://example.com/2'
          })];
        }
      }

      manager.registerScraper('g1', new GoodScraper1());
      manager.registerScraper('b1', new BadScraper());
      manager.registerScraper('g2', new GoodScraper2());

      const res = await manager.scrapeAllDetailed({ source: 'g1,b1,g2' });
      assert.equal(res.records.length, 2, 'Must retain records from both surviving portals');
      assert.equal(res.errors.length, 1, 'Must record the single failure');
      assert.equal(res.errors[0].source, 'b1');
      assert.ok(res.errors[0].error.includes('504 Gateway Timeout'));
    });

    it('C2.3 - Scraper rejecting with string error is safely caught and formatted', async () => {
      const manager = new ScraperManager();

      class StringRejectScraper extends BaseScraper {
        constructor() { super('STR_ERR'); }
        async scrape() {
          // eslint-disable-next-line no-throw-literal
          throw 'Raw string network rejection';
        }
      }

      manager.registerScraper('str', new StringRejectScraper());
      const res = await manager.scrapeAllDetailed({ source: 'str' });
      assert.equal(res.records.length, 0);
      assert.equal(res.errors.length, 1);
      assert.equal(res.errors[0].source, 'str');
      assert.equal(res.errors[0].error, 'Raw string network rejection');
    });

    it('C2.7 - Scraper rejecting with null or undefined', async () => {
      const manager = new ScraperManager();

      class NullRejectScraper extends BaseScraper {
        constructor() { super('NULL_ERR'); }
        async scrape() {
          return Promise.reject(null);
        }
      }

      manager.registerScraper('null_scraper', new NullRejectScraper());
      const res = await manager.scrapeAllDetailed({ source: 'null_scraper' });
      assert.equal(res.records.length, 0);
      assert.equal(res.errors.length, 1);
      assert.equal(res.errors[0].source, 'null_scraper');
    });

    it('C2.4 - High volume aggregation handles 2,000 records smoothly', async () => {
      const manager = new ScraperManager();

      class BulkScraper extends BaseScraper {
        constructor() { super('BULK'); }
        async scrape() {
          const items = [];
          for (let i = 1; i <= 2000; i++) {
            items.push(this.normalizeRecord({
              id: `BULK_${i}`,
              examName: `Bulk Exam Notification ${i}`,
              organization: 'BULK',
              importantDates: { applicationEndDate: '2026-12-31' },
              officialNotificationUrl: `https://example.com/bulk/${i}`
            }));
          }
          return items;
        }
      }

      manager.registerScraper('bulk', new BulkScraper());
      const res = await manager.scrapeAll({ source: 'bulk' });
      assert.equal(res.length, 2000);
      assert.equal(res[0].id, 'BULK_1');
      assert.equal(res[1999].id, 'BULK_2000');
    });

    it('C2.5 - Source filtering handles subset and invalid keys gracefully', async () => {
      const manager = new ScraperManager();
      const allKeys = manager.listScrapers();
      assert.ok(allKeys.includes('upsc'));
      assert.ok(allKeys.includes('ssc'));

      const res = await manager.scrapeAllDetailed({ source: 'nonexistent_portal' });
      assert.equal(res.records.length, 0);
      assert.equal(res.errors.length, 0);
    });

    it('C2.6 - registerScraper rejects invalid instances not extending BaseScraper', () => {
      const manager = new ScraperManager();
      assert.throws(
        () => {
          manager.registerScraper('invalid', { scrape: () => [] });
        },
        /must extend BaseScraper/
      );
    });
  });

  // =========================================================================
  // Challenge Dimension 3: Boundary Exam Fields, Unicode & Dates
  // =========================================================================
  describe('Dimension 3: Boundary Exam Fields, Unicode & Dates', () => {
    const upsc = new UpscScraper();
    const ssc = new SscScraper();

    it('C3.1 - BaseScraper.slugify handles non-Latin Unicode / Hindi characters', () => {
      const scraper = new BaseScraper('TEST');

      // Title in Devanagari script
      const hindiTitle = 'संघ लोक सेवा आयोग परीक्षा 2026';
      const slug = scraper.slugify(hindiTitle);
      // Notice: [^a-z0-9]+ replaces non-ASCII with hyphens, leaving numbers '2026'
      assert.equal(slug, '2026');

      // Title with symbols and mixed punctuation
      const mixedTitle = '  *** UPSC / SSC: Combined Examination (Tier-I & II) -- 2026-2027 ***  ';
      const mixedSlug = scraper.slugify(mixedTitle);
      assert.equal(mixedSlug, 'upsc-ssc-combined-examination-tier-i-ii-2026-2027');

      // Pure non-ASCII title with no Latin characters or digits
      const pureHindi = 'सहायक निदेशक परीक्षा';
      const pureSlug = scraper.slugify(pureHindi);
      // Empty after stripping non-alphanumerics, should be safely string
      assert.equal(typeof pureSlug, 'string');
    });

    it('C3.2 - Multi-line exam title with newlines and carriage returns is normalized', () => {
      const scraper = new BaseScraper('TEST');
      const multilineTitle = '  Combined Medical Services\r\n\tExamination,\n2026   ';
      const record = scraper.normalizeRecord({
        examName: multilineTitle,
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-10-15' },
        officialNotificationUrl: 'https://upsc.gov.in'
      });

      assert.ok(record.examName);
      // Should preserve official exam name without breaking schema
      assert.ok(validateNormalizedExamRecord(record).valid);
    });

    it('C3.3 - UPSC detail table parser handles varied date formats and extra whitespace', () => {
      const detailHtml = `
        <html>
          <body>
            <table class="views-table">
              <caption>Name of Examination: Engineering Services (Preliminary) Examination, 2027</caption>
              <tbody>
                <tr>
                  <td>Date of Notification</td>
                  <td>  15/10/2026   </td>
                </tr>
                <tr>
                  <td>Last Date for Receipt of Applications</td>
                  <td>04/11/2026 - 6:00pm (Extended)</td>
                </tr>
                <tr>
                  <td>Date of Commencement of Examination</td>
                  <td>14.02.2027</td>
                </tr>
                <tr>
                  <td>Download Notification</td>
                  <td><a href="/sites/default/files/Notif-ESE-2027.pdf">Notice (2.4 MB)</a></td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const record = upsc.parseDetailHtml(detailHtml, 'https://www.upsc.gov.in/examinations/ese-2027');
      assert.equal(record.examName, 'Engineering Services (Preliminary) Examination, 2027');
      assert.equal(record.importantDates.notificationDate, '15/10/2026');
      assert.equal(record.importantDates.applicationEndDate, '04/11/2026 - 6:00pm (Extended)');
      assert.equal(record.importantDates.examDate, '14.02.2027');
      assert.equal(record.officialNotificationUrl, 'https://www.upsc.gov.in/sites/default/files/Notif-ESE-2027.pdf');
      assert.ok(validateNormalizedExamRecord(record).valid);
    });

    it('C3.4 - SSC JSON parser handles boundary data types (fees, missing fields, nulls)', () => {
      const boundaryPayload = {
        data: [
          // Case 1: fee as numeric 0 (free exam)
          {
            examCode: 'FREE_EXAM',
            examYear: '2026',
            examName: 'Free Aspirant Scholarship Exam',
            applicationStartDate: '2026-09-01',
            applicationEndDate: '2026-10-01T23:59:59.000Z',
            fee: 0
          },
          // Case 2: fee as string "100.00"
          {
            examCode: 'STR_FEE',
            examYear: '2026',
            examName: 'String Fee Exam',
            applicationStartDate: '2026-09-01',
            applicationEndDate: '2026-10-01T23:59:59.000Z',
            fee: '100.00'
          },
          // Case 3: fee as non-numeric "EXEMPTED"
          {
            examCode: 'EXEMPT',
            examYear: '2026',
            examName: 'Exempted Fee Exam',
            applicationStartDate: '2026-09-01',
            applicationEndDate: '2026-10-01T23:59:59.000Z',
            fee: 'EXEMPTED'
          },
          // Case 4: null examCode and examYear, fallback to examName
          {
            examCode: null,
            examYear: null,
            examName: 'Special Selection Board 2026',
            applicationStartDate: null,
            applicationEndDate: '2026-11-01',
            attachmentUrl: '/download/notice.pdf',
            navigationUrl: '/apply/now'
          }
        ]
      };

      const records = ssc.parseLiveExamsJson(boundaryPayload);
      assert.equal(records.length, 4);

      // Case 1: fee 0 should be number 0, not null
      assert.equal(records[0].fee, 0);

      // Case 2: string '100.00' parsed to number 100
      assert.equal(records[1].fee, 100);

      // Case 3: non-numeric preserved as string 'EXEMPTED'
      assert.equal(records[2].fee, 'EXEMPTED');

      // Case 4: relative urls resolved properly
      assert.equal(records[3].officialNotificationUrl, 'https://ssc.gov.in/download/notice.pdf');
      assert.equal(records[3].applicationUrl, 'https://ssc.gov.in/apply/now');
      assert.equal(records[3].id, 'SSC_special-selection-board-2026');

      // All records must validate strictly against NormalizedExamRecord schema
      records.forEach((r, idx) => {
        const v = validateNormalizedExamRecord(r);
        assert.ok(v.valid, `Record ${idx} failed validation: ${v.reason}`);
      });
    });

    it('C3.5 - Extremely long exam title (500+ chars) generates bounded slug and valid record', () => {
      const longTitle = 'Recruitment to the Posts of Senior Research Officer, Assistant Director General, Deputy Commissioner of Agriculture, Joint Director of Forensic Sciences, and Superintending Geologist in various Ministries and Departments of the Government of India Examination, 2026-2027';
      const record = upsc.normalizeRecord({
        examName: longTitle,
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-12-01' },
        officialNotificationUrl: 'https://upsc.gov.in'
      });

      assert.ok(record.id.length <= 100, `ID should be bounded, got length ${record.id.length}`);
      assert.equal(record.examName, longTitle);
      assert.ok(validateNormalizedExamRecord(record).valid);
    });

    it('C3.6 - validateRecord strictly enforces all required fields and rejects malformed objects', () => {
      const scraper = new BaseScraper('TEST');

      // Missing id
      assert.throws(() => scraper.validateRecord({
        examName: 'Exam', organization: 'TEST',
        importantDates: { applicationEndDate: '2026-10-01' },
        officialNotificationUrl: 'https://example.com', scrapedAt: '2026-09-08'
      }), /missing required field "id"/);

      // Missing importantDates.applicationEndDate
      assert.throws(() => scraper.validateRecord({
        id: 'TEST_1', examName: 'Exam', organization: 'TEST',
        importantDates: {},
        officialNotificationUrl: 'https://example.com', scrapedAt: '2026-09-08'
      }), /"importantDates.applicationEndDate" is required/);

      // Non-object record
      assert.throws(() => scraper.validateRecord(null), /must be a non-null object/);
    });

    it('C3.7 - SSC batch resilience when 1 of 5 items has numeric timestamp applicationEndDate', () => {
      const payloadWithNumericDate = {
        data: [
          { examCode: 'E1', examYear: '2026', examName: 'Exam 1', applicationEndDate: '2026-10-01' },
          { examCode: 'E2', examYear: '2026', examName: 'Exam 2', applicationEndDate: 1728000000000 }, // numeric timestamp
          { examCode: 'E3', examYear: '2026', examName: 'Exam 3', applicationEndDate: '2026-10-03' }
        ]
      };

      // Test whether parseLiveExamsJson converts or crashes the batch
      try {
        const records = ssc.parseLiveExamsJson(payloadWithNumericDate);
        assert.ok(records.length >= 2, 'Batch should preserve valid items E1 and E3');
      } catch (err) {
        // If it throws, the entire batch was crashed by a single item
        assert.fail(`Single item error crashed entire batch: ${err.message}`);
      }
    });

    it('C3.8 - BaseScraper.slugify must generate distinct non-empty IDs for distinct Devanagari/Hindi exam titles', () => {
      const scraper = new BaseScraper('UPSC');
      const title1 = 'सहायक निदेशक परीक्षा';
      const title2 = 'वैज्ञानिक अधिकारी परीक्षा';

      const slug1 = scraper.slugify(title1);
      const slug2 = scraper.slugify(title2);

      const record1 = scraper.normalizeRecord({
        examName: title1,
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-10-01' },
        officialNotificationUrl: 'https://example.com/1'
      });

      const record2 = scraper.normalizeRecord({
        examName: title2,
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-10-01' },
        officialNotificationUrl: 'https://example.com/2'
      });

      assert.notEqual(slug1, '', 'Slug must not be empty string for valid Hindi title');
      assert.notEqual(record1.id, 'UPSC_', 'Record ID must not be generic source prefix "UPSC_"');
      assert.notEqual(record1.id, record2.id, 'Distinct examinations must produce distinct deterministic IDs');
    });
  });
});
