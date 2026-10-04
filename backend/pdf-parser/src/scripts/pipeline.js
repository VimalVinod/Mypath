/**
 * src/scripts/pipeline.js
 * 
 * Pipeline Orchestrator for ExamGo / MyPath backend.
 * Integrates ScraperManager -> DedupStore -> EmailService.
 * Coordinates multi-portal scraping, unnotified exam filtering,
 * email alert dispatching, and persistent notification tracking.
 */

const fs = require('fs');
const path = require('path');
const { ScraperManager } = require('../scrapers');
const DedupStore = require('../services/storage/dedup-store');
const EmailService = require('../services/email/email-service');

const DEFAULT_MOCK_EXAMS = [
  {
    id: 'SSC_CHSL_2026',
    examName: 'Combined Higher Secondary Level (10+2) Examination 2026',
    organization: 'SSC',
    importantDates: {
      applicationStartDate: '2026-09-07',
      applicationEndDate: '2026-10-07T17:30:00.000Z'
    },
    officialNotificationUrl: 'https://ssc.gov.in/api/attachment/chsl2026.pdf',
    applicationUrl: 'https://ssc.gov.in/ApplicationForm/chslform',
    scrapedAt: new Date().toISOString()
  },
  {
    id: 'UPSC_geo-scientist-2027',
    examName: 'Combined Geo-Scientist (Preliminary) Examination, 2027',
    organization: 'UPSC',
    importantDates: {
      notificationDate: '02/09/2026',
      applicationEndDate: '22/09/2026 - 6:00pm',
      examDate: '10/01/2027'
    },
    officialNotificationUrl: 'https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf',
    applicationUrl: 'https://upsconline.nic.in',
    scrapedAt: new Date().toISOString()
  }
];

/**
 * Runs the end-to-end scraping, deduplication, and notification pipeline.
 * 
 * @param {object} [options={}]
 * @param {string} [options.source='all'] - Portal source filter ('all', 'upsc', 'ssc')
 * @param {boolean} [options.notify] - Whether to send/preview notification (default: true)
 * @param {string} [options.email] - Recipient email override
 * @param {boolean} [options.dryRun=false] - Preview mode without calling Resend API
 * @param {boolean} [options.force=false] - Bypass dedup store and process all exams
 * @param {boolean} [options.mock=false] - Use mock data instead of live portal scrapers
 * @param {Array<object>} [options.mockData] - Custom mock data array
 * @param {Array<object>} [options.exams] - Pre-scraped exams to pipe directly
 * @param {string} [options.output] - Filepath to write scraped JSON output
 * @param {string} [options.previewPath] - Filepath to save dry-run email preview HTML
 * @param {string} [options.storePath] - Custom dedup store JSON path
 * @param {string} [options.apiKey] - Custom Resend API key
 * @param {DedupStore} [options.dedupStore] - Injected DedupStore instance
 * @param {EmailService} [options.emailService] - Injected EmailService instance
 * @param {ScraperManager} [options.scraperManager] - Injected ScraperManager instance
 * @returns {Promise<object>} Pipeline execution summary
 */
async function runPipeline(options = {}) {
  const timestamp = new Date().toISOString();

  // Step 1: Scrape or obtain exam records
  let exams = [];
  if (options.exams && Array.isArray(options.exams)) {
    exams = options.exams;
  } else if (options.mock) {
    exams = options.mockData && Array.isArray(options.mockData) ? options.mockData : DEFAULT_MOCK_EXAMS;
  } else if (options.mockData && Array.isArray(options.mockData)) {
    exams = options.mockData;
  } else {
    const scraperManager = options.scraperManager || new ScraperManager();
    const source = options.source || 'all';
    exams = await scraperManager.scrapeAll({ source, scraperOptions: options.scraperOptions });
  }

  // Optional: write scraped exams to file if requested
  if (options.output && Array.isArray(exams)) {
    const outPath = path.resolve(options.output);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(exams, null, 2), 'utf-8');
  }

  // Step 2: Deduplication filtering
  const dedupStore = options.dedupStore || new DedupStore(options.storePath);
  const newExams = options.force ? exams : dedupStore.filterNewExams(exams);

  // Step 3: Notification delivery / preview
  const shouldNotify = options.notify !== false;
  let emailResult = null;

  if (shouldNotify && newExams.length > 0) {
    const emailService = options.emailService || new EmailService({
      apiKey: options.apiKey || process.env.RESEND_API_KEY || (options.mock ? 're_mock_test_key' : undefined)
    });

    // In mock mode without a real API key, simulate Resend client
    if (options.mock && (!process.env.RESEND_API_KEY || emailService.apiKey === 're_mock_test_key')) {
      emailService.resend = {
        emails: {
          send: async () => ({
            data: { id: `mock_msg_${Date.now()}` },
            error: null
          })
        }
      };
    }

    const isDryRun = Boolean(options.dryRun);
    const recipient = options.email || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'aspirant@example.com';

    emailResult = await emailService.sendExamNotification(newExams, {
      recipient,
      dryRun: isDryRun,
      previewPath: options.previewPath
    });

    // Mark notified in store only when live send succeeds (not in dryRun mode)
    if (!isDryRun && emailResult?.success) {
      dedupStore.markAsNotified(newExams);
    }
  }

  const notifiedCount = (newExams.length > 0 && emailResult?.success) ? newExams.length : 0;
  const skippedCount = exams.length - newExams.length;

  return {
    scrapedCount: exams.length,
    newCount: newExams.length,
    notifiedCount,
    skippedCount,
    emailResult,
    timestamp,
    exams,
    newExams
  };
}

module.exports = {
  runPipeline
};
