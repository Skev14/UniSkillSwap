import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert, Image } from 'react-native';
import { db } from '../../services/firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import GroupInvites from '../components/GroupInvites';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
}

interface User {
  id: string;
  photoURL?: string;
  bio: string;
}

export default function GroupsScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showInviteSent, setShowInviteSent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const groupsRef = collection(db, 'groups');
      const snap = await getDocs(groupsRef);
      const groupList: Group[] = snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          members: data.members || [],
          createdBy: data.createdBy,
        };
      });
      setGroups(groupList);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformUsers = async (group: Group) => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const userList: User[] = snap.docs
        .map(docSnap => ({
          id: docSnap.id,
          photoURL: docSnap.data().photoURL,
          bio: docSnap.data().bio || 'No bio available',
        }))
        .filter(u => !group.members.includes(u.id) && u.id !== user?.uid); // Exclude current members and current user
      setPlatformUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Could not load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateGroup = () => {
    setModalVisible(true);
  };

  const handleSubmitGroup = async () => {
    if (!user) return Alert.alert('You must be logged in to create a group.');
    if (!groupName.trim()) return Alert.alert('Group name is required.');
    setCreating(true);
    try {
      const groupsRef = collection(db, 'groups');
      await addDoc(groupsRef, {
        name: groupName.trim(),
        description: groupDesc.trim(),
        members: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setGroupName('');
      setGroupDesc('');
      fetchGroups();
    } catch (error) {
      Alert.alert('Error', 'Could not create group.');
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!user || group.createdBy !== user.uid) {
      Alert.alert('Error', 'You can only delete groups you created.');
      return;
    }

    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const confirmDeleteGroup = async () => {
    if (!user || !groupToDelete) return;
    try {
      await deleteDoc(doc(db, 'groups', groupToDelete.id));
      fetchGroups();
      setShowDeleteModal(false);
      setGroupToDelete(null);
      // Optionally show a snackbar here for success
    } catch (error) {
      console.error('Error deleting group:', error);
      setShowDeleteModal(false);
      setGroupToDelete(null);
      Alert.alert('Error', 'Failed to delete group');
    }
  };

  const handleInvite = (group: Group) => {
    setSelectedGroup(group);
    setInviteModalVisible(true);
    fetchPlatformUsers(group);
  };

  const handleInviteUser = async (userId: string) => {
    if (!selectedGroup || !user) return;

    try {
      // Create an invitation document
      const invitationsRef = collection(db, 'invitations');
      await addDoc(invitationsRef, {
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        inviterId: user.uid,
        inviteeId: userId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      setShowInviteSent(true);
      setTimeout(() => setShowInviteSent(false), 2000);
      
      // Remove invited user from the list
      setPlatformUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleJoinGroup = async (group: Group) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a group.');
      return;
    }

    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid)
      });
      
      // Add system message about user joining
      const messagesRef = collection(db, 'groupMessages');
      await addDoc(messagesRef, {
        groupId: group.id,
        senderId: 'system',
        text: `${user.displayName || 'A new user'} joined the group`,
        timestamp: serverTimestamp(),
        type: 'system'
      });

      fetchGroups();
      Alert.alert('Success', 'You have joined the group!');
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Groups</Text>
      </LinearGradient>
      <GroupInvites />
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Text style={styles.createButtonText}>+ Create New Group</Text>
      </TouchableOpacity>

      {/* Create Group Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Study Group</Text>
            <TextInput
              style={styles.input}
              placeholder="Group Name"
              value={groupName}
              onChangeText={setGroupName}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Description (optional)"
              value={groupDesc}
              onChangeText={setGroupDesc}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitGroup} style={styles.submitButton} disabled={creating}>
                <Text style={styles.submitButtonText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Users Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setInviteModalVisible(false);
          setPlatformUsers([]);
          setSelectedGroup(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Invite Users</Text>
            {loadingUsers ? (
              <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
            ) : platformUsers.length === 0 ? (
              <Text style={styles.noUsersText}>No users available to invite</Text>
            ) : (
              <FlatList
                data={platformUsers}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.inviteUserCard}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.inviteAvatar} />
                    ) : (
                      <View style={styles.inviteAvatarPlaceholder}>
                        <Text style={styles.inviteAvatarText}>{item.id[0]?.toUpperCase() || '?'}</Text>
                      </View>
                    )}
                    <View style={styles.inviteUserInfo}>
                      <Text style={styles.inviteUserId}>{item.id}</Text>
                      <Text style={styles.inviteUserBio} numberOfLines={2}>{item.bio}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inviteUserButton}
                      onPress={() => handleInviteUser(item.id)}
                    >
                      <Text style={styles.inviteUserButtonText}>Invite</Text>
                    </TouchableOpacity>
                  </View>
                )}
                style={{ maxHeight: '80%' }}
              />
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { alignSelf: 'center', marginTop: 16 }]}
              onPress={() => {
                setInviteModalVisible(false);
                setPlatformUsers([]);
                setSelectedGroup(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Group Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Group</Text>
            <Text style={styles.deleteModalText}>Are you sure you want to delete this group? This action cannot be undone.</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButtonModal} onPress={confirmDeleteGroup}>
                <Text style={styles.deleteButtonModalText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupDesc}>{item.description}</Text>
              <Text style={styles.groupMembers}>{item.members.length} members</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.viewButton} 
                  onPress={() => router.push({
                    pathname: "/group/[groupId]",
                    params: { groupId: item.id }
                  })}
                >
                  <Text style={styles.buttonText}>View</Text>
                </TouchableOpacity>
                {user && item.members.includes(user.uid) ? (
                  <TouchableOpacity 
                    style={styles.inviteButton} 
                    onPress={() => handleInvite(item)}
                  >
                    <Text style={styles.buttonText}>Invite</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.joinButton} 
                    onPress={() => handleJoinGroup(item)}
                  >
                    <Text style={styles.buttonText}>Join</Text>
                  </TouchableOpacity>
                )}
                {user && item.createdBy === user.uid && (
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleDeleteGroup(item)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
      {showInviteSent && (
        <View style={styles.snackbar}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.snackbarText}>Invitation sent!</Text>
        </View>
      )}
    </View>
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
  },
  createButton: {
    backgroundColor: '#4c669f',
    padding: 14,
    borderRadius: 20,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  groupCard: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4c669f',
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
    color: '#222',
  },
  groupDesc: {
    color: '#555',
    marginBottom: 8,
    fontSize: 14,
  },
  groupMembers: {
    color: '#888',
    marginBottom: 8,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  viewButton: {
    backgroundColor: '#4c669f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 6,
  },
  inviteButton: {
    backgroundColor: '#3b5998',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 6,
  },
  joinButton: {
    backgroundColor: '#192f6a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 6,
  },
  deleteButton: {
    backgroundColor: '#e57373',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#6B4EFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inviteUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4c669f',
  },
  inviteAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginRight: 10,
  },
  inviteAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4c669f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inviteAvatarText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  inviteUserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  inviteUserId: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
    color: '#222',
  },
  inviteUserBio: {
    color: '#666',
    fontSize: 13,
  },
  inviteUserButton: {
    backgroundColor: '#4c669f',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  inviteUserButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noUsersText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontSize: 16,
  },
  snackbar: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4c669f',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
    alignSelf: 'center',
  },
  snackbarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    width: '85%',
    alignItems: 'center',
    elevation: 6,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 16,
  },
  deleteCancelText: {
    color: '#4c669f',
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteButtonModal: {
    backgroundColor: '#4c669f',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  deleteButtonModalText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 