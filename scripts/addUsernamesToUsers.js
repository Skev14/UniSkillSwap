const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

async function addUsernamesToUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.username) {
      // Generate a username from the name or fallback to uid
      let username = '';
      if (data.name) {
        username = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      } else if (data.displayName) {
        username = data.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      } else {
        username = doc.id;
      }
      // Ensure username is not empty
      if (!username) username = doc.id;

      await doc.ref.update({ username });
      console.log(`Updated user ${doc.id} with username: ${username}`);
      updatedCount++;
    }
  }

  console.log(`Done! Updated ${updatedCount} users.`);
}

addUsernamesToUsers().catch(console.error); 