import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, SafeAreaView } from 'react-native';
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
  const [userRole, setUserRole] = useState<string | null>(null);

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
        setUserRole(data.role || null);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#4c669f", "#3b5998", "#192f6a"]}
          style={styles.header}
        >
          <View style={styles.profileCard}>
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
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Welcome back!</Text>
            <Text style={styles.creditText}><MaterialIcons name="credit-card" size={18} color="#fff" /> {credits} credits</Text>
            <Text style={styles.updatePhotoText}>Tap photo to update</Text>
          </View>
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

          {userRole === 'admin' && (
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#FFD600' }]} 
              onPress={() => router.push('/(admin)/reports')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#4c669f" style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: '#4c669f' }]}>Admin Dashboard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]} 
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 10,
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e1e1e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 45,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  creditText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  updatePhotoText: {
    color: '#e3eaff',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 0,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#4c669f',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#4c669f',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bio: {
    fontSize: 15,
    color: '#444',
    marginTop: 4,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#4c669f',
    padding: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 0,
    shadowColor: '#4c669f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#3b5998',
  },
  findButton: {
    backgroundColor: '#192f6a',
  },
  logoutButton: {
    backgroundColor: '#e57373',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4c669f',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
});