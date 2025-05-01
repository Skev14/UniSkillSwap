import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';

export default function ConnectionsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Connections' }} />
      <Text>Connections Screen</Text>
    </View>
  );
} 