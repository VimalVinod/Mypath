/**
 * scraper-registry.js — Registry of All Scraper Endpoints
 *
 * Defines the authoritative metadata, multi-tier endpoints, expected result thresholds,
 * content tokens, and CSS/JSON selector patterns for government portal scrapers monitored
 * by ScrapperMan.
 *
 * Reference: SCRAPPERMAN_BUILD_SPEC.md §4.1
 */

'use strict';

/**
 * Registry dataset for monitored scrapers.
 */
const SCRAPER_REGISTRY = {
  upsc: {
    id: 'upsc',
    name: 'Union Public Service Commission',
    baseUrl: 'https://www.upsc.gov.in',
    primary: {
      url: 'https://www.upsc.gov.in/examinations/active-exams',
      type: 'html',
      parser: 'cheerio',
      expectedMinResults: 3,         // UPSC always has at least 3 active exams
      expectedMaxResults: 25,        // Expected upper bound based on calendar
      healthyResponseCodes: [200],
      healthyContentContains: ['examination', 'active'],
      maxResponseTimeMs: 15000       // 15 seconds SLA
    },
    secondary: {
      url: 'https://www.upsc.gov.in/whats-new',
      type: 'html',
      parser: 'cheerio',
      expectedMinResults: 5,
      healthyContentContains: ['notice', 'advt', 'posts'],
      maxResponseTimeMs: 15000
    },
    fallback: {
      url: 'https://www.upsc.gov.in/rss.php',
      type: 'xml',
      parser: 'cheerio-xml'
    },
    pdfDomain: 'www.upsc.gov.in',
    applicationPortal: 'https://upsconline.nic.in',
    selectors: {
      row: '.view-content .views-row',
      link: '.views-field-field-exam-name a, a[href*="/examinations/"]',
      fallbackLink: 'a[href*="/examinations/"]',
      detailTable: 'table tr, .views-table tr',
      detailTitle: 'caption, table caption, h1.page-title, #page-title, .page-header',
      pdfLink: 'a[href$=".pdf"]'
    }
  },
  ssc: {
    id: 'ssc',
    name: 'Staff Selection Commission',
    baseUrl: 'https://ssc.gov.in',
    primary: {
      url: 'https://ssc.gov.in/api/admin/5.1/liveExams',
      type: 'json-api',
      parser: 'json',
      expectedMinResults: 1,         // SSC typically has 1-5 concurrent open windows
      expectedMaxResults: 15,        // Total major exams conducted per calendar year
      healthyResponseCodes: [200],
      healthyContentType: 'application/json',
      maxResponseTimeMs: 10000       // 10 seconds SLA
    },
    secondary: {
      url: 'https://ssc.gov.in/home/notice-board',
      type: 'html',
      parser: 'cheerio',
      expectedMinResults: 5,
      healthyContentContains: ['notice', 'board', 'examination'],
      maxResponseTimeMs: 15000
    },
    fallback: {
      url: 'https://ssc.gov.in/api/general-website/portal/lastUpdates',
      type: 'json-api',
      parser: 'json'
    },
    pdfDomain: 'ssc.gov.in',
    applicationPortal: 'https://ssc.gov.in/login',
    selectors: {
      dataPath: 'data',
      examCode: 'examCode',
      examName: 'examName',
      examDescription: 'examDescription',
      applicationStartDate: 'applicationStartDate',
      applicationEndDate: 'applicationEndDate',
      examDate: 'examDate',
      lastDateForFee: 'lastDateForFee',
      attachmentUrl: 'attachmentUrl',
      notificationUrl: 'notificationUrl',
      navigationUrl: 'navigationUrl',
      noticeBoardRow: 'table tr, .notice-item, .views-row'
    }
  }
};

/**
 * Deeply freeze an object to prevent runtime tampering.
 * @param {object} obj
 * @returns {object}
 */
function deepFreeze(obj) {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        deepFreeze(obj[key]);
      }
    }
  }
  return obj;
}

// Freeze registry data to ensure integrity across watchdog runs
deepFreeze(SCRAPER_REGISTRY);

/**
 * Safely retrieve the configuration for a specific scraper source.
 * Case-insensitive (e.g. 'upsc', 'UPSC', 'ssc', 'SSC').
 *
 * @param {string} source - Portal identifier ('upsc' | 'ssc')
 * @returns {object|null} Registry configuration or null if not found
 */
function getRegistry(source) {
  if (!source || typeof source !== 'string') return null;
  const key = source.trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SCRAPER_REGISTRY, key)) return null;
  return SCRAPER_REGISTRY[key] || null;
}

/**
 * Retrieve list of all registered source keys.
 *
 * @returns {string[]} Array of source IDs, e.g. ['upsc', 'ssc']
 */
function getAllSources() {
  return Object.keys(SCRAPER_REGISTRY);
}

/**
 * Validate whether a given source string is a recognized scraper endpoint.
 *
 * @param {string} source - Portal identifier
 * @returns {boolean} True if source exists in registry
 */
function isValidSource(source) {
  if (!source || typeof source !== 'string') return false;
  return Object.prototype.hasOwnProperty.call(SCRAPER_REGISTRY, source.trim().toLowerCase());
}

/**
 * Get endpoint URL for a given source and tier.
 *
 * @param {string} source - 'upsc' | 'ssc'
 * @param {'primary'|'secondary'|'fallback'} [tier='primary'] - Endpoint tier
 * @returns {string|null} Endpoint URL or null
 */
function getEndpointUrl(source, tier = 'primary') {
  const config = getRegistry(source);
  if (!config) return null;
  const tierConfig = config[tier];
  return tierConfig?.url || null;
}

/**
 * Get human-friendly display name for a source.
 *
 * @param {string} source - 'upsc' | 'ssc'
 * @returns {string} Human-readable agency name
 */
function getSourceDisplayName(source) {
  const config = getRegistry(source);
  return config?.name || (typeof source === 'string' ? source.toUpperCase() : 'Unknown');
}

/**
 * Retrieve the entire registry dictionary.
 *
 * @returns {object} Frozen SCRAPER_REGISTRY map
 */
function getAllRegistries() {
  return SCRAPER_REGISTRY;
}

// ── Export Construction ──────────────────────────────────────────────────────────
// Primary exports matching SCRAPPERMAN_BUILD_SPEC.md §4.1: { upsc: {...}, ssc: {...} }
const exportsObject = {
  upsc: SCRAPER_REGISTRY.upsc,
  ssc: SCRAPER_REGISTRY.ssc
};

// Attach helper functions and SCRAPER_REGISTRY as non-enumerable properties.
// This guarantees Object.keys(module.exports) returns ONLY ['upsc', 'ssc'],
// while allowing named destructuring: const { getRegistry, getAllSources } = require('./scraper-registry');
Object.defineProperties(exportsObject, {
  SCRAPER_REGISTRY: { value: SCRAPER_REGISTRY, enumerable: false, writable: false },
  getRegistry: { value: getRegistry, enumerable: false, writable: false },
  getAllSources: { value: getAllSources, enumerable: false, writable: false },
  isValidSource: { value: isValidSource, enumerable: false, writable: false },
  getEndpointUrl: { value: getEndpointUrl, enumerable: false, writable: false },
  getSourceDisplayName: { value: getSourceDisplayName, enumerable: false, writable: false },
  getAllRegistries: { value: getAllRegistries, enumerable: false, writable: false }
});

// Freeze the export wrapper to guarantee complete immutability of module.exports
Object.freeze(exportsObject);

module.exports = exportsObject;
