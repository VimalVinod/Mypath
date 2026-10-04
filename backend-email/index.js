const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();

// Secure the backend: Only allow requests from your actual website (and local testing)
app.use(cors({
  origin: ['https://mypath0.web.app', 'http://localhost:5173']
}));
app.use(express.json());

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
  } catch (error) {
    console.log("Waiting for Firebase Service Account configuration...");
  }
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake and ready!');
});

app.post('/send-verification', async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const verificationLink = await admin.auth().generateEmailVerificationLink(email);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">

                <!-- Header: WildCode Studios branding -->
                <tr>
                  <td align="center" style="background-color: #000000; padding: 24px 40px;">
                    <img src="https://mypath0.web.app/wildcode-logo.png" alt="WildCode Studios" style="height: 48px; width: auto; display: block; margin: 0 auto;" />
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td align="center" style="padding: 48px 40px 32px;">
                    <!-- MyPath logo -->
                    <img src="https://mypath0.web.app/mypath-logo.png" alt="MyPath" style="height: 56px; width: auto; margin-bottom: 24px;" />

                    <h1 style="font-size: 26px; font-weight: 800; color: #111111; margin: 0 0 12px;">Nearly there</h1>
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 32px;">
                      Thanks for signing up to <strong>MyPath</strong>. Confirm your email now to activate your account and you'll be all set to discover and track your exams.
                    </p>

                    <!-- CTA Button -->
                    <a href="${verificationLink}" style="display: inline-block; padding: 15px 36px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 4px; letter-spacing: 1.5px; text-transform: uppercase;">
                      CONFIRM EMAIL
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #000000; padding: 24px 40px; border-top: none;">
                    <img src="https://mypath0.web.app/wildcode-logo.png" alt="WildCode Studios" style="height: 28px; width: auto; opacity: 0.5; margin-bottom: 10px;" />
                    <p style="font-size: 11px; color: #bbbbbb; margin: 0;">
                      MyPath is a product of WildCode Studios &bull; wildcodestudios.in
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const senderEmail = process.env.SENDER_EMAIL || 'MyPath Team <noreply@wildcodestudios.in>';
    
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: 'Last step to confirm your email',
      html: htmlContent,
    });

    if (error) {
      console.error("Resend Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/send-exam-alerts', async (req, res) => {
  const { email, name, newExams } = req.body;
  if (!email || !newExams || newExams.length === 0) return res.status(400).json({ error: 'Missing data' });
  try {
    const examListHtml = newExams.map(exam => `<div style='margin-bottom:16px;padding:12px;background:#f9f9f9;border-left:4px solid #000;'><h3 style='margin:0 0 4px;font-size:16px;color:#111;'>${exam.title || exam.examName}</h3><p style='margin:0;font-size:13px;color:#555;'>Deadline: ${exam.applicationEndDate || exam.importantDates?.applicationEndDate || 'N/A'}</p></div>`).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td align="center" style="background-color: #000000; padding: 24px 40px;">
                    <img src="https://mypath0.web.app/wildcode-logo.png" alt="WildCode Studios" style="height: 48px; width: auto; display: block; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding: 48px 40px 32px;">
                    <h1 style="font-size: 24px; font-weight: 800; color: #111111; margin: 0 0 16px;">Good news, ${name || 'User'}!</h1>
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 24px;">
                      You are eligible for <strong>${newExams.length} new exams</strong> based on your MyPath profile:
                    </p>
                    
                    ${examListHtml}
                    
                    <div style="text-align: center; margin-top: 32px;">
                      <a href="https://mypath0.web.app/dashboard" style="display: inline-block; padding: 15px 36px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 4px; text-transform: uppercase;">
                        VIEW DASHBOARD
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #000000; padding: 24px 40px; border-top: none;">
                    <img src="https://mypath0.web.app/wildcode-logo.png" alt="WildCode Studios" style="height: 28px; width: auto; opacity: 0.5; margin-bottom: 10px;" />
                    <p style="font-size: 11px; color: #bbbbbb; margin: 0;">
                      MyPath is a product of WildCode Studios &bull; wildcodestudios.in
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const senderEmail = process.env.SENDER_EMAIL || 'MyPath Team <noreply@wildcodestudios.in>';
    const { data, error } = await resend.emails.send({ from: senderEmail, to: [email], subject: `You are eligible for ${newExams.length} new exam(s)!`, html: htmlContent });
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Alert Error:', error);
    res.status(500).json({ error: 'Failed to send alert email' });
  }
});

// Export the app for Vercel Serverless Functions
module.exports = app;

const PORT = process.env.PORT || 10000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}
