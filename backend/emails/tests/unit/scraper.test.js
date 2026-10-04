// tests/unit/scraper.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getUpscScraper, getSscScraper } = require('../helpers/loader');
const { getUpscActiveExamsHtml, getUpscDetailSampleHtml, getSscLiveExamsJson } = require('../helpers/fixtures');
const { validateNormalizedExamRecord } = require('../helpers/contracts');

describe('Scraper Unit & Contract Tests', () => {
  const UpscScraperClass = getUpscScraper();
  const SscScraperClass = getSscScraper();
  const upscScraper = new UpscScraperClass();
  const sscScraper = new SscScraperClass();

  describe('UPSC List Parser', () => {
    it('should extract active exam list from realistic UPSC HTML fixture', () => {
      const html = getUpscActiveExamsHtml();
      const exams = typeof upscScraper.parseIndexHtml === 'function'
        ? upscScraper.parseIndexHtml(html)
        : upscScraper.parseActiveExamsList(html);
      assert.ok(Array.isArray(exams), 'Exams must be an array');
      assert.equal(exams.length, 5, 'Should find 5 active exams from fixture');
      const firstTitle = exams[0].examName || exams[0].title;
      assert.equal(firstTitle, 'Combined Geo-Scientist (Preliminary) Examination, 2027');
      assert.ok(exams[0].detailUrl.includes('Combined%20Geo-Scientist'), 'Should have valid detail URL');
    });

    it('should handle HTML without exams by returning empty array', () => {
      const emptyHtml = '<html><body><div>No exams found</div></body></html>';
      const exams = typeof upscScraper.parseIndexHtml === 'function'
        ? upscScraper.parseIndexHtml(emptyHtml)
        : upscScraper.parseActiveExamsList(emptyHtml);
      assert.deepEqual(exams, []);
    });

    it('should handle null or undefined input gracefully without throwing', () => {
      const parse = (h) => typeof upscScraper.parseIndexHtml === 'function'
        ? upscScraper.parseIndexHtml(h)
        : upscScraper.parseActiveExamsList(h);
      assert.deepEqual(parse(null), []);
      assert.deepEqual(parse(undefined), []);
    });
  });

  describe('UPSC Detail Table Parser', () => {
    it('should extract dates and official PDF notice from detail sample fixture', () => {
      const detailHtml = getUpscDetailSampleHtml();
      const examName = 'Combined Geo-Scientist (Preliminary) Examination, 2027';
      const detailUrl = 'https://www.upsc.gov.in/examinations/Combined%20Geo-Scientist';
      const record = typeof upscScraper.parseDetailHtml === 'function'
        ? upscScraper.parseDetailHtml(detailHtml, detailUrl, examName)
        : upscScraper.parseExamDetail(detailHtml, examName, detailUrl);

      assert.equal(record.examName, examName);
      assert.equal(record.organization, 'UPSC');
      assert.equal(record.importantDates.notificationDate, '02/09/2026');
      assert.equal(record.importantDates.examDate, '10/01/2027');
      assert.equal(record.importantDates.applicationEndDate, '22/09/2026 - 6:00pm');
      assert.equal(record.officialNotificationUrl, 'https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf');

      const validation = validateNormalizedExamRecord(record);
      assert.ok(validation.valid, `Schema validation failed: ${validation.reason}`);
    });

    it('should fallback gracefully when detail page table is missing', () => {
      const malformedHtml = '<html><body><h1>Error</h1></body></html>';
      const detailUrl = 'https://upsc.gov.in/test';
      const record = typeof upscScraper.parseDetailHtml === 'function'
        ? upscScraper.parseDetailHtml(malformedHtml, detailUrl, 'Missing Table Exam')
        : upscScraper.parseExamDetail(malformedHtml, 'Missing Table Exam', detailUrl);
      assert.equal(record.examName, 'Missing Table Exam');
      assert.equal(record.organization, 'UPSC');
      assert.ok(record.importantDates.applicationEndDate);
    });
  });

  describe('SSC Live Exams Parser', () => {
    it('should normalize live SSC API JSON payload into NormalizedExamRecord array', () => {
      const json = getSscLiveExamsJson();
      const records = sscScraper.parseLiveExamsJson(json);

      assert.equal(records.length, 3, 'Should parse all 3 active SSC exams');

      const chsl = records.find(r => r.examCode === 'CHSL');
      assert.ok(chsl, 'CHSL exam must be present');
      assert.equal(chsl.organization, 'SSC');
      assert.equal(chsl.examName, 'Combined Higher Secondary Level (10+2) Examination 2026');
      assert.equal(chsl.importantDates.applicationStartDate, '2026-09-07');
      assert.equal(chsl.importantDates.applicationEndDate, '2026-10-07T17:30:00.000Z');
      assert.equal(chsl.importantDates.feeDeadline, '2026-10-08T17:30:00.000Z');
      assert.ok(chsl.fee == '100', 'Fee should be 100');
      if (chsl.ageLimit) {
        assert.deepEqual(chsl.ageLimit, { min: 18, max: 27 });
      }
      assert.equal(chsl.applicationUrl, 'https://ssc.gov.in/ApplicationForm/chslform');

      // Verify each record against NormalizedExamRecord schema
      records.forEach(r => {
        const validation = validateNormalizedExamRecord(r);
        assert.ok(validation.valid, `Record ${r.id} invalid: ${validation.reason}`);
      });
    });

    it('should return empty array if API returns empty data or error status', () => {
      assert.deepEqual(sscScraper.parseLiveExamsJson({ statusCode: '404', data: [] }), []);
      assert.deepEqual(sscScraper.parseLiveExamsJson({}), []);
      assert.deepEqual(sscScraper.parseLiveExamsJson(null), []);
    });
  });
});
