const admin = require('./backend-cronjob/node_modules/firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./global resources/firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearEligibleExams() {
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    await db.collection('users').doc(userDoc.id).update({
      eligibleExams: admin.firestore.FieldValue.delete()
    });
    console.log(`Cleared eligibleExams for user: ${userDoc.id}`);
  }
  console.log("Done!");
  process.exit(0);
}

clearEligibleExams();
