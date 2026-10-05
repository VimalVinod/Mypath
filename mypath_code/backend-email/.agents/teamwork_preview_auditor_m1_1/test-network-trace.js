const UpscScraper = require('../../src/scrapers/upsc-scraper');
const SscScraper = require('../../src/scrapers/ssc-scraper');
const assert = require('node:assert/strict');

console.log('=== NETWORK TRACE & LIVE PROBE ===');

const traces = [];
const originalFetch = global.fetch;

global.fetch = async function (url, options) {
  const trace = {
    url: String(url),
    method: options?.method || 'GET',
    headers: options?.headers || {},
    timestamp: new Date().toISOString()
  };
  traces.push(trace);
  console.log(`[NETWORK OUTBOUND] -> ${trace.method} ${trace.url}`);
  console.log(`  User-Agent: ${trace.headers['User-Agent']}`);

  const start = Date.now();
  const response = await originalFetch(url, options);
  const duration = Date.now() - start;

  console.log(`[NETWORK INBOUND] <- HTTP ${response.status} (${duration}ms) from ${trace.url}`);
  return response;
};

async function runProbes() {
  // Test 1: Live SSC
  console.log('\n--- PROBE 1: SSC Live Scraper ---');
  const ssc = new SscScraper();
  const sscRecords = await ssc.scrape();
  console.log(`SSC records fetched: ${sscRecords.length}`);
  assert.ok(Array.isArray(sscRecords), 'SSC records must be an array');
  if (sscRecords.length > 0) {
    const r = sscRecords[0];
    console.log(`Sample SSC exam: "${r.examName}" (${r.id})`);
    console.log(`  Deadline: ${r.importantDates.applicationEndDate}`);
    console.log(`  Notif URL: ${r.officialNotificationUrl}`);
    assert.ok(r.id.startsWith('SSC_'));
    assert.equal(r.organization, 'SSC');
    assert.ok(r.scrapedAt);
  }

  // Test 2: Live UPSC (limit to maxExams: 2 for speed)
  console.log('\n--- PROBE 2: UPSC Live Scraper (maxExams: 2) ---');
  const upsc = new UpscScraper();
  const upscRecords = await upsc.scrape({ maxExams: 2, delayMs: 100 });
  console.log(`UPSC records fetched: ${upscRecords.length}`);
  assert.ok(Array.isArray(upscRecords), 'UPSC records must be an array');
  if (upscRecords.length > 0) {
    const r = upscRecords[0];
    console.log(`Sample UPSC exam: "${r.examName}" (${r.id})`);
    console.log(`  Deadline: ${r.importantDates.applicationEndDate}`);
    console.log(`  Notif URL: ${r.officialNotificationUrl}`);
    assert.ok(r.id.startsWith('UPSC_'));
    assert.equal(r.organization, 'UPSC');
    assert.ok(r.scrapedAt);
  }

  // Verify network trace log
  console.log('\n--- NETWORK AUDIT VERIFICATION ---');
  console.log(`Total genuine HTTP requests intercepted: ${traces.length}`);
  assert.ok(traces.length >= 2, 'Must have made at least 2 real network requests');
  
  const hasSscCall = traces.some(t => t.url.includes('ssc.gov.in/api/admin/5.1/liveExams'));
  const hasUpscCall = traces.some(t => t.url.includes('upsc.gov.in'));
  
  assert.ok(hasSscCall, 'Real SSC API call must be present in network traces');
  assert.ok(hasUpscCall, 'Real UPSC portal call must be present in network traces');

  console.log('✓ Verified: Genuine HTTP calls made to real government endpoints.');
  console.log('✓ Verified: No mock bypasses in live execution path.');
  console.log('=== NETWORK TRACE PROBE PASSED ===');
}

runProbes().catch((err) => {
  console.error('PROBE FAILED:', err);
  process.exit(1);
});
