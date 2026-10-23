import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';

export default function AppLayout() {
  const { user, profile, initializing, profileLoading } = useAuth();

  if (initializing || (user && profileLoading)) return <LoadingScreen />;
  if (!user) return <Redirect href="/" />;
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.greenDark,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-meal" options={{ title: 'Registrar comida', headerBackTitle: 'Volver' }} />
    </Stack>
  );
}
