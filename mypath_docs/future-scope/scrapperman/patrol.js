'use strict';
/**
 * patrol.js — Lightweight Scrape Health Check
 * Runs after every scrape. Simple sequential checks. No extra network calls.
 */

const healthRules = require('./health-rules');
const { getRegistry } = require('./scraper-registry');
const history = require('./history');

/**
 * @param {object} scrapeResult - { records: [], errors: [] }
 * @returns {HealthReport}
 */
function runPatrol(scrapeResult) {
  const records = Array.isArray(scrapeResult?.records) ? scrapeResult.records : [];
  const errors  = Array.isArray(scrapeResult?.errors)  ? scrapeResult.errors  : [];
  const issues  = [];

  // Check each source (upsc, ssc)
  for (const source of ['upsc', 'ssc']) {
    const reg = getRegistry(source);
    const sourceRecords = records.filter(r =>
      (r.organization || '').toLowerCase() === source ||
      (r.id || '').toUpperCase().startsWith(source.toUpperCase() + '_')
    );
    const sourceError = errors.find(e => (e.source || '').toLowerCase() === source);

    const ctx = {
      scrapedCount: sourceRecords.length,
      records: sourceRecords,
      networkError: !!sourceError,
      error: sourceError ? { message: sourceError.error } : null,
      source,
      registry: reg
    };

    for (const rule of healthRules) {
      // Skip PDF rules here — no live HTTP calls to save CPU
      if (rule.category === 'pdf') continue;
      try {
        if (rule.detect(ctx, source) || rule.detect(ctx, reg)) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity,
            source,
            name: rule.name,
            description: rule.description,
            suggestedFix: rule.autoFix
          });
        }
      } catch { /* a broken rule never crashes the pipeline */ }
    }
  }

  // Compare with last good run (just IDs, very cheap)
  const lastGood    = history.getLastGoodRun() || [];
  const prevIds     = lastGood.map(r => r.id);
  const currentIds  = records.map(r => r.id);
  const newExamIds  = currentIds.filter(id => !prevIds.includes(id));
  const missingIds  = prevIds.filter(id => !currentIds.includes(id));

  const hasCritical = issues.some(i => i.severity === 'CRITICAL');
  const overallStatus = hasCritical ? 'CRITICAL'
    : issues.length > 0            ? 'DEGRADED'
    :                                'HEALTHY';

  const report = {
    timestamp: new Date().toISOString(),
    overallStatus,
    scrapedCount: records.length,
    issues,
    comparison: {
      previousRunCount: lastGood.length || null,
      newExamIds,
      missingExamIds: missingIds
    }
  };

  history.saveHealthReport(report);
  if (overallStatus === 'HEALTHY') history.saveLastGoodRun(records);

  return report;
}

module.exports = { runPatrol };
