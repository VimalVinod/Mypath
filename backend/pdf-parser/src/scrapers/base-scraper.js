/**
 * BaseScraper
 * Abstract base class for all government portal exam scrapers.
 * Provides resilient HTTP fetching with retry & exponential backoff,
 * configurable timeout, standardized User-Agent headers, error wrapping,
 * and NormalizedExamRecord validation.
 */

const crypto = require('crypto');

class BaseScraper {
  /**
   * @param {string} sourceName - Identifier for the scraping source (e.g. 'UPSC', 'SSC')
   * @param {object} [options={}] - Configuration options
   * @param {number} [options.timeoutMs=15000] - HTTP request timeout in milliseconds
   * @param {number} [options.retries=2] - Number of retry attempts on failure
   * @param {number} [options.retryDelayMs=1000] - Initial delay between retries in milliseconds
   * @param {string} [options.userAgent] - Custom User-Agent header
   */
  constructor(sourceName, options = {}) {
    if (!sourceName || typeof sourceName !== 'string') {
      throw new Error('BaseScraper requires a valid string sourceName');
    }

    this.sourceName = sourceName;
    this.options = {
      timeoutMs: options.timeoutMs ?? 15000,
      retries: options.retries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 1000,
      userAgent:
        options.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      ...options
    };
  }

  /**
   * Abstract scrape method. Subclasses must implement this.
   * @returns {Promise<NormalizedExamRecord[]>}
   */
  async scrape() {
    throw new Error(`Scraper ${this.sourceName} must implement scrape()`);
  }

  /**
   * Fetch an HTTP resource with retries, timeout, and custom headers.
   * @param {string} url - Target URL
   * @param {RequestInit} [fetchOptions={}] - Additional fetch options
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(url, fetchOptions = {}) {
    const maxAttempts = 1 + (this.options.retries || 0);
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response;
      try {
        const headers = {
          'User-Agent': this.options.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...fetchOptions.headers
        };

        const signal = fetchOptions.signal || AbortSignal.timeout(this.options.timeoutMs);

        response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal
        });
      } catch (err) {
        lastError = err;
        const isLast = attempt === maxAttempts;
        if (!isLast) {
          const delay = this.options.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      if (!response.ok) {
        const errorMsg = `HTTP ${response.status} ${response.statusText} for ${url}`;
        // If 404 or other 4xx client errors (except 429), throw immediately without retry
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(errorMsg);
        }
        // Retriable error (5xx or 429 rate limit)
        lastError = new Error(errorMsg);
        const isLast = attempt === maxAttempts;
        if (!isLast) {
          const delay = this.options.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        continue;
      }

      return response;
    }

    throw new Error(
      `[${this.sourceName}] Failed to fetch ${url} after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Generate a deterministic slug for exam IDs.
   * @param {string} text - Exam title or name
   * @returns {string} - Clean hyphen-separated slug
   */
  slugify(text) {
    if (!text) return 'exam';
    const cleaned = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    if (!cleaned) {
      if (/[^\x00-\x7F]/.test(text)) {
        const hash = crypto.createHash('md5').update(String(text)).digest('hex').slice(0, 10);
        return `exam-${hash}`;
      }
      return '';
    }

    return cleaned;
  }

  /**
   * Validate that a record adheres strictly to the NormalizedExamRecord contract.
   * Throws an error if required fields are missing or malformed.
   * @param {object} record
   * @returns {boolean}
   */
  validateRecord(record) {
    if (!record || typeof record !== 'object') {
      throw new Error(`[${this.sourceName}] Invalid record: must be a non-null object`);
    }

    const requiredTopLevel = ['id', 'examName', 'organization', 'importantDates', 'officialNotificationUrl', 'scrapedAt'];
    for (const field of requiredTopLevel) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        throw new Error(`[${this.sourceName}] Validation error: missing required field "${field}" in record: ${JSON.stringify(record)}`);
      }
    }

    if (typeof record.importantDates !== 'object' || record.importantDates === null) {
      throw new Error(`[${this.sourceName}] Validation error: "importantDates" must be an object`);
    }

    if (!record.importantDates.applicationEndDate || typeof record.importantDates.applicationEndDate !== 'string') {
      throw new Error(
        `[${this.sourceName}] Validation error: "importantDates.applicationEndDate" is required and must be a string`
      );
    }

    return true;
  }

  /**
   * Fill default values and validate record against NormalizedExamRecord schema.
   * @param {object} partialRecord
   * @returns {NormalizedExamRecord}
   */
  normalizeRecord(partialRecord) {
    const record = {
      id: partialRecord.id || `${this.sourceName}_${this.slugify(partialRecord.examName)}`,
      examName: (partialRecord.examName || '').trim(),
      organization: partialRecord.organization || this.sourceName,
      examCode: partialRecord.examCode || null,
      importantDates: {
        notificationDate: partialRecord.importantDates?.notificationDate || null,
        applicationStartDate: partialRecord.importantDates?.applicationStartDate || null,
        applicationEndDate: partialRecord.importantDates?.applicationEndDate || 'TBD',
        examDate: partialRecord.importantDates?.examDate || null,
        feeDeadline: partialRecord.importantDates?.feeDeadline || null
      },
      officialNotificationUrl: partialRecord.officialNotificationUrl || '',
      applicationUrl: partialRecord.applicationUrl || null,
      categories: Array.isArray(partialRecord.categories) ? partialRecord.categories : [this.sourceName],
      fee: partialRecord.fee ?? null,
      scrapedAt: partialRecord.scrapedAt || new Date().toISOString()
    };

    this.validateRecord(record);
    return record;
  }
}

module.exports = BaseScraper;
