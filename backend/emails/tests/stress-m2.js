// tests/stress-m2.js
// Empirical Stress Test Harness for Milestone 2 (template.js)
const {
  renderExamCardHtml,
  renderFullEmailHtml,
  renderEmailText,
  generateSubject,
  calculateUrgency,
  escapeHtml
} = require('../src/services/email/template');

const suiteResults = [];

function runTest(suite, name, fn) {
  try {
    const detail = fn();
    suiteResults.push({ suite, name, pass: true, detail });
  } catch (err) {
    suiteResults.push({ suite, name, pass: false, error: err.message });
  }
}

// =========================================================================
// SUITE 1: XSS Defense & Sanitization
// =========================================================================
runTest('Suite 1: XSS Defense', 'T1.1 Script tags defanged in all fields', () => {
  const payload = '<script>alert("XSS")</script>';
  const exam = {
    examName: payload,
    organization: payload,
    importantDates: { applicationStartDate: payload, applicationEndDate: payload, examDate: payload },
    officialNotificationUrl: payload,
    applicationUrl: payload
  };
  const html = renderExamCardHtml(exam);
  if (html.includes('<script>')) throw new Error('Unescaped <script> found in HTML output');
  if (!html.includes('&lt;script&gt;')) throw new Error('Expected &lt;script&gt; entity');
  return 'All fields escaped <script> successfully';
});

runTest('Suite 1: XSS Defense', 'T1.2 Attribute breakout payload "><img src=x onerror=alert(1)>', () => {
  const payload = '"><img src=x onerror=alert(1)>';
  const exam = {
    examName: payload,
    organization: payload,
    officialNotificationUrl: payload,
    applicationUrl: payload
  };
  const html = renderExamCardHtml(exam);
  if (html.includes('<img')) throw new Error('Attribute breakout succeeded: <img tag unescaped');
  return 'Attribute breakout prevented, quotes and angle brackets escaped';
});

runTest('Suite 1: XSS Defense', 'T1.3 Recipient name sanitization in full email', () => {
  const payload = '<script>alert(document.domain)</script>';
  const html = renderFullEmailHtml([], { recipientName: payload });
  if (html.includes('<script>')) throw new Error('Unescaped script in recipientName');
  if (!html.includes('&lt;script&gt;')) throw new Error('Missing escaped recipientName');
  return 'Recipient name properly escaped in full email HTML';
});

runTest('Suite 1: XSS Defense', 'T1.4 Unicode & Devanagari text preservation', () => {
  const unicodeTitle = 'संघ लोक सेवा आयोग परीक्षा २०२६ (Combined Geo-Scientist)';
  const escaped = escapeHtml(unicodeTitle);
  if (escaped !== unicodeTitle) throw new Error('Unicode altered: ' + escaped);
  const card = renderExamCardHtml({ examName: unicodeTitle });
  if (!card.includes(unicodeTitle)) throw new Error('Unicode characters not rendered properly');
  return 'Non-ASCII Unicode characters preserved identically';
});

runTest('Suite 1: XSS Defense', 'T1.5 URI scheme validation for javascript: URLs', () => {
  const exam = {
    examName: 'JS URL Test',
    officialNotificationUrl: 'javascript:alert(1)',
    applicationUrl: 'javascript:alert(2)'
  };
  const card = renderExamCardHtml(exam);
  if (card.includes('href="javascript:alert(1)"')) {
    throw new Error('POTENTIAL_XSS_RISK: javascript: URI scheme allowed in href without sanitization');
  }
  return 'javascript: URLs sanitized or stripped';
});

// =========================================================================
// SUITE 2: Null / Undefined / Malformed Objects
// =========================================================================
runTest('Suite 2: Resilience', 'T2.1 renderExamCardHtml with null and undefined', () => {
  const res1 = renderExamCardHtml(null);
  const res2 = renderExamCardHtml(undefined);
  if (res1 !== '' || res2 !== '') throw new Error('Expected empty string for null/undefined exam');
  return 'Handled null and undefined exam safely';
});

runTest('Suite 2: Resilience', 'T2.2 renderExamCardHtml with empty object {}', () => {
  const card = renderExamCardHtml({});
  if (!card.includes('Official Government Examination')) throw new Error('Missing fallback exam title');
  if (!card.includes('Dates Announced')) throw new Error('Missing fallback status badge');
  return 'Empty exam object fell back to default labels';
});

runTest('Suite 2: Resilience', 'T2.3 renderFullEmailHtml with null options', () => {
  const res = renderFullEmailHtml([], null);
  if (!res.includes('Hello <strong>Aspirant</strong>')) throw new Error('Failed null options');
  return 'Handled null options safely';
});

runTest('Suite 2: Resilience', 'T2.4 renderEmailText with null options', () => {
  const res = renderEmailText([], null);
  if (!res.includes('Hello Aspirant')) throw new Error('Failed null options');
  return 'Handled null options safely';
});

runTest('Suite 2: Resilience', 'T2.5 renderFullEmailHtml with array containing null/undefined elements', () => {
  const html = renderFullEmailHtml([null, undefined, { examName: 'Valid Exam' }]);
  if (!html.includes('Valid Exam')) throw new Error('Missing valid exam card');
  return 'Array containing null/undefined handled without crash in HTML renderer';
});

runTest('Suite 2: Resilience', 'T2.6 renderEmailText with array containing null/undefined elements', () => {
  const text = renderEmailText([null, undefined, { examName: 'Valid Exam' }]);
  if (!text.includes('VALID EXAM')) throw new Error('Missing valid exam text');
  return 'Array containing null/undefined handled without crash in text renderer';
});

runTest('Suite 2: Resilience', 'T2.7 generateSubject with array containing null/undefined element', () => {
  const subj1 = generateSubject([null]);
  const subj2 = generateSubject([undefined]);
  return `Subjects: "${subj1}", "${subj2}"`;
});

// =========================================================================
// SUITE 3: Boundary Dates & Urgency Status
// =========================================================================
const ref = new Date('2026-09-09T12:00:00.000Z');

runTest('Suite 3: Boundaries', 'T3.1 Exactly 3 days remaining (+72h)', () => {
  const res = calculateUrgency(new Date(ref.getTime() + 72 * 3600 * 1000).toISOString(), ref);
  if (res.status !== 'critical' || res.daysRemaining !== 3) throw new Error('Expected critical status, got ' + res.status);
  return `status: ${res.status}, daysRemaining: ${res.daysRemaining}, badge: ${res.badgeText}`;
});

runTest('Suite 3: Boundaries', 'T3.2 3 days + 1 second (+72h 1s)', () => {
  const res = calculateUrgency(new Date(ref.getTime() + (72 * 3600 + 1) * 1000).toISOString(), ref);
  if (res.status !== 'warning' || res.daysRemaining !== 4) throw new Error('Expected warning status, got ' + res.status);
  return `status: ${res.status}, daysRemaining: ${res.daysRemaining}, badge: ${res.badgeText}`;
});

runTest('Suite 3: Boundaries', 'T3.3 Exactly 7 days remaining (+168h)', () => {
  const res = calculateUrgency(new Date(ref.getTime() + 168 * 3600 * 1000).toISOString(), ref);
  if (res.status !== 'warning' || res.daysRemaining !== 7) throw new Error('Expected warning status, got ' + res.status);
  return `status: ${res.status}, daysRemaining: ${res.daysRemaining}, badge: ${res.badgeText}`;
});

runTest('Suite 3: Boundaries', 'T3.4 7 days + 1 second (+168h 1s)', () => {
  const res = calculateUrgency(new Date(ref.getTime() + (168 * 3600 + 1) * 1000).toISOString(), ref);
  if (res.status !== 'open' || res.daysRemaining !== 8) throw new Error('Expected open status, got ' + res.status);
  return `status: ${res.status}, daysRemaining: ${res.daysRemaining}, badge: ${res.badgeText}`;
});

runTest('Suite 3: Boundaries', 'T3.5 Past deadline (-5 days)', () => {
  const res = calculateUrgency(new Date(ref.getTime() - 5 * 24 * 3600 * 1000).toISOString(), ref);
  if (res.status !== 'expired') throw new Error('Expected expired status, got ' + res.status);
  return `status: ${res.status}, daysRemaining: ${res.daysRemaining}, badge: ${res.badgeText}`;
});

runTest('Suite 3: Boundaries', 'T3.6 Sub-day past deadline (-2 hours ago)', () => {
  const res = calculateUrgency(new Date(ref.getTime() - 2 * 3600 * 1000).toISOString(), ref);
  if (res.status !== 'expired') {
    throw new Error(`BOUNDARY_BUG: Deadline passed 2 hours ago but status is "${res.status}" with badge "${res.badgeText}"`);
  }
  return `status: ${res.status}, badge: ${res.badgeText}`;
});

runTest('Suite 3: Boundaries', 'T3.7 Non-standard and invalid date inputs', () => {
  const r1 = calculateUrgency('TBD', ref);
  const r2 = calculateUrgency(null, ref);
  const r3 = calculateUrgency('September 20, 2026', ref);
  if (r1.status !== 'unknown' || r2.status !== 'unknown') throw new Error('Expected unknown for invalid dates');
  if (r3.status !== 'open') throw new Error('Expected open for September 20, 2026');
  return 'Invalid dates classified unknown, valid text dates parsed';
});

// =========================================================================
// SUITE 4: Plain Text Layout & Stability
// =========================================================================
runTest('Suite 4: Plain Text', 'T4.1 10,000 character exam title layout stability', () => {
  const longTitle = 'A'.repeat(10000);
  const text = renderEmailText([{ examName: longTitle }]);
  if (!text.includes(longTitle.toUpperCase())) throw new Error('Long title missing');
  return '10,000 character title rendered without layout crash';
});

runTest('Suite 4: Plain Text', 'T4.2 Plain text missing fields fallback display', () => {
  const text = renderEmailText([{}]);
  if (!text.includes('GOVERNMENT EXAMINATION')) throw new Error('Missing fallback title');
  if (!text.includes('Organization: GOVT')) throw new Error('Missing fallback org');
  if (!text.includes('Status:       Dates Announced')) throw new Error('Missing fallback status');
  if (!text.includes('Deadline:     Not specified')) throw new Error('Missing fallback deadline');
  return 'All missing fields display fallback placeholders';
});

runTest('Suite 4: Plain Text', 'T4.3 Plain text empty array handling', () => {
  const text = renderEmailText([]);
  if (!text.includes('0 new exam notification(s)')) throw new Error('Expected 0 count');
  return 'Empty array returns clean header and footer';
});

console.log(JSON.stringify(suiteResults, null, 2));
