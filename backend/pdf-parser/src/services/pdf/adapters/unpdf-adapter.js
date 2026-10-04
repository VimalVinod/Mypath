'use strict';

/**
 * src/services/pdf/adapters/unpdf-adapter.js
 * Production PDF extraction adapter using unpdf.
 */

const fs = require('fs');
const path = require('path');
const { extractText } = require('unpdf');

class PdfError extends Error {
  constructor(message, code, cause = null) {
    super(message);
    this.name = 'PdfError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

class UnpdfAdapter {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.trimPageText=false] Whether to trim whitespace on each page
   */
  constructor(options = {}) {
    this.options = {
      trimPageText: false,
      ...options
    };
  }

  /**
   * Resolves input into an isolated Uint8Array copy to protect caller buffers
   * against ArrayBuffer detachment during PDF.js worker execution.
   * @param {string|Buffer|Uint8Array} input
   * @returns {Promise<Uint8Array>}
   */
  async _resolveBinaryData(input) {
    if (input === null || input === undefined) {
      throw new PdfError('Input cannot be null or undefined', 'INVALID_INPUT_TYPE');
    }

    // Case 1: File path string
    if (typeof input === 'string') {
      const resolvedPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);

      try {
        await fs.promises.access(resolvedPath, fs.constants.R_OK);
      } catch (err) {
        throw new PdfError(`PDF file not found or not readable: ${resolvedPath}`, 'FILE_NOT_FOUND', err);
      }

      const stat = await fs.promises.stat(resolvedPath);
      if (stat.size === 0) {
        throw new PdfError(`PDF file is empty (0 bytes): ${resolvedPath}`, 'EMPTY_PDF');
      }

      const buffer = await fs.promises.readFile(resolvedPath);
      return new Uint8Array(buffer);
    }

    // Case 2: Node.js Buffer
    if (Buffer.isBuffer(input)) {
      if (input.length === 0) {
        throw new PdfError('PDF Buffer is empty (0 bytes)', 'EMPTY_PDF');
      }
      return new Uint8Array(input);
    }

    // Case 3: Uint8Array
    if (input instanceof Uint8Array) {
      if (input.byteLength === 0) {
        throw new PdfError('PDF Uint8Array is empty (0 bytes)', 'EMPTY_PDF');
      }
      return new Uint8Array(input);
    }

    throw new PdfError(
      `Invalid input: Expected a file path string, Buffer, or Uint8Array, received ${typeof input}`,
      'INVALID_INPUT_TYPE'
    );
  }

  /**
   * Maps underlying PDF.js/unpdf errors to standardized PdfError instances.
   * @param {Error} err
   */
  _handleUnpdfError(err) {
    const message = err.message || '';
    const name = err.name || '';

    // Encrypted / password-protected PDF
    if (name === 'PasswordException' || /password/i.test(message)) {
      throw new PdfError(
        'PDF is encrypted or password-protected and cannot be read without credentials',
        'ENCRYPTED_PDF',
        err
      );
    }

    // Invalid structure / corrupt binary
    if (
      name === 'InvalidPDFException' ||
      /invalid pdf/i.test(message) ||
      /PDFHeaderVersionNotPresent/i.test(message) ||
      /corrupt/i.test(message) ||
      /format error/i.test(message)
    ) {
      throw new PdfError(
        `Invalid or corrupted PDF structure: ${message}`,
        'INVALID_PDF',
        err
      );
    }

    // Zero-byte PDF rejected by PDF.js
    if (/size is zero bytes/i.test(message) || /empty/i.test(message)) {
      throw new PdfError(
        'The PDF file is empty (0 bytes)',
        'EMPTY_PDF',
        err
      );
    }

    throw new PdfError(
      `PDF extraction failed: ${message}`,
      'EXTRACTION_FAILED',
      err
    );
  }

  /**
   * Extracts text page-by-page from the PDF input.
   * @param {string|Buffer|Uint8Array} input
   * @param {Object} [overrideOptions]
   * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }>, hasText: boolean, emptyPages: number[] }>}
   */
  async extractPages(input, overrideOptions = {}) {
    const opts = { ...this.options, ...overrideOptions };
    const uint8Data = await this._resolveBinaryData(input);

    let rawResult;
    try {
      rawResult = await extractText(uint8Data, { mergePages: false });
    } catch (err) {
      this._handleUnpdfError(err);
    }

    if (!rawResult || typeof rawResult !== 'object') {
      throw new PdfError('Unexpected null or malformed result from PDF parser', 'PARSER_FAILURE');
    }

    const totalPages = typeof rawResult.totalPages === 'number' ? rawResult.totalPages : 0;
    const rawPages = Array.isArray(rawResult.text)
      ? rawResult.text
      : (rawResult.text != null ? [rawResult.text] : []);

    const emptyPages = [];
    const pages = [];

    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      let rawText = rawPages[i];
      let pageText = typeof rawText === 'string' ? rawText : '';

      // Normalize null bytes and line breaks
      pageText = pageText.replace(/\0/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      if (opts.trimPageText) {
        pageText = pageText.trim();
      }

      if (pageText.trim().length === 0) {
        emptyPages.push(pageNum);
      }

      pages.push({
        pageNumber: pageNum,
        text: pageText
      });
    }

    return {
      totalPages,
      pages,
      hasText: emptyPages.length < totalPages,
      emptyPages
    };
  }

  /**
   * Alias for extractPages to maintain compatibility.
   */
  async extractText(input, options = {}) {
    return this.extractPages(input, options);
  }
}

module.exports = {
  UnpdfAdapter,
  PdfError
};
