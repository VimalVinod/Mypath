const admin = require("firebase-admin");
const serviceAccount = require("./backend-cronjob/mypath0-firebase-adminsdk-hms39-e973e721be.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getUsers() {
  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data().email);
  });
}

getUsers();
