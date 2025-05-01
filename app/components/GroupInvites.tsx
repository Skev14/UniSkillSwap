import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  senderId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: any;
}

export default function GroupInvites() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  const fetchInvitations = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const invitationsRef = collection(db, 'invitations');
      const q = query(
        invitationsRef,
        where('recipientId', '==', user.uid),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const invitationsList: Invitation[] = [];
      
      querySnapshot.forEach((doc) => {
        invitationsList.push({
          id: doc.id,
          ...doc.data()
        } as Invitation);
      });
      
      setInvitations(invitationsList);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string, groupId: string) => {
    if (processing) return;
    setProcessing(invitationId);
    
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      await updateDoc(invitationRef, { status: 'accepted' });
      
      // Add user to group members
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      const currentMembers = groupDoc.data()?.members || [];
      
      await updateDoc(groupRef, {
        members: [...currentMembers, user?.uid]
      });
      
      // Update local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    if (processing) return;
    setProcessing(invitationId);
    
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      await deleteDoc(invitationRef);
      
      // Update local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Error declining invitation:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Invitations</Text>
      {invitations.map((invitation) => (
        <View key={invitation.id} style={styles.invitationCard}>
          <Text style={styles.groupName}>{invitation.groupName}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleAccept(invitation.id, invitation.groupId)}
              disabled={!!processing}
            >
              {processing === invitation.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={() => handleDecline(invitation.id)}
              disabled={!!processing}
            >
              {processing === invitation.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Decline</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  invitationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
}); 