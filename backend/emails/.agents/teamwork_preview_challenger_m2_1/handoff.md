# Empirical Challenge Report: Milestone 2 Email Templates (`template.js`)

- **Agent**: `teamwork_preview_challenger_m2_1`
- **Role**: Milestone 2 Empirical Challenger (Adversarial Critic & Domain Specialist)
- **Target File**: `src/services/email/template.js`
- **Handoff Type**: Hard
- **Date**: 2026-09-08T22:05:00Z
- **Verdict**: **REJECT** (Requires Minor Hardening Fixes)

---

## 1. Observation

### 1.1 Baseline Verification
- Existing test suite passed:
  ```powershell
  node --test
  ```
  *Result*: 171 passed across 43 test suites, 0 failed (2.03s).

### 1.2 Empirical Stress Test Execution
A specialized 22-test adversarial stress harness was implemented in `tests/stress-m2.js` and executed:
```powershell
node tests/stress-m2.js
```
*Result*: 16 tests PASSED, 6 tests FAILED.

### 1.3 Verbatim Failures and Errors Observed

1. **Failure 1 (Critical Crash — Process Termination on Null Array Elements in Text Generator)**:
   - Command: `node -e "const { renderEmailText } = require('./src/services/email/template'); renderEmailText([null]);"`
   - Exact error:
     ```
     TypeError: Cannot read properties of null (reading 'importantDates')
         at src/services/email/template.js:310:24
         at Array.forEach (<anonymous>)
         at renderEmailText (src/services/email/template.js:309:12)
     ```
   - Same error occurs for `renderEmailText([undefined])` and mixed arrays `[null, undefined, { examName: 'Test' }]`.
   - Contrast with HTML renderer (`renderExamCardHtml`), which properly guards `if (!exam || typeof exam !== 'object') return '';`.

2. **Failure 2 (Critical Crash — Process Termination on Null Array Elements in Subject Generator)**:
   - Command: `node -e "const { generateSubject } = require('./src/services/email/template'); generateSubject([null]);"`
   - Exact error:
     ```
     TypeError: Cannot read properties of null (reading 'examName')
         at generateSubject (src/services/email/template.js:346:23)
     ```
   - Same error occurs for `generateSubject([undefined])`.

3. **Failure 3 (High Crash — Process Termination on Null Options)**:
   - Command: `node -e "const { renderFullEmailHtml } = require('./src/services/email/template'); renderFullEmailHtml([], null);"`
   - Exact error:
     ```
     TypeError: Cannot read properties of null (reading 'recipientName')
         at renderFullEmailHtml (src/services/email/template.js:204:33)
     ```
   - Command: `node -e "const { renderEmailText } = require('./src/services/email/template'); renderEmailText([], null);"`
   - Exact error:
     ```
     TypeError: Cannot read properties of null (reading 'recipientName')
         at renderEmailText (src/services/email/template.js:295:33)
     ```
   - Default parameters (`options = {}`) in JavaScript only apply when the argument is `undefined`. Passing `null` retains `options = null`.

4. **Failure 4 (Logic & Behavioral Inversion — Expired Deadlines Labeled "Closing Soon")**:
   - In `src/services/email/template.js` lines 61-75:
     ```javascript
     const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
     const diffMs = deadline.getTime() - now.getTime();
     const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

     if (days < 0) {
       return { daysRemaining: days, status: 'expired', badgeText: 'Application Closed', ... };
     }
     if (days <= 3) {
       return { daysRemaining: days, status: 'critical', badgeText: `⚠️ Closing Soon (${days}d left)`, ... };
     }
     ```
   - Test observation:
     ```javascript
     const ref = new Date('2026-09-09T12:00:00.000Z');
     const expired2hAgo = new Date('2026-09-09T10:00:00.000Z'); // 2 hours in the past
     calculateUrgency(expired2hAgo, ref);
     ```
   - Output observed:
     ```json
     {
       "daysRemaining": -0,
       "status": "critical",
       "badgeText": "⚠️ Closing Soon (0d left)",
       "badgeColor": "#b91c1c",
       "badgeBg": "#fee2e2"
     }
     ```
   - Mechanism: When an exam deadline passed 2 hours ago, `diffMs = -7,200,000`. Dividing by `86,400,000` yields `-0.0833`. In JavaScript, `Math.ceil(-0.0833)` returns `-0`. In JavaScript IEEE 754 arithmetic, `-0 < 0` is `false`. Thus, `if (days < 0)` fails to trigger! It falls through to `if (days <= 3)`, which evaluates to `true` (`-0 <= 3` is `true`). As a result, an exam whose deadline has already closed is emailed to candidates claiming `⚠️ Closing Soon (0d left)`. It only registers as expired if the deadline passed > 24 hours ago.

5. **Failure 5 (XSS / Untrusted URI Protocol Injection)**:
   - In `renderExamCardHtml`:
     ```javascript
     const notifUrl = escapeHtml(exam.officialNotificationUrl || exam.notificationUrl || '#');
     const appUrl = (exam.applicationUrl && typeof exam.applicationUrl === 'string')
       ? escapeHtml(exam.applicationUrl)
       : null;
     ```
   - Observed output when `officialNotificationUrl: "javascript:alert(1)"`:
     ```html
     <a href="javascript:alert(1)" target="_blank" style="...">View Notification (PDF) &rarr;</a>
     ```
   - `escapeHtml` escapes `& < > " '`, but does not inspect or validate URI protocols (`javascript:`, `data:`). In email previewers (such as `output/email-preview.html` opened in browser), clicking the button executes attacker JavaScript.

### 1.4 Passed Tests
- Standard XSS injection in `examName`, `organization`, `importantDates`: `<script>alert(1)</script>` and `"><img src=x onerror=alert(1)>` are properly escaped to HTML entities (`&lt;script&gt;`, `&quot;&gt;&lt;img`).
- Non-ASCII / Unicode text (Devanagari: `संघ लोक सेवा आयोग परीक्षा २०२६`) is 100% preserved without mangling.
- Extremely long exam titles (10,000 characters) render cleanly without buffer overflows or layout distortion.
- Empty arrays `[]` and empty exam records `{}` fall back cleanly to placeholders in both HTML and plain-text modes.
- Day boundary checks for positive intervals (`+3d`, `+4d`, `+7d`, `+8d`, `-5d`) function accurately.

---

## 2. Logic Chain

1. **From Observation 1.3.1 to Unhandled Process Crash**:
   - `renderEmailText` iterates `examList.forEach(exam => ...)`. Line 310 directly accesses `exam.importantDates` without verifying that `exam` is non-null. When a null/undefined item exists in the array, Node.js throws an uncaught `TypeError` that will abort the notification loop and take down the CLI script or serverless function.
2. **From Observation 1.3.2 to Subject Generator Crash**:
   - `generateSubject` checks `if (exams.length === 1)` and then accesses `exam.examName`. If `exams` is `[null]`, `exam` is `null`, throwing an unhandled `TypeError`.
3. **From Observation 1.3.3 to Parameter Handling Flaw**:
   - `renderFullEmailHtml(exams, options)` and `renderEmailText(exams, options)` default `options` to `{}` in the parameter list. In JavaScript, default arguments are only evaluated when the argument is `undefined`. Callers passing `null` trigger `TypeError: Cannot read properties of null (reading 'recipientName')`.
4. **From Observation 1.3.4 to Urgency Status Inversion**:
   - The calculation relies on `days < 0` where `days = Math.ceil(diffMs / msPerDay)`. Any negative duration between 0 and -24 hours results in `days = -0`. In JS, `-0 < 0` is false. Because `-0 <= 3` is true, all intraday expired exams are classified as `critical` (`Closing Soon`) instead of `expired` (`Application Closed`). Checking `diffMs < 0` directly eliminates this mathematical flaw.
5. **From Observation 1.3.5 to Protocol XSS Risk**:
   - While HTML entity injection is defended against, URL protocol injection is not. Standard security practice requires protocol whitelisting (`http:`, `https:`, `#`, or relative paths) before injecting values into `<a href="...">`.

---

## 3. Caveats

- **Upstream Protection**: `ScraperManager` in Milestone 1 filters null/undefined items from its aggregated results, meaning standard pipeline runs with healthy scrapers might not hit the `[null]` crash. However, unit tests, standalone consumers, or custom scrapers passing malformed arrays will trigger immediate unhandled exceptions.
- **Email Client XSS Filtering**: Many modern desktop and webmail clients (Gmail, Outlook) automatically strip `javascript:` URIs. However, local preview files (`output/email-preview.html`) and less restrictive email clients remain vulnerable.

---

## 4. Conclusion

**VERDICT: REJECT**

While the HTML table styling, responsiveness, standard escaping, and 171 contract tests pass, `src/services/email/template.js` contains two unhandled process-terminating `TypeError` crashes, a null-options crash, an urgency calculation boundary bug that inverts expired exams to "Closing Soon", and unvalidated URI protocols.

### Required Concrete Fixes (All in `src/services/email/template.js`):

1. **Fix `calculateUrgency` (lines 61-66)**:
   Check `diffMs < 0` directly before computing ceiling days:
   ```javascript
   const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
   const diffMs = deadline.getTime() - now.getTime();
   if (diffMs < 0) {
     return {
       daysRemaining: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
       status: 'expired',
       badgeText: 'Application Closed',
       badgeColor: '#4b5563',
       badgeBg: '#f3f4f6'
     };
   }
   const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
   ```

2. **Fix `renderFullEmailHtml` & `renderEmailText` options guard (lines 204, 295)**:
   ```javascript
   const opts = options || {};
   const recipientName = opts.recipientName || 'Aspirant';
   const refDate = opts.referenceDate || referenceDate || new Date();
   ```

3. **Fix `renderEmailText` exam null guard (line 310)**:
   ```javascript
   examList.forEach((exam, index) => {
     if (!exam || typeof exam !== 'object') return;
     const dates = exam.importantDates || {};
   ```

4. **Fix `generateSubject` exam null guard (line 345)**:
   ```javascript
   if (exams.length === 1) {
     const exam = exams[0] || {};
     const name = exam.examName || exam.title || 'Government Examination';
     const org = exam.organization || 'GOVT';
     return `🔔 New Exam Alert: ${name} (${org})`;
   }
   ```

5. **Fix URL Protocol Sanitization in `renderExamCardHtml` (lines 121-124)**:
   ```javascript
   function sanitizeUrl(url) {
     if (!url || typeof url !== 'string') return '#';
     const trimmed = url.trim();
     return (/^(https?:\/\/|\/|#)/i.test(trimmed)) ? escapeHtml(trimmed) : '#';
   }
   const notifUrl = sanitizeUrl(exam.officialNotificationUrl || exam.notificationUrl);
   const appUrl = (exam.applicationUrl && typeof exam.applicationUrl === 'string')
     ? sanitizeUrl(exam.applicationUrl)
     : null;
   ```

Once these 5 straightforward hardening patches are applied by the worker, Milestone 2 will achieve a full **APPROVE** verdict.

---

## 5. Verification Method

### Test Commands
1. Run the empirical stress harness:
   ```powershell
   node tests/stress-m2.js
   ```
   *Expected Result after fix*: 22 tests PASS, 0 fail.
2. Run project test suite:
   ```powershell
   node --test
   ```
   *Expected Result*: 171 tests PASS, 0 fail.
3. Test dry-run CLI:
   ```powershell
   node src/scripts/test-email.js --dry-run
   ```
   *Expected Result*: Exit code 0, preview generated.

### Invalidation Conditions
- Any of the 22 tests in `tests/stress-m2.js` fail.
- `renderEmailText([null])` throws a TypeError.
- `calculateUrgency` returns `critical` for a deadline 2 hours in the past.
- Any regression in `node --test` (less than 171 pass).
