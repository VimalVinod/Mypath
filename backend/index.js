const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin (Using Env Vars for Render deployment)
// We will configure this properly when deploying
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

// ==========================================
// ROUTE 1: The "Pre-Warm" Ping (User's Idea)
// ==========================================
// This endpoint is called silently by the frontend to wake up Render
// so there is zero delay when the user actually signs up.
app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake and ready!');
});

// ==========================================
// ROUTE 2: Send Custom Verification Email
// ==========================================
app.post('/send-verification', async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 1. Generate the raw Firebase Verification Link
    const verificationLink = await admin.auth().generateEmailVerificationLink(email);

    // 2. Build the Custom HTML Template (Spotify style)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; text-align: center;">
        <h1 style="font-size: 28px; font-weight: 800; color: #000000; margin-bottom: 10px;">MyPath</h1>
        <h2 style="font-size: 22px; font-weight: 700; color: #000000; margin-bottom: 20px;">Nearly there</h2>
        <p style="font-size: 16px; color: #555555; margin-bottom: 30px;">
          Thanks for signing up to MyPath. Confirm your email now to activate your account, and you'll be all set to discover exams.
        </p>
        <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 4px; letter-spacing: 1px; text-transform: uppercase;">
          CONFIRM EMAIL
        </a>
        <div style="margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px; font-size: 12px; color: #999999;">
          If you're having trouble clicking the button, copy and paste this link into your browser:<br>
          <a href="${verificationLink}" style="color: #999999;">${verificationLink}</a>
        </div>
      </div>
    `;

    // 3. Send via Resend
    // Updated to wildcodestudios.in based on your clarification!
    const senderEmail = process.env.SENDER_EMAIL || 'MyPath Team <noreply@wildcodestudios.in>';
    
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: 'Last step — confirm your email',
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

// Export the app for Vercel Serverless Functions
module.exports = app;

const PORT = process.env.PORT || 10000;
// Only listen if not running in Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}
