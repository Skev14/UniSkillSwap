import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { router } from 'expo-router';

interface ChatPreview {
  userId: string;
  lastMessage: string;
  timestamp: any;
  photoURL?: string;
  name?: string;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('participants', 'array-contains', user.uid),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      
      // Get unique chat partners and their last messages
      const chatMap = new Map<string, ChatPreview>();
      
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const otherUserId = data.participants.find((id: string) => id !== user.uid);
        
        if (otherUserId && !chatMap.has(otherUserId)) {
          // Get user profile
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          const userData = userDoc.data();
          
          chatMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: data.text,
            timestamp: data.timestamp,
            photoURL: userData?.photoURL,
            name: userData?.name || 'Anonymous'
          });
        }
      }
      
      setChats(Array.from(chatMap.values()));
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>You must be logged in to view messages.</Text>
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

  if (chats.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No messages yet. Start a conversation with your connections!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={chats}
        keyExtractor={item => item.userId}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => router.push({ pathname: '/chat', params: { userId: item.userId } })}
          >
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.name?.[0] || '?'}</Text>
              </View>
            )}
            <View style={styles.chatInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            <Text style={styles.timestamp}>
              {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString() : 'Just now'}
            </Text>
          </TouchableOpacity>
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
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
  },
  chatInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  lastMessage: {
    color: '#666',
    fontSize: 14,
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 