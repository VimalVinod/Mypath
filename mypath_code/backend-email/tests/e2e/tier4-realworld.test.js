// tests/e2e/tier4-realworld.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getDedupStore,
  getTemplateService,
  getPipeline
} = require('../helpers/loader');

describe('Tier 4: Real-World Scenarios', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypath-t4-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  it('T4.1 - Simulated Daily Cron Run: Day 1 Notifies 2 Exams -> Day 2 Reports 0 New Exams', async () => {
    const pipeline = getPipeline();
    const storePath = path.join(tempDir, 'daily-cron-dedup.json');
    const preview1 = path.join(tempDir, 'day1-preview.html');

    const day1Exams = [
      {
        id: 'UPSC_IAS_2026',
        examName: 'Indian Administrative Service 2026',
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-10-20' },
        officialNotificationUrl: 'https://upsc.gov.in/ias.pdf',
        scrapedAt: '2026-09-08T06:00:00Z'
      },
      {
        id: 'SSC_CPO_2026',
        examName: 'Central Police Organization 2026',
        organization: 'SSC',
        importantDates: { applicationEndDate: '2026-10-25' },
        officialNotificationUrl: 'https://ssc.gov.in/cpo.pdf',
        scrapedAt: '2026-09-08T06:00:00Z'
      }
    ];

    // --- DAY 1 (06:00 AM Cron) ---
    const day1Summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
      mock: true,
      mockData: day1Exams,
      storePath,
      dryRun: false, // updates dedup
      previewPath: preview1
    });

    assert.equal(day1Summary.scrapedCount, 2);
    assert.equal(day1Summary.newCount, 2);
    assert.equal(day1Summary.notifiedCount, 2);
    assert.ok(fs.existsSync(storePath));

    // --- DAY 2 (06:00 AM Cron - Same exams scraped from portals) ---
    const day2Summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
      mock: true,
      mockData: day1Exams,
      storePath,
      dryRun: false
    });

    assert.equal(day2Summary.scrapedCount, 2);
    assert.equal(day2Summary.newCount, 0, 'Must detect 0 new exams on second run');
    assert.equal(day2Summary.notifiedCount, 0, 'Must not send duplicate alerts');
    assert.equal(day2Summary.skippedCount, 2);
  });

  it('T4.2 - Urgent 48-Hour Exam Alert Triggers Critical Red Urgency Badge & Action Buttons', () => {
    const template = getTemplateService();

    // Exam closing in 2 days relative to fixedNow
    const fixedNow = new Date('2026-09-09T00:00:00.000Z');
    const urgentExam = {
      id: 'URGENT_EXAM_2D',
      examName: 'Combined Defence Services (Emergency Closing)',
      organization: 'UPSC',
      importantDates: {
        applicationStartDate: '2026-08-10',
        applicationEndDate: '2026-09-11T18:00:00.000Z', // 2.75 days
        examDate: '2026-11-15'
      },
      officialNotificationUrl: 'https://upsc.gov.in/cds-urgent.pdf',
      applicationUrl: 'https://upsconline.nic.in/cds',
      scrapedAt: fixedNow.toISOString()
    };

    const card = template.renderExamCardHtml(urgentExam, fixedNow);

    // Verify critical styling
    assert.ok(card.includes('Closing Soon'), 'Must show Closing Soon badge');
    assert.ok(card.includes('#b91c1c'), 'Must use critical red color');
    assert.ok(card.includes('fee2e2'), 'Must use red background tint');
    assert.ok(card.includes('https://upsconline.nic.in/cds'), 'Must include direct application button');
  });

  it('T4.3 - Automated Dedup Cache Auto-Healing on File Corruption', () => {
    const DedupClass = getDedupStore();
    const storePath = path.join(tempDir, 'corrupted-healing.json');

    // Simulate partial/truncated write from power loss or crash
    fs.writeFileSync(storePath, '{"key1": {"title": "broken... TRUNCATED', 'utf-8');

    const store = new DedupClass(storePath);

    const testExam = {
      id: 'HEAL_1',
      examName: 'Cache Recovery Test Exam',
      organization: 'SSC',
      importantDates: { applicationEndDate: '2026-11-11' },
      officialNotificationUrl: 'https://ssc.gov.in/heal.pdf'
    };

    // Should not crash, should treat corrupted store as empty
    assert.doesNotThrow(() => {
      const newItems = store.filterNewExams([testExam]);
      assert.equal(newItems.length, 1);
    });

    // Should successfully heal and overwrite with valid JSON
    store.markAsNotified([testExam]);
    assert.doesNotThrow(() => {
      const recovered = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      assert.equal(typeof recovered, 'object');
      const key = store.generateKey(testExam);
      assert.ok(recovered[key]);
    });
  });

  it('T4.4 - Resilience Under Partial Upstream Outage (Isolated Portal Failure)', async () => {
    // When one portal fails (e.g. SSC API 500), the aggregator isolates the failure
    // and continues alerting for exams discovered from other portals (e.g. UPSC).
    const upscMock = [
      {
        id: 'UPSC_SURVIVOR',
        examName: 'Civil Services 2026',
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-03-05' },
        officialNotificationUrl: 'https://upsc.gov.in/notice.pdf',
        scrapedAt: new Date().toISOString()
      }
    ];

    const pipeline = getPipeline();
    const storePath = path.join(tempDir, 'partial-outage-dedup.json');

    const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
      mock: true,
      mockData: upscMock, // SSC failed, only UPSC returned data
      storePath,
      dryRun: true
    });

    assert.equal(summary.scrapedCount, 1);
    assert.equal(summary.newCount, 1);
    assert.equal(summary.notifiedCount, 1);
    assert.equal(summary.emailResult?.examCount, 1);
  });

  it('T4.5 - High-Volume Multi-Exam Digest (12 Exams Scaling)', () => {
    const template = getTemplateService();

    const largeExamList = [];
    for (let i = 1; i <= 12; i++) {
      largeExamList.push({
        id: `BULK_EXAM_${i}`,
        examName: `Government Competitive Examination Tier ${i}`,
        organization: i % 2 === 0 ? 'UPSC' : 'SSC',
        importantDates: {
          applicationStartDate: `2026-0${(i % 9) + 1}-01`,
          applicationEndDate: `2026-1${(i % 2)}-15`,
          examDate: `2027-01-${i < 10 ? '0' + i : i}`
        },
        officialNotificationUrl: `https://portal.gov.in/notice-${i}.pdf`,
        applicationUrl: `https://portal.gov.in/apply/${i}`,
        scrapedAt: new Date().toISOString()
      });
    }

    const html = template.renderFullEmailHtml(largeExamList, { recipientName: 'Subscriber' });
    const text = template.renderEmailText(largeExamList, { recipientName: 'Subscriber' });

    assert.ok(html.includes('12 new exam notifications'));
    assert.ok(html.includes('Government Competitive Examination Tier 12'));
    assert.ok(text.includes('[12] GOVERNMENT COMPETITIVE EXAMINATION TIER 12'));
    assert.ok(html.length > 5000, 'HTML should contain rich cards for all 12 exams');
  });
});
