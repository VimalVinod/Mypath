/**
 * SscScraper
 * Scraper for Staff Selection Commission (SSC) live examinations.
 * Canonical REST API: https://ssc.gov.in/api/admin/5.1/liveExams
 * Quick check endpoint: https://ssc.gov.in/api/general-website/portal/lastUpdates
 * Extracts structured live exams directly into NormalizedExamRecord without DOM overhead.
 */

const BaseScraper = require('./base-scraper');

class SscScraper extends BaseScraper {
  /**
   * @param {object} [options={}]
   */
  constructor(options = {}) {
    super('SSC', {
      timeoutMs: options.timeoutMs ?? 15000,
      retries: options.retries ?? 2,
      ...options
    });

    this.baseUrl = 'https://ssc.gov.in';
    this.liveExamsApiUrl = `${this.baseUrl}/api/admin/5.1/liveExams`;
    this.lastUpdatesApiUrl = `${this.baseUrl}/api/general-website/portal/lastUpdates`;
  }

  /**
   * Check if SSC has new updates since a given timestamp.
   * @param {string} [lastKnownTimestamp]
   * @returns {Promise<boolean>}
   */
  async hasUpdates(lastKnownTimestamp) {
    if (!lastKnownTimestamp) return true;

    try {
      const res = await this.fetchWithRetry(this.lastUpdatesApiUrl, {
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();
      const lastModified = data?.data?.createdAt;

      if (!lastModified) return true;
      return new Date(lastModified).getTime() > new Date(lastKnownTimestamp).getTime();
    } catch {
      // On error, default to true so we don't skip scraping
      return true;
    }
  }

  /**
   * Parse raw SSC live exams JSON into NormalizedExamRecord array.
   * @param {object|Array} payload - Response body from liveExams API or array of exams
   * @returns {NormalizedExamRecord[]}
   */
  parseLiveExamsJson(payload) {
    if (!payload) return [];

    let examList = [];
    if (Array.isArray(payload)) {
      examList = payload;
    } else if (Array.isArray(payload.data)) {
      examList = payload.data;
    } else if (payload.data && typeof payload.data === 'object') {
      examList = [payload.data];
    }

    const records = [];

    for (const item of examList) {
      if (!item || typeof item !== 'object') continue;

      try {
        const examCode = item.examCode || null;
        const examYear = item.examYear || '';
        const examName = (item.examName || item.examDescription || `SSC ${examCode || 'Exam'} ${examYear}`).trim();

        const idSlug = [examCode, examYear].filter(Boolean).join('_') || this.slugify(examName);
        const id = `SSC_${idSlug}`;

        let applicationEndDate = item.applicationEndDate;
        if (typeof applicationEndDate === 'number') {
          applicationEndDate = new Date(applicationEndDate).toISOString();
        } else if (!applicationEndDate) {
          applicationEndDate = 'TBD';
        } else {
          applicationEndDate = String(applicationEndDate);
        }

        let applicationStartDate = item.applicationStartDate || null;
        if (typeof applicationStartDate === 'number') {
          applicationStartDate = new Date(applicationStartDate).toISOString();
        }

        let examDate = item.examDate || null;
        if (typeof examDate === 'number') {
          examDate = new Date(examDate).toISOString();
        }

        const importantDates = {
          notificationDate: applicationStartDate,
          applicationStartDate: applicationStartDate,
          applicationEndDate: applicationEndDate,
          examDate: examDate,
          feeDeadline: item.lastDateForFee || null
        };

        // Determine official notification URL
        let officialNotificationUrl = `${this.baseUrl}/notice-boards`;
        if (item.attachmentUrl && typeof item.attachmentUrl === 'string') {
          officialNotificationUrl = item.attachmentUrl.startsWith('http')
            ? item.attachmentUrl
            : `${this.baseUrl}${item.attachmentUrl.startsWith('/') ? '' : '/'}${item.attachmentUrl}`;
        } else if (item.notificationUrl && typeof item.notificationUrl === 'string') {
          officialNotificationUrl = item.notificationUrl.startsWith('http')
            ? item.notificationUrl
            : `${this.baseUrl}${item.notificationUrl.startsWith('/') ? '' : '/'}${item.notificationUrl}`;
        }

        // Determine application submission URL
        let applicationUrl = `${this.baseUrl}/login`;
        if (item.navigationUrl && typeof item.navigationUrl === 'string') {
          applicationUrl = item.navigationUrl.startsWith('http')
            ? item.navigationUrl
            : `${this.baseUrl}${item.navigationUrl.startsWith('/') ? '' : '/'}${item.navigationUrl}`;
        }

        // Parse fee if present
        let fee = null;
        if (item.fee !== undefined && item.fee !== null) {
          const num = Number(item.fee);
          fee = isNaN(num) ? item.fee : num;
        }

        const record = this.normalizeRecord({
          id,
          examName,
          organization: 'SSC',
          examCode,
          importantDates,
          officialNotificationUrl,
          applicationUrl,
          categories: ['SSC', 'Central Govt'],
          fee
        });

        records.push(record);
      } catch (itemErr) {
        console.warn(`[SSC] Skipping malformed item ${item?.examCode || 'unknown'}: ${itemErr.message}`);
      }
    }

    return records;
  }

  /**
   * Fetch and scrape live exams from SSC.
   * @param {object} [options={}]
   * @param {object|Array} [options.jsonData] - Mock data for offline testing
   * @returns {Promise<NormalizedExamRecord[]>}
   */
  async scrape(options = {}) {
    if (options.jsonData) {
      return this.parseLiveExamsJson(options.jsonData);
    }

    try {
      const res = await this.fetchWithRetry(this.liveExamsApiUrl, {
        headers: {
          Accept: 'application/json',
          Referer: 'https://ssc.gov.in/'
        }
      });

      const json = await res.json();
      return this.parseLiveExamsJson(json);
    } catch (err) {
      throw new Error(`[SSC] Failed to scrape live exams from ${this.liveExamsApiUrl}: ${err.message}`);
    }
  }
}

module.exports = SscScraper;
