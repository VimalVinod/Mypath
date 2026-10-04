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

                <!-- Header: WildCode Studios branding (like Spotify header) -->
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

                <!-- Divider image area -->
                <tr>
                  <td align="center" style="padding: 0 40px 32px;">
                    <p style="font-size: 12px; color: #aaaaaa; margin-top: 32px;">
                      If you're having trouble clicking the button, copy and paste this link into your browser:
                    </p>
                    <a href="${verificationLink}" style="font-size: 11px; color: #aaaaaa; word-break: break-all;">${verificationLink}</a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #f9f9f9; padding: 24px 40px; border-top: 1px solid #eeeeee;">
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
      subject: 'Last step â€” confirm your email',
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
// --- ELIGIBILITY MATH (Copied from main backend) ---
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function educationRank(level = '') {
  const l = level.toLowerCase();
  if (l.includes('phd') || l.includes('doctorate')) return 6;
  if (l.includes('pg') || l.includes('post') || l.includes('master')) return 5;
  if (l.includes('graduate') || l.includes('degree') || l.includes('bachelor') || l.includes('b.tech') || l.includes('b.e') || l.includes('ba') || l.includes('bsc') || l.includes('bcom')) return 4;
  if (l.includes('diploma')) return 3;
  if (l.includes('12') || l.includes('intermediate') || l.includes('higher secondary')) return 2;
  if (l.includes('10') || l.includes('matriculation') || l.includes('sslc')) return 1;
  return 0;
}

function checkEligibility(user, eligibility) {
  if (!eligibility) return { eligible: true, reason: 'No eligibility data - assuming eligible' };

  const userAge = calculateAge(user.dob);
  const userCategory = (user.category || 'General').toUpperCase();
  const userEducation = user.education || [];

  if (eligibility.minAge && userAge !== null && userAge < eligibility.minAge) {
    return { eligible: false, reason: `Age ${userAge} is below minimum ${eligibility.minAge}` };
  }

  let effectiveMaxAge = eligibility.maxAge;
  if (effectiveMaxAge && eligibility.ageRelaxation && eligibility.ageRelaxation.length > 0) {
    for (const relaxation of eligibility.ageRelaxation) {
      const cat = (relaxation.category || '').toUpperCase();
      if (
        (userCategory === 'SC' && cat.includes('SC')) ||
        (userCategory === 'ST' && (cat.includes('ST') || cat.includes('SC'))) ||
        (userCategory === 'OBC-NCL' && cat.includes('OBC')) ||
        (userCategory === 'EWS' && cat.includes('EWS')) ||
        (user.isPwbd && cat.includes('PWBD')) ||
        (user.isExServiceman && cat.includes('EX'))
      ) {
        effectiveMaxAge += relaxation.years;
        break;
      }
    }
  }

  if (effectiveMaxAge && userAge !== null && userAge > effectiveMaxAge) {
    return { eligible: false, reason: `Age ${userAge} exceeds maximum ${effectiveMaxAge}` };
  }

  if (eligibility.requiredEducation && eligibility.requiredEducation.length > 0) {
    const userHighestRank = userEducation.length > 0
      ? Math.max(...userEducation.map(e => educationRank(e.level || '')))
      : 0;

    const requiredRanks = eligibility.requiredEducation.map(req => {
      const r = req.toLowerCase();
      if (r.includes('any degree') || r.includes('bachelor') || r.includes('graduate')) return 4;
      if (r.includes('post') || r.includes('master')) return 5;
      if (r.includes('diploma')) return 3;
      if (r.includes('12') || r.includes('intermediate')) return 2;
      if (r.includes('10') || r.includes('matric')) return 1;
      return 4; 
    });

    const minRequiredRank = Math.min(...requiredRanks);
    if (userHighestRank < minRequiredRank && userHighestRank > 0) {
      return { eligible: false, reason: `Education level insufficient` };
    }
  }

  return { eligible: true, reason: 'Meets all criteria' };
}

// --- NEW INSTANT MATCH ENDPOINT ---
app.post('/match-user', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const db = admin.firestore();
    
    // 1. Get the user
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();

    // 2. Get all active exams
    const examsSnapshot = await db.collection('exams').get();
    
    const eligibleHashes = [];
    
    // 3. Run the math instantly
    examsSnapshot.forEach(doc => {
      const exam = doc.data();
      const { eligible } = checkEligibility(userData, exam.eligibility);
      if (eligible) {
        eligibleHashes.push(exam.id || doc.id);
      }
    });

    // 4. Save to Firebase instantly
    await db.collection('users').doc(userId).set({
      eligibleExams: eligibleHashes
    }, { merge: true });

    res.status(200).json({ 
      success: true, 
      matchedCount: eligibleHashes.length,
      eligibleExams: eligibleHashes
    });

  } catch (error) {
    console.error("Match Error:", error);
    res.status(500).json({ error: 'Internal server error during matching' });
  }
});

module.exports = app;

const PORT = process.env.PORT || 10000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

