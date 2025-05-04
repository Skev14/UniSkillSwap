import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [interestedConnections, setInterestedConnections] = useState<UserProfile[]>([]);
  const [mutualConnections, setMutualConnections] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchConnections();
      }
    }, [user])
  );

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get all swipes where current user swiped right
      const swipesRef = collection(db, 'swipes');
      const q = query(swipesRef, where('swiperId', '==', user.uid), where('direction', '==', 'right'));
      const swipesSnap = await getDocs(q);
      const swipedIds = swipesSnap.docs.map(doc => doc.data().swipedId);

      // 2. For each swipedId, check if they also swiped right on the current user
      const mutualMatchIds: string[] = [];
      for (const id of swipedIds) {
        const reverseSwipeDoc = await getDoc(doc(db, 'swipes', `${id}_${user.uid}`));
        if (reverseSwipeDoc.exists() && reverseSwipeDoc.data().direction === 'right') {
          mutualMatchIds.push(id);
        }
      }

      // 3. Fetch user profiles for interested connections (all right swipes)
      const interestedProfiles: UserProfile[] = [];
      for (const id of swipedIds) {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          interestedProfiles.push({
            id,
            photoURL: data.photoURL || '',
            skillsOffered: Array.isArray(data.skillsOffered) ? data.skillsOffered : [],
            skillsNeeded: Array.isArray(data.skillsNeeded) ? data.skillsNeeded : [],
            availability: Array.isArray(data.availability) ? data.availability : [],
            bio: data.bio || ''
          });
        }
      }
      setInterestedConnections(interestedProfiles);

      // 4. Fetch user profiles for mutual matches
      const mutualProfiles: UserProfile[] = [];
      for (const id of mutualMatchIds) {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          mutualProfiles.push({
            id,
            photoURL: data.photoURL || '',
            skillsOffered: Array.isArray(data.skillsOffered) ? data.skillsOffered : [],
            skillsNeeded: Array.isArray(data.skillsNeeded) ? data.skillsNeeded : [],
            availability: Array.isArray(data.availability) ? data.availability : [],
            bio: data.bio || ''
          });
        }
      }
      setMutualConnections(mutualProfiles);
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

  if (interestedConnections.length === 0 && mutualConnections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No connections yet. Swipe right on users to connect!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <Text style={styles.title}>Connections</Text>
      </LinearGradient>
      
      {/* Color Key */}
      <View style={styles.colorKeyContainer}>
        <View style={styles.colorKeyItem}>
          <View style={[styles.colorKeyChip, { backgroundColor: '#e3eaff' }]} />
          <Text style={styles.colorKeyText}>Skills Offered</Text>
        </View>
        <View style={styles.colorKeyItem}>
          <View style={[styles.colorKeyChip, { backgroundColor: '#eaffea' }]} />
          <Text style={styles.colorKeyText}>Skills Needed</Text>
        </View>
        <View style={styles.colorKeyItem}>
          <View style={[styles.colorKeyChip, { backgroundColor: '#f3eaff' }]} />
          <Text style={styles.colorKeyText}>Availability</Text>
        </View>
      </View>

      {interestedConnections.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="heart-outline" size={22} color="#4c669f" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Interested Connections</Text>
          </View>
          <FlatList
            data={interestedConnections}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            renderItem={({ item }) => (
              <View style={styles.compactCard}>
                <View style={styles.compactAvatarWrap}>
                  {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.compactAvatar} />
                  ) : (
                    <View style={styles.compactAvatarPlaceholder}>
                      <Text style={styles.avatarText}>{item.id[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.compactInfo}>
                  <Text style={styles.compactName} numberOfLines={1}>{item.bio || 'No bio'}</Text>
                  <View style={styles.compactChipRow}>
                    {item.skillsOffered.slice(0, 2).map((skill, idx) => (
                      <View key={skill + idx} style={[styles.compactChip, { backgroundColor: '#e3eaff' }]}><Text style={styles.compactChipText}>{skill}</Text></View>
                    ))}
                    {item.skillsNeeded.slice(0, 1).map((skill, idx) => (
                      <View key={skill + idx} style={[styles.compactChip, { backgroundColor: '#eaffea' }]}><Text style={styles.compactChipText}>{skill}</Text></View>
                    ))}
                    {item.availability.slice(0, 1).map((time, idx) => (
                      <View key={time + idx} style={[styles.compactChip, { backgroundColor: '#f3eaff' }]}><Text style={styles.compactChipText}>{time}</Text></View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.compactMsgBtn} onPress={() => router.push({ pathname: '/chat', params: { userId: item.id } })}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                  <Text style={styles.messageText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}
      {mutualConnections.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="people-circle-outline" size={22} color="#4CAF50" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: '#4CAF50' }]}>Mutual Matches</Text>
          </View>
          <FlatList
            data={mutualConnections}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            renderItem={({ item }) => (
              <View style={styles.compactCard}>
                <View style={styles.compactAvatarWrap}>
                  {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.compactAvatar} />
                  ) : (
                    <View style={styles.compactAvatarPlaceholder}>
                      <Text style={styles.avatarText}>{item.id[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.compactInfo}>
                  <Text style={styles.compactName} numberOfLines={1}>{item.bio || 'No bio'}</Text>
                  <View style={styles.compactChipRow}>
                    {item.skillsOffered.slice(0, 2).map((skill, idx) => (
                      <View key={skill + idx} style={[styles.compactChip, { backgroundColor: '#e3eaff' }]}><Text style={styles.compactChipText}>{skill}</Text></View>
                    ))}
                    {item.skillsNeeded.slice(0, 1).map((skill, idx) => (
                      <View key={skill + idx} style={[styles.compactChip, { backgroundColor: '#eaffea' }]}><Text style={styles.compactChipText}>{skill}</Text></View>
                    ))}
                    {item.availability.slice(0, 1).map((time, idx) => (
                      <View key={time + idx} style={[styles.compactChip, { backgroundColor: '#f3eaff' }]}><Text style={styles.compactChipText}>{time}</Text></View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.compactMsgBtn} onPress={() => router.push({ pathname: '/chat', params: { userId: item.id } })}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                  <Text style={styles.messageText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4c669f',
  },
  compactAvatarWrap: {
    marginRight: 10,
  },
  compactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  compactAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
    color: '#222',
  },
  compactChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactChip: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
  },
  compactChipText: {
    fontSize: 12,
    color: '#333',
  },
  compactMsgBtn: {
    backgroundColor: '#4c669f',
    borderRadius: 16,
    padding: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 60,
  },
  messageText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
  },
  avatarText: {
    fontSize: 24,
    color: '#fff',
  },
  colorKeyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorKeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorKeyChip: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  colorKeyText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
}); 