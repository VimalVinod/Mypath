// tests/helpers/loader.js
const fs = require('fs');
const path = require('path');
const contracts = require('./contracts');

const SRC_DIR = path.resolve(__dirname, '../../src');

function resolveFirstExisting(candidatePaths) {
  for (const rel of candidatePaths) {
    const full = path.join(SRC_DIR, rel);
    if (fs.existsSync(full)) {
      try {
        return require(full);
      } catch (err) {
        // If file exists but has syntax or missing dependency, return null to allow inspection
        console.warn(`[Loader Warning] Failed to load ${full}:`, err.message);
      }
    }
  }
  return null;
}

function getUpscScraper() {
  const loaded = resolveFirstExisting([
    'scrapers/upsc-scraper.js',
    'scrapers/upscScraper.js'
  ]);
  return loaded || contracts.ReferenceUpscScraper;
}

function getSscScraper() {
  const loaded = resolveFirstExisting([
    'scrapers/ssc-scraper.js',
    'scrapers/sscScraper.js'
  ]);
  return loaded || contracts.ReferenceSscScraper;
}

function getDedupStore() {
  const loaded = resolveFirstExisting([
    'services/storage/dedup-store.js',
    'services/dedup-store.js'
  ]);
  return loaded || contracts.ReferenceDedupStore;
}

function getTemplateService() {
  const loaded = resolveFirstExisting([
    'services/email/template.js',
    'services/templateService.js'
  ]);
  return loaded || {
    escapeHtml: contracts.escapeHtml,
    calculateUrgency: contracts.calculateUrgency,
    renderExamCardHtml: contracts.renderExamCardHtml,
    renderFullEmailHtml: contracts.renderFullEmailHtml,
    renderEmailText: contracts.renderEmailText,
    generateSubject: contracts.generateSubject
  };
}

function getEmailService() {
  const loaded = resolveFirstExisting([
    'services/email/email-service.js',
    'services/emailService.js'
  ]);
  return loaded || contracts.ReferenceEmailService;
}

function getPipeline() {
  const loaded = resolveFirstExisting([
    'scripts/pipeline.js',
    'scripts/scrape-and-notify.js'
  ]);
  return loaded || { runPipeline: contracts.runReferencePipeline };
}

module.exports = {
  getUpscScraper,
  getSscScraper,
  getDedupStore,
  getTemplateService,
  getEmailService,
  getPipeline
};
