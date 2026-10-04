// tests/e2e/tier1-feature.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseArgs } = require('node:util');

const {
  getUpscScraper,
  getSscScraper,
  getDedupStore,
  getTemplateService,
  getEmailService,
  getPipeline
} = require('../helpers/loader');

const {
  getUpscActiveExamsHtml,
  getUpscDetailSampleHtml,
  getSscLiveExamsJson
} = require('../helpers/fixtures');

const { validateNormalizedExamRecord } = require('../helpers/contracts');

describe('Tier 1: Feature Coverage (>=5 tests per feature)', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypath-t1-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  // =========================================================================
  // Feature 1: Scraper Extraction (>=5 tests)
  // =========================================================================
  describe('Feature 1: Scraper Extraction', () => {
    const UpscClass = getUpscScraper();
    const SscClass = getSscScraper();
    const upsc = new UpscClass();
    const ssc = new SscClass();

    it('T1.1.1 - UPSC List extraction retrieves all active exams with URLs', () => {
      const html = getUpscActiveExamsHtml();
      const list = typeof upsc.parseIndexHtml === 'function'
        ? upsc.parseIndexHtml(html)
        : upsc.parseActiveExamsList(html);

      assert.ok(Array.isArray(list));
      assert.equal(list.length, 5);
      const title = list[0].examName || list[0].title;
      assert.ok(title.includes('Combined Geo-Scientist'));
      assert.ok(list[0].detailUrl.startsWith('https://www.upsc.gov.in'));
    });

    it('T1.1.2 - UPSC Detail extraction parses all structured date labels', () => {
      const detailHtml = getUpscDetailSampleHtml();
      const detailUrl = 'https://www.upsc.gov.in/examinations/Combined%20Geo-Scientist';
      const record = typeof upsc.parseDetailHtml === 'function'
        ? upsc.parseDetailHtml(detailHtml, detailUrl, 'Combined Geo-Scientist')
        : upsc.parseExamDetail(detailHtml, 'Combined Geo-Scientist', detailUrl);

      assert.equal(record.importantDates.notificationDate, '02/09/2026');
      assert.equal(record.importantDates.examDate, '10/01/2027');
      assert.equal(record.importantDates.applicationEndDate, '22/09/2026 - 6:00pm');
    });

    it('T1.1.3 - UPSC Detail extraction extracts absolute PDF notification URL', () => {
      const detailHtml = getUpscDetailSampleHtml();
      const detailUrl = 'https://www.upsc.gov.in/examinations/Combined%20Geo-Scientist';
      const record = typeof upsc.parseDetailHtml === 'function'
        ? upsc.parseDetailHtml(detailHtml, detailUrl, 'Combined Geo-Scientist')
        : upsc.parseExamDetail(detailHtml, 'Combined Geo-Scientist', detailUrl);

      assert.ok(record.officialNotificationUrl.endsWith('.pdf'));
      assert.ok(record.officialNotificationUrl.startsWith('https://www.upsc.gov.in/sites/'));
    });

    it('T1.1.4 - SSC Live Exams API parser extracts all active exam items', () => {
      const json = getSscLiveExamsJson();
      const records = ssc.parseLiveExamsJson(json);

      assert.equal(records.length, 3);
      const codes = records.map(r => r.examCode);
      assert.ok(codes.includes('CHSL'));
      assert.ok(codes.includes('CGL'));
      assert.ok(codes.includes('MTS'));
    });

    it('T1.1.5 - Schema Conformance: All extracted records satisfy NormalizedExamRecord contract', () => {
      const json = getSscLiveExamsJson();
      const records = ssc.parseLiveExamsJson(json);
      for (const r of records) {
        const v = validateNormalizedExamRecord(r);
        assert.ok(v.valid, `Record ${r.id} invalid: ${v.reason}`);
        assert.ok(r.id.length > 0);
        assert.ok(r.organization === 'SSC');
        assert.ok(r.scrapedAt);
      }
    });

    it('T1.1.6 - Scraper constructor options configure timeout and retries', () => {
      const customUpsc = new UpscClass({ timeoutMs: 5000, retries: 3 });
      assert.equal(customUpsc.options.timeoutMs, 5000);
      assert.equal(customUpsc.options.retries, 3);
    });
  });

  // =========================================================================
  // Feature 2: Email Template Rendering (>=5 tests)
  // =========================================================================
  describe('Feature 2: Email Template Rendering', () => {
    const template = getTemplateService();

    const sampleExams = [
      {
        id: 'UPSC_CSE_2026',
        examName: 'Civil Services Examination 2026',
        organization: 'UPSC',
        importantDates: {
          applicationStartDate: '2026-02-05',
          applicationEndDate: '2026-03-05',
          examDate: '2026-05-24'
        },
        officialNotificationUrl: 'https://upsc.gov.in/notice.pdf',
        applicationUrl: 'https://upsconline.nic.in',
        scrapedAt: new Date().toISOString()
      },
      {
        id: 'SSC_CHSL_2026',
        examName: 'Combined Higher Secondary Level 2026',
        organization: 'SSC',
        importantDates: {
          applicationStartDate: '2026-09-07',
          applicationEndDate: '2026-10-07'
        },
        officialNotificationUrl: 'https://ssc.gov.in/chsl.pdf',
        scrapedAt: new Date().toISOString()
      }
    ];

    it('T1.2.1 - Single exam card renders typography, organization tag, and CTA link', () => {
      const cardHtml = template.renderExamCardHtml(sampleExams[0]);
      assert.ok(cardHtml.includes('Civil Services Examination 2026'));
      assert.ok(cardHtml.includes('UPSC'));
      assert.ok(cardHtml.includes('https://upsc.gov.in/notice.pdf'));
      assert.ok(cardHtml.includes('View Notification (PDF)'));
      assert.ok(cardHtml.includes('Apply Online'));
    });

    it('T1.2.2 - Multi-exam digest renders inside 600px container with header and footer', () => {
      const html = template.renderFullEmailHtml(sampleExams, { recipientName: 'Priya' });
      assert.ok(html.includes('width="600"'));
      assert.ok(html.includes('Hello <strong>Priya</strong>'));
      assert.ok(html.includes('2 new exam notifications'));
      assert.ok(html.includes('ExamGo'));
      assert.ok(html.includes('&copy;'));
    });

    it('T1.2.3 - Urgency calculation renders correct badges across categories', () => {
      const now = new Date('2026-09-09T00:00:00.000Z');
      const urgent = template.calculateUrgency('2026-09-11T00:00:00.000Z', now);
      assert.equal(urgent.status, 'critical');

      const warning = template.calculateUrgency('2026-09-15T00:00:00.000Z', now);
      assert.equal(warning.status, 'warning');

      const open = template.calculateUrgency('2026-10-01T00:00:00.000Z', now);
      assert.equal(open.status, 'open');

      const expired = template.calculateUrgency('2026-08-01T00:00:00.000Z', now);
      assert.equal(expired.status, 'expired');
    });

    it('T1.2.4 - Dynamic subject line differentiates single exam vs multiple exams', () => {
      assert.equal(
        template.generateSubject([sampleExams[0]]),
        '🔔 New Exam Alert: Civil Services Examination 2026 (UPSC)'
      );
      assert.equal(
        template.generateSubject(sampleExams),
        '🔔 New Exam Alerts: 2 New Government Exams Announced'
      );
    });

    it('T1.2.5 - Plain text fallback renders formatted ASCII cards with direct links', () => {
      const text = template.renderEmailText(sampleExams, { recipientName: 'Priya' });
      assert.ok(text.includes('CIVIL SERVICES EXAMINATION 2026'));
      assert.ok(text.includes('COMBINED HIGHER SECONDARY LEVEL 2026'));
      assert.ok(text.includes('Organization: UPSC'));
      assert.ok(text.includes('Notification: https://upsc.gov.in/notice.pdf'));
      assert.ok(text.includes('Apply Online: https://upsconline.nic.in'));
    });

    it('T1.2.6 - HTML escaping protects against unescaped markup in titles', () => {
      const escaped = template.escapeHtml('SSC <CGL> & "MTS" \'2026\'');
      assert.equal(escaped, 'SSC &lt;CGL&gt; &amp; &quot;MTS&quot; &#039;2026&#039;');
    });
  });

  // =========================================================================
  // Feature 3: Deduplication Store (>=5 tests)
  // =========================================================================
  describe('Feature 3: Deduplication Store', () => {
    const DedupClass = getDedupStore();

    const examA = {
      id: 'UPSC_A',
      examName: 'UPSC Exam A',
      organization: 'UPSC',
      importantDates: { applicationEndDate: '2026-10-01' },
      officialNotificationUrl: 'https://upsc.gov.in/a.pdf',
      scrapedAt: new Date().toISOString()
    };

    const examB = {
      id: 'SSC_B',
      examName: 'SSC Exam B',
      organization: 'SSC',
      importantDates: { applicationEndDate: '2026-11-01' },
      officialNotificationUrl: 'https://ssc.gov.in/b.pdf',
      scrapedAt: new Date().toISOString()
    };

    it('T1.3.1 - Deterministic key generation creates consistent 16-char sha256 hash', () => {
      const store = new DedupClass(path.join(tempDir, 'dedup.json'));
      const key1 = store.generateKey(examA);
      const key2 = store.generateKey({ ...examA });
      assert.equal(typeof key1, 'string');
      assert.equal(key1.length, 16);
      assert.equal(key1, key2);
    });

    it('T1.3.2 - Filter identifies all exams as new when store is empty', () => {
      const store = new DedupClass(path.join(tempDir, 'dedup.json'));
      const filtered = store.filterNewExams([examA, examB]);
      assert.equal(filtered.length, 2);
    });

    it('T1.3.3 - Filter excludes exams that have already been marked as notified', () => {
      const store = new DedupClass(path.join(tempDir, 'dedup.json'));
      store.markAsNotified([examA]);

      const filtered = store.filterNewExams([examA, examB]);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, examB.id);
    });

    it('T1.3.4 - markAsNotified persists JSON data to disk with metadata', () => {
      const storeFile = path.join(tempDir, 'sub', 'nested', 'dedup.json');
      const store = new DedupClass(storeFile);
      store.markAsNotified([examA]);

      assert.ok(fs.existsSync(storeFile));
      const parsed = JSON.parse(fs.readFileSync(storeFile, 'utf-8'));
      const key = store.generateKey(examA);
      assert.ok(parsed[key]);
      assert.equal(parsed[key].title, examA.examName);
      assert.equal(parsed[key].organization, 'UPSC');
      assert.ok(parsed[key].notifiedAt);
    });

    it('T1.3.5 - Incremental notification retains existing keys and appends new ones', () => {
      const store = new DedupClass(path.join(tempDir, 'dedup.json'));
      store.markAsNotified([examA]);
      store.markAsNotified([examB]);

      const data = store.load();
      assert.equal(Object.keys(data).length, 2);
      assert.equal(store.filterNewExams([examA, examB]).length, 0);
    });

    it('T1.3.6 - Missing or corrupted store file defaults to empty store without throwing', () => {
      const storeFile = path.join(tempDir, 'corrupted.json');
      fs.writeFileSync(storeFile, '{{{ not json', 'utf-8');

      const store = new DedupClass(storeFile);
      assert.doesNotThrow(() => {
        const loaded = store.load();
        assert.deepEqual(loaded, {});
      });
    });
  });

  // =========================================================================
  // Feature 4: Standalone CLI Execution (>=5 tests)
  // =========================================================================
  describe('Feature 4: Standalone CLI Execution', () => {
    const cliOptionsSchema = {
      source: { type: 'string', short: 's', default: 'all' },
      email: { type: 'string', short: 'e' },
      'dry-run': { type: 'boolean', default: false },
      mock: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h', default: false }
    };

    it('T1.4.1 - Native parseArgs parses --dry-run, --mock, --force flags correctly', () => {
      const { values } = parseArgs({
        options: cliOptionsSchema,
        args: ['--dry-run', '--mock', '--force']
      });
      assert.equal(values['dry-run'], true);
      assert.equal(values.mock, true);
      assert.equal(values.force, true);
    });

    it('T1.4.2 - Default values applied when flags are omitted', () => {
      const { values } = parseArgs({
        options: cliOptionsSchema,
        args: []
      });
      assert.equal(values.source, 'all');
      assert.equal(values['dry-run'], false);
      assert.equal(values.mock, false);
      assert.equal(values.force, false);
      assert.equal(values.help, false);
    });

    it('T1.4.3 - Custom email recipient parsed via --email flag', () => {
      const { values } = parseArgs({
        options: cliOptionsSchema,
        args: ['--email=candidate@domain.com']
      });
      assert.equal(values.email, 'candidate@domain.com');
    });

    it('T1.4.4 - Source filtering parsed via --source=upsc', () => {
      const { values } = parseArgs({
        options: cliOptionsSchema,
        args: ['--source=upsc']
      });
      assert.equal(values.source, 'upsc');
    });

    it('T1.4.5 - Output destination path parsed via --output', () => {
      const { values } = parseArgs({
        options: cliOptionsSchema,
        args: ['--output=data/exams.json']
      });
      assert.equal(values.output, 'data/exams.json');
    });

    it('T1.4.6 - Short flags parsed properly (-s upsc -e test@mail.com)', () => {
      const { values } = parseArgs({
        options: cliOptionsSchema,
        args: ['-s', 'ssc', '-e', 'test@mail.com', '-h']
      });
      assert.equal(values.source, 'ssc');
      assert.equal(values.email, 'test@mail.com');
      assert.equal(values.help, true);
    });
  });

  // =========================================================================
  // Feature 5: Integration Pipeline (>=5 tests)
  // =========================================================================
  describe('Feature 5: Integration Pipeline', () => {
    const pipeline = getPipeline();
    const EmailClass = getEmailService();

    const mockExams = [
      {
        id: 'SSC_CHSL_2026',
        examName: 'Combined Higher Secondary Level 2026',
        organization: 'SSC',
        importantDates: { applicationEndDate: '2026-10-07' },
        officialNotificationUrl: 'https://ssc.gov.in/chsl.pdf',
        scrapedAt: new Date().toISOString()
      },
      {
        id: 'UPSC_GEO_2027',
        examName: 'Combined Geo-Scientist 2027',
        organization: 'UPSC',
        importantDates: { applicationEndDate: '2026-09-22' },
        officialNotificationUrl: 'https://upsc.gov.in/cgs.pdf',
        scrapedAt: new Date().toISOString()
      }
    ];

    it('T1.5.1 - Pipeline passes scraped items to deduplication and email sender', async () => {
      const storePath = path.join(tempDir, 'pipeline-dedup.json');
      const previewPath = path.join(tempDir, 'preview.html');

      const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
        mock: true,
        mockData: mockExams,
        storePath,
        dryRun: true,
        previewPath,
        email: 'aspirant@example.com'
      });

      assert.equal(summary.scrapedCount, 2);
      assert.equal(summary.newCount, 2);
      assert.equal(summary.notifiedCount, 2);
      assert.ok(summary.emailResult?.success);
      assert.ok(fs.existsSync(previewPath));
    });

    it('T1.5.2 - Pipeline skips notification when 0 new exams discovered', async () => {
      const storePath = path.join(tempDir, 'pipeline-dedup.json');
      const DedupClass = getDedupStore();
      const store = new DedupClass(storePath);
      store.markAsNotified(mockExams);

      const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
        mock: true,
        mockData: mockExams,
        storePath,
        dryRun: true
      });

      assert.equal(summary.scrapedCount, 2);
      assert.equal(summary.newCount, 0);
      assert.equal(summary.notifiedCount, 0);
      assert.equal(summary.skippedCount, 2);
    });

    it('T1.5.3 - Pipeline --force flag bypasses deduplication and notifies all exams', async () => {
      const storePath = path.join(tempDir, 'pipeline-dedup.json');
      const DedupClass = getDedupStore();
      const store = new DedupClass(storePath);
      store.markAsNotified(mockExams);

      const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
        mock: true,
        mockData: mockExams,
        storePath,
        force: true,
        dryRun: true
      });

      assert.equal(summary.newCount, 2);
      assert.equal(summary.notifiedCount, 2);
    });

    it('T1.5.4 - Pipeline updates deduplication store after successful live run', async () => {
      const storePath = path.join(tempDir, 'pipeline-dedup.json');

      const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
        mock: true,
        mockData: mockExams,
        storePath,
        dryRun: false // live simulation mode
      });

      assert.equal(summary.newCount, 2);
      assert.ok(fs.existsSync(storePath));

      const DedupClass = getDedupStore();
      const store = new DedupClass(storePath);
      assert.equal(store.filterNewExams(mockExams).length, 0);
    });

    it('T1.5.5 - EmailService sendTestNotification dispatches test alert successfully', async () => {
      const emailService = new EmailClass();
      const previewPath = path.join(tempDir, 'test-email.html');

      const res = await emailService.sendTestNotification({
        recipient: 'test@domain.com',
        dryRun: true,
        previewPath
      });

      assert.ok(res.success);
      assert.equal(res.examCount, 1);
      assert.ok(fs.existsSync(previewPath));
    });

    it('T1.5.6 - Pipeline execution returns valid timestamp in ISO format', async () => {
      const storePath = path.join(tempDir, 'pipeline-dedup.json');
      const summary = await (pipeline.runPipeline || pipeline.runReferencePipeline)({
        mock: true,
        mockData: [],
        storePath,
        dryRun: true
      });
      assert.ok(!isNaN(new Date(summary.timestamp).getTime()));
    });
  });
});
