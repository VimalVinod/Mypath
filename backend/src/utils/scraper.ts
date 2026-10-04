import axios from 'axios';
import * as cheerio from 'cheerio';
import Exam from '../models/Exam';

// Helper function to parse Indian date format (DD-MM-YYYY or DD/MM/YYYY)
const parseIndianDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Remove extra spaces and normalize
  dateStr = dateStr.trim().replace(/\s+/g, ' ');
  
  // Try different date formats
  const formats = [
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/, // DD Month YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        if (format === formats[0]) {
          // DD-MM-YYYY
          const [, day, month, year] = match;
          return new Date(`${year}-${month}-${day}`);
        } else if (format === formats[1]) {
          // DD Month YYYY
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) return date;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
};

// SSC Scraper (Example: SSC Official Website)
export const scrapeSSCExams = async () => {
  try {
    const url = 'https://ssc.gov.in/notifications';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const exams: any[] = [];

    // Note: These selectors are examples. You'll need to inspect the actual SSC website
    // and update the selectors based on the real HTML structure
    $('table.notifications-table tr, .notification-item').each((index, element) => {
      const title = $(element).find('td.title a, .notification-title').text().trim();
      const dateText = $(element).find('td.date, .notification-date').text().trim();
      const link = $(element).find('a').attr('href');
      const description = $(element).find('td.description, .notification-desc').text().trim();

      if (title && link) {
        const examDate = parseIndianDate(dateText);
        
        exams.push({
          title,
          conductingBody: 'SSC',
          description: description || title,
          eligibility: {
            ageLimit: { minAge: 18, maxAge: 32 }, // Default, will be updated from actual data
            education: ['Graduation'],
            nationality: 'Indian'
          },
          importantDates: {
            notificationDate: new Date(),
            applicationStartDate: examDate || new Date(),
            applicationEndDate: examDate ? new Date(examDate.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date()
          },
          sourceUrl: link.startsWith('http') ? link : `https://ssc.gov.in${link}`,
          officialWebsite: 'https://ssc.gov.in',
          isActive: true,
          scrapedAt: new Date()
        });
      }
    });

    // Save to database (avoid duplicates)
    for (const exam of exams) {
      await Exam.findOneAndUpdate(
        { sourceUrl: exam.sourceUrl },
        exam,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Successfully scraped ${exams.length} SSC exams`);
    return exams.length;
  } catch (error) {
    console.error(' Error scraping SSC exams:', error);
    return 0;
  }
};

// UPSC Scraper (Example)
export const scrapeUPSCExams = async () => {
  try {
    const url = 'https://upsc.gov.in/whats-new';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const exams: any[] = [];

    // UPSC website structure (adjust selectors as needed)
    $('.field-content a, .whats-new-item a').each((index, element) => {
      const title = $(element).text().trim();
      const link = $(element).attr('href');

      if (title.toLowerCase().includes('examination') || title.toLowerCase().includes('exam')) {
        exams.push({
          title,
          conductingBody: 'UPSC',
          description: title,
          eligibility: {
            ageLimit: { minAge: 21, maxAge: 32 },
            education: ['Graduation'],
            nationality: 'Indian'
          },
          importantDates: {
            notificationDate: new Date(),
            applicationStartDate: new Date(),
            applicationEndDate: new Date()
          },
          sourceUrl: link?.startsWith('http') ? link : `https://upsc.gov.in${link}`,
          officialWebsite: 'https://upsc.gov.in',
          isActive: true,
          scrapedAt: new Date()
        });
      }
    });

    // Save to database
    for (const exam of exams) {
      await Exam.findOneAndUpdate(
        { sourceUrl: exam.sourceUrl },
        exam,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Successfully scraped ${exams.length} UPSC exams`);
    return exams.length;
  } catch (error) {
    console.error('❌ Error scraping UPSC exams:', error);
    return 0;
  }
};

// Generic scraper that can be customized for any website
export const scrapeGenericExam = async (config: {
  url: string;
  conductingBody: string;
  selectors: {
    container: string;
    title: string;
    date?: string;
    link?: string;
    description?: string;
  };
}) => {
  try {
    const { data } = await axios.get(config.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const exams: any[] = [];

    $(config.selectors.container).each((index, element) => {
      const title = $(element).find(config.selectors.title).text().trim();
      const dateText = config.selectors.date ? $(element).find(config.selectors.date).text().trim() : '';
      const link = config.selectors.link ? $(element).find(config.selectors.link).attr('href') : '';
      const description = config.selectors.description ? $(element).find(config.selectors.description).text().trim() : '';

      if (title) {
        exams.push({
          title,
          conductingBody: config.conductingBody,
          description: description || title,
          eligibility: {
            ageLimit: { minAge: 18, maxAge: 32 },
            education: ['Graduation']
          },
          importantDates: {
            notificationDate: new Date(),
            applicationStartDate: parseIndianDate(dateText) || new Date(),
            applicationEndDate: new Date()
          },
          sourceUrl: link || config.url,
          isActive: true,
          scrapedAt: new Date()
        });
      }
    });

    // Save to database
    for (const exam of exams) {
      await Exam.findOneAndUpdate(
        { sourceUrl: exam.sourceUrl },
        exam,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Successfully scraped ${exams.length} ${config.conductingBody} exams`);
    return exams.length;
  } catch (error) {
    console.error(`❌ Error scraping ${config.conductingBody} exams:`, error);
    return 0;
  }
};

// Master scraper function that runs all scrapers
export const runAllScrapers = async () => {
  console.log('🚀 Starting all scrapers...');
  
  const sscCount = await scrapeSSCExams();
  const upscCount = await scrapeUPSCExams();
  
  const total = sscCount + upscCount;
  console.log(`🎉 Total exams scraped: ${total}`);
  
  return total;
};