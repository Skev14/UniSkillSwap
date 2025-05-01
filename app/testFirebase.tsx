import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { testFirebaseConnection } from '../services/firebaseTest';

export default function TestFirebase() {
  const [testResult, setTestResult] = useState<string>('Running test...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runTest();
  }, []);

  const runTest = async () => {
    try {
      await testFirebaseConnection();
      setTestResult('All Firebase connections successful!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setTestResult('Firebase connection test failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.result}>{testResult}</Text>
      {error && <Text style={styles.error}>Error: {error}</Text>}
      <Button title="Run Test Again" onPress={runTest} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  result: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
}); 