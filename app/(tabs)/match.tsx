import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, Platform, ScrollView } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  id: string;
  photoURL?: string;
  skillsOffered: string[];
  skillsNeeded: string[];
  availability: string[];
  bio: string;
}

export default function MatchScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      loadPotentialMatches();
    }
  }, [user]);

  const loadPotentialMatches = async () => {
    try {
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }

      // Get current user's profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        console.error('User profile not found');
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      const currentUserProfile: UserProfile = {
        id: user.uid,
        photoURL: userData.photoURL,
        skillsOffered: Array.isArray(userData.skillsOffered) ? userData.skillsOffered : [],
        skillsNeeded: Array.isArray(userData.skillsNeeded) ? userData.skillsNeeded : [],
        availability: Array.isArray(userData.availability) ? userData.availability : [],
        bio: userData.bio || ''
      };
      
      setCurrentProfile(currentUserProfile);

      // Get all users except current user
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const potentialMatches: UserProfile[] = [];

      usersSnapshot.forEach(doc => {
        if (doc.id !== user.uid) {
          const data = doc.data();
          potentialMatches.push({
            id: doc.id,
            photoURL: data.photoURL,
            skillsOffered: Array.isArray(data.skillsOffered) ? data.skillsOffered : [],
            skillsNeeded: Array.isArray(data.skillsNeeded) ? data.skillsNeeded : [],
            availability: Array.isArray(data.availability) ? data.availability : [],
            bio: data.bio || ''
          });
        }
      });

      // Fetch all swipes by the current user
      const swipesRef = collection(db, 'swipes');
      const swipesQuery = query(swipesRef, where('swiperId', '==', user.uid));
      const swipesSnap = await getDocs(swipesQuery);
      const swipedIds = swipesSnap.docs.map(doc => doc.data().swipedId);

      // Filter out users already swiped on
      const filteredMatches = potentialMatches.filter(profile => !swipedIds.includes(profile.id));

      // Filter and sort potential matches based on compatibility
      const sortedMatches = filteredMatches
        .map(profile => ({
          profile,
          score: calculateMatchScore(currentUserProfile, profile)
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ profile }) => profile);

      setProfiles(sortedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchScore = (userProfile: UserProfile, otherProfile: UserProfile): number => {
    let score = 0;

    // Check for mutual skill matches
    const skillMatches = userProfile.skillsNeeded.filter(skill => 
      otherProfile.skillsOffered.includes(skill)
    ).length;
    score += skillMatches * 2;

    // Check for availability overlap
    const availabilityOverlap = userProfile.availability.filter(time =>
      otherProfile.availability.includes(time)
    ).length;
    score += availabilityOverlap;

    return score;
  };

  const handleSwipe = async (direction: 'left' | 'right', swipedProfile: UserProfile) => {
    if (!user || !currentProfile) return;

    try {
      // Store the swipe in Firestore
      const swipeData = {
        swiperId: user.uid,
        swipedId: swipedProfile.id,
        direction,
        timestamp: serverTimestamp(),
        swiperSkills: currentProfile.skillsOffered,
        swiperNeeds: currentProfile.skillsNeeded,
        swipedSkills: swipedProfile.skillsOffered,
        swipedNeeds: swipedProfile.skillsNeeded
      };

      await setDoc(doc(db, 'swipes', `${user.uid}_${swipedProfile.id}`), swipeData);

      if (direction === 'right') {
        // Check if there's a mutual match
        const otherSwipeDoc = await getDoc(doc(db, 'swipes', `${swipedProfile.id}_${user.uid}`));
        
        if (otherSwipeDoc.exists() && otherSwipeDoc.data().direction === 'right') {
          // It's a match! Create a match document
          const matchId = [user.uid, swipedProfile.id].sort().join('_');
          await setDoc(doc(db, 'matches', matchId), {
            users: [user.uid, swipedProfile.id],
            timestamp: serverTimestamp(),
            lastMessage: null
          });
        }
      }
    } catch (error) {
      console.error('Error handling swipe:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.header}
        >
          <Text style={styles.title}>Recommended Users</Text>
          <Text style={styles.subtitle}>No potential matches found</Text>
          <Text style={styles.subtitle}>Check back later for new study partners!</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <Text style={styles.title}>Recommended Users</Text>
        <Text style={styles.subtitle}>These users match your skills and availability. Swipe right to match, left to skip.</Text>
      </LinearGradient>

      <Swiper
        ref={swiperRef}
        cards={profiles}
        renderCard={(profile: UserProfile, idx: number) => (
          <View style={styles.card}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
              {profile.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.cardImage} />
              ) : (
                <View style={styles.noPhotoContainer}>
                  <Ionicons name="person" size={60} color="#666" />
                </View>
              )}
              <View style={styles.cardContent}>
                {/* Match Score */}
                <View style={styles.matchScoreRow}>
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={styles.matchScoreText}>Match Score: {calculateMatchScore(currentProfile!, profile)}</Text>
                </View>
                <Text style={styles.bioText}>{profile.bio}</Text>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Skills They Offer</Text>
                  <View style={styles.chipContainer}>
                    {profile.skillsOffered.filter(Boolean).map((skill, idx) => (
                      <View key={`${profile.id || 'unknown'}-offered-${skill || 'none'}-${idx}`} style={styles.chip}>
                        <Text style={styles.chipText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Skills They Need</Text>
                  <View style={styles.chipContainer}>
                    {profile.skillsNeeded.filter(Boolean).map((skill, idx) => (
                      <View key={`${profile.id || 'unknown'}-needed-${skill || 'none'}-${idx}`} style={styles.chip}>
                        <Text style={styles.chipText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Availability</Text>
                  <View style={styles.chipContainer}>
                    {profile.availability.filter(Boolean).map((time, idx) => (
                      <View key={`${profile.id || 'unknown'}-avail-${time || 'none'}-${idx}`} style={styles.chip}>
                        <Text style={styles.chipText}>{time}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
        onSwipedLeft={(cardIndex) => handleSwipe('left', profiles[cardIndex])}
        onSwipedRight={(cardIndex) => handleSwipe('right', profiles[cardIndex])}
        onSwipedAll={() => {
          loadPotentialMatches();
        }}
        cardIndex={0}
        backgroundColor={'transparent'}
        stackSize={3}
        stackSeparation={15}
        overlayLabels={{
          left: {
            title: 'SKIP',
            style: {
              label: {
                backgroundColor: '#FF0000',
                color: '#fff',
                fontSize: 24,
                padding: 10,
                borderRadius: 10,
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
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                marginTop: 30,
                marginLeft: -30
              }
            }
          },
          right: {
            title: 'MATCH',
            style: {
              label: {
                backgroundColor: '#4CAF50',
                color: '#fff',
                fontSize: 24,
                padding: 10,
                borderRadius: 10,
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
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginTop: 30,
                marginLeft: 30
              }
            }
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    height: Dimensions.get('window').height * 0.68,
    marginTop: 90,
    paddingHorizontal: 18,
    paddingVertical: 18,
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
  cardImage: {
    width: '100%',
    height: '40%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  noPhotoContainer: {
    width: '100%',
    height: '40%',
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 10,
    flex: 1,
  },
  bioText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 18,
    lineHeight: 24,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  chipText: {
    color: '#333',
    fontSize: 14,
  },
  matchScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchScoreText: {
    marginLeft: 6,
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
}); 