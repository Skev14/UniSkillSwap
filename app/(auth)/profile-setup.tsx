import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Chip, TextInput as PaperTextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Surface } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';

const SUGGESTED_SKILLS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'English', 'History', 'Economics', 'Psychology', 'Languages'
];

const AVAILABILITY = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Morning', 'Afternoon', 'Evening'
];

export default function ProfileSetupScreen() {
  const { user } = useAuth();
  const { mode } = useLocalSearchParams();
  const isEditing = mode === 'edit';
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    skillsOffered: [] as string[],
    skillsNeeded: [] as string[],
    availability: [] as string[],
    bio: '',
    photoURL: ''
  });
  const [newSkillOffered, setNewSkillOffered] = useState('');
  const [newSkillNeeded, setNewSkillNeeded] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEditing && user) {
      loadExistingProfile();
    } else {
      setLoading(false);
    }
  }, [isEditing, user]);

  const loadExistingProfile = async () => {
    try {
      const docRef = doc(db, 'users', user!.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          name: data.name || '',
          username: data.username || '',
          skillsOffered: data.skillsOffered || [],
          skillsNeeded: data.skillsNeeded || [],
          availability: data.availability || [],
          bio: data.bio || '',
          photoURL: data.photoURL || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const addCustomSkill = (type: 'skillsOffered' | 'skillsNeeded', skill: string) => {
    if (!skill.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], skill.trim()]
    }));

    if (type === 'skillsOffered') {
      setNewSkillOffered('');
    } else {
      setNewSkillNeeded('');
    }
  };

  const removeSkill = (type: 'skillsOffered' | 'skillsNeeded', skill: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(s => s !== skill)
    }));
  };

  const toggleSkill = (skill: string, type: 'skillsOffered' | 'skillsNeeded') => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].includes(skill)
        ? prev[type].filter(s => s !== skill)
        : [...prev[type], skill]
    }));
  };

  const toggleAvailability = (time: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(time)
        ? prev.availability.filter(a => a !== time)
        : [...prev.availability, time]
    }));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && user) {
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
        
        setFormData(prev => ({
          ...prev,
          photoURL: downloadURL
        }));
        setUploading(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate form
    if (formData.skillsOffered.length === 0 || formData.skillsNeeded.length === 0) {
      setError('Please select at least one skill for both offered and needed skills');
      return;
    }

    if (formData.availability.length === 0) {
      setError('Please select at least one availability time');
      return;
    }

    if (!formData.bio.trim()) {
      setError('Please enter a bio');
      return;
    }

    if (!formData.username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', formData.username.trim()));
      const snap = await getDocs(q);
      if (!isEditing && !snap.empty) {
        setError('Username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      await setDoc(doc(db, 'users', user.uid), {
        ...formData,
        username: formData.username.trim(),
        name: formData.name || user.email,
        credits: 100, // Start with 100 credits
        updatedAt: new Date().toISOString(),
        ...(isEditing ? {} : { createdAt: new Date().toISOString() })
      });

      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <Ionicons name="person-circle" size={40} color="#fff" style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Your Profile' : 'Set Up Your Profile'}</Text>
      </LinearGradient>
      <Surface style={styles.surface} elevation={4}>
        <TouchableOpacity 
          style={styles.imageContainer} 
          onPress={pickImage}
          disabled={uploading}
        >
          {formData.photoURL ? (
            <Image 
              source={{ uri: formData.photoURL }} 
              style={styles.profileImage} 
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Add Photo</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <Text style={styles.updatePhotoText}>Tap to update photo</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Your Name</Text>
        <PaperTextInput
          value={formData.name}
          onChangeText={name => setFormData(prev => ({ ...prev, name }))}
          placeholder="Enter your name"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Username</Text>
        <PaperTextInput
          value={formData.username}
          onChangeText={username => setFormData(prev => ({ ...prev, username }))}
          placeholder="Enter a unique username"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Skills You Can Offer</Text>
        <View style={styles.inputContainer}>
          <PaperTextInput
            value={newSkillOffered}
            onChangeText={setNewSkillOffered}
            placeholder="Enter a skill..."
            style={styles.input}
            right={
              <PaperTextInput.Icon 
                icon="plus"
                onPress={() => addCustomSkill('skillsOffered', newSkillOffered)}
              />
            }
            onSubmitEditing={() => addCustomSkill('skillsOffered', newSkillOffered)}
          />
        </View>
        <Text style={styles.subtitle}>Suggested Skills:</Text>
        <View style={styles.chipContainer}>
          {SUGGESTED_SKILLS.map((skill) => (
            <Chip
              key={skill}
              selected={formData.skillsOffered.includes(skill)}
              onPress={() => toggleSkill(skill, 'skillsOffered')}
              style={[styles.chip, formData.skillsOffered.includes(skill) && styles.chipSelected]}
              selectedColor="#fff"
            >
              {skill}
            </Chip>
          ))}
        </View>
        <Text style={styles.subtitle}>Your Custom Skills:</Text>
        <View style={styles.chipContainer}>
          {formData.skillsOffered
            .filter(skill => !SUGGESTED_SKILLS.includes(skill))
            .map((skill) => (
              <Chip
                key={skill}
                selected
                onClose={() => removeSkill('skillsOffered', skill)}
                style={[styles.chip, styles.chipSelected]}
                selectedColor="#fff"
              >
                {skill}
              </Chip>
            ))}
        </View>

        <Text style={styles.sectionTitle}>Skills You Need Help With</Text>
        <View style={styles.inputContainer}>
          <PaperTextInput
            value={newSkillNeeded}
            onChangeText={setNewSkillNeeded}
            placeholder="Enter a skill..."
            style={styles.input}
            right={
              <PaperTextInput.Icon 
                icon="plus"
                onPress={() => addCustomSkill('skillsNeeded', newSkillNeeded)}
              />
            }
            onSubmitEditing={() => addCustomSkill('skillsNeeded', newSkillNeeded)}
          />
        </View>
        <Text style={styles.subtitle}>Suggested Skills:</Text>
        <View style={styles.chipContainer}>
          {SUGGESTED_SKILLS.map((skill) => (
            <Chip
              key={skill}
              selected={formData.skillsNeeded.includes(skill)}
              onPress={() => toggleSkill(skill, 'skillsNeeded')}
              style={[styles.chip, formData.skillsNeeded.includes(skill) && styles.chipSelected]}
              selectedColor="#fff"
            >
              {skill}
            </Chip>
          ))}
        </View>
        <Text style={styles.subtitle}>Your Custom Skills:</Text>
        <View style={styles.chipContainer}>
          {formData.skillsNeeded
            .filter(skill => !SUGGESTED_SKILLS.includes(skill))
            .map((skill) => (
              <Chip
                key={skill}
                selected
                onClose={() => removeSkill('skillsNeeded', skill)}
                style={[styles.chip, styles.chipSelected]}
                selectedColor="#fff"
              >
                {skill}
              </Chip>
            ))}
        </View>

        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.chipContainer}>
          {AVAILABILITY.map((time) => (
            <Chip
              key={time}
              selected={formData.availability.includes(time)}
              onPress={() => toggleAvailability(time)}
              style={[styles.chip, formData.availability.includes(time) && styles.chipSelected]}
              selectedColor="#fff"
            >
              {time}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Bio</Text>
        <TextInput
          style={styles.bioInput}
          multiline
          numberOfLines={4}
          placeholder="Tell us about yourself..."
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Profile')}
          </Text>
        </TouchableOpacity>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 16,
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
  },
  updatePhotoText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4c669f',
    padding: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
    shadowColor: '#4c669f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  gradientHeader: {
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 0,
  },
  surface: {
    marginHorizontal: 18,
    marginTop: -30,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  chipSelected: {
    backgroundColor: '#4c669f',
  },
}); 