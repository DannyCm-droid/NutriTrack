import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LoadingScreen, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { colors } from '@/constants/palette';

// Primera pantalla. Según la sesión, espera, manda a crear el perfil o entra a Inicio.
// Si no hay usuario, se queda aqui y ofrece crear cuenta o iniciar sesion.
export default function WelcomeScreen() {
  const { user, profile, initializing, profileLoading } = useAuth();

  if (initializing || (user && profileLoading)) return <LoadingScreen />;
  if (user && !profile) return <Redirect href="/onboarding" />;
  if (user && profile) return <Redirect href="/home" />;

  return (
    <Screen scroll centered>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.title}>NutriTrack</Text>
        <Text style={styles.subtitle}>Tu alimentación, bajo control.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registra lo que comes</Text>
          <Text style={styles.description}>
            Describe tu comida, revisa calorías y macros, y compáralos con una meta hecha para ti.
          </Text>
        </View>

        {/* router.push abre la ruta sin borrar esta pantalla, así se puede volver atrás. */}
        <Pressable style={styles.button} onPress={() => router.push('/register')}>
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </Pressable>
        <Pressable style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </Pressable>
        <Text style={styles.footer}>Pequeños hábitos, grandes cambios.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: colors.white,
    fontSize: 42,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.greenDark,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 8,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 20,
    marginTop: 36,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.greenDark,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#59665C',
  },
  button: {
    width: '100%',
    backgroundColor: colors.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loginButton: {
    marginTop: 20,
    padding: 8,
  },
  loginText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 28,
    fontSize: 13,
    color: colors.mutedSoft,
  },
});
