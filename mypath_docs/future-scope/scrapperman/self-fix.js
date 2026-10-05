'use strict';
/**
 * self-fix.js — The Technician
 * Attempts automated fixes for minor scraper problems.
 */

/**
 * @param {Object} issue - The triggered issue from health-rules.js
 * @param {string} source - 'upsc' | 'ssc'
 * @param {Object} options - { scraperManager, registry }
 * @returns {Promise<FixResult>}
 */
async function attemptAutoFix(issue, source, options = {}) {
  const { scraperManager } = options;
  const fixType = issue.suggestedFix;

  const result = {
    attempted: false,
    success: false,
    fixType,
    records: [],
    message: ''
  };

  if (!scraperManager) {
    result.message = 'ScraperManager not provided';
    return result;
  }

  // DIAGNOSE_WITH_GEMINI and ALERT_ADMIN_IMMEDIATELY are not handled by the Technician
  if (fixType === 'DIAGNOSE_WITH_GEMINI' || fixType === 'ALERT_ADMIN_IMMEDIATELY' || fixType === 'LOG_WARNING') {
    result.message = 'Fix type delegated to other modules';
    return result;
  }

  result.attempted = true;

  try {
    switch (fixType) {
      case 'RETRY_WITH_LONGER_TIMEOUT':
      case 'RETRY_WITH_BACKOFF': {
        result.message = 'Retrying with 30s timeout and relaxed settings';
        // Mocking a retry on the specific source
        const retryResult = await scraperManager.scrapeAllDetailed({ source, timeout: 30000 });
        const sourceErrors = retryResult.errors.filter(e => e.source === source);
        if (sourceErrors.length === 0) {
          result.success = true;
          result.records = retryResult.records.filter(r => r.organization.toLowerCase() === source || r.id.toLowerCase().startsWith(source));
        } else {
          result.message = `Retry failed: ${sourceErrors[0].error}`;
        }
        break;
      }
      case 'SWITCH_TO_FALLBACK': {
        result.message = 'Retrying with fallback endpoint (RSS/API)';
        const retryResult = await scraperManager.scrapeAllDetailed({ source, useFallback: true });
        const sourceErrors = retryResult.errors.filter(e => e.source === source);
        if (sourceErrors.length === 0) {
          result.success = true;
          result.records = retryResult.records.filter(r => r.organization.toLowerCase() === source || r.id.toLowerCase().startsWith(source));
        } else {
          result.message = `Fallback failed: ${sourceErrors[0].error}`;
        }
        break;
      }
      case 'ROTATE_USER_AGENT': {
        result.message = 'Retrying with rotated User-Agent header';
        const retryResult = await scraperManager.scrapeAllDetailed({ source, rotateUserAgent: true });
        const sourceErrors = retryResult.errors.filter(e => e.source === source);
        if (sourceErrors.length === 0) {
          result.success = true;
          result.records = retryResult.records.filter(r => r.organization.toLowerCase() === source || r.id.toLowerCase().startsWith(source));
        } else {
          result.message = `User-Agent rotation failed: ${sourceErrors[0].error}`;
        }
        break;
      }
      default:
        result.attempted = false;
        result.message = `Unknown fix type: ${fixType}`;
    }
  } catch (err) {
    result.success = false;
    result.message = `Auto-fix threw error: ${err.message}`;
  }

  return result;
}

module.exports = { attemptAutoFix };
