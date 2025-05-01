import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, Surface } from "react-native-paper";
import { registerUser } from "../../services/authService";
import { useRouter } from "expo-router";

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
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
        
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />
        
        <Button
          mode="contained"
          onPress={handleSignup}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Sign Up
        </Button>
        
        <Button
          mode="text"
          onPress={() => router.push("/(auth)/login")}
          style={styles.link}
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
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  surface: {
    padding: 20,
    borderRadius: 10,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    color: "#1a73e8",
  },
  error: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  link: {
    marginTop: 10,
  },
});

export default SignupScreen; 