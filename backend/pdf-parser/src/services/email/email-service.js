const { renderFullEmailHtml, renderEmailText, generateSubject } = require('./template');

let ResendClass;
try {
  const resendPkg = require('resend');
  ResendClass = resendPkg.Resend || resendPkg;
} catch (_) {
  ResendClass = null;
}

class EmailService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.RESEND_API_KEY;
    this.senderEmail = config.senderEmail || process.env.SENDER_EMAIL || process.env.RESEND_FROM_EMAIL || 'MyPath <onboarding@resend.dev>';
    this.defaultRecipient = config.defaultRecipient || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'aspirant@example.com';
    this.resend = (this.apiKey && ResendClass) ? new ResendClass(this.apiKey) : null;
  }

  renderTemplates(exams, options = {}) {
    return {
      html: renderFullEmailHtml(exams, options),
      text: renderEmailText(exams, options),
      subject: options.subject || generateSubject(exams)
    };
  }

  async sendExamNotification(exams, options = {}) {
    const recipient = options.recipient || this.defaultRecipient;
    if (!recipient) throw new Error('Recipient email address is required');
    if (!exams || exams.length === 0) return { success: true, examCount: 0 };

    const { html: htmlContent, text: textContent, subject } = this.renderTemplates(exams, options);
    if (options.dryRun) return { success: true, dryRun: true };
    if (!this.resend) throw new Error('RESEND_API_KEY is missing.');

    try {
      const payload = {
        from: this.senderEmail,
        to: [recipient],
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const { data, error } = await this.resend.emails.send(payload);
      if (error) return { success: false, error };
      
      return { success: true, messageId: data?.id, recipient, examCount: exams.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = EmailService;