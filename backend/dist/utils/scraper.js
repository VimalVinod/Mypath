"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllScrapers = exports.scrapeGenericExam = exports.scrapeUPSCExams = exports.scrapeSSCExams = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const Exam_1 = __importDefault(require("../models/Exam"));
// Helper function to parse Indian date format (DD-MM-YYYY or DD/MM/YYYY)
const parseIndianDate = (dateStr) => {
    if (!dateStr)
        return null;
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
                }
                else if (format === formats[1]) {
                    // DD Month YYYY
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime()))
                        return date;
                }
            }
            catch (e) {
                continue;
            }
        }
    }
    return null;
};
// SSC Scraper (Example: SSC Official Website)
const scrapeSSCExams = async () => {
    try {
        const url = 'https://ssc.gov.in/notifications';
        const { data } = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const exams = [];
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
            await Exam_1.default.findOneAndUpdate({ sourceUrl: exam.sourceUrl }, exam, { upsert: true, new: true });
        }
        console.log(`✅ Successfully scraped ${exams.length} SSC exams`);
        return exams.length;
    }
    catch (error) {
        console.error(' Error scraping SSC exams:', error);
        return 0;
    }
};
exports.scrapeSSCExams = scrapeSSCExams;
// UPSC Scraper (Example)
const scrapeUPSCExams = async () => {
    try {
        const url = 'https://upsc.gov.in/whats-new';
        const { data } = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const exams = [];
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
            await Exam_1.default.findOneAndUpdate({ sourceUrl: exam.sourceUrl }, exam, { upsert: true, new: true });
        }
        console.log(`✅ Successfully scraped ${exams.length} UPSC exams`);
        return exams.length;
    }
    catch (error) {
        console.error('❌ Error scraping UPSC exams:', error);
        return 0;
    }
};
exports.scrapeUPSCExams = scrapeUPSCExams;
// Generic scraper that can be customized for any website
const scrapeGenericExam = async (config) => {
    try {
        const { data } = await axios_1.default.get(config.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const exams = [];
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
            await Exam_1.default.findOneAndUpdate({ sourceUrl: exam.sourceUrl }, exam, { upsert: true, new: true });
        }
        console.log(`✅ Successfully scraped ${exams.length} ${config.conductingBody} exams`);
        return exams.length;
    }
    catch (error) {
        console.error(`❌ Error scraping ${config.conductingBody} exams:`, error);
        return 0;
    }
};
exports.scrapeGenericExam = scrapeGenericExam;
// Master scraper function that runs all scrapers
const runAllScrapers = async () => {
    console.log('🚀 Starting all scrapers...');
    const sscCount = await (0, exports.scrapeSSCExams)();
    const upscCount = await (0, exports.scrapeUPSCExams)();
    const total = sscCount + upscCount;
    console.log(`🎉 Total exams scraped: ${total}`);
    return total;
};
exports.runAllScrapers = runAllScrapers;
