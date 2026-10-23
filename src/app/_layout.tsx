import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashGate />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F5F8F2' },
        }}
      />
    </AuthProvider>
  );
}

function SplashGate() {
  const { initializing, user, profileLoading } = useAuth();
  const waiting = initializing || (user != null && profileLoading);

  useEffect(() => {
    if (!waiting) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [waiting]);

  return null;
}
