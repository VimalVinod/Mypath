#!/usr/bin/env node
/**
 * src/scripts/test-email.js
 * 
 * Standalone verification CLI script for Resend email notifications.
 * Dispatches a realistic mock government exam alert (Civil Services Examination 2026).
 * 
 * Usage:
 *   node src/scripts/test-email.js --dry-run
 *   node src/scripts/test-email.js --email=aspirant@example.com
 *   npm run test:notify
 */

const { parseArgs } = require('node:util');
require('dotenv').config();
const EmailService = require('../services/email/email-service');

const cliOptions = {
  email: { type: 'string', short: 'e' },
  'dry-run': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

function printHelp() {
  console.log(`
ExamGo - Resend Email Notification Test CLI

Usage:
  node src/scripts/test-email.js [options]
  npm run test:notify [-- options]

Options:
  -e, --email <address>   Target recipient email address (defaults to NOTIFICATION_RECIPIENT_EMAIL)
  --dry-run               Render HTML preview to output/email-preview.html without calling Resend API
  -h, --help              Display this help message

Examples:
  node src/scripts/test-email.js --dry-run
  node src/scripts/test-email.js --email=user@example.com
  npm run test:notify -- --dry-run
`);
}

async function main(args = process.argv.slice(2)) {
  let values;
  try {
    const parsed = parseArgs({ args, options: cliOptions, allowPositionals: true });
    values = parsed.values;
  } catch (err) {
    console.error(`[CLI Error] ${err.message}`);
    printHelp();
    process.exit(1);
  }

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const isDryRun = Boolean(values['dry-run']);
  const recipient = values.email || process.env.NOTIFICATION_RECIPIENT_EMAIL;

  if (!recipient && !isDryRun) {
    console.error('[Error] Target recipient email is required for live delivery.');
    console.error('Provide it via --email=your@email.com or define NOTIFICATION_RECIPIENT_EMAIL in .env');
    console.error('Alternatively, use --dry-run to generate a local HTML preview.');
    process.exit(1);
  }

  const targetRecipient = recipient || 'preview@example.com';
  console.log(`[Test Email] Initiating test exam alert to: ${targetRecipient} (mode: ${isDryRun ? 'DRY RUN' : 'LIVE SEND'})`);

  try {
    const emailService = new EmailService();
    const result = await emailService.sendTestNotification({
      recipient: targetRecipient,
      dryRun: isDryRun
    });

    if (result.success) {
      if (result.dryRun) {
        console.log('✅ [Test Email] SUCCESS: Email preview rendered successfully!');
        console.log(`   Subject:      ${result.subject}`);
        console.log(`   Recipient:    ${result.recipient}`);
        console.log(`   Exams:        ${result.examCount}`);
        console.log(`   Preview HTML: ${result.previewPath}`);
      } else {
        console.log('✅ [Test Email] SUCCESS: Email dispatched via Resend API!');
        console.log(`   Message ID:   ${result.messageId}`);
        console.log(`   Recipient:    ${result.recipient}`);
        console.log(`   Exams:        ${result.examCount}`);
      }
      return result;
    } else {
      console.error('❌ [Test Email] FAILED to send email notification:');
      console.error(`   Error Code:    ${result.error?.code || 'UNKNOWN_ERROR'}`);
      console.error(`   Error Message: ${result.error?.message || JSON.stringify(result.error)}`);
      if (result.error?.statusCode) {
        console.error(`   Status Code:   ${result.error.statusCode}`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ [Test Email] ERROR during execution:');
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

// When invoked under Node's test runner (`node --test`), register as a test suite
const isTestRunner = process.execArgv.some(arg => arg === '--test' || arg.startsWith('--test')) ||
                     Boolean(process.env.NODE_TEST_CONTEXT);

if (isTestRunner) {
  const { test } = require('node:test');
  const assert = require('node:assert/strict');

  test('test-email CLI script execution (dry-run mode)', async () => {
    const res = await main(['--dry-run']);
    assert.ok(res.success);
    assert.equal(res.dryRun, true);
    assert.equal(res.examCount, 1);
    assert.ok(res.previewPath);
  });
} else if (require.main === module) {
  main();
}

module.exports = { main, cliOptions };
