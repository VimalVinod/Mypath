'use strict';

/**
 * src/services/pdf/pdf-extractor.js
 * Targeted PDF extraction engine with abbreviation-aware sentence segmentation,
 * case-insensitive keyword filtering, context windowing, interval deduplication, and token metrics.
 */

const { segmentSentences } = require('./sentence-segmenter');
const { UnpdfAdapter } = require('./adapters/unpdf-adapter');
const { MockPdfAdapter } = require('./adapters/mock-adapter');

/**
 * Resolves a PDF adapter from options or instantiates the default.
 * @param {string|Object} [adapterOption]
 * @param {Object} [options={}]
 * @returns {Object}
 */
function resolveAdapter(adapterOption, options = {}) {
  if (adapterOption && typeof adapterOption.extractPages === 'function') {
    return adapterOption;
  }
  if (adapterOption === 'mock') {
    return new MockPdfAdapter(options);
  }
  if (adapterOption === 'unpdf' || !adapterOption) {
    return new UnpdfAdapter(options);
  }
  throw new Error(`Unsupported PDF adapter type: "${adapterOption}". Valid options are "unpdf" or "mock".`);
}

/**
 * Compiles an array of string keywords into word-boundary safe, case-insensitive regular expressions.
 * @param {string[]|string} keywords 
 * @param {boolean} [wholeWord=true] 
 * @returns {Array<{ raw: string, regex: RegExp }>}
 */
function compileKeywords(keywords, wholeWord = true) {
  if (!keywords) return [];
  const list = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
      ? keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

  return list
    .map(kw => (typeof kw === 'string' ? kw.trim() : ''))
    .filter(Boolean)
    .map(rawKw => {
      const escaped = rawKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexibleWhitespace = escaped.replace(/\s+/g, '\\s+');

      let pattern = flexibleWhitespace;
      if (wholeWord) {
        const hasLeadingWord = /^\w/.test(rawKw);
        const hasTrailingWord = /\w$/.test(rawKw);
        pattern = `${hasLeadingWord ? '\\b' : ''}${pattern}${hasTrailingWord ? '\\b' : ''}`;
      }

      return {
        raw: rawKw,
        regex: new RegExp(pattern, 'i')
      };
    });
}

/**
 * Calculates reduction metrics between raw pages and extracted sentences.
 * @param {Array<{ text: string }>} pages 
 * @param {string[]} extractedSentences 
 * @returns {Object}
 */
function calculateMetrics(pages, extractedSentences) {
  const rawCharCount = pages.reduce((acc, p) => acc + (p.text ? p.text.length : 0), 0);
  const rawWordCount = pages.reduce((acc, p) => {
    return acc + (p.text && p.text.trim() ? p.text.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const estimatedRawTokens = Math.ceil(rawCharCount / 4);

  const combinedExtracted = extractedSentences.join(' ');
  const extractedCharCount = combinedExtracted.length;
  const extractedWordCount = combinedExtracted.trim()
    ? combinedExtracted.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const estimatedTokens = Math.ceil(extractedCharCount / 4);

  let reductionPercentage = 0;
  if (rawCharCount > 0) {
    reductionPercentage = Math.round(((rawCharCount - extractedCharCount) / rawCharCount) * 1000) / 10;
    reductionPercentage = Math.max(0, Math.min(100, reductionPercentage));
  }

  return {
    rawStats: {
      rawCharCount,
      rawWordCount,
      estimatedRawTokens
    },
    extractedStats: {
      extractedCharCount,
      extractedWordCount,
      estimatedTokens,
      reductionPercentage
    }
  };
}

/**
 * Core targeted PDF extraction engine.
 * Reads PDF via adapter, segments text, matches keywords with context windowing, and calculates reduction metrics.
 * 
 * @param {string|Buffer|Uint8Array} input - PDF file path or buffer
 * @param {Object} [options={}]
 * @param {string[]} [options.keywords=[]] - Target search keywords
 * @param {number} [options.contextBefore=1] - Preceding context sentences (default: 1)
 * @param {number} [options.contextAfter=1] - Following context sentences (default: 1)
 * @param {'sentence'|'page'} [options.mode='sentence'] - Extraction mode ('sentence' or 'page')
 * @param {boolean} [options.wholeWord=true] - Word boundary matching (default: true)
 * @param {number} [options.minSentenceLength=3] - Minimum sentence length
 * @param {Object} [opts.adapter] - Optional PDF extraction adapter
 * @returns {Promise<Object>} Conforms to PROJECT.md extractTargetedPdfText output contract
 */
async function extractTargetedPdfText(input, options = {}) {
  const opts = options || {};
  if (!input) {
    throw new Error('Invalid PDF input: expected a non-empty file path, Buffer, or Uint8Array');
  }

  // 1. Resolve adapter
  const adapter = resolveAdapter(opts.adapter, options);

  // 2. Extract pages via adapter
  const adapterResult = await adapter.extractPages(input, opts);
  const totalPages = typeof adapterResult.totalPages === 'number'
    ? adapterResult.totalPages
    : (adapterResult.pages ? adapterResult.pages.length : 0);

  // Normalize pages format
  const normalizedPages = (adapterResult.pages || []).map((page, idx) => {
    if (typeof page === 'string') {
      return { pageNumber: idx + 1, text: page };
    }
    return {
      pageNumber: page.pageNumber || idx + 1,
      text: typeof page.text === 'string' ? page.text : ''
    };
  });

  const mode = opts.mode === 'page' ? 'page' : 'sentence';
  const contextBefore = Number.isFinite(opts.contextBefore) ? Math.max(0, Math.floor(opts.contextBefore)) : 1;
  const contextAfter = Number.isFinite(opts.contextAfter) ? Math.max(0, Math.floor(opts.contextAfter)) : 1;
  const wholeWord = opts.wholeWord !== false;
  const minSentenceLength = Number.isFinite(opts.minSentenceLength) ? Math.max(0, Math.floor(opts.minSentenceLength)) : 3;

  const compiledKeywords = compileKeywords(opts.keywords, wholeWord);

  const matchedPages = [];
  const sections = [];
  const allExtractedSentences = [];
  let totalExtractedSentenceCount = 0;

  // Keyword hits tracking
  const keywordHits = {};
  for (const kw of compiledKeywords) {
    keywordHits[kw.raw] = 0;
  }

  for (const page of normalizedPages) {
    if (compiledKeywords.length === 0) {
      continue;
    }

    // Segment page text into sentences
    const pageSentences = segmentSentences(page.text, { minSentenceLength });
    if (pageSentences.length === 0) continue;

    // Identify matching sentence indices
    const matchingIndices = [];
    pageSentences.forEach((sentence, idx) => {
      let sentenceMatched = false;
      for (const kw of compiledKeywords) {
        if (kw.regex.test(sentence)) {
          keywordHits[kw.raw] = (keywordHits[kw.raw] || 0) + 1;
          sentenceMatched = true;
        }
      }
      if (sentenceMatched) {
        matchingIndices.push(idx);
      }
    });

    if (matchingIndices.length === 0) {
      continue;
    }

    matchedPages.push(page.pageNumber);

    if (mode === 'page') {
      // Page mode: include all sentences from the page
      sections.push({
        pageNumber: page.pageNumber,
        sentences: pageSentences
      });
      totalExtractedSentenceCount += pageSentences.length;
      allExtractedSentences.push(...pageSentences);
    } else {
      // Sentence mode: Context windowing with overlapping span deduplication
      const intervals = matchingIndices.map(matchIdx => ({
        start: Math.max(0, matchIdx - contextBefore),
        end: Math.min(pageSentences.length - 1, matchIdx + contextAfter)
      }));

      // Sort intervals by start index
      intervals.sort((a, b) => a.start - b.start);

      // Merge overlapping or adjacent intervals
      const mergedIntervals = [];
      for (const interval of intervals) {
        if (mergedIntervals.length === 0) {
          mergedIntervals.push({ ...interval });
        } else {
          const prev = mergedIntervals[mergedIntervals.length - 1];
          if (interval.start <= prev.end + 1) {
            prev.end = Math.max(prev.end, interval.end);
          } else {
            mergedIntervals.push({ ...interval });
          }
        }
      }

      // Collect deduplicated sentences for this page
      const pageExtractedSentences = [];
      for (const span of mergedIntervals) {
        for (let sIdx = span.start; sIdx <= span.end; sIdx++) {
          pageExtractedSentences.push(pageSentences[sIdx]);
        }
      }

      if (pageExtractedSentences.length > 0) {
        sections.push({
          pageNumber: page.pageNumber,
          sentences: pageExtractedSentences
        });
        totalExtractedSentenceCount += pageExtractedSentences.length;
        allExtractedSentences.push(...pageExtractedSentences);
      }
    }
  }

  // 3. Format targetedText with clean page demarcations
  const targetedTextBlocks = sections.map(sec => {
    return `--- [Page ${sec.pageNumber}] ---\n${sec.sentences.join(' ')}`;
  });
  const targetedText = targetedTextBlocks.join('\n\n');

  // 4. Calculate reduction metrics
  const metrics = calculateMetrics(normalizedPages, allExtractedSentences);

  // Keyword match summary
  const matchedKeywords = Object.keys(keywordHits).filter(k => keywordHits[k] > 0);
  const unmatchedKeywords = Object.keys(keywordHits).filter(k => keywordHits[k] === 0);

  return {
    success: true,
    rawStats: {
      totalPages,
      rawCharCount: metrics.rawStats.rawCharCount,
      rawWordCount: metrics.rawStats.rawWordCount,
      estimatedRawTokens: metrics.rawStats.estimatedRawTokens
    },
    extractedStats: {
      matchedPages,
      sentenceCount: totalExtractedSentenceCount,
      extractedCharCount: metrics.extractedStats.extractedCharCount,
      extractedWordCount: metrics.extractedStats.extractedWordCount,
      estimatedTokens: metrics.extractedStats.estimatedTokens,
      reductionPercentage: metrics.extractedStats.reductionPercentage,
      matchedKeywords,
      unmatchedKeywords,
      keywordHits
    },
    targetedText,
    sections
  };
}

module.exports = {
  extractTargetedPdfText,
  compileKeywords,
  calculateMetrics,
  resolveAdapter
};
