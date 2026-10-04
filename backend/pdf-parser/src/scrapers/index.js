/**
 * ScraperManager
 * Master aggregator for all government portal scrapers.
 * Manages scraper instances, runs crawls with error isolation,
 * and normalizes aggregated exam records.
 */

const BaseScraper = require('./base-scraper');
const UpscScraper = require('./upsc-scraper');
const SscScraper = require('./ssc-scraper');

class ScraperManager {
  /**
   * @param {object} [options={}] - Global scraper manager options
   */
  constructor(options = {}) {
    this.options = options;
    this.scrapers = new Map();

    // Register built-in portal scrapers
    this.registerScraper('upsc', new UpscScraper(options.upsc));
    this.registerScraper('ssc', new SscScraper(options.ssc));
  }

  /**
   * Register a scraper instance.
   * @param {string} key - Unique key (e.g. 'upsc', 'ssc')
   * @param {BaseScraper} scraperInstance
   */
  registerScraper(key, scraperInstance) {
    if (!(scraperInstance instanceof BaseScraper)) {
      throw new Error(`Scraper for "${key}" must extend BaseScraper`);
    }
    this.scrapers.set(key.toLowerCase(), scraperInstance);
  }

  /**
   * Retrieve a scraper instance by key.
   * @param {string} key
   * @returns {BaseScraper|undefined}
   */
  getScraper(key) {
    return this.scrapers.get(key.toLowerCase());
  }

  /**
   * List all registered scraper keys.
   * @returns {string[]}
   */
  listScrapers() {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Run scrapers with full error isolation.
   * If one portal scraper throws an error or times out, others continue and return results.
   *
   * @param {object} [options={}]
   * @param {string} [options.source='all'] - 'all' or comma-separated list like 'upsc,ssc'
   * @param {object} [options.scraperOptions={}] - Options passed to individual scraper.scrape()
   * @returns {Promise<Array<NormalizedExamRecord>>} - Array of records (with attached .errors metadata)
   */
  async scrapeAll(options = {}) {
    const detailed = await this.scrapeAllDetailed(options);
    const records = detailed.records;
    // Attach error diagnostic details non-enumerably or directly
    Object.defineProperty(records, 'errors', {
      value: detailed.errors,
      writable: true,
      enumerable: false,
      configurable: true
    });
    return records;
  }

  /**
   * Run scrapers with detailed return format { records, errors }.
   *
   * @param {object} [options={}]
   * @param {string} [options.source='all']
   * @param {object} [options.scraperOptions={}]
   * @returns {Promise<{ records: Array<NormalizedExamRecord>, errors: Array<{ source: string, error: string }> }>}
   */
  async scrapeAllDetailed(options = {}) {
    const sourceFilter = (options.source || 'all').toLowerCase();
    const scraperOptions = options.scraperOptions || {};

    let targets = [];
    if (sourceFilter === 'all') {
      targets = Array.from(this.scrapers.entries());
    } else {
      const keys = sourceFilter.split(',').map((s) => s.trim().toLowerCase());
      for (const key of keys) {
        if (this.scrapers.has(key)) {
          targets.push([key, this.scrapers.get(key)]);
        } else {
          console.warn(`[ScraperManager] Unknown scraper source requested: "${key}"`);
        }
      }
    }

    const records = [];
    const errors = [];

    // Execute with error isolation
    const executions = targets.map(async ([key, scraper]) => {
      try {
        const portalOpts = scraperOptions[key] || scraperOptions;
        const results = await scraper.scrape(portalOpts);
        if (Array.isArray(results)) {
          records.push(...results);
        }
      } catch (err) {
        const errorMsg = (err && typeof err === 'object' && err.message) ? err.message : String(err || 'Unknown error');
        errors.push({
          source: key,
          error: errorMsg
        });
        console.error(`[ScraperManager] Scraper "${key}" failed gracefully: ${errorMsg}`);
      }
    });

    await Promise.allSettled(executions);

    return {
      records,
      errors
    };
  }
}

// Export singleton instance convenience function as well as classes
const defaultManager = new ScraperManager();

module.exports = {
  ScraperManager,
  BaseScraper,
  UpscScraper,
  SscScraper,
  defaultManager,
  scrapeAll: (options) => defaultManager.scrapeAll(options)
};
