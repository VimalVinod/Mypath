'use strict';
/**
 * index.js — ScrapperMan Main Orchestrator
 * Ties together Patrol, Diagnose, Self-Fix, and Report modules.
 */

const { runPatrol } = require('./patrol');
const { diagnoseFailure } = require('./diagnose');
const { attemptAutoFix } = require('./self-fix');
const { sendAdminReport } = require('./report');
const { getRegistry } = require('./scraper-registry');

/**
 * Main orchestrator for ScrapperMan.
 * @param {Object} scrapeResult - Output from ScraperManager.scrapeAllDetailed()
 * @param {Object} options 
 * @returns {Promise<Object>} The finalized scrape records and watchdog status
 */
async function runScrapperMan(scrapeResult, options = {}) {
  const {
    enableDiagnosis = true,
    enableAutoFix = true,
    enableAdminAlerts = true,
    scraperManager = null
  } = options;

  console.log('\n🛡️  ScrapperMan Watchdog initiated...');

  // 1. Run Patrol
  let healthReport = runPatrol(scrapeResult);
  console.log(`🛡️  Patrol Status: [${healthReport.overallStatus}] - ${healthReport.issues.length} issues found.`);

  let finalRecords = Array.isArray(scrapeResult?.records) ? [...scrapeResult.records] : [];
  let diagnosticReport = null;
  let fixAttempted = false;

  // 2. Iterate through issues
  for (const issue of healthReport.issues) {
    console.log(`   ⚠️  Issue: ${issue.name} (${issue.source}) -> Suggests: ${issue.suggestedFix}`);

    if (issue.suggestedFix === 'DIAGNOSE_WITH_GEMINI' && enableDiagnosis) {
      console.log(`   🧠  Doctor (Gemini) is diagnosing ${issue.source}...`);
      const reg = getRegistry(issue.source);
      // For a real diagnostic, we'd fetch the broken raw HTML here.
      // Mocking the HTML fetch for the scope of this implementation.
      const rawHtml = '<html><body>Mock broken government portal HTML</body></html>';
      
      diagnosticReport = await diagnoseFailure(issue.source, issue, { registry: reg, htmlContent: rawHtml });
      if (diagnosticReport.success) {
        console.log(`   💡  Diagnosis complete! Root Cause: ${diagnosticReport.rootCause}`);
      } else {
        console.log(`   ❌  Diagnosis failed: ${diagnosticReport.error}`);
      }
    } 
    else if (issue.suggestedFix !== 'ALERT_ADMIN_IMMEDIATELY' && issue.suggestedFix !== 'LOG_WARNING' && enableAutoFix) {
      console.log(`   🔧  Technician is attempting auto-fix: ${issue.suggestedFix}...`);
      fixAttempted = true;
      const fixResult = await attemptAutoFix(issue, issue.source, { scraperManager });
      if (fixResult.success) {
        console.log(`   ✅  Auto-fix SUCCESS. Recovered ${fixResult.records.length} records.`);
        // Merge recovered records
        for (const rec of fixResult.records) {
          if (!finalRecords.find(r => r.id === rec.id)) {
            finalRecords.push(rec);
          }
        }
      } else {
        console.log(`   ❌  Auto-fix FAILED: ${fixResult.message}`);
        // If fix fails, escalate to CRITICAL
        healthReport.overallStatus = 'CRITICAL';
      }
    }
  }

  // If fixes were applied and succeeded, re-run patrol to confirm healthy
  if (fixAttempted && healthReport.overallStatus !== 'CRITICAL') {
    healthReport = runPatrol({ records: finalRecords, errors: [] });
    console.log(`🛡️  Post-Fix Patrol Status: [${healthReport.overallStatus}]`);
  }

  // 3. Determine if admin alert is needed
  const needsAlert = healthReport.overallStatus === 'CRITICAL' || 
                     healthReport.issues.some(i => i.suggestedFix === 'ALERT_ADMIN_IMMEDIATELY');

  if (needsAlert && enableAdminAlerts) {
    console.log(`   📬  Mailman is sending SOS alert to admin...`);
    const mailResult = await sendAdminReport(healthReport, diagnosticReport, { dryRun: false });
    if (mailResult.sent) {
      console.log(`   ✅  Alert sent successfully (ID: ${mailResult.messageId})`);
    } else {
      console.log(`   ❌  Failed to send alert: ${mailResult.error}`);
    }
  }

  console.log(`🛡️  ScrapperMan completed. Final valid records: ${finalRecords.length}\n`);

  return {
    status: healthReport.overallStatus,
    records: finalRecords,
    healthReport,
    diagnosticReport
  };
}

module.exports = {
  runScrapperMan,
  runPatrol: require('./patrol').runPatrol,
  diagnoseFailure,
  attemptAutoFix,
  sendAdminReport
};
