import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="chat" 
        options={{ 
          title: 'Chat',
          headerShown: true,
        }} 
      />
    </Stack>
  );
} 