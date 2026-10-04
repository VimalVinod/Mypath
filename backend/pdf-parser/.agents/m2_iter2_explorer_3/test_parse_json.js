'use strict';

const assert = require('node:assert/strict');

function parseJsonSafely(text) {
  if (typeof text !== 'string') {
    throw new Error('Model response text is not a string.');
  }
  const clean = text.replace(/^\uFEFF/, '').trim();

  // Fast path: direct JSON parse
  if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    try {
      return JSON.parse(clean);
    } catch {
      // Fall through to resilient regex extractors
    }
  }

  // Attempt 1: Extract from markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Fall through
    }
  }

  // Attempt 2: Unclosed markdown code fence (```json ... [EOF])
  const unclosedMatch = clean.match(/^```(?:json)?\s*\n?([\s\S]+)$/i);
  if (unclosedMatch) {
    try {
      return JSON.parse(unclosedMatch[1].trim());
    } catch {
      // Fall through
    }
  }

  // Attempt 3: Outermost JSON object extraction from conversational prose
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    } catch {
      // Fall through
    }
  }

  // Fallback: standard JSON.parse on full text to produce standard SyntaxError
  return JSON.parse(clean);
}

// 1. Direct JSON
assert.deepEqual(parseJsonSafely('{"examTitle": "UPSC"}'), { examTitle: "UPSC" });

// 2. Standard markdown fence
assert.deepEqual(parseJsonSafely('```json\n{"examTitle": "UPSC"}\n```'), { examTitle: "UPSC" });

// 3. Markdown fence without language tag
assert.deepEqual(parseJsonSafely('```\n{"examTitle": "UPSC"}\n```'), { examTitle: "UPSC" });

// 4. Trailing commentary after code fence
assert.deepEqual(
  parseJsonSafely('```json\n{"examTitle": "UPSC"}\n```\nNote: Verified from official circular.'),
  { examTitle: "UPSC" }
);

// 5. Leading commentary before code fence
assert.deepEqual(
  parseJsonSafely('Here is the parsed JSON:\n```json\n{"examTitle": "UPSC"}\n```'),
  { examTitle: "UPSC" }
);

// 6. Leading AND trailing commentary around code fence
assert.deepEqual(
  parseJsonSafely('Here is the parsed JSON:\n```json\n{"examTitle": "UPSC"}\n```\nHope this helps!'),
  { examTitle: "UPSC" }
);

// 7. Unclosed code fence
assert.deepEqual(
  parseJsonSafely('```json\n{"examTitle": "UPSC"}'),
  { examTitle: "UPSC" }
);

// 8. Conversational prose with embedded JSON (no code fence)
assert.deepEqual(
  parseJsonSafely('The criteria found is: {"examTitle": "UPSC"} as requested.'),
  { examTitle: "UPSC" }
);

// 9. BOM character at start
assert.deepEqual(parseJsonSafely('\uFEFF{"examTitle": "UPSC"}'), { examTitle: "UPSC" });

// 10. Non-JSON errors thrown as SyntaxError
assert.throws(() => parseJsonSafely('<html>502 Bad Gateway</html>'), SyntaxError);
assert.throws(() => parseJsonSafely(''), SyntaxError);
assert.throws(() => parseJsonSafely('   '), SyntaxError);
assert.throws(() => parseJsonSafely('```json\n\n```'), SyntaxError);

// 11. Non-string errors thrown as Error
assert.throws(() => parseJsonSafely(null), /Model response text is not a string/);
assert.throws(() => parseJsonSafely(undefined), /Model response text is not a string/);
assert.throws(() => parseJsonSafely(123), /Model response text is not a string/);

console.log('ALL 11 parseJsonSafely TESTS PASSED!');
