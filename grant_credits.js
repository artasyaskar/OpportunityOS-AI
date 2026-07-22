const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'))
  });
}

const db = admin.firestore();
db.collection('profiles').get().then(snap => {
  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, { aiCredits: 1000 });
  });
  return batch.commit().then(() => snap.size);
}).then(size => {
  console.log('Updated ' + size + ' profiles with 1000 AI credits.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
