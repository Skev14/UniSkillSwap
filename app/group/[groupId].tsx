import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, FlatList, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

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
  const router = useRouter();

  useEffect(() => {
    if (groupId) fetchGroup();
  }, [groupId]);

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
    <View style={styles.container}>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.groupDesc}>{group.description}</Text>
      <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
      <FlatList
        data={memberProfiles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.bio[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.memberInfo}>
              <Text style={styles.memberBio}>{item.bio}</Text>
              {item.skillsOffered.length > 0 && (
                <Text style={styles.memberSkills}>
                  Skills: {item.skillsOffered.slice(0, 3).join(', ')}
                  {item.skillsOffered.length > 3 ? ' ...' : ''}
                </Text>
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
      {!isMember && (
        <TouchableOpacity 
          style={styles.joinButton} 
          onPress={handleJoin} 
          disabled={joining}
        >
          <Text style={styles.joinButtonText}>
            {joining ? 'Joining...' : 'Join Group'}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  groupDesc: {
    color: '#666',
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
  },
  memberList: {
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
    backgroundColor: '#6B4EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberBio: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  memberSkills: {
    fontSize: 14,
    color: '#666',
  },
  creatorBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  creatorBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  joinButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 