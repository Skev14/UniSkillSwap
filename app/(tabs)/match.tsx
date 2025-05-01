import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { ActivityIndicator } from 'react-native-paper';

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

      // Filter and sort potential matches based on compatibility
      const sortedMatches = potentialMatches
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noMatchesText}>No potential matches found</Text>
        <Text style={styles.subtitle}>Check back later for new study partners!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Swiper
        ref={swiperRef}
        cards={profiles}
        renderCard={(profile: UserProfile) => (
          <View style={styles.card}>
            {profile.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.cardImage} />
            ) : (
              <View style={styles.noPhotoContainer}>
                <Text style={styles.noPhotoText}>No Photo</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.bioText}>{profile.bio}</Text>
              
              <Text style={styles.sectionTitle}>Skills They Offer:</Text>
              <View style={styles.chipContainer}>
                {profile.skillsOffered.filter(Boolean).map((skill, idx) => (
                  <View key={`${profile.id || 'unknown'}-offered-${skill || 'none'}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{skill}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Skills They Need:</Text>
              <View style={styles.chipContainer}>
                {profile.skillsNeeded.filter(Boolean).map((skill, idx) => (
                  <View key={`${profile.id || 'unknown'}-needed-${skill || 'none'}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{skill}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Availability:</Text>
              <View style={styles.chipContainer}>
                {profile.availability.filter(Boolean).map((time, idx) => (
                  <View key={`${profile.id || 'unknown'}-avail-${time || 'none'}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{time}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
        onSwipedLeft={(cardIndex) => handleSwipe('right', profiles[cardIndex])}
        onSwipedRight={(cardIndex) => handleSwipe('left', profiles[cardIndex])}
        onSwipedAll={() => {
          console.log('No more cards!');
          // Optionally reload matches here
          loadPotentialMatches();
        }}
        cardIndex={0}
        backgroundColor={'transparent'}
        stackSize={3}
        stackSeparation={15}
        overlayLabels={{
          left: {
            title: 'MATCH',
            style: {
              label: {
                backgroundColor: '#4CAF50',
                color: '#fff',
                fontSize: 24
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
            title: 'NOPE',
            style: {
              label: {
                backgroundColor: '#FF0000',
                color: '#fff',
                fontSize: 24
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
        animateOverlayLabelsOpacity
        animateCardOpacity
        swipeBackCard
        infinite={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: 'white',
    marginVertical: 20,
    marginHorizontal: 10,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover'
  },
  noPhotoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  noPhotoText: {
    fontSize: 18,
    color: '#666'
  },
  cardContent: {
    padding: 20
  },
  bioText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 8
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10
  },
  chip: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4
  },
  chipText: {
    fontSize: 14,
    color: '#333'
  },
  noMatchesText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10
  }
}); 