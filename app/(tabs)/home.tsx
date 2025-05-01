import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ActivityIndicator } from 'react-native-paper';

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

  const loadProfile = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Raw Firestore data:', data);
        console.log('Availability type:', typeof data.availability);
        console.log('Availability value:', data.availability);
        
        // Ensure all array fields are properly initialized and handle string case for availability
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
        console.log('Processed profile data:', profileData);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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
        
        // Convert image to blob
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        // Upload to Firebase Storage
        await uploadBytes(imageRef, blob);
        
        // Get download URL
        const downloadURL = await getDownloadURL(imageRef);
        
        // Update Firestore profile
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: downloadURL
        });

        // Update local state
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
            <Text style={styles.photoPlaceholderText}>Add Photo</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        <Text style={styles.updatePhotoText}>Tap to update photo</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills You Offer</Text>
        <View style={styles.chipContainer}>
          {(profile?.skillsOffered || []).filter(Boolean).map((skill, idx) => (
            <View key={`offered-${skill}-${idx}`} style={styles.chip}>
              <Text>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills You Want to Learn</Text>
        <View style={styles.chipContainer}>
          {(profile?.skillsNeeded || []).filter(Boolean).map((skill, idx) => (
            <View key={`needed-${skill}-${idx}`} style={styles.chip}>
              <Text>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.chipContainer}>
          {Array.isArray(profile?.availability) ? profile.availability.filter(Boolean).map((time, idx) => (
            <View key={`avail-${time}-${idx}`} style={styles.chip}>
              <Text>{time}</Text>
            </View>
          )) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About You</Text>
        <Text style={styles.bio}>{profile?.bio}</Text>
      </View>

      <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(auth)/profile-setup?mode=edit')}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.findButton} onPress={() => router.push('/match')}>
        <Text style={styles.findButtonText}>Find Study Partners</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: '#666',
    fontSize: 16,
  },
  updatePhotoText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6B4EFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  editButtonText: {
    color: '#6B4EFF',
    fontSize: 16,
    fontWeight: '600',
  },
  findButton: {
    backgroundColor: '#6B4EFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FF4E4E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#FF4E4E',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#6B4EFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 