const { ScraperManager, UpscScraper, SscScraper } = require('../../src/scrapers');

async function testLive() {
  console.log('=== TEST 1: LIVE SSC SCRAPING ===');
  const ssc = new SscScraper();
  try {
    const sscRecords = await ssc.scrape();
    console.log('SSC Live Records found:', sscRecords.length);
    if (sscRecords.length > 0) {
      console.log('Sample Live SSC Record:');
      console.log(JSON.stringify(sscRecords[0], null, 2));
      console.log('Exam Name:', sscRecords[0].examName);
      console.log('Organization:', sscRecords[0].organization);
      console.log('Deadline:', sscRecords[0].importantDates.applicationEndDate);
    }
  } catch (err) {
    console.error('SSC Live Scraping error:', err.message);
  }

  console.log('\n=== TEST 2: LIVE UPSC SCRAPING (Top 2 Active Exams) ===');
  const upsc = new UpscScraper();
  try {
    const upscRecords = await upsc.scrape({ maxExams: 2, delayMs: 500 });
    console.log('UPSC Live Records found:', upscRecords.length);
    if (upscRecords.length > 0) {
      console.log('Sample Live UPSC Record:');
      console.log(JSON.stringify(upscRecords[0], null, 2));
      console.log('Exam Name:', upscRecords[0].examName);
      console.log('Organization:', upscRecords[0].organization);
      console.log('Deadline:', upscRecords[0].importantDates.applicationEndDate);
      console.log('Notification URL:', upscRecords[0].officialNotificationUrl);
    }
  } catch (err) {
    console.error('UPSC Live Scraping error:', err.message);
  }

  console.log('\n=== TEST 3: LIVE SCRAPER MANAGER AGGREGATION ===');
  const manager = new ScraperManager();
  try {
    const allRecords = await manager.scrapeAll({
      scraperOptions: {
        upsc: { maxExams: 1, delayMs: 300 }
      }
    });
    console.log('ScraperManager total records aggregated:', allRecords.length);
    allRecords.forEach((r, idx) => {
      console.log(`[${idx + 1}] Org: ${r.organization} | Exam: ${r.examName.slice(0, 50)}... | Deadline: ${r.importantDates.applicationEndDate}`);
    });
  } catch (err) {
    console.error('ScraperManager error:', err.message);
  }
}

testLive().catch(err => {
  console.error('Fatal live test error:', err);
  process.exit(1);
});
