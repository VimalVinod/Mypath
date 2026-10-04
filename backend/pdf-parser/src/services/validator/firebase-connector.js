const admin = require('firebase-admin');
const path = require('path');

// Point to the service account key you placed in global resources
const serviceAccountPath = path.join(__dirname, '../../../../../global resources/firebase-service-account.json');

// Initialize Firebase Admin (ensuring we only do it once)
if (!admin.apps.length) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (err) {
    console.error("❌ Failed to connect to Firebase. Check if the key is in global resources!");
    console.error(err.message);
  }
}

const db = admin.firestore();

/**
 * Fetches a real user from your live Firestore database
 * @param {string} userId - The Firebase UID of the user from your website
 */
async function getRealUser(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User with ID ${userId} not found in database.`);
    }
    return userDoc.data();
  } catch (err) {
    console.error("Error fetching real user:", err);
    return null;
  }
}

module.exports = { db, getRealUser };
