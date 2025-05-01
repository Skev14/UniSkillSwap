import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { db } from '../../services/firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import GroupInvites from '../components/GroupInvites';

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

    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'groups', group.id));
              fetchGroups();
              Alert.alert('Success', 'Group deleted successfully');
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
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
      
      Alert.alert('Success', 'Invitation sent successfully');
      
      // Remove invited user from the list
      setPlatformUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  return (
    <View style={styles.container}>
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
                  <View style={styles.userRow}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userId}>{item.id}</Text>
                      <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
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

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.groupRow}>
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
                <TouchableOpacity 
                  style={styles.inviteButton} 
                  onPress={() => handleInvite(item)}
                >
                  <Text style={styles.buttonText}>Invite</Text>
                </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  createButton: {
    backgroundColor: '#6B4EFF',
    padding: 14,
    borderRadius: 20,
    margin: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  groupRow: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  groupDesc: {
    color: '#555',
    marginBottom: 8,
  },
  groupMembers: {
    color: '#888',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  viewButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  inviteButton: {
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flex: 1,
  },
  userId: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  userBio: {
    color: '#666',
    fontSize: 14,
  },
  inviteUserButton: {
    backgroundColor: '#34C759',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
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
}); 