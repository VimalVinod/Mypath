// tests/unit/template.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getTemplateService } = require('../helpers/loader');

describe('Email Template Service Unit Tests', () => {
  const template = getTemplateService();

  describe('HTML Entity Escaping (XSS Prevention)', () => {
    it('should escape dangerous characters & < > " \'', () => {
      const malicious = '<script>alert("XSS" & \'attack\')</script>';
      const escaped = template.escapeHtml(malicious);
      assert.ok(!escaped.includes('<script>'), 'Must not contain unescaped script tag');
      assert.ok(escaped.includes('&lt;script&gt;'), 'Must encode opening tag');
      assert.ok(escaped.includes('&amp;'), 'Must encode ampersand');
      assert.ok(escaped.includes('&quot;'), 'Must encode double quote');
      assert.ok(escaped.includes('&#039;'), 'Must encode single quote');
    });

    it('should handle null, undefined, and non-string inputs safely', () => {
      assert.equal(template.escapeHtml(null), '');
      assert.equal(template.escapeHtml(undefined), '');
      assert.equal(template.escapeHtml(12345), '12345');
    });
  });

  describe('Urgency Indicator Calculation', () => {
    const fixedNow = new Date('2026-09-09T00:00:00.000Z');

    it('should return critical status for deadlines within 3 days', () => {
      const urgentDate = '2026-09-11T12:00:00.000Z'; // ~2.5 days away
      const urgency = template.calculateUrgency(urgentDate, fixedNow);
      assert.equal(urgency.status, 'critical');
      assert.ok(urgency.badgeText.includes('Closing Soon'));
      assert.equal(urgency.badgeColor, '#b91c1c');
    });

    it('should return warning status for deadlines within 7 days', () => {
      const warningDate = '2026-09-15T00:00:00.000Z'; // 6 days away
      const urgency = template.calculateUrgency(warningDate, fixedNow);
      assert.equal(urgency.status, 'warning');
      assert.ok(urgency.badgeText.includes('Deadline Approaching'));
      assert.equal(urgency.badgeColor, '#b45309');
    });

    it('should return open status for deadlines beyond 7 days', () => {
      const openDate = '2026-10-15T00:00:00.000Z'; // 36 days away
      const urgency = template.calculateUrgency(openDate, fixedNow);
      assert.equal(urgency.status, 'open');
      assert.ok(urgency.badgeText.includes('Applications Open'));
      assert.equal(urgency.badgeColor, '#15803d');
    });

    it('should return expired status for past deadlines', () => {
      const pastDate = '2026-08-01T00:00:00.000Z';
      const urgency = template.calculateUrgency(pastDate, fixedNow);
      assert.equal(urgency.status, 'expired');
      assert.ok(urgency.badgeText.includes('Application Closed'));
    });

    it('should return unknown status for missing or invalid dates', () => {
      assert.equal(template.calculateUrgency(null, fixedNow).status, 'unknown');
      assert.equal(template.calculateUrgency('Invalid Date String', fixedNow).status, 'unknown');
    });
  });

  describe('Full HTML Email Layout Rendering', () => {
    const sampleExams = [
      {
        id: 'UPSC_CSE_2026',
        examName: 'Civil Services Examination 2026',
        organization: 'UPSC',
        importantDates: {
          applicationStartDate: '2026-02-05',
          applicationEndDate: '2026-03-05',
          examDate: '2026-05-24'
        },
        officialNotificationUrl: 'https://upsc.gov.in/notice.pdf',
        applicationUrl: 'https://upsconline.nic.in',
        scrapedAt: new Date().toISOString()
      },
      {
        id: 'SSC_CGL_2026',
        examName: 'Combined Graduate Level 2026',
        organization: 'SSC',
        importantDates: {
          applicationStartDate: '2026-08-15',
          applicationEndDate: '2026-09-15'
        },
        officialNotificationUrl: 'https://ssc.gov.in/notice.pdf',
        scrapedAt: new Date().toISOString()
      }
    ];

    it('should generate responsive 600px email container with branding and cards', () => {
      const html = template.renderFullEmailHtml(sampleExams, { recipientName: 'Test Aspirant' });
      assert.ok(html.includes('width="600"'), 'Must contain 600px max container');
      assert.ok(html.includes('ExamGo'), 'Must contain ExamGo branding');
      assert.ok(html.includes('Test Aspirant'), 'Must include personalized recipient greeting');
      assert.ok(html.includes('Civil Services Examination 2026'), 'Must render exam 1 card');
      assert.ok(html.includes('Combined Graduate Level 2026'), 'Must render exam 2 card');
      assert.ok(html.includes('View Notification (PDF)'), 'Must render CTA button');
      assert.ok(html.includes('Apply Online'), 'Must render application button when present');
    });

    it('should render plain-text fallback with all important fields', () => {
      const text = template.renderEmailText(sampleExams, { recipientName: 'Test Aspirant' });
      assert.ok(text.includes('CIVIL SERVICES EXAMINATION 2026'));
      assert.ok(text.includes('COMBINED GRADUATE LEVEL 2026'));
      assert.ok(text.includes('Organization: UPSC'));
      assert.ok(text.includes('Organization: SSC'));
      assert.ok(text.includes('https://upsc.gov.in/notice.pdf'));
      assert.ok(text.includes('https://upsconline.nic.in'));
    });

    it('should generate dynamic subject line based on count', () => {
      assert.equal(template.generateSubject([]), '🔔 Exam Notification Update');
      assert.equal(
        template.generateSubject([sampleExams[0]]),
        '🔔 New Exam Alert: Civil Services Examination 2026 (UPSC)'
      );
      assert.equal(
        template.generateSubject(sampleExams),
        '🔔 New Exam Alerts: 2 New Government Exams Announced'
      );
    });
  });
});
