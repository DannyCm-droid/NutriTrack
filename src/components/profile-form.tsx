import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { colors } from '@/constants/palette';
import { daysUntil, isIsoDate } from '@/lib/format';
import { dailyTargets, goalSummary } from '@/lib/nutrition';
import { ACTIVITY_LEVELS, type ActivityLevel, type Sex, type UserProfile } from '@/types/models';

// El mismo formulario sirve para crear el perfil y para editarlo.
// initial rellena los campos. email llega de la cuenta y aquí no se teclea.
// submitLabel es el texto del botón. onSubmit es la función con la que el padre guarda.
type ProfileFormProps = {
  initial?: Partial<UserProfile>;
  email: string;
  submitLabel: string;
  onSubmit: (profile: UserProfile) => Promise<void>;
};

export function ProfileForm({ initial, email, submitLabel, onSubmit }: ProfileFormProps) {
  // Los números también se guardan como texto, para que el teclado pueda editarlos.
  // saving impide enviar otra vez mientras onSubmit no termina.
  const [name, setName] = useState(initial?.name ?? '');
  const [sex, setSex] = useState<Sex | ''>(initial?.sex ?? '');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [weight, setWeight] = useState(initial?.weightKg ? String(initial.weightKg) : '');
  const [height, setHeight] = useState(initial?.heightCm ? String(initial.heightCm) : '');
  const [activity, setActivity] = useState<ActivityLevel | ''>(initial?.activityLevel ?? '');
  const [goalWeight, setGoalWeight] = useState(
    initial?.goalWeightKg ? String(initial.goalWeightKg) : '',
  );
  const [deadline, setDeadline] = useState(initial?.goalDeadline ?? '');
  const [saving, setSaving] = useState(false);

  // useMemo vuelve a armar la vista previa solo cuando cambia un dato del formulario.
  // Si buildProfile devuelve null, la tarjeta de la meta no se dibuja.
  const preview = useMemo(() => {
    const profile = buildProfile({
      name,
      email,
      sex,
      age,
      weight,
      height,
      activity,
      goalWeight,
      deadline,
    });
    if (!profile) return null;
    const targets = dailyTargets(profile);
    return { profile, targets, summary: goalSummary(profile, targets) };
  }, [activity, age, deadline, email, goalWeight, height, name, sex, weight]);

  // Si la validación deja un mensaje, muestra la alerta y no llama al padre.
  // Si pasa, pone updatedAt con la hora actual y espera a onSubmit.
  // catch avisa con un texto fijo. finally siempre apaga saving.
  async function handleSubmit() {
    const profile = preview?.profile ?? null;
    const message = validationMessage({
      name,
      email,
      sex,
      age,
      weight,
      height,
      activity,
      goalWeight,
      deadline,
    });

    if (!profile || message) {
      Alert.alert('Revisa tu perfil', message ?? 'Completa los datos para calcular tu meta.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({ ...profile, updatedAt: Date.now() });
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión y que Firestore esté activo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />

      <View style={styles.group}>
        <Text style={styles.label}>Sexo</Text>
        <Text style={styles.hint}>Se usa para estimar tus calorías con más precisión.</Text>
        <View style={styles.row}>
          <Choice label="Mujer" selected={sex === 'female'} onPress={() => setSex('female')} />
          <Choice label="Hombre" selected={sex === 'male'} onPress={() => setSex('male')} />
        </View>
      </View>

      <Field
        label="Edad"
        value={age}
        onChangeText={setAge}
        placeholder="Años"
        keyboardType="number-pad"
      />
      <Field
        label="Peso actual (kg)"
        value={weight}
        onChangeText={setWeight}
        placeholder="70"
        keyboardType="decimal-pad"
      />
      <Field
        label="Estatura (cm)"
        value={height}
        onChangeText={setHeight}
        placeholder="165"
        keyboardType="number-pad"
      />

      <View style={styles.group}>
        <Text style={styles.label}>Nivel de actividad</Text>
        <View style={styles.activityList}>
          {ACTIVITY_LEVELS.map((level) => (
            <Choice
              key={level.id}
              label={level.label}
              detail={level.detail}
              selected={activity === level.id}
              onPress={() => setActivity(level.id)}
            />
          ))}
        </View>
      </View>

      <Field
        label="Peso objetivo (kg)"
        value={goalWeight}
        onChangeText={setGoalWeight}
        placeholder="65"
        keyboardType="decimal-pad"
      />
      <Field
        label="Fecha para alcanzarlo"
        value={deadline}
        onChangeText={setDeadline}
        placeholder="2026-12-31"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <Text style={styles.hint}>Usa el formato año-mes-día, por ejemplo 2026-12-31.</Text>

      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Meta diaria estimada</Text>
          <Text style={styles.previewCalories}>{preview.targets.calories} kcal</Text>
          <Text style={styles.previewDetail}>
            Proteína {preview.targets.protein} g · Carbos {preview.targets.carbs} g · Grasas{' '}
            {preview.targets.fat} g
          </Text>
          <Text style={styles.hint}>{preview.summary}</Text>
        </View>
      ) : null}

      <Button label={submitLabel} onPress={handleSubmit} loading={saving} />
    </View>
  );
}

function Choice({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected, detail ? styles.choiceBlock : null]}
    >
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
      {detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

// Devuelve el primer error, o null si todos los datos caben en su rango.
// La fecha tiene que existir y ser posterior a hoy.
function validationMessage(input: FormInput) {
  if (input.name.trim().length < 2) return 'Escribe tu nombre.';
  if (!input.sex) return 'Selecciona el sexo para estimar las calorías.';
  const age = readNumber(input.age);
  if (age == null || age < 13 || age > 100) return 'La edad debe estar entre 13 y 100 años.';
  const weight = readNumber(input.weight);
  if (weight == null || weight < 30 || weight > 300) return 'El peso debe estar entre 30 y 300 kg.';
  const height = readNumber(input.height);
  if (height == null || height < 120 || height > 230) {
    return 'La estatura debe estar entre 120 y 230 cm.';
  }
  if (!input.activity) return 'Selecciona tu nivel de actividad.';
  const goalWeight = readNumber(input.goalWeight);
  if (goalWeight == null || goalWeight < 30 || goalWeight > 300) {
    return 'El peso objetivo debe estar entre 30 y 300 kg.';
  }
  if (!isIsoDate(input.deadline)) return 'La fecha debe tener el formato AAAA-MM-DD.';
  if (daysUntil(input.deadline) < 1) return 'Elige una fecha posterior a hoy.';
  return null;
}

type FormInput = {
  name: string;
  email: string;
  sex: Sex | '';
  age: string;
  weight: string;
  height: string;
  activity: ActivityLevel | '';
  goalWeight: string;
  deadline: string;
};

// Arma el objeto del perfil solo cuando validationMessage no encontró errores.
function buildProfile(input: FormInput): UserProfile | null {
  if (validationMessage(input)) return null;
  if (!input.sex || !input.activity) return null;

  return {
    name: input.name.trim(),
    email: input.email,
    sex: input.sex,
    age: readNumber(input.age) ?? 0,
    weightKg: readNumber(input.weight) ?? 0,
    heightCm: readNumber(input.height) ?? 0,
    activityLevel: input.activity,
    goalWeightKg: readNumber(input.goalWeight) ?? 0,
    goalDeadline: input.deadline.trim(),
    updatedAt: Date.now(),
  };
}

// Pasa el texto a número y acepta coma o punto. Si el resultado no es finito, devuelve null.
function readNumber(value: string) {
  const number = Number(value.replace(',', '.').trim());
  return Number.isFinite(number) ? number : null;
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  group: {
    gap: 8,
  },
  label: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  activityList: {
    gap: 8,
  },
  choice: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choiceBlock: {
    flex: 0,
  },
  choiceSelected: {
    borderColor: colors.green,
    backgroundColor: '#E7F3EC',
  },
  choiceLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  choiceLabelSelected: {
    color: colors.greenDark,
  },
  choiceDetail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  preview: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  previewTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  previewCalories: {
    color: colors.greenDark,
    fontSize: 28,
    fontWeight: '700',
  },
  previewDetail: {
    color: colors.text,
    fontSize: 14,
  },
});
