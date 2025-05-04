import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { CreditTransaction } from '../types/user';

export const earnCredits = async (
  fromUserId: string,
  toUserId: string,
  amount: number,
  description: string
) => {
  try {
    // Update receiver's credits
    const receiverRef = doc(db, 'users', toUserId);
    const receiverSnap = await getDoc(receiverRef);
    
    if (!receiverSnap.exists()) {
      throw new Error('Receiver not found');
    }

    const currentCredits = receiverSnap.data().credits || 0;
    await updateDoc(receiverRef, {
      credits: currentCredits + amount
    });

    // Create transaction record
    const transaction: Omit<CreditTransaction, 'id'> = {
      fromUserId,
      toUserId,
      amount,
      type: 'earn',
      description,
      createdAt: serverTimestamp() as unknown as Timestamp
    };

    await addDoc(collection(db, 'creditTransactions'), transaction);

    return true;
  } catch (error) {
    console.error('Error earning credits:', error);
    throw error;
  }
};

export const spendCredits = async (
  fromUserId: string,
  toUserId: string,
  amount: number,
  description: string
) => {
  try {
    // Check if spender has enough credits
    const spenderRef = doc(db, 'users', fromUserId);
    const spenderSnap = await getDoc(spenderRef);
    
    if (!spenderSnap.exists()) {
      throw new Error('Spender not found');
    }

    const currentCredits = spenderSnap.data().credits || 0;
    if (currentCredits < amount) {
      throw new Error('Insufficient credits');
    }

    // Update spender's credits
    await updateDoc(spenderRef, {
      credits: currentCredits - amount
    });

    // Update receiver's credits
    const receiverRef = doc(db, 'users', toUserId);
    const receiverSnap = await getDoc(receiverRef);
    
    if (!receiverSnap.exists()) {
      throw new Error('Receiver not found');
    }

    const receiverCredits = receiverSnap.data().credits || 0;
    await updateDoc(receiverRef, {
      credits: receiverCredits + amount
    });

    // Create transaction record
    const transaction: Omit<CreditTransaction, 'id'> = {
      fromUserId,
      toUserId,
      amount,
      type: 'spend',
      description,
      createdAt: serverTimestamp() as unknown as Timestamp
    };

    await addDoc(collection(db, 'creditTransactions'), transaction);

    return true;
  } catch (error) {
    console.error('Error spending credits:', error);
    throw error;
  }
};

export const getUserCredits = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    return userSnap.data().credits || 0;
  } catch (error) {
    console.error('Error getting user credits:', error);
    throw error;
  }
}; 