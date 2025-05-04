import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getUserCredits } from '../../services/creditService';

interface UserProfile {
  photoURL?: string;
  skillsOffered: string[];
  skillsNeeded: string[];
  availability: string[];
  bio: string;
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [credits, setCredits] = useState<number>(0);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData: UserProfile = {
          photoURL: data.photoURL || undefined,
          skillsOffered: Array.isArray(data.skillsOffered) ? data.skillsOffered : [],
          skillsNeeded: Array.isArray(data.skillsNeeded) ? data.skillsNeeded : [],
          availability: Array.isArray(data.availability)
            ? data.availability
            : (typeof data.availability === 'string' && data.availability.length > 0)
              ? [data.availability]
              : [],
          bio: data.bio || ''
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredits = async () => {
    if (!user) return;
    try {
      const userCredits = await getUserCredits(user.uid);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const updateProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && user && profile) {
        setUploading(true);
        const storage = getStorage();
        const imageRef = ref(storage, `profile-photos/${user.uid}`);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: downloadURL
        });
        setProfile({
          ...profile,
          photoURL: downloadURL
        });
        setUploading(false);
      }
    } catch (error) {
      console.error('Error updating profile photo:', error);
      setUploading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadCredits();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Let's set up your profile</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(auth)/profile-setup')}
        >
          <Text style={styles.buttonText}>Set Up Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Welcome to UniSkillSwap</Text>
      </LinearGradient>

      {/* Credit Display Section */}
      <View style={styles.creditCard}>
        <LinearGradient
          colors={["#4c669f", "#3b5998", "#192f6a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.creditGradient}
        >
          <View style={styles.creditHeader}>
            <MaterialIcons name="credit-card" size={24} color="#fff" />
            <Text style={styles.creditTitle}>Your Credits</Text>
          </View>
          <Text style={styles.creditAmount}>{credits}</Text>
          <Text style={styles.creditSubtitle}>Available for sessions</Text>
        </LinearGradient>
      </View>

      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <Text style={styles.title}>Welcome back!</Text>
        <TouchableOpacity 
          style={styles.photoContainer} 
          onPress={updateProfilePhoto}
          disabled={uploading}
        >
          {profile?.photoURL ? (
            <Image 
              source={{ uri: profile.photoURL }} 
              style={styles.profilePhoto} 
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <Text style={styles.updatePhotoText}>Tap to update photo</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Skills You Offer</Text>
          <View style={styles.chipContainer}>
            {(profile?.skillsOffered || []).filter(Boolean).map((skill, idx) => (
              <View key={`offered-${skill}-${idx}`} style={styles.chip}>
                <Text style={styles.chipText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Skills You Want to Learn</Text>
          <View style={styles.chipContainer}>
            {(profile?.skillsNeeded || []).filter(Boolean).map((skill, idx) => (
              <View key={`needed-${skill}-${idx}`} style={styles.chip}>
                <Text style={styles.chipText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.chipContainer}>
            {Array.isArray(profile?.availability) ? profile.availability.filter(Boolean).map((time, idx) => (
              <View key={`avail-${time}-${idx}`} style={styles.chip}>
                <Text style={styles.chipText}>{time}</Text>
              </View>
            )) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About You</Text>
          <Text style={styles.bio}>{profile?.bio}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.editButton]} 
          onPress={() => router.push('/(auth)/profile-setup?mode=edit')}
        >
          <Ionicons name="create-outline" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.findButton]} 
          onPress={() => router.push('/match')}
        >
          <Ionicons name="people-outline" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Find Study Partners</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]} 
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  creditCard: {
    marginBottom: 20,
  },
  creditGradient: {
    padding: 20,
    borderRadius: 10,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  creditTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  creditAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  creditSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updatePhotoText: {
    fontSize: 14,
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  chipText: {
    fontSize: 14,
  },
  bio: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    padding: 15,
    backgroundColor: '#4c669f',
    borderRadius: 10,
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#3b5998',
  },
  findButton: {
    backgroundColor: '#192f6a',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});