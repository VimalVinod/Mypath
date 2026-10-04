const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../../global resources/firebase-service-account.json'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkData() {
  console.log("Checking Firestore database 'mypath0'...");
  const collections = await db.listCollections();
  if (collections.length === 0) {
      console.log("No collections found. The database is entirely empty.");
  } else {
      console.log('Found ' + collections.length + ' collections.');
  }
  
  for (const col of collections) {
    const countSnap = await col.count().get();
    const count = countSnap.data().count;
    console.log('- Collection ' + col.id + ': ' + count + ' documents');
    
    if (count > 0) {
        const snap = await col.limit(3).get();
        console.log('  Sample Document IDs: ' + snap.docs.map(d => d.id).join(', '));
    }
  }
  process.exit(0);
}

checkData().catch(err => {
    console.error(err);
    process.exit(1);
});
