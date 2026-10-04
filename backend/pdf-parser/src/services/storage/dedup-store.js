/**
 * src/services/storage/dedup-store.js
 * 
 * Deduplication Store for ExamGo / MyPath backend.
 * Persists notified exam identifiers to data/notified-exams.json using deterministic
 * 16-character sha256 hashes to prevent duplicate alert spam across scheduled runs.
 * Features automated directory creation, corruption resilience, and safe file writes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DedupStore {
  /**
   * @param {string} [filePath] - Optional custom path for the store JSON file.
   *                              Defaults to data/notified-exams.json in current working directory.
   */
  constructor(filePath) {
    this.filePath = filePath || path.resolve(process.cwd(), 'data', 'notified-exams.json');
  }

  /**
   * Generates a deterministic 16-character sha256 hash key from exam metadata.
   * Format: ${exam.organization}:${exam.id || exam.title || exam.examName}:${deadline}
   * 
   * @param {object} exam - NormalizedExamRecord or ExamNotificationItem
   * @returns {string} 16-character hex hash string
   */
  generateKey(exam) {
    if (!exam || typeof exam !== 'object') return '';
    const org = exam.organization || '';
    const identifier = exam.id || exam.title || exam.examName || '';
    const dates = exam.importantDates || {};
    const deadline = exam.applicationEndDate || dates.applicationEndDate || '';
    const raw = `${org}:${identifier}:${deadline}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  /**
   * Loads the current store contents from disk.
   * Handles empty files, non-existent files, and JSON syntax errors gracefully.
   * 
   * @returns {Record<string, object>} Key-value map of notified exams
   */
  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {};
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw || !raw.trim()) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (err) {
      // Gracefully recover from corruption or parse errors without throwing
      return {};
    }
  }

  /**
   * Checks if an individual exam has already been marked as notified.
   * 
   * @param {object} exam - Exam record
   * @returns {boolean}
   */
  isNotified(exam) {
    const store = this.load();
    const key = this.generateKey(exam);
    return Boolean(store[key]);
  }

  /**
   * Filters an array of exam records, returning only those that have not yet been notified.
   * 
   * @param {Array<object>} exams - Array of exam records
   * @returns {Array<object>} Unnotified exam records
   */
  filterNewExams(exams) {
    if (!Array.isArray(exams)) return [];
    const store = this.load();
    return exams.filter((exam) => {
      const key = this.generateKey(exam);
      return !store[key];
    });
  }

  /**
   * Marks an array of exams as notified, recording metadata and persisting to disk.
   * Auto-creates parent directories if they do not exist and writes safely.
   * 
   * @param {Array<object>} exams - Array of exam records to record
   */
  markAsNotified(exams) {
    if (!Array.isArray(exams) || exams.length === 0) return;

    const store = this.load();
    const now = new Date().toISOString();

    for (const exam of exams) {
      if (!exam || typeof exam !== 'object') continue;
      const key = this.generateKey(exam);
      const dates = exam.importantDates || {};
      const deadline = exam.applicationEndDate || dates.applicationEndDate || null;
      const title = exam.examName || exam.title || exam.id || 'Unknown Exam';
      const organization = exam.organization || 'Unknown';

      store[key] = {
        id: exam.id || key,
        title,
        organization,
        deadline,
        notifiedAt: now
      };
    }

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serialized = JSON.stringify(store, null, 2);
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
      // Attempt safe atomic write via temporary file
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (_) {
      // Fallback to direct write if rename fails (e.g. Windows lock / permissions)
      fs.writeFileSync(this.filePath, serialized, 'utf-8');
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (__) {}
    }
  }

  /**
   * Clears all stored records (useful for test resets).
   */
  clear() {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, '{}', 'utf-8');
      }
    } catch (_) {}
  }
}

module.exports = DedupStore;
