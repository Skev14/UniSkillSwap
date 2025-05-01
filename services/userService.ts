import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { UserProfile } from '../types/user';

export const createUserProfile = async (
  uid: string,
  email: string,
  profileData: Partial<UserProfile>
) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userData = {
      uid,
      email,
      ...profileData,
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, userData);
    return userData;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  uid: string,
  profileData: Partial<UserProfile>
) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, profileData, { merge: true });
    return profileData;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}; 