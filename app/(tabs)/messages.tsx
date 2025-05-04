import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatPreview {
  userId: string;
  lastMessage: string;
  timestamp: any;
  photoURL?: string;
  name?: string;
  username?: string;
}

interface UserData {
  name: string;
  username?: string;
  photoURL?: string;
  displayName?: string;
  email?: string;
  id?: string;
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
          const userData = userDoc.data() as UserData;
          
          chatMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: data.text,
            timestamp: data.timestamp,
            photoURL: userData?.photoURL,
            name: userData?.name || userData?.displayName || userData?.username || userData?.email || userData?.id || userDoc.id,
            username: userData?.username
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
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Messages</Text>
      </LinearGradient>
      <FlatList
        data={chats}
        keyExtractor={item => item.userId}
        contentContainerStyle={{ paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatCard}
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
              {item.username && (
                <Text style={styles.username}>@{item.username}</Text>
              )}
              <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              <Text style={styles.timestamp}>
                {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString() : 'Just now'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4c669f',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
    color: '#222',
  },
  username: {
    fontSize: 13,
    color: '#b0b0b0',
    marginTop: 2,
    marginBottom: 2,
  },
  lastMessage: {
    color: '#666',
    fontSize: 13,
    marginBottom: 4,
  },
  timestamp: {
    color: '#999',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 