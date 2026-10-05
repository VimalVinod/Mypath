/**
 * health-rules.js — ScrapperMan Health Rules Engine
 *
 * Defines the 20 deterministic anomaly detection rules across 5 categories:
 * - Network Failures (3 rules)
 * - HTTP Status Code Anomalies (5 rules)
 * - Data Quality Issues (6 rules)
 * - PDF Link Verification (3 rules)
 * - Website Layout Changes (3 rules)
 *
 * Reference: SCRAPPERMAN_BUILD_SPEC.md §4.2
 */

'use strict';

/**
 * All 20 health rules definitions.
 */
const rules = [
  // ── Category 1: Network & Connectivity Failures ──────────────────────────────
  {
    id: 'NET_TIMEOUT',
    name: 'Request Timeout',
    category: 'network',
    severity: 'MEDIUM',
    autoFix: 'RETRY_WITH_LONGER_TIMEOUT',
    fixAction: 'RETRY_WITH_LONGER_TIMEOUT',
    maxAutoRetries: 3,
    description: 'The government server took too long to respond. Often happens during peak hours (10 AM - 2 PM IST).',
    detect: (context) => {
      try {
        if (!context) return false;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || err?.code || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return msg.includes('timeout') || msg.includes('etimedout') || msg.includes('aborterror') || msg.includes('err_request_timed_out');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'NET_CONNECTION_REFUSED',
    name: 'Connection Refused',
    category: 'network',
    severity: 'HIGH',
    autoFix: 'SWITCH_TO_FALLBACK',
    fixAction: 'SWITCH_TO_FALLBACK',
    description: 'The server actively refused the connection. The portal may be down for maintenance.',
    detect: (context) => {
      try {
        if (!context) return false;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || err?.code || (typeof err === 'string' ? err : ''))?.toUpperCase() || '';
        return msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('CONNECTION REFUSED') || msg.includes('CONNECTION RESET');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'NET_DNS_FAILURE',
    name: 'DNS Resolution Failed',
    category: 'network',
    severity: 'CRITICAL',
    autoFix: 'ALERT_ADMIN_IMMEDIATELY',
    fixAction: 'ALERT_ADMIN_IMMEDIATELY',
    description: 'Cannot resolve the domain name. Either the internet is down or the government changed their domain.',
    detect: (context) => {
      try {
        if (!context) return false;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || err?.code || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return msg.includes('enotfound') || msg.includes('getaddrinfo') || msg.includes('eai_again');
      } catch {
        return false;
      }
    }
  },

  // ── Category 2: HTTP Status Code Anomalies ──────────────────────────────────
  {
    id: 'HTTP_403_FORBIDDEN',
    name: 'Access Forbidden (Bot Blocked)',
    category: 'http',
    severity: 'HIGH',
    autoFix: 'ROTATE_USER_AGENT',
    fixAction: 'ROTATE_USER_AGENT',
    description: 'The government website detected our scraper as a bot and blocked it. Try rotating User-Agent headers.',
    detect: (context) => {
      try {
        if (!context) return false;
        const status = context.httpStatus ?? context.result?.httpStatus ?? context.status ?? context.response?.status;
        if (status !== undefined && status !== null && Number(status) === 403) return true;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return /\b403\b/.test(msg) && (msg.includes('http') || msg.includes('forbidden') || msg.includes('status'));
      } catch {
        return false;
      }
    }
  },
  {
    id: 'HTTP_404_NOT_FOUND',
    name: 'Page Not Found',
    category: 'http',
    severity: 'CRITICAL',
    autoFix: 'ALERT_ADMIN_IMMEDIATELY',
    fixAction: 'ALERT_ADMIN_IMMEDIATELY',
    description: 'The target URL no longer exists. The government likely restructured their website.',
    detect: (context) => {
      try {
        if (!context) return false;
        const status = context.httpStatus ?? context.result?.httpStatus ?? context.status ?? context.response?.status;
        if (status !== undefined && status !== null && Number(status) === 404) return true;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return /\b404\b/.test(msg) && (msg.includes('http') || msg.includes('not found') || msg.includes('status'));
      } catch {
        return false;
      }
    }
  },
  {
    id: 'HTTP_429_RATE_LIMITED',
    name: 'Rate Limited',
    category: 'http',
    severity: 'MEDIUM',
    autoFix: 'WAIT_AND_RETRY',
    fixAction: 'WAIT_AND_RETRY',
    retryDelayMs: 60000,
    description: 'We are sending too many requests. Wait 60 seconds and retry.',
    detect: (context) => {
      try {
        if (!context) return false;
        const status = context.httpStatus ?? context.result?.httpStatus ?? context.status ?? context.response?.status;
        if (status !== undefined && status !== null && Number(status) === 429) return true;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return /\b429\b/.test(msg) || msg.includes('rate limit') || msg.includes('too many requests');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'HTTP_500_SERVER_ERROR',
    name: 'Government Server Internal Error',
    category: 'http',
    severity: 'MEDIUM',
    autoFix: 'RETRY_WITH_BACKOFF',
    fixAction: 'RETRY_WITH_BACKOFF',
    description: 'The government server had an internal error. This is usually temporary.',
    detect: (context) => {
      try {
        if (!context) return false;
        const rawStatus = context.httpStatus ?? context.result?.httpStatus ?? context.status ?? context.response?.status;
        if (rawStatus !== undefined && rawStatus !== null) {
          const status = Number(rawStatus);
          if (status >= 500 && status < 600 && status !== 503) return true;
        }
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return /\b(500|502|504)\b/.test(msg) && (msg.includes('http') || msg.includes('server error') || msg.includes('bad gateway') || msg.includes('status'));
      } catch {
        return false;
      }
    }
  },
  {
    id: 'HTTP_503_MAINTENANCE',
    name: 'Server Under Maintenance',
    category: 'http',
    severity: 'MEDIUM',
    autoFix: 'SCHEDULE_RETRY_30MIN',
    fixAction: 'SCHEDULE_RETRY_30MIN',
    description: 'The government portal is under scheduled maintenance. Retry in 30 minutes.',
    detect: (context) => {
      try {
        if (!context) return false;
        const status = context.httpStatus ?? context.result?.httpStatus ?? context.status ?? context.response?.status;
        if (status !== undefined && status !== null && Number(status) === 503) return true;
        const err = context.error !== undefined ? context.error : context;
        const msg = (err?.message || (typeof err === 'string' ? err : ''))?.toLowerCase() || '';
        return (/\b503\b/.test(msg) && msg.includes('http')) || msg.includes('maintenance') || msg.includes('service unavailable');
      } catch {
        return false;
      }
    }
  },

  // ── Category 3: Data Quality Anomalies ──────────────────────────────────────
  {
    id: 'DATA_ZERO_RESULTS',
    name: 'Zero Results Scraped',
    category: 'data',
    severity: 'HIGH',
    autoFix: 'DIAGNOSE_WITH_GEMINI',
    fixAction: 'DIAGNOSE_WITH_GEMINI',
    description: 'The scraper successfully connected but found 0 exams. This is highly suspicious — the website layout likely changed.',
    detect: (context) => {
      try {
        if (!context) return false;
        if (context.networkError === true || context.result?.networkError === true) return false;
        if (context.error) return false;
        let count = null;
        if (typeof context.scrapedCount === 'number') {
          count = context.scrapedCount;
        } else if (Array.isArray(context.records)) {
          count = context.records.length;
        } else if (Array.isArray(context)) {
          count = context.length;
        } else if (typeof context.result?.scrapedCount === 'number') {
          count = context.result.scrapedCount;
        }
        return count === 0;
      } catch {
        return false;
      }
    }
  },
  {
    id: 'DATA_BELOW_MINIMUM',
    name: 'Suspiciously Few Results',
    category: 'data',
    severity: 'MEDIUM',
    autoFix: 'DIAGNOSE_WITH_GEMINI',
    fixAction: 'DIAGNOSE_WITH_GEMINI',
    description: 'The scraper returned fewer results than the historical minimum. Some exam listings may be missing.',
    detect: (context, registryArg) => {
      try {
        if (!context) return false;
        const reg = context.registry || registryArg;
        const min = reg?.primary?.expectedMinResults;
        if (typeof min !== 'number' || isNaN(min)) return false;
        let count = null;
        if (typeof context.scrapedCount === 'number') {
          count = context.scrapedCount;
        } else if (Array.isArray(context.records)) {
          count = context.records.length;
        } else if (typeof context.result?.scrapedCount === 'number') {
          count = context.result.scrapedCount;
        }
        if (count === null || isNaN(count)) return false;
        return count > 0 && count < min;
      } catch {
        return false;
      }
    }
  },
  {
    id: 'DATA_ABOVE_MAXIMUM',
    name: 'Suspiciously Many Results',
    category: 'data',
    severity: 'LOW',
    autoFix: 'LOG_WARNING',
    fixAction: 'LOG_WARNING',
    description: 'The scraper returned more results than expected. Could be duplicates or a change in how exams are listed.',
    detect: (context, registryArg) => {
      try {
        if (!context) return false;
        const reg = context.registry || registryArg;
        const max = reg?.primary?.expectedMaxResults;
        if (typeof max !== 'number' || isNaN(max)) return false;
        let count = null;
        if (typeof context.scrapedCount === 'number') {
          count = context.scrapedCount;
        } else if (Array.isArray(context.records)) {
          count = context.records.length;
        } else if (typeof context.result?.scrapedCount === 'number') {
          count = context.result.scrapedCount;
        }
        if (count === null || isNaN(count)) return false;
        return count > max;
      } catch {
        return false;
      }
    }
  },
  {
    id: 'DATA_ALL_SAME_DATE',
    name: 'All Exams Have Identical Dates',
    category: 'data',
    severity: 'MEDIUM',
    autoFix: 'LOG_WARNING',
    fixAction: 'LOG_WARNING',
    description: 'All scraped records have the exact same timestamp. The data may be cached or stale.',
    detect: (context) => {
      try {
        if (!context) return false;
        const records = Array.isArray(context.records) ? context.records : (Array.isArray(context) ? context : context.result?.records);
        if (!Array.isArray(records) || records.length <= 3) return false;
        const dates = records.map(r => r?.scrapedAt).filter(Boolean);
        if (dates.length !== records.length) return false;
        const uniqueDates = new Set(dates);
        return uniqueDates.size === 1;
      } catch {
        return false;
      }
    }
  },
  {
    id: 'DATA_MISSING_PDF_LINKS',
    name: 'Exam Records Without PDF Links',
    category: 'data',
    severity: 'MEDIUM',
    autoFix: 'LOG_WARNING',
    fixAction: 'LOG_WARNING',
    description: 'More than half the scraped exams are missing direct PDF notification links.',
    detect: (context) => {
      try {
        if (!context) return false;
        const records = Array.isArray(context.records) ? context.records : (Array.isArray(context) ? context : context.result?.records);
        if (!Array.isArray(records) || records.length === 0) return false;
        const missingCount = records.filter(r => {
          if (!r || typeof r !== 'object') return true;
          const url = r.officialNotificationUrl;
          if (!url || typeof url !== 'string' || !url.trim()) return true;

          // Spec §4.2 line 362: Identical notification and application URLs indicate lack of distinct PDF
          const appUrl = r.applicationUrl;
          if (appUrl && (url === appUrl || (typeof appUrl === 'string' && url.trim() === appUrl.trim()))) {
            return true;
          }

          return !url.toLowerCase().includes('.pdf');
        }).length;
        return missingCount > records.length * 0.5;
      } catch {
        return false;
      }
    }
  },
  {
    id: 'DATA_DUPLICATE_IDS',
    name: 'Duplicate Exam IDs Detected',
    category: 'data',
    severity: 'MEDIUM',
    autoFix: 'DEDUPLICATE_RECORDS',
    fixAction: 'DEDUPLICATE_RECORDS',
    description: 'Multiple exam records share the same ID. The scraper is producing duplicates.',
    detect: (context) => {
      try {
        if (!context) return false;
        const records = Array.isArray(context.records) ? context.records : (Array.isArray(context) ? context : context.result?.records);
        if (!Array.isArray(records) || records.length < 2) return false;
        const ids = records.map(r => r?.id).filter(id => id !== undefined && id !== null);
        if (ids.length < 2) return false;
        return new Set(ids).size < ids.length;
      } catch {
        return false;
      }
    }
  },

  // ── Category 4: PDF Link Verification Failures ──────────────────────────────
  {
    id: 'PDF_LINK_BROKEN',
    name: 'PDF Download Link Returns 404',
    category: 'pdf',
    severity: 'MEDIUM',
    autoFix: 'FLAG_BROKEN_LINK',
    fixAction: 'FLAG_BROKEN_LINK',
    description: 'A specific PDF notification link is broken (404). The government may have moved or renamed the file.',
    detect: (context) => {
      try {
        if (!context) return false;
        const status = context.httpStatus ?? context.status ?? context.linkCheck?.httpStatus ?? context.linkCheck?.status;
        if (status === undefined || status === null) return false;
        return Number(status) === 404;
      } catch {
        return false;
      }
    }
  },
  {
    id: 'PDF_LINK_NOT_PDF',
    name: 'PDF Link Does Not Return a PDF',
    category: 'pdf',
    severity: 'MEDIUM',
    autoFix: 'FLAG_WRONG_CONTENT',
    fixAction: 'FLAG_WRONG_CONTENT',
    description: 'The URL labeled as a PDF notification actually returns HTML or another format.',
    detect: (context) => {
      try {
        if (!context) return false;
        const ct = (context.contentType || context.linkCheck?.contentType || '')?.toLowerCase();
        if (!ct || typeof ct !== 'string') return false;
        return !ct.includes('pdf');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'PDF_LINK_EMPTY',
    name: 'PDF File Is Empty (0 bytes)',
    category: 'pdf',
    severity: 'HIGH',
    autoFix: 'FLAG_EMPTY_PDF',
    fixAction: 'FLAG_EMPTY_PDF',
    description: 'The PDF file exists but is 0 bytes. The government may have uploaded a placeholder.',
    detect: (context) => {
      try {
        if (!context) return false;
        const cl = context.contentLength ?? context.linkCheck?.contentLength ?? context.length;
        if (cl === undefined || cl === null) return false;
        return Number(cl) === 0;
      } catch {
        return false;
      }
    }
  },

  // ── Category 5: Website Layout Changes ──────────────────────────────────────
  {
    id: 'LAYOUT_NO_TABLE',
    name: 'Expected HTML Table Missing',
    category: 'layout',
    severity: 'HIGH',
    autoFix: 'DIAGNOSE_WITH_GEMINI',
    fixAction: 'DIAGNOSE_WITH_GEMINI',
    description: 'The UPSC page no longer contains an HTML table. They may have switched to a card/list layout.',
    detect: (context, sourceArg) => {
      try {
        if (!context) return false;
        const src = (typeof sourceArg === 'string' ? sourceArg : (context.source || ''))?.toLowerCase();
        if (src !== 'upsc') return false;
        const html = typeof context === 'string'
          ? context
          : (context.htmlContent || context.html || context.rawContent || '');
        if (!html || typeof html !== 'string') return false;
        return !html.toLowerCase().includes('<table');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'LAYOUT_NO_JSON_BODY',
    name: 'API Endpoint No Longer Returns JSON',
    category: 'layout',
    severity: 'CRITICAL',
    autoFix: 'ALERT_ADMIN_IMMEDIATELY',
    fixAction: 'ALERT_ADMIN_IMMEDIATELY',
    description: 'The SSC API endpoint is no longer returning JSON. They may have changed or deprecated the API.',
    detect: (context, sourceArg) => {
      try {
        if (!context) return false;
        const src = (typeof sourceArg === 'string' ? sourceArg : (context.source || ''))?.toLowerCase();
        if (src !== 'ssc') return false;
        const ct = (context.contentType || context.result?.contentType || context.response?.contentType || (typeof context === 'string' ? context : ''))?.toLowerCase();
        if (!ct || typeof ct !== 'string') return false;
        return !ct.includes('json');
      } catch {
        return false;
      }
    }
  },
  {
    id: 'LAYOUT_REDIRECT',
    name: 'URL Redirecting to Different Page',
    category: 'layout',
    severity: 'HIGH',
    autoFix: 'DIAGNOSE_WITH_GEMINI',
    fixAction: 'DIAGNOSE_WITH_GEMINI',
    description: 'The target URL is redirecting to a different page. The government may have moved the content.',
    detect: (context) => {
      try {
        if (!context) return false;
        const red = context.redirected ?? context.result?.redirected ?? context.response?.redirected;
        return red === true;
      } catch {
        return false;
      }
    }
  }
];

// O(1) Lookup Map by ID
const rulesById = Object.freeze(
  rules.reduce((acc, rule) => {
    acc[rule.id] = rule;
    return acc;
  }, {})
);

// Grouped Rules by Category
const rulesByCategory = Object.freeze(
  rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {})
);

// Attach helper methods & aliases to the exported array
rules.rules = rules;
rules.healthRules = rules;
rules.rulesById = rulesById;
rules.rulesByCategory = rulesByCategory;

rules.getRule = (id) => rulesById[id] || null;
rules.getRulesByCategory = (category) => rulesByCategory[category?.toLowerCase()] || [];
rules.categories = Object.freeze(['network', 'http', 'data', 'pdf', 'layout']);

module.exports = rules;
