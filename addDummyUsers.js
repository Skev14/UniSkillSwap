const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json'); // Download this from Firebase Console

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function addDummyUsers() {
  const users = [
    {
      uid: 'dummyUser2',
      data: {
        skillsOffered: ['React Native', 'JavaScript'],
        skillsNeeded: ['HTML'],
        availability: ['Evening'],
        bio: 'I can help with React Native!',
        photoURL: ''
      }
    },
    {
      uid: 'dummyUser3',
      data: {
        skillsOffered: ['Python'],
        skillsNeeded: ['React Native'],
        availability: ['Morning'],
        bio: 'Python expert, looking to learn React Native.',
        photoURL: ''
      }
    }
  ];

  for (const user of users) {
    await db.collection('users').doc(user.uid).set(user.data);
    console.log(`Added user: ${user.uid}`);
  }
}

addDummyUsers().then(() => {
  console.log('Done!');
  process.exit();
}); 