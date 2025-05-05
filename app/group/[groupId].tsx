import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, FlatList, Alert, Image, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
}

interface UserProfile {
  id: string;
  photoURL?: string;
  bio: string;
  skillsOffered: string[];
}

export default function GroupDetailsScreen() {
  const { user } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (groupId) fetchGroup();
  }, [groupId]);

  useEffect(() => {
    const ids = memberProfiles.map(m => m.id);
    const hasDuplicates = ids.length !== new Set(ids).size;
    if (hasDuplicates) {
      console.warn('Duplicate member ids detected in group members:', ids);
    }
  }, [memberProfiles]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const groupRef = doc(db, 'groups', String(groupId));
      const docSnap = await getDoc(groupRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const groupData = {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          members: data.members || [],
          createdBy: data.createdBy,
        };
        setGroup(groupData);
        await fetchMemberProfiles(groupData.members);
      } else {
        setGroup(null);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberProfiles = async (memberIds: string[]) => {
    try {
      const profiles: UserProfile[] = [];
      for (const memberId of memberIds) {
        const userDoc = await getDoc(doc(db, 'users', memberId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          profiles.push({
            id: userDoc.id,
            photoURL: userData.photoURL,
            bio: userData.bio || 'No bio available',
            skillsOffered: userData.skillsOffered || [],
          });
        }
      }
      setMemberProfiles(profiles);
    } catch (error) {
      console.error('Error fetching member profiles:', error);
    }
  };

  const handleJoin = async () => {
    if (!user || !group) return;
    setJoining(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
      });
      
      // Fetch the current user's profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newProfile: UserProfile = {
          id: user.uid,
          photoURL: userData.photoURL,
          bio: userData.bio || 'No bio available',
          skillsOffered: userData.skillsOffered || [],
        };
        setMemberProfiles(prev => [...prev, newProfile]);
      }
      
      setGroup({ ...group, members: [...group.members, user.uid] });
      Alert.alert('Success', 'You have joined the group!');
    } catch (error) {
      Alert.alert('Error', 'Could not join group.');
      console.error('Error joining group:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const groupRef = doc(db, 'groups', group.id);
              await updateDoc(groupRef, {
                members: arrayRemove(user.uid),
              });
              setGroup({ ...group, members: group.members.filter(id => id !== user.uid) });
              setMemberProfiles(prev => prev.filter(profile => profile.id !== user.uid));
              await fetchGroup();
              Alert.alert('Left Group', 'You have left the group.');
            } catch (error) {
              Alert.alert('Error', 'Could not leave group.');
              console.error('Error leaving group:', error);
            }
          },
        },
      ]
    );
  };

  const submitReport = async () => {
    if (!user || !group || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reportedId: group.id,
        type: 'group',
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Group not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMember = user && group.members.includes(user.uid);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.header}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        </LinearGradient>
        <TouchableOpacity 
          style={styles.simpleBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.groupDesc}>{group.description}</Text>
        {isMember && (
          <TouchableOpacity 
            style={styles.chatButton} 
            onPress={() => router.push({
              pathname: "/groupChat",
              params: { groupId: group.id, groupName: group.name }
            })}
          >
            <Text style={styles.chatButtonText}>Open Chat</Text>
          </TouchableOpacity>
        )}
        {isMember && user && group.createdBy !== user.uid && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
            <TouchableOpacity
              style={[styles.chatButton, { backgroundColor: '#e57373', marginTop: 8, flex: 1 }]}
              onPress={handleLeaveGroup}
            >
              <Ionicons name="exit-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.chatButtonText}>Leave Group</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatButton, { backgroundColor: '#e57373', marginTop: 8, flex: 1 }]}
              onPress={() => setReportModalVisible(true)}
            >
              <Ionicons name="flag" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.chatButtonText}>Report Group</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
        <FlatList
          data={memberProfiles}
          keyExtractor={(item, idx) => `${item.id || 'member'}-${idx}`}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{item.bio[0]?.toUpperCase() || 'U'}</Text>
                </View>
              )}
              <View style={styles.memberInfo}>
                <Text style={styles.memberBio}>{item.bio}</Text>
                {item.skillsOffered.length > 0 && (
                  <View style={styles.chipRow}>
                    {item.skillsOffered.slice(0, 3).map((skill, idx) => (
                      <View key={skill + idx} style={styles.skillChip}><Text style={styles.skillChipText}>{skill}</Text></View>
                    ))}
                  </View>
                )}
                {item.id === group.createdBy && (
                  <View style={styles.creatorBadge}>
                    <Text style={styles.creatorBadgeText}>Creator</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          style={styles.memberList}
        />
      </View>
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
            <Text style={[styles.headerTitle, { marginBottom: 8 }]}>Report Group</Text>
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
              style={[styles.chatButton, { backgroundColor: '#e57373', opacity: reportSubmitting || !reportReason.trim() ? 0.6 : 1 }]}
              onPress={submitReport}
              disabled={reportSubmitting || !reportReason.trim()}
            >
              <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.chatButtonText}>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textAlign: 'center',
    maxWidth: '90%',
  },
  groupDesc: {
    color: '#555',
    marginBottom: 16,
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  chatButton: {
    backgroundColor: '#4c669f',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 16,
    color: '#222',
  },
  memberList: {
    paddingHorizontal: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginHorizontal: 8,
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
    marginTop: 2,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4c669f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberBio: {
    fontSize: 15,
    color: '#222',
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  skillChip: {
    backgroundColor: '#e3eaff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
  },
  skillChipText: {
    fontSize: 12,
    color: '#333',
  },
  creatorBadge: {
    backgroundColor: '#FFD600',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  creatorBadgeText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 12,
  },
  joinButton: {
    backgroundColor: '#4c669f',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  backButton: {
    marginTop: 18,
    alignSelf: 'center',
    padding: 8,
  },
  backButtonText: {
    color: '#4c669f',
    fontWeight: 'bold',
    fontSize: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleBackButton: {
    position: 'absolute',
    top: 38,
    left: 16,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'transparent',
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
  },
}); 