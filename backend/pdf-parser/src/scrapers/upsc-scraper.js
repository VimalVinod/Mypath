/**
 * UpscScraper
 * Scraper for Union Public Service Commission (UPSC) active examinations.
 * Canonical URL: https://www.upsc.gov.in/examinations/active-exams
 * Implements a resilient two-tier crawl:
 * 1. Index crawl: extracts active exam titles and detail links.
 * 2. Detail crawl: extracts notification date, application deadline, exam commencement date, and PDF notice.
 * Includes automatic RSS fallback (https://www.upsc.gov.in/rss.php).
 */

const cheerio = require('cheerio');
const BaseScraper = require('./base-scraper');

class UpscScraper extends BaseScraper {
  /**
   * @param {object} [options={}]
   */
  constructor(options = {}) {
    super('UPSC', {
      timeoutMs: options.timeoutMs ?? 15000,
      retries: options.retries ?? 2,
      ...options
    });

    this.baseUrl = 'https://www.upsc.gov.in';
    this.activeExamsUrl = `${this.baseUrl}/examinations/active-exams`;
    this.rssUrl = `${this.baseUrl}/rss.php`;
  }

  /**
   * Parse active examinations index page HTML into an array of exam stubs.
   * @param {string} html - HTML of /examinations/active-exams
   * @returns {Array<{ title: string, detailUrl: string }>}
   */
  parseIndexHtml(html) {
    if (!html || typeof html !== 'string') return [];

    const $ = cheerio.load(html);
    const examEntries = [];

    // Strategy 1: Drupal view rows (.view-content .views-row)
    $('.view-content .views-row').each((_, el) => {
      const linkEl = $(el).find('.views-field-field-exam-name a, a[href*="/examinations/"]').first();
      if (linkEl.length) {
        const href = linkEl.attr('href');
        const title = linkEl.find('li').text().trim() || linkEl.text().trim();
        if (title && href) {
          examEntries.push({
            title,
            detailUrl: href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
          });
        }
      }
    });

    // Strategy 2: If strategy 1 didn't find any, fallback to any anchor with /examinations/
    if (examEntries.length === 0) {
      $('a[href*="/examinations/"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).find('li').text().trim() || $(el).text().trim();
        if (
          title &&
          href &&
          !href.endsWith('/active-exams') &&
          !href.endsWith('/examinations') &&
          title.length > 5
        ) {
          examEntries.push({
            title,
            detailUrl: href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
          });
        }
      });
    }

    // Deduplicate entries by detailUrl
    const seen = new Set();
    return examEntries.filter((item) => {
      if (seen.has(item.detailUrl)) return false;
      seen.add(item.detailUrl);
      return true;
    });
  }

  /**
   * Parse exam detail page HTML into a NormalizedExamRecord.
   * @param {string} html - HTML of detail page
   * @param {string} detailUrl - URL of detail page
   * @param {string} [fallbackTitle=''] - Fallback title if caption missing
   * @returns {NormalizedExamRecord}
   */
  parseDetailHtml(html, detailUrl, fallbackTitle = '') {
    if (!html || typeof html !== 'string') {
      throw new Error(`[UPSC] Cannot parse empty detail HTML for ${detailUrl}`);
    }

    const $ = cheerio.load(html);

    let examTitle = fallbackTitle || '';
    const captionText = $('caption, table caption, h1.page-title, #page-title, .page-header').first().text().trim();
    if (captionText) {
      const cleaned = captionText.replace(/^Name of Examination:\s*/i, '').trim();
      if (cleaned) {
        examTitle = cleaned;
      }
    }
    if (!examTitle) {
      examTitle = 'UPSC Examination';
    }

    const importantDates = {
      notificationDate: null,
      applicationStartDate: null,
      applicationEndDate: 'TBD',
      examDate: null,
      feeDeadline: null
    };

    let officialNotificationUrl = detailUrl;

    $('table tr, .views-table tr').each((_, row) => {
      const cells = $(row).find('th, td');
      if (cells.length >= 2) {
        const rawText = $(cells[0]).text();
        const hasInternalMultiSpace = /\S\s{2,}\S/.test(rawText.trim());
        const label = hasInternalMultiSpace
          ? rawText.trim().toLowerCase()
          : rawText.replace(/\s+/g, ' ').trim().toLowerCase();
        const valCell = $(cells[1]);
        const value = valCell.text().replace(/\s+/g, ' ').trim();

        if (label.includes('notification') && label.includes('date') && !label.includes('last')) {
          importantDates.notificationDate = value || null;
          if (!importantDates.applicationStartDate && value) {
            importantDates.applicationStartDate = value;
          }
        } else if (label.includes('commencement') || (label.includes('date') && label.includes('examination'))) {
          importantDates.examDate = value || null;
        } else if (label.includes('last date') || label.includes('receipt of application')) {
          importantDates.applicationEndDate = value || 'TBD';
        }

        // Extract notification PDF link
        if (label.includes('notification') || label.includes('download') || label.includes('notice')) {
          const pdfHref = valCell.find('a[href]').attr('href');
          if (pdfHref) {
            officialNotificationUrl = pdfHref.startsWith('http')
              ? pdfHref
              : `${this.baseUrl}${pdfHref.startsWith('/') ? '' : '/'}${pdfHref}`;
          }
        }
      }
    });

    // Fallback search for any PDF link on the page
    if (officialNotificationUrl === detailUrl) {
      const anyPdf = $('a[href$=".pdf"]').first().attr('href');
      if (anyPdf) {
        officialNotificationUrl = anyPdf.startsWith('http')
          ? anyPdf
          : `${this.baseUrl}${anyPdf.startsWith('/') ? '' : '/'}${anyPdf}`;
      }
    }

    const id = `UPSC_${this.slugify(examTitle)}`;

    return this.normalizeRecord({
      id,
      examName: examTitle,
      organization: 'UPSC',
      examCode: null,
      importantDates,
      officialNotificationUrl,
      applicationUrl: 'https://upsconline.nic.in',
      categories: ['UPSC', 'Central Govt', 'All India Services']
    });
  }

  /**
   * Parse RSS XML feed as fallback.
   * @param {string} xml - Raw RSS XML
   * @returns {NormalizedExamRecord[]}
   */
  parseRssXml(xml) {
    if (!xml || typeof xml !== 'string') return [];

    const $ = cheerio.load(xml, { xmlMode: true });
    const records = [];

    $('item').each((_, item) => {
      const title = $(item).find('title').text().trim();
      const link = $(item).find('link').text().trim();
      const pubDate = $(item).find('pubDate').text().trim();

      if (title && link) {
        const id = `UPSC_${this.slugify(title)}`;
        const pdfUrl = link.startsWith('http') ? link : `${this.baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;

        let notificationDate = null;
        if (pubDate) {
          try {
            notificationDate = new Date(pubDate).toISOString().split('T')[0];
          } catch {
            notificationDate = pubDate;
          }
        }

        const record = this.normalizeRecord({
          id,
          examName: title,
          organization: 'UPSC',
          examCode: null,
          importantDates: {
            notificationDate,
            applicationStartDate: notificationDate,
            applicationEndDate: 'TBD (Refer Notification PDF)',
            examDate: null,
            feeDeadline: null
          },
          officialNotificationUrl: pdfUrl,
          applicationUrl: 'https://upsconline.nic.in',
          categories: ['UPSC', 'Central Govt', 'All India Services']
        });
        records.push(record);
      }
    });

    return records;
  }

  /**
   * Fallback scraping using UPSC RSS feed.
   * @returns {Promise<NormalizedExamRecord[]>}
   */
  async scrapeRssFallback() {
    const res = await this.fetchWithRetry(this.rssUrl);
    const xml = await res.text();
    const records = this.parseRssXml(xml);
    if (records.length === 0) {
      throw new Error('[UPSC] RSS feed returned 0 records');
    }
    return records;
  }

  /**
   * Primary scrape method: Crawls active-exams index then detail pages.
   * @param {object} [options={}]
   * @param {string} [options.indexHtml] - Optional index HTML for offline testing
   * @param {Record<string, string>} [options.detailHtmlMap] - Optional map of detailUrl -> html for offline testing
   * @param {number} [options.maxExams=10] - Limit detail fetches to avoid long runs
   * @param {number} [options.delayMs=250] - Delay between detail page fetches
   * @returns {Promise<NormalizedExamRecord[]>}
   */
  async scrape(options = {}) {
    const maxExams = options.maxExams ?? 10;
    const records = [];

    try {
      let indexHtml = options.indexHtml;
      if (!indexHtml) {
        const res = await this.fetchWithRetry(this.activeExamsUrl);
        indexHtml = await res.text();
      }

      const examEntries = this.parseIndexHtml(indexHtml);

      if (examEntries.length === 0) {
        return await this.scrapeRssFallback();
      }

      const targetEntries = examEntries.slice(0, maxExams);

      for (const entry of targetEntries) {
        try {
          let detailHtml = options.detailHtmlMap?.[entry.detailUrl];
          if (!detailHtml && !options.indexHtml) {
            const detailRes = await this.fetchWithRetry(entry.detailUrl);
            detailHtml = await detailRes.text();
          }

          if (detailHtml) {
            const record = this.parseDetailHtml(detailHtml, entry.detailUrl, entry.title);
            records.push(record);
          } else {
            // If offline test with indexHtml but no detailHtmlMap, generate record from entry
            records.push(
              this.normalizeRecord({
                id: `UPSC_${this.slugify(entry.title)}`,
                examName: entry.title,
                organization: 'UPSC',
                importantDates: {
                  applicationEndDate: 'TBD'
                },
                officialNotificationUrl: entry.detailUrl,
                applicationUrl: 'https://upsconline.nic.in',
                categories: ['UPSC', 'Central Govt']
              })
            );
          }
        } catch (detailErr) {
          records.push(
            this.normalizeRecord({
              id: `UPSC_${this.slugify(entry.title)}`,
              examName: entry.title,
              organization: 'UPSC',
              importantDates: {
                applicationEndDate: 'TBD'
              },
              officialNotificationUrl: entry.detailUrl,
              applicationUrl: 'https://upsconline.nic.in',
              categories: ['UPSC', 'Central Govt']
            })
          );
        }

        if (!options.indexHtml && options.delayMs !== 0) {
          await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 250));
        }
      }

      return records;
    } catch (err) {
      // If index crawl failed, attempt RSS fallback
      try {
        return await this.scrapeRssFallback();
      } catch (rssErr) {
        throw new Error(
          `[UPSC] Scraping failed: active-exams error (${err.message}) and RSS fallback error (${rssErr.message})`
        );
      }
    }
  }
}

module.exports = UpscScraper;
