// tests/e2e/tier3-combination.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getUpscScraper,
  getSscScraper,
  getDedupStore,
  getTemplateService,
  getEmailService,
  getPipeline
} = require('../helpers/loader');

const {
  getUpscDetailSampleHtml,
  getSscLiveExamsJson
} = require('../helpers/fixtures');

describe('Tier 3: Cross-Feature Combinations', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypath-t3-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  it('T3.1 - Scraper -> Dedup -> Email Template End-to-End Flow', async () => {
    // 1. Scrape offline data from SSC and UPSC fixtures
    const SscClass = getSscScraper();
    const UpscClass = getUpscScraper();
    const ssc = new SscClass();
    const upsc = new UpscClass();

    const sscExams = ssc.parseLiveExamsJson(getSscLiveExamsJson());
    const upscDetail = getUpscDetailSampleHtml();
    const upscRecord = typeof upsc.parseDetailHtml === 'function'
      ? upsc.parseDetailHtml(upscDetail, 'https://www.upsc.gov.in/cgs', 'Combined Geo-Scientist')
      : upsc.parseExamDetail(upscDetail, 'Combined Geo-Scientist', 'https://www.upsc.gov.in/cgs');

    const allScraped = [...sscExams, upscRecord];
    assert.equal(allScraped.length, 4);

    // 2. Filter through DedupStore
    const DedupClass = getDedupStore();
    const storePath = path.join(tempDir, 'dedup.json');
    const store = new DedupClass(storePath);

    const newExams = store.filterNewExams(allScraped);
    assert.equal(newExams.length, 4);

    // 3. Render and preview email template
    const template = getTemplateService();
    const html = template.renderFullEmailHtml(newExams, { recipientName: 'Combined Applicant' });
    const text = template.renderEmailText(newExams);

    assert.ok(html.includes('4 new exam notifications'));
    assert.ok(html.includes('Combined Geo-Scientist'));
    assert.ok(html.includes('Combined Higher Secondary Level'));
    assert.ok(text.includes('COMBINED GRADUATE LEVEL'));

    // 4. Mark notified and verify subsequent check is empty
    store.markAsNotified(newExams);
    assert.equal(store.filterNewExams(allScraped).length, 0);
  });

  it('T3.2 - Handling Mixed Valid and Incomplete Exam Items in a Single Digest', () => {
    const template = getTemplateService();

    const mixedExams = [
      {
        id: 'EXAM_VALID',
        examName: 'Complete Exam Record 2026',
        organization: 'UPSC',
        importantDates: {
          applicationStartDate: '2026-01-01',
          applicationEndDate: '2026-02-01',
          examDate: '2026-06-01'
        },
        officialNotificationUrl: 'https://upsc.gov.in/complete.pdf',
        applicationUrl: 'https://upsconline.nic.in',
        scrapedAt: new Date().toISOString()
      },
      {
        id: 'EXAM_INCOMPLETE',
        examName: 'Incomplete Exam Record',
        organization: 'SSC',
        importantDates: {
          applicationStartDate: null,
          applicationEndDate: 'TBD',
          examDate: null
        },
        officialNotificationUrl: 'https://ssc.gov.in/notice',
        applicationUrl: null,
        scrapedAt: new Date().toISOString()
      }
    ];

    // Must render without exception and contain both cards
    const html = template.renderFullEmailHtml(mixedExams);
    assert.ok(html.includes('Complete Exam Record 2026'));
    assert.ok(html.includes('Incomplete Exam Record'));
    assert.ok(html.includes('Dates Announced')); // TBD deadline yields Dates Announced
    assert.ok(html.includes('Application Closed')); // 2026-02-01 in the past
  });

  it('T3.3 - CLI Arguments Combined with Mock Data and Dry-Run Flag', async () => {
    const pipeline = getPipeline();
    const storePath = path.join(tempDir, 'cli-combined-dedup.json');
    const previewPath = path.join(tempDir, 'cli-preview.html');

    const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
      mock: true,
      dryRun: true,
      storePath,
      previewPath,
      email: 'custom-cli@mypath.com'
    });

    assert.ok(summary.scrapedCount > 0);
    assert.ok(summary.newCount > 0);
    assert.ok(fs.existsSync(previewPath));
    const previewHtml = fs.readFileSync(previewPath, 'utf-8');
    assert.ok(previewHtml.includes('ExamGo'));
    assert.ok(previewHtml.includes('width="600"'));
  });

  it('T3.4 - Multi-Portal Aggregator: UPSC and SSC Hash Collisions Prevention', () => {
    const DedupClass = getDedupStore();
    const store = new DedupClass(path.join(tempDir, 'collision.json'));

    // Two exams with identical name and deadline but different organizations
    const upscExam = {
      id: 'UPSC_TEST',
      examName: 'Assistant Engineer Examination 2026',
      organization: 'UPSC',
      importantDates: { applicationEndDate: '2026-10-15' },
      officialNotificationUrl: 'https://upsc.gov.in/ae.pdf',
      scrapedAt: new Date().toISOString()
    };

    const sscExam = {
      id: 'SSC_TEST',
      examName: 'Assistant Engineer Examination 2026',
      organization: 'SSC',
      importantDates: { applicationEndDate: '2026-10-15' },
      officialNotificationUrl: 'https://ssc.gov.in/ae.pdf',
      scrapedAt: new Date().toISOString()
    };

    const keyUPSC = store.generateKey(upscExam);
    const keySSC = store.generateKey(sscExam);

    assert.notEqual(keyUPSC, keySSC, 'Keys must differ because organization is part of hash');
  });

  it('T3.5 - Incremental Run Flow: Batch 1 Marked -> Batch 2 Discovers Only Incremental Exam', () => {
    const DedupClass = getDedupStore();
    const storePath = path.join(tempDir, 'incremental.json');
    const store = new DedupClass(storePath);

    const exam1 = { id: 'E1', examName: 'Exam 1', organization: 'UPSC', importantDates: { applicationEndDate: '2026-10-01' } };
    const exam2 = { id: 'E2', examName: 'Exam 2', organization: 'SSC', importantDates: { applicationEndDate: '2026-10-02' } };
    const exam3 = { id: 'E3', examName: 'Exam 3', organization: 'UPSC', importantDates: { applicationEndDate: '2026-10-03' } };

    // Run 1: Exam 1 & 2
    const run1New = store.filterNewExams([exam1, exam2]);
    assert.equal(run1New.length, 2);
    store.markAsNotified(run1New);

    // Run 2: Exam 2 & 3
    const run2New = store.filterNewExams([exam2, exam3]);
    assert.equal(run2New.length, 1);
    assert.equal(run2New[0].id, 'E3');
    store.markAsNotified(run2New);

    // Run 3: All 3
    const run3New = store.filterNewExams([exam1, exam2, exam3]);
    assert.equal(run3New.length, 0);
  });

  it('T3.6 - Force Flag Re-Notifies Previously Notified Items', async () => {
    const pipeline = getPipeline();
    const storePath = path.join(tempDir, 'force-pipeline.json');
    const DedupClass = getDedupStore();
    const store = new DedupClass(storePath);

    const mockExams = [
      { id: 'F1', examName: 'Force Exam', organization: 'UPSC', importantDates: { applicationEndDate: '2026-12-01' }, officialNotificationUrl: 'https://upsc.gov.in' }
    ];

    // Mark notified
    store.markAsNotified(mockExams);

    // Normal run should yield 0 new
    const normalSummary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
      mock: true,
      mockData: mockExams,
      storePath,
      dryRun: true
    });
    assert.equal(normalSummary.newCount, 0);

    // Force run should yield 1 new
    const forceSummary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
      mock: true,
      mockData: mockExams,
      storePath,
      force: true,
      dryRun: true
    });
    assert.equal(forceSummary.newCount, 1);
  });
});
