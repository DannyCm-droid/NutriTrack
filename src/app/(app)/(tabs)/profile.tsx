import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { signOut } from 'firebase/auth';

import { ProfileForm } from '@/components/profile-form';
import { Button, Card, LoadingScreen, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { formatIsoDate } from '@/lib/format';
import { activityLabel, dailyTargets } from '@/lib/nutrition';
import { auth } from '@/services/firebase';
import { saveProfile } from '@/services/user-data';
import type { UserProfile } from '@/types/models';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!profile || !user) return <LoadingScreen />;

  const targets = dailyTargets(profile);

  async function handleSave(next: UserProfile) {
    const weightChanged = next.weightKg !== profile?.weightKg;
    await saveProfile(user!.uid, { ...next, email: user?.email ?? next.email }, weightChanged);
    setEditing(false);
  }

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', 'Podrás volver a entrar con tu correo y contraseña.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  }

  if (editing) {
    return (
      <Screen scroll keyboard edges={['top', 'bottom']}>
        <Text style={styles.title}>Editar perfil</Text>
        <ProfileForm
          initial={profile}
          email={user.email ?? profile.email}
          submitLabel="Guardar cambios"
          onSubmit={handleSave}
        />
        <Button label="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View>
        <Text style={styles.title}>{profile.name}</Text>
        <Text style={styles.subtitle}>{user.email ?? profile.email}</Text>
      </View>

      <Card>
        <Info label="Edad" value={`${profile.age} años`} />
        <Info label="Peso" value={`${profile.weightKg} kg`} />
        <Info label="Estatura" value={`${profile.heightCm} cm`} />
        <Info label="Actividad" value={activityLabel(profile.activityLevel)} />
        <Info label="Sexo" value={profile.sex === 'female' ? 'Mujer' : 'Hombre'} />
        <Info
          label="Objetivo"
          value={`${profile.goalWeightKg} kg para el ${formatIsoDate(profile.goalDeadline)}`}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Necesidades diarias</Text>
        <Text style={styles.calories}>{targets.calories} kcal</Text>
        <Text style={styles.body}>
          Proteína {targets.protein} g · Carbos {targets.carbs} g · Grasas {targets.fat} g
        </Text>
        <Text style={styles.hint}>
          La estimación usa la fórmula de Mifflin-St Jeor, tu nivel de actividad y el cambio de peso
          que quieres lograr. Es una guía, no un diagnóstico.
        </Text>
      </Card>

      <Button label="Editar perfil" onPress={() => setEditing(true)} />
      <Button label="Cerrar sesión" variant="secondary" onPress={confirmSignOut} />
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.greenDark,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 4,
  },
  cardTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  calories: {
    color: colors.greenDark,
    fontSize: 32,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  info: {
    gap: 2,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
