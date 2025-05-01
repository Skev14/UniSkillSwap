import { collection, doc, getDoc, setDoc, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { getApps } from 'firebase/app';

const dummyUsers = [
  {
    id: 'dummy1',
    photoURL: 'https://xsgames.co/randomusers/assets/avatars/female/1.jpg',
    bio: 'Computer Science student looking to improve my math skills. I can help with programming!',
    skillsOffered: ['JavaScript', 'React Native', 'Python'],
    skillsNeeded: ['Calculus', 'Linear Algebra', 'Statistics'],
    availability: ['Morning', 'Weekend'],
    createdAt: null // Will be set to serverTimestamp() during creation
  },
  {
    id: 'dummy2',
    photoURL: 'https://xsgames.co/randomusers/assets/avatars/male/2.jpg',
    bio: 'Math major willing to help with any math subject. Looking to learn programming.',
    skillsOffered: ['Calculus', 'Linear Algebra', 'Statistics'],
    skillsNeeded: ['JavaScript', 'Python', 'Web Development'],
    availability: ['Evening', 'Weekend'],
    createdAt: null
  },
  {
    id: 'dummy3',
    photoURL: 'https://xsgames.co/randomusers/assets/avatars/female/3.jpg',
    bio: 'Physics student interested in exchanging knowledge about quantum mechanics and machine learning.',
    skillsOffered: ['Quantum Physics', 'Mathematics', 'Machine Learning'],
    skillsNeeded: ['Programming', 'Data Science', 'Statistics'],
    availability: ['Afternoon', 'Evening'],
    createdAt: null
  },
  {
    id: 'dummy4',
    photoURL: 'https://xsgames.co/randomusers/assets/avatars/male/4.jpg',
    bio: 'Data Science enthusiast looking to improve public speaking skills.',
    skillsOffered: ['Python', 'Data Analysis', 'Statistics'],
    skillsNeeded: ['Public Speaking', 'Presentation Skills', 'Communication'],
    availability: ['Morning', 'Afternoon'],
    createdAt: null
  },
  {
    id: 'dummy5',
    photoURL: 'https://xsgames.co/randomusers/assets/avatars/female/5.jpg',
    bio: 'Literature major offering help with essay writing and creative writing.',
    skillsOffered: ['Essay Writing', 'Creative Writing', 'Literature Analysis'],
    skillsNeeded: ['Digital Marketing', 'Social Media', 'Graphic Design'],
    availability: ['Evening', 'Weekend'],
    createdAt: null
  }
];

const clearExistingDummyData = async () => {
  try {
    console.log('Clearing existing dummy data...');
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    const deletePromises = snapshot.docs
      .filter(doc => doc.id.startsWith('dummy')) // Only delete dummy users
      .map(doc => {
        console.log(`Deleting user: ${doc.id}`);
        return deleteDoc(doc.ref);
      });
      
    await Promise.all(deletePromises);
    console.log('Finished clearing dummy data');
  } catch (error) {
    console.error('Error clearing dummy data:', error);
    throw error;
  }
};

const initializeDummyData = async () => {
  try {
    console.log('Starting dummy data initialization...');
    
    // Check if Firebase is initialized
    if (getApps().length === 0) {
      throw new Error('Firebase not initialized yet');
    }

    // Log authentication state
    console.log('Current auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');

    // Clear existing dummy data first
    await clearExistingDummyData();
    
    console.log('Adding new dummy users to Firestore...');
    // Add dummy users
    const usersCollection = collection(db, 'users');
    
    for (const userData of dummyUsers) {
      try {
        console.log(`Attempting to add user: ${userData.id}`);
        // Add serverTimestamp() for createdAt
        const userDataWithTimestamp = {
          ...userData,
          createdAt: serverTimestamp()
        };
        
        await setDoc(doc(usersCollection, userData.id), userDataWithTimestamp);
        console.log(`Successfully added user: ${userData.id}`);
      } catch (userError) {
        console.error(`Error adding user ${userData.id}:`, userError);
        // Log more details about the error
        if (userError instanceof Error) {
          console.error('Error details:', {
            message: userError.message,
            name: userError.name,
            stack: userError.stack
          });
        }
        throw userError; // Re-throw to stop the initialization if any user fails
      }
    }
    
    console.log('Successfully initialized dummy data');
    
    // Verify the data was added
    const verifySnapshot = await getDocs(collection(db, 'users'));
    console.log(`Total users in database: ${verifySnapshot.size}`);
    verifySnapshot.forEach(doc => {
      console.log(`Found user: ${doc.id}`);
    });
    
  } catch (error) {
    console.error('Error initializing dummy data:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw error;
  }
};

export default initializeDummyData; 