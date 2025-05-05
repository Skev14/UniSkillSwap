import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import CreditDisplay from '../../components/CreditDisplay';
import { deleteUser } from 'firebase/auth';

interface Feedback {
  id: string;
  fromUserId: string;
  toUserId: string;
  sessionMessageId: string;
  rating: number;
  comment: string;
  timestamp: any;
}

interface UserProfile {
  id: string;
  name?: string;
  username?: string;
  photoURL?: string;
  bio?: string;
  skillsOffered?: string[];
  skillsNeeded?: string[];
  sessionCount?: number;
  // ... add more fields as needed
}

interface Group {
  id: string;
  name: string;
  description?: string;
  members?: string[];
  // ... add more fields as needed
}

export default function BrowseProfilesScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<Feedback[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [sessionCounts, setSessionCounts] = useState<{ [userId: string]: number }>({});
  const { user } = useAuth();
  const [reportModal, setReportModal] = useState<{ type: 'user' | 'group'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [weekProgress, setWeekProgress] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchSessionCounts();
    updateWeekProgress();
  }, []);

  const updateWeekProgress = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const progress = (dayOfWeek / 7) * 100;
    setWeekProgress(progress);
  };

  const fetchSessionCounts = async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Set to start of current week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      const q = query(
        messagesRef, 
        where('type', '==', 'session_request'),
        where('status', '==', 'accepted'),
        where('timestamp', '>=', startOfWeek)
      );
      const snap = await getDocs(q);
      const counts: { [userId: string]: number } = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        [data.senderId, data.receiverId].forEach((uid: string) => {
          if (!counts[uid]) counts[uid] = 0;
          counts[uid] += 1;
        });
      });
      setSessionCounts(counts);
    } catch (error) {
      console.error('Error fetching session counts:', error);
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(users);
      setFilteredGroups(groups);
    } else {
      const s = search.trim().toLowerCase();
      setFiltered(users.filter(u =>
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.username && u.username.toLowerCase().includes(s)) ||
        (u.skillsOffered && u.skillsOffered.some(skill => skill.toLowerCase().includes(s))) ||
        (u.skillsNeeded && u.skillsNeeded.some(skill => skill.toLowerCase().includes(s)))
      ));
      setFilteredGroups(groups.filter(g =>
        (g.name && g.name.toLowerCase().includes(s)) ||
        (g.description && g.description.toLowerCase().includes(s))
      ));
    }
  }, [search, users, groups]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const userList: UserProfile[] = snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
        };
      }) as UserProfile[];
      setUsers(userList);
      setFiltered(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const snap = await getDocs(collection(db, 'groups'));
      const groupList: Group[] = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Group[];
      setGroups(groupList);
      setFilteredGroups(groupList);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const openProfile = async (profile: UserProfile) => {
    setSelectedProfile(profile);
    setProfileLoading(true);
    try {
      const feedbackRef = collection(db, 'feedback');
      const q = query(feedbackRef, where('toUserId', '==', profile.id));
      const snap = await getDocs(q);
      const feedbackList: Feedback[] = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Feedback[];
      setProfileFeedback(feedbackList);
    } catch (error) {
      setProfileFeedback([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setSelectedProfile(null);
    setProfileFeedback([]);
  };

  const getAverageRating = (feedback: Feedback[]) => {
    if (!feedback.length) return null;
    return (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2);
  };

  const usersWithSessionCount = users.map(u => ({ ...u, sessionCount: sessionCounts[u.id] || 0 }));
  const sortedUsers = [...usersWithSessionCount].sort((a, b) => (b.sessionCount || 0) - (a.sessionCount || 0));
  const topUsers = sortedUsers.slice(0, 5);

  const openReportModal = (type: 'user' | 'group', id: string) => {
    setReportModal({ type, id });
    setReportReason('');
    setReportSuccess(false);
  };

  const closeReportModal = () => {
    setReportModal(null);
    setReportReason('');
    setReportSuccess(false);
  };

  const submitReport = async () => {
    if (!user || !reportModal || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reportedId: reportModal.id,
        type: reportModal.type,
        reporterId: user.uid,
        reason: reportReason.trim(),
        timestamp: serverTimestamp(),
      });
      setReportSuccess(true);
      setTimeout(closeReportModal, 1200);
    } catch (error) {
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const getDisplayName = (user: any) => user.name || user.displayName || user.username || user.email || 'Anonymous';

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete user from Firebase Auth
      await deleteUser(auth.currentUser!);
      alert('Your account has been deleted.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      alert('Error deleting account: ' + (error.message || error));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Search Users & Groups</Text>
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={20} color="#4c669f" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, username, skill, or group..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#4c669f"
          />
        </View>
      </LinearGradient>
      {/* Leaderboard Section */}
      <View style={styles.leaderboardCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trophy" size={20} color="#FFD600" style={{ marginRight: 6 }} />
            <Text style={styles.leaderboardTitle}>Weekly Leaderboard</Text>
          </View>
          <TouchableOpacity onPress={() => setLeaderboardModal(true)}>
            <Text style={styles.leaderboardViewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.leaderboardSubtitle}>Resets every Sunday</Text>
        {topUsers.map((user, idx) => (
          <View key={user.id} style={styles.leaderboardRowClean}>
            <Text style={styles.leaderboardRank}>{idx + 1}</Text>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.leaderboardAvatar} />
            ) : (
              <View style={styles.leaderboardAvatarPlaceholder}>
                <Ionicons name="person" size={22} color="#fff" />
              </View>
            )}
            <Text style={styles.leaderboardName}>{getDisplayName(user)}</Text>
            <View style={styles.sessionBadge}><Text style={styles.sessionBadgeText}>{user.sessionCount || 0}</Text></View>
          </View>
        ))}
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 90 }}>
          <Text style={styles.sectionTitle}>Users</Text>
          {filtered.length === 0 ? (
            <Text style={styles.noFeedback}>No users found.</Text>
          ) : (
            filtered.map(item => (
              <TouchableOpacity key={item.id} style={styles.profileCardClean} onPress={() => openProfile(item)}>
                {item.photoURL ? (
                  <Image source={{ uri: item.photoURL }} style={styles.profileAvatar} />
                ) : (
                  <View style={styles.profileAvatarPlaceholder}>
                    <Ionicons name="person" size={28} color="#fff" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{getDisplayName(item)}</Text>
                  {item.username && <Text style={styles.profileUsername}>@{item.username}</Text>}
                  <Text style={styles.profileBio} numberOfLines={1}>{item.bio}</Text>
                  <View style={styles.chipRow}>
                    {item.skillsOffered && item.skillsOffered.map((skill, idx) => (
                      <View key={skill + idx} style={[styles.chip, { backgroundColor: '#e3eaff' }]}><Text style={styles.chipText}>{skill}</Text></View>
                    ))}
                    {item.skillsNeeded && item.skillsNeeded.map((skill, idx) => (
                      <View key={skill + idx} style={[styles.chip, { backgroundColor: '#eaffea' }]}><Text style={styles.chipText}>{skill}</Text></View>
                    ))}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#4c669f" />
              </TouchableOpacity>
            ))
          )}
          <Text style={styles.sectionTitle}>Groups</Text>
          {filteredGroups.length === 0 ? (
            <Text style={styles.noFeedback}>No groups found.</Text>
          ) : (
            filteredGroups.map(group => (
              <TouchableOpacity key={group.id} style={styles.groupCardClean} onPress={() => setSelectedGroup(group)}>
                <Ionicons name="people" size={28} color="#4c669f" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
                  <Text style={styles.groupMembers}>{group.members?.length || 0} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#4c669f" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
      {/* Profile Modal */}
      <Modal visible={!!selectedProfile} animationType="slide" transparent onRequestClose={closeProfile}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalCard}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeProfile}>
              <Ionicons name="close" size={28} color="#4c669f" />
            </TouchableOpacity>
            {selectedProfile && (
              <>
                {selectedProfile.photoURL ? (
                  <Image source={{ uri: selectedProfile.photoURL }} style={styles.modalAvatar} />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Ionicons name="person" size={48} color="#fff" />
                  </View>
                )}
                <Text style={styles.modalName}>{getDisplayName(selectedProfile)}</Text>
                {selectedProfile.username && <Text style={styles.modalUsername}>@{selectedProfile.username}</Text>}
                <Text style={styles.modalBio}>{selectedProfile.bio}</Text>
                <Text style={styles.modalSectionTitle}>Skills Offered</Text>
                <Text style={styles.modalSkills}>{selectedProfile.skillsOffered?.join(', ') || 'None'}</Text>
                <Text style={styles.modalSectionTitle}>Skills Needed</Text>
                <Text style={styles.modalSkills}>{selectedProfile.skillsNeeded?.join(', ') || 'None'}</Text>
                
                {/* Add Credit Display */}
                <CreditDisplay 
                  userId={selectedProfile.id}
                  userName={getDisplayName(selectedProfile)}
                  onNegotiationComplete={closeProfile}
                />
                
                <Text style={styles.modalSectionTitle}>Feedback</Text>
                {profileLoading ? <ActivityIndicator size="small" /> : profileFeedback.length === 0 ? (
                  <Text style={styles.noFeedback}>No feedback yet.</Text>
                ) : (
                  <>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={20} color="#FFD600" />
                      <Text style={styles.ratingText}>{getAverageRating(profileFeedback)} ({profileFeedback.length} reviews)</Text>
                    </View>
                    {profileFeedback.map(item => (
                      <View key={item.id} style={styles.feedbackCard}>
                        <View style={styles.feedbackHeader}>
                          <Ionicons name="star" size={16} color="#FFD600" />
                          <Text style={styles.feedbackRating}>{item.rating}</Text>
                          <Text style={styles.feedbackDate}>{item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString() : ''}</Text>
                        </View>
                        <Text style={styles.feedbackComment}>{item.comment}</Text>
                      </View>
                    ))}
                  </>
                )}
                <TouchableOpacity
                  style={styles.messageBtn}
                  onPress={() => {
                    closeProfile();
                    router.push({ pathname: '/chat', params: { userId: selectedProfile.id } });
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.messageBtnText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.messageBtn, { backgroundColor: '#e57373', marginTop: 8 }]}
                  onPress={() => openReportModal('user', selectedProfile.id)}
                >
                  <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.messageBtnText}>Report User</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
      {/* Group Modal */}
      <Modal visible={!!selectedGroup} animationType="slide" transparent onRequestClose={() => setSelectedGroup(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedGroup(null)}>
              <Ionicons name="close" size={28} color="#4c669f" />
            </TouchableOpacity>
            {selectedGroup && (
              <>
                <Ionicons name="people" size={48} color="#4c669f" style={{ marginBottom: 10 }} />
                <Text style={styles.modalName}>{selectedGroup.name}</Text>
                <Text style={styles.modalBio}>{selectedGroup.description}</Text>
                <Text style={styles.modalSectionTitle}>Members</Text>
                <Text style={styles.modalSkills}>{selectedGroup.members?.length || 0} members</Text>
                <TouchableOpacity
                  style={[styles.messageBtn, { backgroundColor: '#e57373', marginTop: 8 }]}
                  onPress={() => openReportModal('group', selectedGroup.id)}
                >
                  <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.messageBtnText}>Report Group</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* Leaderboard Modal */}
      <Modal visible={leaderboardModal} animationType="slide" transparent onRequestClose={() => setLeaderboardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: 340, minHeight: 300, maxHeight: 500 }] }>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setLeaderboardModal(false)}>
              <Ionicons name="close" size={28} color="#4c669f" />
            </TouchableOpacity>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.leaderboardTitle, { marginBottom: 4 }]}>🏆 Weekly Leaderboard</Text>
              <Text style={styles.leaderboardSubtitle}>Resets every Sunday</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${weekProgress}%` }]} />
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Sun</Text>
                  <Text style={styles.progressLabel}>Mon</Text>
                  <Text style={styles.progressLabel}>Tue</Text>
                  <Text style={styles.progressLabel}>Wed</Text>
                  <Text style={styles.progressLabel}>Thu</Text>
                  <Text style={styles.progressLabel}>Fri</Text>
                  <Text style={styles.progressLabel}>Sat</Text>
                </View>
              </View>
            </View>
            <ScrollView>
              {sortedUsers.map((user, idx) => (
                <View key={user.id} style={styles.leaderboardRow}>
                  <Text style={styles.leaderboardRank}>{idx + 1}</Text>
                  {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.leaderboardAvatar} />
                  ) : (
                    <View style={styles.leaderboardAvatarPlaceholder}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.leaderboardName}>{getDisplayName(user)}</Text>
                  <Text style={styles.leaderboardCount}>{user.sessionCount || 0} sessions</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Report Modal */}
      <Modal visible={!!reportModal} animationType="fade" transparent onRequestClose={closeReportModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: 320, minHeight: 220, alignItems: 'center' }] }>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeReportModal}>
              <Ionicons name="close" size={28} color="#4c669f" />
            </TouchableOpacity>
            <Text style={[styles.leaderboardTitle, { marginBottom: 8 }]}>Report {reportModal?.type === 'user' ? 'User' : 'Group'}</Text>
            <TextInput
              style={[styles.searchInput, { marginBottom: 12, width: '100%' }]}
              placeholder="Reason for report..."
              value={reportReason}
              onChangeText={setReportReason}
              editable={!reportSubmitting && !reportSuccess}
            />
            {reportSuccess ? (
              <Text style={{ color: 'green', fontWeight: 'bold', marginBottom: 8 }}>Report submitted!</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: '#e57373', opacity: reportSubmitting || !reportReason.trim() ? 0.6 : 1 }]}
              onPress={submitReport}
              disabled={reportSubmitting || !reportReason.trim()}
            >
              <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.messageBtnText}>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3eaff',
    borderRadius: 24,
    marginTop: 10,
    marginBottom: 10,
    width: '92%',
    alignSelf: 'center',
    height: 48,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 24,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#222',
    height: 48,
    marginLeft: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginRight: 12,
  },
  profileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  profileUsername: {
    fontSize: 13,
    color: '#4c669f',
    marginBottom: 2,
  },
  profileBio: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  profileSkills: {
    fontSize: 12,
    color: '#4c669f',
    marginBottom: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    width: 340,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#4c669f',
    marginBottom: 10,
    marginTop: 10,
  },
  modalAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  modalName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
    marginTop: 2,
    textAlign: 'center',
  },
  modalUsername: {
    fontSize: 15,
    color: '#4c669f',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalBio: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4c669f',
    marginTop: 10,
    marginBottom: 2,
    textAlign: 'center',
  },
  modalSkills: {
    fontSize: 13,
    color: '#222',
    marginBottom: 2,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#FFD600',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  feedbackCard: {
    backgroundColor: '#e3eaff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackRating: {
    fontSize: 15,
    color: '#FFD600',
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  feedbackComment: {
    fontSize: 15,
    color: '#222',
    textAlign: 'center',
  },
  noFeedback: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 15,
    textAlign: 'center',
  },
  messageBtn: {
    backgroundColor: '#4c669f',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  messageBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4c669f',
    marginBottom: 10,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  groupDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 12,
    color: '#4c669f',
    marginBottom: 1,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4c669f',
    marginBottom: 10,
  },
  leaderboardViewAll: {
    fontSize: 15,
    color: '#4c669f',
    fontWeight: 'bold',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderboardRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4c669f',
    marginRight: 12,
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginRight: 12,
  },
  leaderboardAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  leaderboardCount: {
    fontSize: 13,
    color: '#4c669f',
  },
  leaderboardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#4c669f',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: '#666',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  leaderboardRowClean: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  sessionBadge: {
    backgroundColor: '#e3eaff',
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sessionBadgeText: {
    color: '#4c669f',
    fontWeight: 'bold',
    fontSize: 13,
  },
  profileCardClean: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e3eaff',
  },
  groupCardClean: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e3eaff',
  },
}); 