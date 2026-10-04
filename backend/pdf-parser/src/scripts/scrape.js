#!/usr/bin/env node
/**
 * src/scripts/scrape.js
 * 
 * Standalone CLI Runner for ExamGo / MyPath backend.
 * Provides the `npm run scrape` entry point for manual triggering,
 * local testing, and automated cron task scheduling.
 * 
 * Supports source filtering, dry-run HTML previewing, recipient overriding,
 * deduplication bypassing, and JSON file exporting.
 */

const { parseArgs } = require('node:util');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { runPipeline } = require('./pipeline');

const cliOptionsSchema = {
  source: { type: 'string', short: 's', default: 'all' },
  notify: { type: 'boolean', short: 'n', default: false },
  email: { type: 'string', short: 'e' },
  'dry-run': { type: 'boolean', default: false },
  mock: { type: 'boolean', default: false },
  force: { type: 'boolean', short: 'f', default: false },
  output: { type: 'string', short: 'o' },
  help: { type: 'boolean', short: 'h', default: false }
};

/**
 * Displays CLI usage and available flags.
 */
function printHelp() {
  console.log(`
ExamGo Scraper CLI Runner
=========================
Usage:
  node src/scripts/scrape.js [options]
  npm run scrape [-- [options]]

Options:
  -s, --source <source>    Target portal source ('all', 'upsc', 'ssc') [default: 'all']
  -n, --notify             Send email notifications for new exams via Resend
  -e, --email <address>    Recipient email address override
      --dry-run            Preview mode: prints JSON to stdout and saves preview without calling Resend API
  -f, --force              Bypass deduplication store and process all discovered exams
  -o, --output <path>      Save scraped exam records to a JSON file
      --mock               Use mock exam fixtures instead of calling live portals
  -h, --help               Display this help message
`);
}

/**
 * Parses raw CLI arguments using Node's native util.parseArgs.
 * 
 * @param {string[]} [rawArgs=process.argv.slice(2)]
 * @returns {{ values: object, positionals: string[] }}
 */
function parseCliArgs(rawArgs = process.argv.slice(2)) {
  return parseArgs({
    options: cliOptionsSchema,
    args: rawArgs,
    allowPositionals: true
  });
}

/**
 * Main CLI execution entry point.
 * 
 * @param {string[]} [rawArgs=process.argv.slice(2)]
 * @returns {Promise<object>} Pipeline summary or exit status
 */
async function main(rawArgs = process.argv.slice(2)) {
  const { values } = parseCliArgs(rawArgs);

  if (values.help) {
    printHelp();
    return { exitCode: 0, help: true };
  }

  const isDryRun = Boolean(values['dry-run']);
  const notifyFlag = Boolean(values.notify);
  const shouldNotify = notifyFlag || isDryRun;
  const recipient = values.email || process.env.NOTIFICATION_RECIPIENT_EMAIL;

  // Informative notice for live notification runs without API key
  if (notifyFlag && !isDryRun && !process.env.RESEND_API_KEY && !values.mock) {
    console.warn('\n[CLI Warning] RESEND_API_KEY is not configured in environment or .env.');
    console.warn('Set RESEND_API_KEY or use --dry-run to preview emails locally.\n');
  }

  const summary = await runPipeline({
    source: values.source,
    notify: shouldNotify,
    dryRun: isDryRun,
    force: values.force,
    mock: values.mock,
    email: recipient,
    output: values.output
  });

  // In dry-run or scrape-only mode, output structured JSON to stdout for pipes and inspections
  if (isDryRun || !notifyFlag) {
    console.log(JSON.stringify(summary.exams || [], null, 2));
  }

  console.log('\n--- ExamGo Scraping Summary ---');
  console.log(`Source:         ${values.source}`);
  console.log(`Mode:           ${isDryRun ? 'DRY-RUN (Preview)' : notifyFlag ? 'LIVE (Notify)' : 'SCRAPE-ONLY'}`);
  console.log(`Total Scraped:  ${summary.scrapedCount}`);
  console.log(`New Discovered: ${summary.newCount}`);
  console.log(`Skipped (Dedup):${summary.skippedCount}`);
  console.log(`Notified:       ${summary.notifiedCount}`);

  if (summary.emailResult?.previewPath) {
    console.log(`HTML Preview:   ${summary.emailResult.previewPath}`);
  } else if (summary.emailResult?.messageId) {
    console.log(`Email Sent:     Message ID: ${summary.emailResult.messageId} to ${summary.emailResult.recipient}`);
  } else if (summary.emailResult?.error) {
    console.error(`Email Error:    ${summary.emailResult.error.message || summary.emailResult.error}`);
  }

  if (values.output) {
    console.log(`Output Saved:   ${path.resolve(values.output)}`);
  }

  return summary;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[CLI Fatal Error]', err.message || err);
    process.exit(1);
  });
}

module.exports = {
  main,
  parseCliArgs,
  cliOptionsSchema,
  printHelp
};
