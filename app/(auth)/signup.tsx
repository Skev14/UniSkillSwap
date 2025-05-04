import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, Surface } from "react-native-paper";
import { registerUser } from "../../services/authService";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SignupScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await registerUser(email, password);
      router.replace("/(auth)/profile-setup");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4c669f", "#3b5998", "#192f6a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <Ionicons name="person-add" size={36} color="#fff" style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={styles.headerTitle}>Create Account</Text>
      </LinearGradient>
      <Surface style={styles.surface} elevation={4}>
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
        
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={[styles.input, { backgroundColor: '#fafbff' }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={[styles.input, { backgroundColor: '#fafbff' }]}
          secureTextEntry
        />
        
        <Button
          mode="contained"
          onPress={handleSignup}
          style={styles.button}
          loading={loading}
          disabled={loading}
          buttonColor="#4c669f"
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
        >
          Sign Up
        </Button>
        
        <Button
          mode="text"
          onPress={() => router.push("/(auth)/login")}
          style={styles.link}
          labelStyle={{ color: '#4c669f', fontWeight: 'bold' }}
        >
          Already have an account? Login
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 0,
    backgroundColor: "#f5f5f5",
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
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  error: {
    color: "#d32f2f",
    marginBottom: 10,
    textAlign: "center",
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 18,
    shadowColor: '#4c669f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  link: {
    marginTop: 12,
    alignSelf: 'center',
  },
});

export default SignupScreen; 