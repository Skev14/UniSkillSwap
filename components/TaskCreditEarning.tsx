import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { earnCredits } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';

interface TaskCreditEarningProps {
  taskId: string;
  taskTitle: string;
  requesterId: string;
  requesterName: string;
  onComplete?: () => void;
}

export default function TaskCreditEarning({ 
  taskId, 
  taskTitle, 
  requesterId, 
  requesterName,
  onComplete 
}: TaskCreditEarningProps) {
  const { user } = useAuth();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [proposedCredits, setProposedCredits] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEarnCredits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const amount = parseInt(proposedCredits);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid credit amount');
        return;
      }

      await earnCredits(
        requesterId,
        user.uid,
        amount,
        `Completed task: ${taskTitle}`
      );

      Alert.alert('Success', `You have earned ${amount} credits for helping with ${taskTitle}`);
      setShowCreditModal(false);
      setProposedCredits('');
      onComplete?.();
    } catch (error) {
      console.error('Error earning credits:', error);
      Alert.alert('Error', 'Failed to process credit transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.earnButton}
        onPress={() => setShowCreditModal(true)}
      >
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.earnButtonText}>Earn Credits</Text>
      </TouchableOpacity>

      <Modal
        visible={showCreditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Earn Credits for Helping</Text>
            <Text style={styles.modalSubtitle}>
              How many credits would you like to earn for completing this task?
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter credit amount"
              keyboardType="numeric"
              value={proposedCredits}
              onChangeText={setProposedCredits}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreditModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleEarnCredits}
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
  earnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4c669f',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  earnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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