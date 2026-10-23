import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { Button, Field, LoadingScreen, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { auth, authErrorMessage } from '@/services/firebase';

export default function LoginScreen() {
  const { user, initializing } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      Alert.alert('Campos incompletos', 'Ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (error) {
      Alert.alert('No se pudo entrar', authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (initializing) return <LoadingScreen />;
  if (user) return <Redirect href="/" />;

  return (
    <Screen scroll centered keyboard edges={['top', 'bottom']}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>N</Text>
      </View>
      <Text style={styles.title}>Bienvenido a NutriTrack</Text>
      <Text style={styles.subtitle}>Tu alimentación, bajo control.</Text>

      <View style={styles.form}>
        <Field
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="ejemplo@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Ingresa tu contraseña"
          secureTextEntry
          autoCapitalize="none"
        />
        <Button label="Iniciar sesión" onPress={handleLogin} loading={loading} />
      </View>

      <Pressable onPress={() => router.push('/register')} style={styles.linkButton}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
      </Pressable>
      <Text style={styles.footer}>NutriTrack · Pequeños hábitos, grandes cambios.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '700',
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: colors.greenDark,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 15,
  },
  form: {
    gap: 16,
    marginTop: 8,
  },
  linkButton: {
    alignItems: 'center',
    padding: 8,
  },
  link: {
    color: colors.green,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.mutedSoft,
  },
});
