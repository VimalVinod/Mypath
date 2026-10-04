// Multi-page test simulation
const pages = [
  {
    pageNumber: 1,
    text: `
    CENTRAL RECRUITMENT COMMISSION
    NEW DELHI - 110001
    ADVERTISEMENT NO. 04/2026

    1. GENERAL INFORMATION:
    Applications are invited from eligible citizens of India for recruitment to the post of Assistant Director (Technical).
    The Commission reserves the right to cancel the recruitment process at any stage without assigning any reason.
    Detailed instructions regarding online application submission are available on the official portal www.recruitment.gov.in.
    Applicants are advised to read the guidelines carefully before submitting the online form.
    Incomplete applications or applications without proper enclosures will be summarily rejected.
    No interim correspondence will be entertained under any circumstances.
    All disputes shall be subject to the jurisdiction of courts in New Delhi only.
    `
  },
  {
    pageNumber: 2,
    text: `
    2. ELIGIBILITY CRITERIA:
    (A) Nationality: A candidate must be a citizen of India or a subject of Nepal or Bhutan.
    (B) Age Limit: The candidate must have attained the age of 21 years and must not have exceeded the age of 30 years as on 1st August 2026.
    The upper age limit is relaxable up to 5 years for SC/ST candidates and 3 years for OBC (Non-Creamy Layer) candidates.
    (C) Educational Qualifications:
    Candidates must possess a Bachelor's degree in Computer Science, Information Technology, or Electronics from an accredited university.
    A minimum of 60% aggregate marks (or CGPA 6.5/10) is mandatory.
    Candidates awaiting final semester results are not eligible to apply.
    (D) Experience: No prior work experience is required for this entry-level position.
    `
  },
  {
    pageNumber: 3,
    text: `
    3. SCHEME OF EXAMINATION AND SYLLABUS:
    The examination will consist of two stages: Computer Based Test (CBT) and Personal Interview.
    The CBT will comprise 100 objective type multiple choice questions carrying 1 mark each.
    There will be negative marking of 0.25 marks for each incorrect response.
    The duration of the examination will be 120 minutes.
    Examination centers will be located across 24 major cities in India.
    No request for change of center will be entertained once the admit card is issued.
    Candidates must carry a valid photo identity card such as Aadhaar Card, Voter ID, or Passport to the examination hall.
    Electronic gadgets, calculators, and mobile phones are strictly prohibited inside the hall.
    `
  }
];

function splitSentences(rawText) {
  let cleaned = rawText
    .replace(/(\b\w+)-\s*\r?\n\s*(\w+\b)/g, '$1$2')
    .replace(/\r?\n\s*([0-9]+\.|\([A-Za-z0-9]+\)|[•\-\*])\s+/gi, '\n\n$1 ')
    .replace(/\r?\n\s*\r?\n/g, '{{PARAGRAPH}}')
    .replace(/\r?\n/g, ' ')
    .replace(/{{PARAGRAPH}}/g, '\n');

  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const allSentences = [];

  const ABBREVIATIONS = [
    'Govt', 'govt', 'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
    'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
    'e\\.g', 'i\\.e', 'vs', 'etc', 'No', 'no', 'Rs', 'approx', 'dept', 'vol', 'p', 'pp', 'Advt'
  ];
  const abbrPattern = new RegExp(`\\b(${ABBREVIATIONS.join('|')})\\.`, 'gi');

  for (const line of lines) {
    let protectedLine = line.replace(abbrPattern, '$1\u0001');
    protectedLine = protectedLine.replace(/\b([A-Z])\./g, '$1\u0001');
    protectedLine = protectedLine.replace(/(\d+)\.(\d+)/g, '$1\u0002$2');
    protectedLine = protectedLine.replace(/^(\d+)\.\s+/g, '$1\u0003 ');

    const rawSegments = protectedLine.split(/(?<=[.!?])\s+(?=[A-Z0-9(\[])/);

    for (let segment of rawSegments) {
      segment = segment
        .replace(/\u0001/g, '.')
        .replace(/\u0002/g, '.')
        .replace(/\u0003/g, '.')
        .trim();
      if (segment) {
        allSentences.push(segment);
      }
    }
  }

  return allSentences;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createKeywordMatcher(keywords, { wholeWord = true } = {}) {
  const compiled = keywords.map(kw => {
    const trimmed = kw.trim();
    const pattern = escapeRegex(trimmed).replace(/\s+/g, '\\s+');
    const regex = wholeWord ? new RegExp(`\\b${pattern}\\b`, 'i') : new RegExp(pattern, 'i');
    return { keyword: trimmed, regex };
  });

  return function match(text) {
    const matchedKeywords = [];
    for (const { keyword, regex } of compiled) {
      if (regex.test(text)) {
        matchedKeywords.push(keyword);
      }
    }
    return matchedKeywords;
  };
}

function processDocument(pagesData, keywords, options = {}) {
  const {
    filterMode = 'sentence', // 'page', 'sentence', 'both'
    contextBefore = 0,
    contextAfter = 0,
    wholeWord = true
  } = options;

  const matcher = createKeywordMatcher(keywords, { wholeWord });

  let totalDocChars = 0;
  let totalDocWords = 0;
  const processedPages = [];
  const allMatchedKeywords = new Set();

  for (const page of pagesData) {
    const pageSentences = splitSentences(page.text);
    const pageText = page.text.trim();
    const pageChars = pageText.length;
    const pageWords = pageText.split(/\s+/).filter(Boolean).length;
    totalDocChars += pageChars;
    totalDocWords += pageWords;

    const matchedPageKeywords = matcher(pageText);

    // Sentence matching
    const matchedSentenceIndices = new Set();
    const sentenceMatchesMap = new Map();

    pageSentences.forEach((sentence, idx) => {
      const kwMatches = matcher(sentence);
      if (kwMatches.length > 0) {
        matchedSentenceIndices.add(idx);
        sentenceMatchesMap.set(idx, kwMatches);
        kwMatches.forEach(k => allMatchedKeywords.add(k));
      }
    });

    // Compute intervals with context
    const intervals = [];
    for (const idx of matchedSentenceIndices) {
      const start = Math.max(0, idx - contextBefore);
      const end = Math.min(pageSentences.length - 1, idx + contextAfter);
      intervals.push({ start, end });
    }

    // Merge intervals
    intervals.sort((a, b) => a.start - b.start);
    const mergedIntervals = [];
    for (const cur of intervals) {
      if (mergedIntervals.length === 0) {
        mergedIntervals.push({ start: cur.start, end: cur.end });
      } else {
        const prev = mergedIntervals[mergedIntervals.length - 1];
        if (cur.start <= prev.end + 1) {
          prev.end = Math.max(prev.end, cur.end);
        } else {
          mergedIntervals.push({ start: cur.start, end: cur.end });
        }
      }
    }

    const targetedSentences = [];
    for (const interval of mergedIntervals) {
      for (let i = interval.start; i <= interval.end; i++) {
        targetedSentences.push({
          sentenceIndex: i,
          text: pageSentences[i],
          isDirectMatch: matchedSentenceIndices.has(i),
          matchedKeywords: sentenceMatchesMap.get(i) || []
        });
      }
    }

    processedPages.push({
      pageNumber: page.pageNumber,
      hasMatch: matchedPageKeywords.length > 0,
      matchedKeywords: matchedPageKeywords,
      totalSentences: pageSentences.length,
      sentences: targetedSentences,
      pageText: pageText,
      extractedPageText: targetedSentences.map(s => s.text).join(' ')
    });
  }

  // Filter pages that had matches
  const matchedPages = processedPages.filter(p => p.hasMatch);

  let targetedText = '';
  if (filterMode === 'page') {
    targetedText = matchedPages.map(p => `--- [Page ${p.pageNumber}] ---\n${p.pageText}`).join('\n\n');
  } else {
    // sentence mode
    targetedText = matchedPages
      .filter(p => p.sentences.length > 0)
      .map(p => `--- [Page ${p.pageNumber}] ---\n${p.sentences.map(s => s.text).join(' ')}`)
      .join('\n\n');
  }

  const targetedChars = targetedText.length;
  const targetedWords = targetedText.split(/\s+/).filter(Boolean).length;
  const charReductionPct = totalDocChars > 0 ? (((totalDocChars - targetedChars) / totalDocChars) * 100).toFixed(1) : 0;
  const wordReductionPct = totalDocWords > 0 ? (((totalDocWords - targetedWords) / totalDocWords) * 100).toFixed(1) : 0;

  return {
    keywords,
    allMatchedKeywords: Array.from(allMatchedKeywords),
    totalPages: pagesData.length,
    matchedPagesCount: matchedPages.length,
    matchedPages: matchedPages.map(p => ({
      pageNumber: p.pageNumber,
      matchedKeywords: p.matchedKeywords,
      matchedSentencesCount: p.sentences.filter(s => s.isDirectMatch).length,
      totalExtractedSentencesCount: p.sentences.length,
      extractedSnippet: p.extractedPageText
    })),
    metrics: {
      originalChars: totalDocChars,
      extractedChars: targetedChars,
      charReductionPercent: parseFloat(charReductionPct),
      originalWords: totalDocWords,
      extractedWords: targetedWords,
      wordReductionPercent: parseFloat(wordReductionPct),
      estimatedOriginalTokens: Math.ceil(totalDocWords * 1.33),
      estimatedExtractedTokens: Math.ceil(targetedWords * 1.33)
    },
    targetedText
  };
}

const keywords = ['Age Limit', 'Bachelor', 'SC/ST'];
console.log('=== SENTENCE MODE (context: 0) ===');
const resSentence = processDocument(pages, keywords, { filterMode: 'sentence', contextBefore: 0, contextAfter: 0 });
console.log(JSON.stringify(resSentence.metrics, null, 2));
console.log('\nExtracted Text:');
console.log(resSentence.targetedText);

console.log('\n=== SENTENCE MODE (context: 1) ===');
const resSentenceCtx = processDocument(pages, keywords, { filterMode: 'sentence', contextBefore: 1, contextAfter: 1 });
console.log(JSON.stringify(resSentenceCtx.metrics, null, 2));

console.log('\n=== PAGE MODE ===');
const resPage = processDocument(pages, keywords, { filterMode: 'page' });
console.log(JSON.stringify(resPage.metrics, null, 2));
