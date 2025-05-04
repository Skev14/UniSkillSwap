import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  timestamp: any;
  type: 'message' | 'system'; // system for join/leave messages
}

interface MessageData {
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  timestamp: any;
  type?: 'message' | 'system';
}

interface UserData {
  photoURL?: string;
  name?: string;
  // Add other user fields as needed
}

interface TypingStatus {
  userId: string;
  userName: string;
  timestamp: any;
}

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export default function GroupChatScreen() {
  const { user } = useAuth();
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [senderNames, setSenderNames] = useState<{[key: string]: string}>({});
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (user && groupId) {
      const messagesRef = collection(db, 'groupMessages');
      const q = query(
        messagesRef,
        where('groupId', '==', groupId),
        orderBy('timestamp', 'asc')
      );

      setLoading(true);
      // Real-time updates for messages
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const msgs: GroupMessage[] = [];
        for (const doc of snapshot.docs) {
          const data = doc.data() as MessageData;
          // Fetch sender's profile if not already included
          let senderPhotoURL = data.senderPhotoURL;
          if (!senderPhotoURL) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.senderId));
              if (userDoc.exists()) {
                const userData = userDoc.data() as UserData;
                senderPhotoURL = userData.photoURL;
              }
            } catch (error) {
              console.error('Error fetching sender profile:', error);
            }
          }
          
          msgs.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderPhotoURL,
            text: data.text,
            timestamp: data.timestamp,
            type: data.type || 'message'
          });
        }
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }, (error) => {
        console.error('Error in chat snapshot:', error);
        setLoading(false);
      });

      // Listen for typing status
      const typingRef = collection(db, 'typingStatus');
      const typingQuery = query(
        typingRef,
        where('groupId', '==', groupId)
      );

      const typingUnsubscribe = onSnapshot(typingQuery, (snapshot) => {
        const typingStatuses: TypingStatus[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.userId !== user.uid) { // Don't show current user's typing status
            typingStatuses.push({
              userId: data.userId,
              userName: data.userName,
              timestamp: data.timestamp
            });
          }
        });
        setTypingUsers(typingStatuses);
      });

      return () => {
        unsubscribe();
        typingUnsubscribe();
      };
    }
  }, [user, groupId]);

  const sendMessage = async () => {
    if (!user || !groupId || !input.trim()) return;
    try {
      const messagesRef = collection(db, 'groupMessages');
      await addDoc(messagesRef, {
        groupId,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhotoURL: user.photoURL,
        text: input.trim(),
        timestamp: serverTimestamp(),
        type: 'message'
      });
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    updateTypingStatus();
  };

  const updateTypingStatus = async () => {
    if (!user || !groupId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status
    const typingRef = doc(db, 'typingStatus', `${groupId}_${user.uid}`);
    await setDoc(typingRef, {
      groupId,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      timestamp: serverTimestamp()
    });

    // Set timeout to remove typing status after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      await deleteDoc(typingRef);
    }, 3000);
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isCurrentUser = item.senderId === user?.uid;
    
    if (item.type === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {item.senderPhotoURL ? (
              <Image source={{ uri: item.senderPhotoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.senderName?.[0] || '?'}</Text>
              </View>
            )}
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.myMessage : styles.theirMessage
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.myMessageText : styles.theirMessageText
          ]}>{item.text}</Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const names = typingUsers.map(user => user.userName).join(', ');
    return (
      <View style={styles.typingIndicator}>
        <Text style={styles.typingText}>
          {typingUsers.length === 1 ? `${names} is typing...` : `${names} are typing...`}
        </Text>
      </View>
    );
  };

  if (!user || !groupId) {
    return (
      <View style={styles.centered}>
        <Text>Invalid chat session.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.gradientHeader}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
            <Text style={styles.headerSubtitle}>{messages.length} messages</Text>
          </View>
        </LinearGradient>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {loading ? (
              <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : (
              <>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={item => item.id}
                  renderItem={renderMessage}
                  contentContainerStyle={{ paddingVertical: 16 }}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
                {renderTypingIndicator()}
              </>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={handleInputChange}
                placeholder="Type a message..."
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={sendMessage}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e3eaff',
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    color: '#fff',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessage: {
    backgroundColor: '#4c669f',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#222',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#e3eaff',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4c669f',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4c669f',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
}); 