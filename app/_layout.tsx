import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ActivityIndicator, View } from 'react-native';
import initializeDummyData from './utils/initializeApp';
import { app } from '../services/firebaseConfig';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const router = useRouter();

  useEffect(() => {
    if (!navigationState?.key || loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isProfileSetup = segments[1] === 'profile-setup';
    const isTestRoute = segments[0] === 'testFirebase';

    if (!user && !inAuthGroup && !isTestRoute) {
      // Redirect to login if user is not logged in and trying to access protected routes
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup && !isProfileSetup) {
      // Redirect to home if user is logged in and trying to access auth routes
      // (except for profile-setup)
      router.replace('/(tabs)/home');
    }
  }, [user, segments, loading, navigationState?.key, router]);

  // Initialize dummy data once we have a user and Firebase is ready
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First ensure Firebase is initialized
        if (!app) {
          console.error('Firebase app not initialized');
          return;
        }

        // Only initialize if we have a user
        if (user) {
          console.log('Initializing dummy data with user:', user.uid);
          await initializeDummyData();
        }
        
        // Hide the splash screen
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error during app initialization:', error);
        await SplashScreen.hideAsync();
      }
    };

    if (!loading) {
      initializeApp();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)" options={{ headerShown: false }} />
        <Stack.Screen name="testFirebase" options={{ title: 'Firebase Test' }} />
        <Stack.Screen 
          name="chat" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            title: 'Chat'
          }} 
        />
        <Stack.Screen name="+not-found" />
      </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
      <StatusBar style="auto" />
    </ThemeProvider>
    </AuthProvider>
  );
}
