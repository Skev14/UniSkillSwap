import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import TaskCreditEarning from '../../components/TaskCreditEarning';
import { earnCredits } from '../../services/creditService';

interface StudySession {
  id: string;
  title: string;
  description: string;
  studentId: string;
  studentName: string;
  helperId: string;
  skill: string;
  status: 'pending' | 'accepted' | 'completed';
  createdAt: any;
  credits: number;
  completedAt?: any;
}

export default function TasksScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if (!user) return;
    try {
      // Get sessions where the current user is the helper
      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef, 
        where('helperId', '==', user.uid),
        where('status', '==', 'accepted')
      );
      const querySnapshot = await getDocs(q);
      
      const sessionsList: StudySession[] = [];
      querySnapshot.forEach((doc) => {
        sessionsList.push({ id: doc.id, ...doc.data() } as StudySession);
      });
      
      setSessions(sessionsList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const handleSessionComplete = async (sessionId: string) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      if (!sessionDoc.exists()) return;

      const sessionData = sessionDoc.data();
      await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: new Date(),
      });

      // Automatically earn credits when completing a session
      if (sessionData.credits > 0) {
        await earnCredits(
          sessionData.studentId,
          sessionData.helperId,
          sessionData.credits,
          `Completed study session: ${sessionData.title}`
        );
      }

      fetchSessions(); // Refresh the sessions list
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Study Sessions</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>{item.title}</Text>
            <Text style={styles.sessionDescription}>{item.description}</Text>
            <Text style={styles.skill}>Skill: {item.skill}</Text>
            <Text style={styles.student}>Student: {item.studentName}</Text>
            <Text style={styles.credits}>Credits: {item.credits}</Text>
            
            <TaskCreditEarning
              taskId={item.id}
              taskTitle={item.title}
              requesterId={item.studentId}
              requesterName={item.studentName}
              onComplete={() => handleSessionComplete(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No active study sessions</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  skill: {
    fontSize: 14,
    color: '#4c669f',
    marginBottom: 4,
    fontWeight: '600',
  },
  student: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  credits: {
    fontSize: 14,
    color: '#2ecc71',
    marginBottom: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16,
  },
}); 