// tests/helpers/fixtures.js
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

function getUpscActiveExamsHtml() {
  return fs.readFileSync(path.join(FIXTURES_DIR, 'upsc-active-exams.html'), 'utf-8');
}

function getUpscDetailSampleHtml() {
  return fs.readFileSync(path.join(FIXTURES_DIR, 'upsc-detail-sample.html'), 'utf-8');
}

function getSscLiveExamsJson() {
  const content = fs.readFileSync(path.join(FIXTURES_DIR, 'ssc-live-exams.json'), 'utf-8');
  return JSON.parse(content);
}

module.exports = {
  FIXTURES_DIR,
  getUpscActiveExamsHtml,
  getUpscDetailSampleHtml,
  getSscLiveExamsJson
};
