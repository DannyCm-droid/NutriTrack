import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, LoadingScreen, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { useWeights } from '@/hooks/use-records';
import { formatMacro, formatShortDate } from '@/lib/format';
import { logWeight } from '@/services/user-data';

export default function ProgressScreen() {
  const { user, profile } = useAuth();
  const weights = useWeights();
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  if (!profile || !user) return <LoadingScreen />;

  const uid = user.uid;
  const difference = profile.goalWeightKg - profile.weightKg;
  const weightStatus =
    Math.abs(difference) < 0.3
      ? 'Estás en tu peso objetivo.'
      : `Necesitas ${difference < 0 ? 'bajar' : 'subir'} ${formatMacro(Math.abs(difference))} kg para llegar a ${formatMacro(profile.goalWeightKg)} kg.`;

  async function handleSave() {
    const value = Number(weight.replace(',', '.'));
    if (!Number.isFinite(value) || value < 30 || value > 300) {
      Alert.alert('Peso inválido', 'Escribe un peso entre 30 y 300 kg.');
      return;
    }

    try {
      setSaving(true);
      await logWeight(uid, value);
      setWeight('');
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const recent = [...weights.items].sort((a, b) => a.recordedAt - b.recordedAt).slice(-8);

  return (
    <Screen scroll keyboard>
      <View>
        <Text style={styles.title}>Progreso</Text>
        <Text style={styles.subtitle}>Peso y ritmo según lo que has registrado.</Text>
      </View>

      <Card>
        <Text style={styles.label}>Peso actual</Text>
        <Text style={styles.weight}>{formatMacro(profile.weightKg)} kg</Text>
        <Text style={styles.body}>
          Objetivo: {formatMacro(profile.goalWeightKg)} kg. {weightStatus}
        </Text>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <Text style={styles.label}>Últimos registros</Text>
          <WeightBars entries={recent} />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.label}>Nuevo peso</Text>
        <Field
          label="Peso de hoy (kg)"
          value={weight}
          onChangeText={setWeight}
          placeholder="68.5"
          keyboardType="decimal-pad"
        />
        <Button label="Guardar peso" onPress={handleSave} loading={saving} />
      </Card>

      {weights.error ? <Text style={styles.error}>{weights.error}</Text> : null}
    </Screen>
  );
}

function WeightBars({
  entries,
}: {
  entries: { id: string; weightKg: number; recordedAt: number }[];
}) {
  const values = entries.map((entry) => entry.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  return (
    <View style={styles.bars}>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.barColumn}>
          <Text style={styles.barValue}>{formatMacro(entry.weightKg)}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                { height: 28 + ((entry.weightKg - min) / span) * 72 },
              ]}
            />
          </View>
          <Text style={styles.barDate}>{formatShortDate(entry.recordedAt)}</Text>
        </View>
      ))}
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
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  weight: {
    color: colors.greenDark,
    fontSize: 34,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    height: 108,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    maxWidth: 28,
    backgroundColor: colors.green,
    borderRadius: 8,
  },
  barValue: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: '700',
  },
  barDate: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
