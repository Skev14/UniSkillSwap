import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserCredits, spendCredits } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';

interface CreditDisplayProps {
  userId: string;
  userName: string;
  onNegotiationComplete?: () => void;
}

export default function CreditDisplay({ userId, userName, onNegotiationComplete }: CreditDisplayProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [proposedAmount, setProposedAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCredits = async () => {
    if (!user) return;
    try {
      const userCredits = await getUserCredits(user.uid);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  React.useEffect(() => {
    loadCredits();
  }, []);

  const handleNegotiation = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const amount = parseInt(proposedAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid credit amount');
        return;
      }

      if (amount > credits) {
        Alert.alert('Insufficient Credits', 'You don\'t have enough credits for this session');
        return;
      }

      await spendCredits(
        user.uid,
        userId,
        amount,
        `Session with ${userName}`
      );

      Alert.alert('Success', `You have successfully spent ${amount} credits for a session with ${userName}`);
      setShowNegotiation(false);
      setProposedAmount('');
      loadCredits();
      onNegotiationComplete?.();
    } catch (error) {
      console.error('Error spending credits:', error);
      Alert.alert('Error', 'Failed to process credit transaction. Please try again.');
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
        style={styles.creditCard}
      >
        <View style={styles.creditHeader}>
          <MaterialIcons name="credit-card" size={24} color="#fff" />
          <Text style={styles.creditTitle}>Your Credits</Text>
        </View>
        <Text style={styles.creditAmount}>{credits}</Text>
        <TouchableOpacity 
          style={styles.negotiateButton}
          onPress={() => setShowNegotiation(true)}
        >
          <Text style={styles.negotiateButtonText}>Negotiate Session</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Modal
        visible={showNegotiation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNegotiation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Negotiate Session Credits</Text>
            <Text style={styles.modalSubtitle}>
              How many credits would you like to offer for this session?
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter credit amount"
              keyboardType="numeric"
              value={proposedAmount}
              onChangeText={setProposedAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNegotiation(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleNegotiation}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Processing...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  creditCard: {
    padding: 20,
    borderRadius: 15,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  creditTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  creditAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  negotiateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  negotiateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#4c669f',
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
}); 