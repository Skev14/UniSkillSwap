import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { collection as fbCollection, addDoc as fbAddDoc, serverTimestamp as fbServerTimestamp } from 'firebase/firestore';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
  type?: 'text' | 'session_request';
  sessionTime?: string;
  sessionPlace?: string;
  status?: 'pending' | 'accepted' | 'declined';
}

interface ChatPartner {
  name: string;
  username?: string;
  photoURL?: string;
}

interface UserData {
  name: string;
  username?: string;
  photoURL?: string;
  displayName?: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [proposedTime, setProposedTime] = useState('');
  const [proposedPlace, setProposedPlace] = useState('');
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Message | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (user && userId) {
      fetchChatPartner();
      fetchMessages();
    }
  }, [user, userId]);

  const fetchChatPartner = async () => {
    if (!user || !userId) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        setChatPartner({
          name: userData.name || userData.displayName || 'Anonymous',
          username: userData.username,
          photoURL: userData.photoURL
        });
      }
    } catch (error) {
      console.error('Error fetching chat partner:', error);
    }
  };

  const fetchMessages = async () => {
    if (!user || !userId) return;
    setLoading(true);
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('participants', 'array-contains', user.uid),
        orderBy('timestamp', 'asc')
      );
      const snap = await getDocs(q);
      const msgs: Message[] = snap.docs
        .map(docSnap => {
          const data = docSnap.data();
          if (data.participants.includes(user.uid) && data.participants.includes(userId)) {
            return {
              id: docSnap.id,
              senderId: data.senderId,
              receiverId: data.receiverId,
              text: data.text,
              timestamp: data.timestamp,
              type: data.type,
              sessionTime: data.sessionTime,
              sessionPlace: data.sessionPlace,
              status: data.status,
            };
          }
          return null;
        })
        .filter(Boolean) as Message[];
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !userId || !input.trim()) return;
    try {
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        receiverId: userId,
        text: input.trim(),
        timestamp: serverTimestamp(),
        participants: [user.uid, userId]
      });
      setInput('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendSessionRequest = async () => {
    if (!user || !userId || !proposedTime.trim() || !proposedPlace.trim()) return;
    try {
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        receiverId: userId,
        text: 'Study session request',
        timestamp: serverTimestamp(),
        participants: [user.uid, userId],
        type: 'session_request',
        sessionTime: proposedTime,
        sessionPlace: proposedPlace,
        status: 'pending',
      });
      setSessionModalVisible(false);
      setProposedTime('');
      setProposedPlace('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending session request:', error);
    }
  };

  const respondToSessionRequest = async (messageId: string, status: 'accepted' | 'declined') => {
    try {
      const msgRef = doc(db, 'messages', messageId);
      await updateDoc(msgRef, { status });
      setRespondingToRequestId(null);
      fetchMessages();
    } catch (error) {
      console.error('Error updating session request:', error);
    }
  };

  // Helper: check if session time has passed
  const isSessionPast = (sessionTime: string) => {
    // For demo: always allow feedback. For real use, parse and compare time.
    return true;
  };

  const openFeedbackModal = (msg: Message) => {
    setFeedbackTarget(msg);
    setFeedbackModalVisible(true);
    setFeedbackRating(5);
    setFeedbackComment('');
  };

  const submitFeedback = async () => {
    if (!user || !feedbackTarget) return;
    setSubmittingFeedback(true);
    try {
      await fbAddDoc(fbCollection(db, 'feedback'), {
        fromUserId: user.uid,
        toUserId: user.uid === feedbackTarget.senderId ? feedbackTarget.receiverId : feedbackTarget.senderId,
        sessionMessageId: feedbackTarget.id,
        rating: feedbackRating,
        comment: feedbackComment,
        timestamp: fbServerTimestamp(),
      });
      setFeedbackModalVisible(false);
      setFeedbackTarget(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const submitReport = async () => {
    if (!user || !userId || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reportedId: userId,
        type: 'user',
        reporterId: user.uid,
        reason: reportReason.trim(),
        timestamp: serverTimestamp(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalVisible(false);
        setReportReason('');
        setReportSuccess(false);
      }, 1200);
    } catch (error) {
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.uid;
    if (item.type === 'session_request') {
      const isRecipient = item.receiverId === user?.uid;
      const canLeaveFeedback = item.status === 'accepted' && isSessionPast(item.sessionTime || '') && !feedbackModalVisible;
      return (
        <View style={[styles.sessionRequestContainer, isCurrentUser ? styles.myMessageContainer : styles.theirMessageContainer]}>
          <View style={styles.sessionRequestCard}>
            <Text style={styles.sessionRequestTitle}>Study Session Request</Text>
            <View style={styles.sessionRequestDetailRow}>
              <Ionicons name="calendar-outline" size={18} color="#4c669f" style={{ marginRight: 6 }} />
              <Text style={styles.sessionRequestDetailLabel}>Time: </Text>
              <Text style={styles.sessionRequestDetailValue}>{item.sessionTime}</Text>
            </View>
            <View style={styles.sessionRequestDetailRow}>
              <Ionicons name="location-outline" size={18} color="#4c669f" style={{ marginRight: 6 }} />
              <Text style={styles.sessionRequestDetailLabel}>Place: </Text>
              <Text style={styles.sessionRequestDetailValue}>{item.sessionPlace}</Text>
            </View>
            {item.status === 'pending' && isRecipient ? (
              <View style={styles.sessionRequestActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => respondToSessionRequest(item.id, 'accepted')}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => respondToSessionRequest(item.id, 'declined')}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : item.status === 'accepted' && canLeaveFeedback ? (
              <TouchableOpacity style={styles.feedbackBtn} onPress={() => openFeedbackModal(item)}>
                <Ionicons name="star" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.feedbackBtnText}>Leave Feedback</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.sessionRequestStatus, item.status === 'accepted' ? styles.accepted : styles.declined]}>
                {item.status === 'accepted' ? 'Accepted' : item.status === 'declined' ? 'Declined' : isCurrentUser ? 'Pending' : ''}
              </Text>
            )}
          </View>
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
            {chatPartner?.photoURL ? (
              <Image source={{ uri: chatPartner.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{chatPartner?.name?.[0] || '?'}</Text>
              </View>
            )}
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.myMessage : styles.theirMessage
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>{chatPartner?.name}</Text>
          )}
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.myMessageText : styles.theirMessageText
          ]}>{item.text}</Text>
          <Text style={styles.timestamp}>
            {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
          </Text>
        </View>
      </View>
    );
  };

  if (!user || !userId) {
    return (
      <View style={styles.centered}>
        <Text>Invalid chat session.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            {chatPartner?.photoURL ? (
              <Image source={{ uri: chatPartner.photoURL }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>{chatPartner?.name?.[0] || '?'}</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>{chatPartner?.name || 'Chat'}</Text>
              {chatPartner?.username && (
                <Text style={styles.username}>@{chatPartner.username}</Text>
              )}
            </View>
          </View>
        </LinearGradient>
        <View style={styles.container}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity style={styles.sessionRequestButton} onPress={() => setSessionModalVisible(true)}>
              <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.sessionRequestButtonText}>Request Study Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sessionRequestButton, { backgroundColor: '#e57373' }]} onPress={() => setReportModalVisible(true)}>
              <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.sessionRequestButtonText}>Report User</Text>
            </TouchableOpacity>
          </View>
          <Modal
            visible={sessionModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setSessionModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Propose Study Session</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Proposed Time (e.g. Friday 3pm)"
                  value={proposedTime}
                  onChangeText={setProposedTime}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Place (e.g. Library, Zoom)"
                  value={proposedPlace}
                  onChangeText={setProposedPlace}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSessionModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSendBtn} onPress={sendSessionRequest}>
                    <Text style={styles.modalSendText}>Send Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={{ paddingVertical: 16 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave Feedback</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                  <Ionicons name={star <= feedbackRating ? 'star' : 'star-outline'} size={28} color="#FFD600" style={{ marginHorizontal: 2 }} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Add a comment (optional)"
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setFeedbackModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSendBtn} onPress={submitFeedback} disabled={submittingFeedback}>
                <Text style={styles.modalSendText}>{submittingFeedback ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: 320, minHeight: 220, alignItems: 'center' }] }>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setReportModalVisible(false)}>
              <Ionicons name="close" size={28} color="#4c669f" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { marginBottom: 8 }]}>Report User</Text>
            <TextInput
              style={[styles.input, { marginBottom: 12, width: '100%' }]}
              placeholder="Reason for report..."
              value={reportReason}
              onChangeText={setReportReason}
              editable={!reportSubmitting && !reportSuccess}
            />
            {reportSuccess ? (
              <Text style={{ color: 'green', fontWeight: 'bold', marginBottom: 8 }}>Report submitted!</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.sessionRequestButton, { backgroundColor: '#e57373', opacity: reportSubmitting || !reportReason.trim() ? 0.6 : 1 }]}
              onPress={submitReport}
              disabled={reportSubmitting || !reportReason.trim()}
            >
              <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.sessionRequestButtonText}>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 0,
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
    fontSize: 16,
    marginRight: 8,
    backgroundColor: '#fafafa',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4c669f',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 18,
    color: '#fff',
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
  username: {
    fontSize: 13,
    color: '#b0b0b0',
    marginTop: 2,
    marginBottom: 2,
  },
  sessionRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#4c669f',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: '#4c669f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionRequestButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sessionRequestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    justifyContent: 'center',
  },
  sessionRequestCard: {
    backgroundColor: '#e3eaff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#4c669f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 220,
  },
  sessionRequestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    textAlign: 'center',
  },
  sessionRequestDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionRequestDetailLabel: {
    fontSize: 13,
    color: '#4c669f',
    textAlign: 'center',
  },
  sessionRequestDetailValue: {
    fontSize: 13,
    color: '#4c669f',
    textAlign: 'center',
  },
  sessionRequestActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  acceptBtn: {
    backgroundColor: '#4c669f',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 6,
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  declineBtn: {
    backgroundColor: '#e3eaff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  declineBtnText: {
    color: '#4c669f',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sessionRequestStatus: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  accepted: {
    color: '#2e7d32',
  },
  declined: {
    color: '#d32f2f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4c669f',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e3eaff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    fontSize: 15,
    backgroundColor: '#fafbff',
  },
  modalCancelBtn: {
    backgroundColor: '#e3eaff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 6,
  },
  modalCancelText: {
    color: '#4c669f',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalSendBtn: {
    backgroundColor: '#4c669f',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  modalSendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  feedbackBtn: {
    backgroundColor: '#4c669f',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 10,
    marginRight: 6,
  },
  feedbackBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
}); 