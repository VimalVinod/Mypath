const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../pdf-parser/.env') });

const { runScrapperMan } = require('../pdf-parser/src/services/scrapperman/index');
const { ScraperManager } = require('../pdf-parser/src/scrapers');

async function testScrapperMan() {
    console.log("==================================================");
    console.log("   TESTING SCRAPPERMAN (THE WATCHDOG)             ");
    console.log("==================================================");

    const scraperManager = new ScraperManager();
    
    console.log("1. Running actual scrapers to get live data...");
    const scrapeResult = await scraperManager.scrapeAllDetailed({ source: 'all' });
    console.log(`Scraped ${scrapeResult.records.length} records. Errors: ${scrapeResult.errors.length}\n`);

    // Let's purposefully inject a fake error to test ScrapperMan's reaction
    console.log("2. Injecting a fake 'Connection Refused' error into the results...");
    scrapeResult.errors.push({
        source: 'upsc',
        error: new Error('ECONNREFUSED: Connection refused to upsc.gov.in')
    });
    // And inject a fake missing JSON issue
    scrapeResult.errors.push({
        source: 'ssc',
        error: new Error('HTTP 404 Not Found')
    });

    console.log("\n3. Handing over to ScrapperMan...");
    const scrapperResult = await runScrapperMan(scrapeResult, {
        scraperManager,
        enableDiagnosis: true,
        enableAutoFix: true,
        enableAdminAlerts: true // Assuming keys are in .env
    });

    console.log("==================================================");
    console.log("   SCRAPPERMAN FINAL RESULT                       ");
    console.log("==================================================");
    console.log(`Final Status: ${scrapperResult.status}`);
    console.log(`Valid Records Passed Downstream: ${scrapperResult.records.length}`);
}

testScrapperMan().catch(console.error);
