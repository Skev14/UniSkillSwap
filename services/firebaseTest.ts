import { auth, db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test Firestore connection
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    console.log('Firestore connection successful!');
    
    // Test Auth connection
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('Auth connection successful! User is signed in:', user.email);
        } else {
          console.log('Auth connection successful! No user is signed in.');
        }
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    throw error;
  }
} 