const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createIndexes() {
  try {
    const db = admin.firestore();
    
    // Create index for groupMessages collection
    await db.collection('groupMessages').listIndexes();
    
    const index = {
      collectionGroup: 'groupMessages',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'groupId', order: 'ASCENDING' },
        { fieldPath: 'timestamp', order: 'ASCENDING' }
      ]
    };

    await db.collection('groupMessages').createIndex(index);
    console.log('Index created successfully!');
  } catch (error) {
    console.error('Error creating index:', error);
  } finally {
    process.exit();
  }
}

createIndexes(); 