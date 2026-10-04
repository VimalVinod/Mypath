'use strict';

/**
 * src/services/pdf/adapters/mock-adapter.js
 * In-memory mock adapter for lightning-fast unit tests and deterministic error injection.
 */

class MockPdfAdapter {
  /**
   * @param {Array<string|{ pageNumber?: number, text: string }>|Object} [configOrPages] Pre-configured pages or config object
   * @param {Array<string|{ pageNumber?: number, text: string }>} [configOrPages.pages] Pre-configured pages
   * @param {number} [configOrPages.totalPages] Total pages
   * @param {Error|string} [configOrPages.simulateError] Simulated error or error code to throw
   * @param {number} [configOrPages.delayMs=0] Simulated delay in milliseconds
   */
  constructor(configOrPages = {}) {
    this.calls = [];
    this.delayMs = 0;
    this.simulateError = null;
    this.mockPages = [];
    this.totalPages = 0;

    if (Array.isArray(configOrPages)) {
      this.setPages(configOrPages);
    } else if (configOrPages && typeof configOrPages === 'object') {
      this.simulateError = configOrPages.simulateError || null;
      this.delayMs = configOrPages.delayMs || 0;
      this.setPages(configOrPages.pages || []);
      if (typeof configOrPages.totalPages === 'number') {
        this.totalPages = configOrPages.totalPages;
      }
    }
  }

  /**
   * Updates mock pages.
   * @param {Array<string|{ pageNumber?: number, text: string }>} pages
   */
  setPages(pages = []) {
    this.mockPages = pages.map((item, index) => {
      if (typeof item === 'string') {
        return { pageNumber: index + 1, text: item };
      }
      return {
        pageNumber: typeof item.pageNumber === 'number' ? item.pageNumber : index + 1,
        text: typeof item.text === 'string' ? item.text : ''
      };
    });
    this.totalPages = this.mockPages.length;
  }

  /**
   * Configures an error to throw on the next invocation.
   * @param {Error|string|null} err
   */
  setSimulateError(err) {
    this.simulateError = err;
  }

  /**
   * Clears call history and reset errors.
   */
  reset() {
    this.calls = [];
    this.simulateError = null;
  }

  /**
   * In-memory page extraction adhering to the IPdfAdapter interface.
   * @param {string|Buffer|Uint8Array} input
   * @param {Object} [options]
   * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }>, hasText: boolean, emptyPages: number[] }>}
   */
  async extractPages(input, options = {}) {
    this.calls.push({
      input,
      options,
      timestamp: Date.now()
    });

    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    if (this.simulateError) {
      if (typeof this.simulateError === 'string') {
        const err = new Error(`Mock simulated error: ${this.simulateError}`);
        err.code = this.simulateError;
        throw err;
      }
      throw this.simulateError;
    }

    const emptyPages = this.mockPages
      .filter(p => !p.text || p.text.trim().length === 0)
      .map(p => p.pageNumber);

    return {
      totalPages: this.totalPages,
      pages: this.mockPages.map(p => ({ ...p })),
      hasText: emptyPages.length < this.totalPages,
      emptyPages
    };
  }

  /**
   * Alias for extractPages.
   */
  async extractText(input, options = {}) {
    return this.extractPages(input, options);
  }

  // --- Static Helper Factories ---

  /**
   * Instantiates a mock adapter with an array of page strings.
   * @param {string[]} pages
   * @returns {MockPdfAdapter}
   */
  static fromStrings(pages) {
    return new MockPdfAdapter({ pages });
  }

  /**
   * Instantiates a mock adapter configured to fail with a specific error code.
   * @param {string} code ('FILE_NOT_FOUND', 'INVALID_PDF', 'ENCRYPTED_PDF', etc.)
   * @returns {MockPdfAdapter}
   */
  static createFailing(code) {
    return new MockPdfAdapter({ simulateError: code });
  }

  /**
   * Instantiates a mock adapter with N blank/empty pages.
   * @param {number} [count=3]
   * @returns {MockPdfAdapter}
   */
  static empty(count = 3) {
    const pages = Array.from({ length: count }, (_, i) => ({ pageNumber: i + 1, text: '' }));
    return new MockPdfAdapter({ pages, totalPages: count });
  }
}

module.exports = {
  MockPdfAdapter
};
