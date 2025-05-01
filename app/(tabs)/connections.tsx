import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

interface UserProfile {
  id: string;
  photoURL?: string;
  skillsOffered: string[];
  skillsNeeded: string[];
  availability: string[];
  bio: string;
}

export default function ConnectionsScreen() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get all swipes where current user swiped right
      const swipesRef = collection(db, 'swipes');
      const q = query(swipesRef, where('swiperId', '==', user.uid), where('direction', '==', 'right'));
      const swipesSnap = await getDocs(q);
      const swipedIds = swipesSnap.docs.map(doc => doc.data().swipedId);

      // 2. Fetch user profiles for those swipedIds
      const profiles: UserProfile[] = [];
      for (const id of swipedIds) {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          profiles.push({
            id,
            photoURL: data.photoURL || '',
            skillsOffered: Array.isArray(data.skillsOffered) ? data.skillsOffered : [],
            skillsNeeded: Array.isArray(data.skillsNeeded) ? data.skillsNeeded : [],
            availability: Array.isArray(data.availability) ? data.availability : [],
            bio: data.bio || ''
          });
        }
      }
      setConnections(profiles);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>You must be logged in to view connections.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (connections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No connections yet. Swipe right on users to connect!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Connections</Text>
      <FlatList
        data={connections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.id[0]}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.bio || 'No bio'}</Text>
              <Text style={styles.skills}>Skills: {item.skillsOffered.join(', ')}</Text>
              <Text style={styles.skills}>Wants: {item.skillsNeeded.join(', ')}</Text>
              <Text style={styles.skills}>Availability: {item.availability.join(', ')}</Text>
            </View>
            <TouchableOpacity style={styles.messageButton} onPress={() => router.push({ pathname: '/chat', params: { userId: item.id } })}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  skills: {
    fontSize: 13,
    color: '#555',
  },
  messageButton: {
    backgroundColor: '#6B4EFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 