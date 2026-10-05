/**
 * history.js — ScrapperMan Health History Tracker & Snapshot Manager
 *
 * Manages persistent JSON storage for:
 * 1. data/scrapperman-history.json — Append-only FIFO queue of HealthReport objects (capped at 100 entries)
 * 2. data/scrapperman-last-run.json — Snapshot of the last HEALTHY scrape records and metadata
 *
 * Reference: SCRAPPERMAN_BUILD_SPEC.md §4.7, §4.8
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Directory & Path Configuration ───────────────────────────────────────────

const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../../data');
let activeDataDir = null;

const MAX_HISTORY_ENTRIES = 100;

/**
 * Returns current resolved data paths.
 * Dynamically evaluates options.dataDir, programmatic activeDataDir override,
 * process.env.SCRAPPERMAN_DATA_DIR, and fallback DEFAULT_DATA_DIR.
 *
 * @param {object} [options]
 * @returns {{ dataDir: string, historyFilePath: string, lastRunFilePath: string }}
 */
function getDataPaths(options = {}) {
  const opts = (options && typeof options === 'object') ? options : {};
  const envDir = (process.env.SCRAPPERMAN_DATA_DIR && typeof process.env.SCRAPPERMAN_DATA_DIR === 'string')
    ? process.env.SCRAPPERMAN_DATA_DIR.trim()
    : null;
  const dir = opts.dataDir
    || activeDataDir
    || envDir
    || DEFAULT_DATA_DIR;

  return {
    dataDir: dir,
    historyFilePath: opts.historyFile || path.join(dir, 'scrapperman-history.json'),
    lastRunFilePath: opts.lastRunFile || path.join(dir, 'scrapperman-last-run.json')
  };
}

/**
 * Overrides active data directory (useful for unit testing sandboxes).
 * Passing null, undefined, or the default directory resets the override.
 *
 * @param {string|null} customDir
 */
function setDataDir(customDir) {
  if (customDir && typeof customDir === 'string') {
    if (path.resolve(customDir) === path.resolve(DEFAULT_DATA_DIR)) {
      activeDataDir = null;
    } else {
      activeDataDir = customDir;
    }
  } else {
    activeDataDir = null;
  }
}

// ── File I/O Resilience Utilities ────────────────────────────────────────────

/**
 * Synchronous delay helper using Atomics.wait with fallback.
 * Used for brief backoff during transient Windows file locks.
 *
 * @param {number} ms
 */
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (_) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

/**
 * Ensures parent directory exists.
 * @param {string} filePath
 */
function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Safely reads and parses a JSON file with corruption fallback and transient lock retries.
 * Retries on transient Windows file lock errors (EBUSY, EPERM, EACCES) before falling back.
 *
 * @param {string} filePath
 * @param {*} defaultValue
 * @param {number} [maxRetries=5]
 * @returns {*}
 */
function safeReadJson(filePath, defaultValue, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw || !raw.trim()) {
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      if (['EBUSY', 'EPERM', 'EACCES'].includes(err.code) && attempt < maxRetries) {
        sleepSync(10 * (attempt + 1));
        continue;
      }
      return defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Safely writes JSON to disk using direct synchronous write with transient lock retries.
 * Adheres strictly to SCRAPPERMAN_BUILD_SPEC.md §4.7 line 753:
 * "NOTE: Use synchronous fs.readFileSync / fs.writeFileSync for simplicity."
 * Avoids temp-file rename patterns which suffer from EPERM locking on Windows.
 *
 * @param {string} targetPath
 * @param {*} data
 * @param {number} [maxRetries=5]
 */
function safeWriteJson(targetPath, data, maxRetries = 5) {
  ensureDirectory(targetPath);
  const serialized = JSON.stringify(data, null, 2);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      fs.writeFileSync(targetPath, serialized, 'utf-8');
      return;
    } catch (err) {
      if (['EBUSY', 'EPERM', 'EACCES'].includes(err.code) && attempt < maxRetries) {
        sleepSync(10 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Appends a HealthReport to scrapperman-history.json, keeping only the last 100 entries (FIFO).
 *
 * @param {object} report - HealthReport object produced by patrol.js
 * @param {object} [options] - Optional custom file path overrides
 * @returns {object|null} The saved report, or null if input was invalid
 */
function saveHealthReport(report, options = {}) {
  if (!report || typeof report !== 'object') {
    return null;
  }

  const { historyFilePath } = getDataPaths(options);
  const maxEntries = options.maxEntries || MAX_HISTORY_ENTRIES;

  let history = safeReadJson(historyFilePath, []);
  if (!Array.isArray(history)) {
    history = [];
  }

  // Ensure report has a valid ISO timestamp
  const reportToSave = {
    ...report,
    timestamp: report.timestamp || new Date().toISOString()
  };

  history.push(reportToSave);

  // FIFO trimming
  if (history.length > maxEntries) {
    history = history.slice(-maxEntries);
  }

  safeWriteJson(historyFilePath, history);
  return reportToSave;
}

/**
 * Returns the most recent HealthReport from history, or null if no history exists.
 *
 * @param {object} [options]
 * @returns {object|null}
 */
function getLastHealthReport(options = {}) {
  const { historyFilePath } = getDataPaths(options);
  const history = safeReadJson(historyFilePath, null);

  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }

  return history[history.length - 1];
}

/**
 * Saves snapshot of last HEALTHY scrape records and metadata to scrapperman-last-run.json.
 * Only call this when patrol overallStatus is "HEALTHY".
 *
 * @param {Array<object>|object} runData - Array of NormalizedExamRecord or snapshot object
 * @param {object} [options]
 * @returns {object|null}
 */
function saveLastGoodRun(runData, options = {}) {
  if (!runData) {
    return null;
  }

  const { lastRunFilePath } = getDataPaths(options);

  let records = [];
  let timestamp = new Date().toISOString();
  let sources = { upsc: 0, ssc: 0 };

  if (Array.isArray(runData)) {
    records = runData;
    sources = {
      upsc: records.filter(r => typeof r?.organization === 'string' && r.organization.trim().toUpperCase() === 'UPSC').length,
      ssc: records.filter(r => typeof r?.organization === 'string' && r.organization.trim().toUpperCase() === 'SSC').length
    };
  } else if (typeof runData === 'object') {
    records = Array.isArray(runData.records) ? runData.records : [];
    timestamp = runData.timestamp || timestamp;
    sources = runData.sources || {
      upsc: records.filter(r => typeof r?.organization === 'string' && r.organization.trim().toUpperCase() === 'UPSC').length,
      ssc: records.filter(r => typeof r?.organization === 'string' && r.organization.trim().toUpperCase() === 'SSC').length
    };
  }

  const payload = {
    timestamp,
    recordsCount: records.length,
    records,
    sources
  };

  safeWriteJson(lastRunFilePath, payload);
  return payload;
}

/**
 * Returns the last known good records array (or null if none exists).
 * The returned array is decorated with metadata (.timestamp, .recordsCount, .sources, .records)
 * ensuring full dual-contract compatibility.
 *
 * @param {object} [options]
 * @param {boolean} [options.raw=false] - If true, returns the raw { timestamp, recordsCount, records, sources } object
 * @returns {Array<object>|object|null}
 */
function getLastGoodRun(options = {}) {
  const { lastRunFilePath } = getDataPaths(options);
  const data = safeReadJson(lastRunFilePath, null);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const isRecordArray = Array.isArray(data);
  const isSnapshotObject = !isRecordArray && Array.isArray(data.records);

  if (!isRecordArray && !isSnapshotObject) {
    return null;
  }

  if (options.raw === true) {
    return data;
  }

  let records = [];
  let timestamp = null;
  let recordsCount = 0;
  let sources = null;

  if (Array.isArray(data)) {
    records = [...data];
    recordsCount = records.length;
  } else if (typeof data === 'object') {
    records = Array.isArray(data.records) ? [...data.records] : [];
    timestamp = data.timestamp || null;
    recordsCount = data.recordsCount ?? records.length;
    sources = data.sources || null;
  }

  // Decorate array with non-enumerable properties for dual-contract support
  Object.defineProperty(records, 'timestamp', {
    value: timestamp,
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(records, 'recordsCount', {
    value: recordsCount,
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(records, 'sources', {
    value: sources,
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(records, 'records', {
    value: records,
    enumerable: false,
    writable: true,
    configurable: true
  });

  return records;
}

/**
 * Returns the raw last good run snapshot object { timestamp, recordsCount, records, sources } or null.
 *
 * @param {object} [options]
 * @returns {object|null}
 */
function getLastGoodRunSnapshot(options = {}) {
  return getLastGoodRun({ ...options, raw: true });
}

/**
 * Returns the last N health reports in chronological order.
 * Used to detect degradation streaks (e.g. 3 consecutive DEGRADED runs).
 *
 * @param {number} [limit=10]
 * @param {object} [options]
 * @returns {Array<object>}
 */
function getHealthTrend(limit = 10, options = {}) {
  const { historyFilePath } = getDataPaths(options);
  const history = safeReadJson(historyFilePath, null);

  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const n = (typeof limit === 'number' && !isNaN(limit)) ? Math.floor(limit) : 10;
  if (n <= 0) {
    return [];
  }

  if (history.length <= n) {
    return [...history];
  }

  return history.slice(-n);
}

/**
 * Resets history array to empty (useful for testing).
 * @param {object} [options]
 */
function clearHistory(options = {}) {
  const { historyFilePath } = getDataPaths(options);
  safeWriteJson(historyFilePath, []);
}

/**
 * Clears last good run file (useful for testing).
 * @param {object} [options]
 */
function clearLastGoodRun(options = {}) {
  const { lastRunFilePath } = getDataPaths(options);
  try {
    if (fs.existsSync(lastRunFilePath)) {
      fs.unlinkSync(lastRunFilePath);
    }
  } catch (_) {}
}

module.exports = {
  saveHealthReport,
  getLastHealthReport,
  saveLastGoodRun,
  getLastGoodRun,
  getLastGoodRunSnapshot,
  getHealthTrend,
  clearHistory,
  clearLastGoodRun,
  getDataPaths,
  setDataDir
};
