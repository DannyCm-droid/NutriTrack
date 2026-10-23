import { Redirect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { StyleSheet, Text } from 'react-native';

import { ProfileForm } from '@/components/profile-form';
import { LoadingScreen, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { auth } from '@/services/firebase';
import { saveProfile } from '@/services/user-data';
import type { UserProfile } from '@/types/models';

export default function OnboardingScreen() {
  const { user, profile, initializing, profileLoading } = useAuth();

  if (initializing || profileLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/" />;
  if (profile) return <Redirect href="/home" />;

  async function handleSubmit(next: UserProfile) {
    if (!user) return;
    await saveProfile(user.uid, { ...next, email: user.email ?? next.email }, true);
  }

  return (
    <Screen scroll keyboard edges={['top', 'bottom']}>
      <Text style={styles.title}>Cuéntanos sobre ti</Text>
      <Text style={styles.subtitle}>
        Con estos datos estimamos tus calorías y macronutrientes diarios. Puedes editarlos después.
      </Text>
      <ProfileForm
        email={user.email ?? ''}
        initial={{ name: user.displayName ?? '' }}
        submitLabel="Guardar y continuar"
        onSubmit={handleSubmit}
      />
      <Text style={styles.link} onPress={() => signOut(auth)}>
        Cerrar sesión
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.greenDark,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -6,
  },
  link: {
    textAlign: 'center',
    color: colors.green,
    fontWeight: '600',
    paddingVertical: 8,
  },
});
