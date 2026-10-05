// tests/unit/dedup.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDedupStore } = require('../helpers/loader');

describe('Deduplication Store Unit Tests', () => {
  const DedupStoreClass = getDedupStore();
  let tempDir;
  let testStorePath;
  let dedupStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypath-dedup-test-'));
    testStorePath = path.join(tempDir, 'test-notified-exams.json');
    dedupStore = new DedupStoreClass(testStorePath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  const sampleExam1 = {
    id: 'UPSC_CSE_2026',
    examName: 'Civil Services Examination 2026',
    organization: 'UPSC',
    importantDates: { applicationEndDate: '2026-03-05' },
    officialNotificationUrl: 'https://upsc.gov.in/notice.pdf',
    scrapedAt: new Date().toISOString()
  };

  const sampleExam2 = {
    id: 'SSC_CHSL_2026',
    examName: 'Combined Higher Secondary Level 2026',
    organization: 'SSC',
    importantDates: { applicationEndDate: '2026-10-07' },
    officialNotificationUrl: 'https://ssc.gov.in/chsl.pdf',
    scrapedAt: new Date().toISOString()
  };

  it('should generate consistent deterministic hash key for identical inputs', () => {
    const key1 = dedupStore.generateKey(sampleExam1);
    const key2 = dedupStore.generateKey({ ...sampleExam1 });
    assert.equal(typeof key1, 'string');
    assert.equal(key1.length, 16);
    assert.equal(key1, key2, 'Keys for identical exam data must match');
  });

  it('should generate different keys for different exams', () => {
    const key1 = dedupStore.generateKey(sampleExam1);
    const key2 = dedupStore.generateKey(sampleExam2);
    assert.notEqual(key1, key2);
  });

  it('should filter new exams against an empty store', () => {
    const newExams = dedupStore.filterNewExams([sampleExam1, sampleExam2]);
    assert.equal(newExams.length, 2, 'All exams should be identified as new when store is empty');
  });

  it('should filter out previously notified exams once marked', () => {
    // First run: mark sampleExam1 as notified
    dedupStore.markAsNotified([sampleExam1]);
    assert.ok(fs.existsSync(testStorePath), 'Store file must be created on markAsNotified');

    // Second run: pass both exams
    const newExams = dedupStore.filterNewExams([sampleExam1, sampleExam2]);
    assert.equal(newExams.length, 1, 'Only unnotified exam should remain');
    assert.equal(newExams[0].id, sampleExam2.id);
  });

  it('should recover gracefully from corrupted store file', () => {
    // Write invalid JSON to store file
    fs.writeFileSync(testStorePath, '{ invalid json content !!!', 'utf-8');

    // Should not throw, should treat store as empty
    assert.doesNotThrow(() => {
      const newExams = dedupStore.filterNewExams([sampleExam1]);
      assert.equal(newExams.length, 1);
    });

    // Should be able to overwrite corrupted file safely
    dedupStore.markAsNotified([sampleExam1]);
    const reloaded = JSON.parse(fs.readFileSync(testStorePath, 'utf-8'));
    assert.ok(Object.keys(reloaded).length > 0);
  });
});
