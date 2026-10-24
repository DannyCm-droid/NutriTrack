import { Redirect, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field, LoadingScreen, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { auth, authErrorMessage } from '@/services/firebase';

export default function RegisterScreen() {
  const { user, initializing } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Valida en el teléfono antes de llamar a Firebase.
  // La contraseña no se recorta: un espacio cuenta como parte de ella.
  async function handleRegister() {
    const normalizedEmail = email.trim();
    if (!name.trim() || !normalizedEmail || !password || !confirmPassword) {
      Alert.alert('Campos incompletos', 'Completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    // await espera a Firebase. Si createUserWithEmailAndPassword falla, la cuenta no se creó.
    // El try de dentro solo guarda el nombre. Si ese paso falla, la sesión ya existe.
    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

      try {
        await updateProfile(credential.user, { displayName: name.trim() });
      } catch (error) {
        Alert.alert(
          'Cuenta creada',
          `La sesión ya está activa. No se pudo guardar el nombre; podrás escribirlo en el perfil. ${authErrorMessage(error)}`,
        );
      }
    } catch (error) {
      Alert.alert('Error al registrarse', authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  // Igual que en login: con sesión activa se sale de esta pantalla hacia /.
  if (initializing) return <LoadingScreen />;
  if (user) return <Redirect href="/" />;

  return (
    <Screen scroll keyboard edges={['top', 'bottom']}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>N</Text>
      </View>
      <Text style={styles.title}>Crea tu cuenta</Text>
      <Text style={styles.subtitle}>Comienza a cuidar tus hábitos alimenticios.</Text>

      <View style={styles.form}>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
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
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          autoCapitalize="none"
        />
        <Field
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repite tu contraseña"
          secureTextEntry
          autoCapitalize="none"
        />
        <Button label="Crear cuenta" onPress={handleRegister} loading={loading} />
      </View>

      <Pressable onPress={() => router.push('/login')} style={styles.linkButton}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </Pressable>
      <Text style={styles.footer}>NutriTrack · Pequeños hábitos, grandes cambios.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.greenDark,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 14,
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
