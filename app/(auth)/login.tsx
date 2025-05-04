import React, { useState } from "react";
import { View, StyleSheet, Modal } from "react-native";
import { TextInput, Button, Text, Surface } from "react-native-paper";
import { loginUser } from "../../services/authService";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await loginUser(email, password);
      router.push("/(tabs)/home");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetStatus(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), resetEmail);
      setResetStatus("A password reset link has been sent to your email.");
    } catch (err: any) {
      setResetStatus(err.message || "Failed to send reset email.");
    } finally {
      setResetLoading(false);
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
        <Ionicons name="lock-closed" size={36} color="#fff" style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={styles.headerTitle}>Welcome Back</Text>
      </LinearGradient>
      <Surface style={styles.surface} elevation={4}>
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
          mode="text"
          onPress={() => setForgotModalVisible(true)}
          style={{ alignSelf: 'flex-end', marginBottom: 8 }}
          labelStyle={{ color: '#4c669f', fontWeight: 'bold', fontSize: 14 }}
        >
          Forgot Password?
        </Button>
        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          loading={loading}
          disabled={loading}
          buttonColor="#4c669f"
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
        >
          Login
        </Button>
        <Button
          mode="text"
          onPress={() => router.push("/(auth)/signup")}
          style={styles.link}
          labelStyle={{ color: '#4c669f', fontWeight: 'bold' }}
        >
          Don't have an account? Sign Up
        </Button>
      </Surface>
      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
          <Surface style={{ width: 320, padding: 24, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center' }} elevation={4}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4c669f', marginBottom: 12 }}>Reset Password</Text>
            <TextInput
              label="Email"
              value={resetEmail}
              onChangeText={setResetEmail}
              mode="outlined"
              style={{ width: '100%', marginBottom: 16, backgroundColor: '#fafbff' }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {resetStatus && (
              <Text style={{ color: resetStatus.includes('sent') ? 'green' : 'red', marginBottom: 10, textAlign: 'center' }}>{resetStatus}</Text>
            )}
            <Button
              mode="contained"
              onPress={handlePasswordReset}
              loading={resetLoading}
              disabled={resetLoading}
              style={{ borderRadius: 12, marginBottom: 8, width: '100%' }}
              buttonColor="#4c669f"
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
            >
              Send Reset Link
            </Button>
            <Button
              mode="text"
              onPress={() => setForgotModalVisible(false)}
              labelStyle={{ color: '#4c669f', fontWeight: 'bold' }}
            >
              Cancel
            </Button>
          </Surface>
        </View>
      </Modal>
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
    backgroundColor: '#fafbff',
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

export default LoginScreen; 