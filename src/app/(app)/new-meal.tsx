import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Field, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { sumMacros } from '@/lib/format';
import { interpretMealWithGemini, type GeminiFailure } from '@/services/gemini-meal';
import { saveMeal } from '@/services/user-data';
import type { MealItem } from '@/types/models';

type DraftItem = {
  key: string;
  name: string;
  quantityLabel: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  grams: number;
  recognized: boolean;
};

export default function NewMealScreen() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function interpret() {
    const text = description.trim();
    if (text.length < 3) {
      Alert.alert('Falta la descripción', 'Escribe qué comiste, por ejemplo: 2 huevos, frijoles y 3 tortillas.');
      return;
    }

    setInterpreting(true);
    try {
      const result = await interpretMealWithGemini(text);
      if (!result.ok) {
        setNotice({ text: geminiFailureNote(result), error: true });
        setReviewed(true);
        return;
      }

      setItems(result.items.map(toDraft));
      setNotice({
        text: 'Estimación de Gemini. Revísala y corrígela antes de guardar.',
        error: false,
      });
      setReviewed(true);
    } finally {
      setInterpreting(false);
    }
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function save() {
    if (!user) return;
    const parsed = items.map(parseDraft);
    if (parsed.some((item) => item == null)) {
      Alert.alert('Revisa los números', 'Cada alimento necesita nombre y valores numéricos de 0 o más.');
      return;
    }

    const mealItems = parsed.filter((item): item is MealItem => item != null);
    if (mealItems.length === 0) {
      Alert.alert('Sin alimentos', 'Agrega al menos un alimento antes de guardar.');
      return;
    }

    const totals = sumMacros(mealItems);

    try {
      setSaving(true);
      await saveMeal(user.uid, {
        description: description.trim(),
        items: mealItems,
        ...totals,
        calories: Math.round(totals.calories),
        eatenAt: Date.now(),
      });
      router.replace('/home');
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión y que Firestore esté activo.');
    } finally {
      setSaving(false);
    }
  }

  const totals = sumMacros(
    items.map((item) => ({
      calories: readNumber(item.calories) ?? 0,
      protein: readNumber(item.protein) ?? 0,
      carbs: readNumber(item.carbs) ?? 0,
      fat: readNumber(item.fat) ?? 0,
    })),
  );
  return (
    <Screen scroll keyboard edges={['bottom']}>
      <Text style={styles.lead}>
        Describe la comida con tus palabras. Después puedes corregir la estimación antes de guardarla.
      </Text>

      <Field
        label="¿Qué comiste?"
        value={description}
        onChangeText={setDescription}
        placeholder="2 huevos, frijoles, 3 tortillas y aguacate"
        multiline
      />

      <Button
        label={reviewed ? 'Volver a interpretar' : 'Interpretar comida'}
        onPress={() => void interpret()}
        variant={reviewed ? 'secondary' : 'primary'}
        loading={interpreting}
        disabled={saving}
      />

      {reviewed ? (
        <>
          {notice ? <Text style={notice.error ? styles.warning : styles.note}>{notice.text}</Text> : null}
          {items.length > 0 && !notice?.error ? (
            <Text style={styles.note}>
              Las cantidades son una estimación. Cámbialas si la porción fue distinta.
            </Text>
          ) : null}

          {items.map((item) => (
            <Card key={item.key}>
              <TextInput
                style={styles.name}
                value={item.name}
                onChangeText={(name) => updateItem(item.key, { name })}
                placeholder="Alimento"
                placeholderTextColor={colors.placeholder}
              />
              <TextInput
                style={styles.quantity}
                value={item.quantityLabel}
                onChangeText={(quantityLabel) => updateItem(item.key, { quantityLabel })}
                placeholder="Cantidad"
                placeholderTextColor={colors.placeholder}
              />
              <View style={styles.macros}>
                <NumberField
                  label="kcal"
                  value={item.calories}
                  onChangeText={(calories) => updateItem(item.key, { calories })}
                />
                <NumberField
                  label="Prot"
                  value={item.protein}
                  onChangeText={(protein) => updateItem(item.key, { protein })}
                />
                <NumberField
                  label="Carb"
                  value={item.carbs}
                  onChangeText={(carbs) => updateItem(item.key, { carbs })}
                />
                <NumberField
                  label="Grasa"
                  value={item.fat}
                  onChangeText={(fat) => updateItem(item.key, { fat })}
                />
              </View>
              <Pressable onPress={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}>
                <Text style={styles.remove}>Quitar</Text>
              </Pressable>
            </Card>
          ))}

          <Button
            label="Agregar alimento"
            variant="secondary"
            onPress={() =>
              setItems((current) => [
                ...current,
                {
                  key: `${Date.now()}`,
                  name: '',
                  quantityLabel: 'Porción ajustada',
                  calories: '',
                  protein: '',
                  carbs: '',
                  fat: '',
                  grams: 0,
                  recognized: true,
                },
              ])
            }
          />

          <Card>
            <Text style={styles.totalLabel}>Total de esta comida</Text>
            <Text style={styles.total}>{Math.round(totals.calories)} kcal</Text>
            <Text style={styles.note}>
              Proteína {format(totals.protein)} g · Carbos {format(totals.carbs)} g · Grasas{' '}
              {format(totals.fat)} g
            </Text>
          </Card>

          <Button label="Guardar comida" onPress={save} loading={saving} />
        </>
      ) : null}
    </Screen>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.numberLabel}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.placeholder}
      />
    </View>
  );
}

function toDraft(item: MealItem): DraftItem {
  return {
    key: `${item.name}-${item.grams}-${Math.random().toString(36).slice(2)}`,
    name: item.name,
    quantityLabel: item.quantityLabel,
    calories: String(item.calories),
    protein: String(item.protein),
    carbs: String(item.carbs),
    fat: String(item.fat),
    grams: item.grams,
    recognized: item.recognized,
  };
}

function parseDraft(item: DraftItem): MealItem | null {
  const calories = readNumber(item.calories);
  const protein = readNumber(item.protein);
  const carbs = readNumber(item.carbs);
  const fat = readNumber(item.fat);
  if (!item.name.trim() || calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }

  return {
    name: item.name.trim(),
    quantityLabel: item.quantityLabel.trim() || 'Porción',
    grams: item.grams,
    calories,
    protein,
    carbs,
    fat,
    recognized: item.recognized,
  };
}

function readNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value.replace(',', '.'));
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function geminiFailureNote(failure: GeminiFailure) {
  const retry = 'Puedes volver a interpretar o agregar los alimentos a mano.';
  switch (failure.reason) {
    case 'missing':
      return `No hay una clave de Gemini configurada. ${retry}`;
    case 'timeout':
      return `Gemini tardó demasiado (${failure.name}: ${failure.message}). ${retry}`;
    case 'network':
      return `No se pudo conectar con Gemini (${failure.name}: ${failure.message}). ${retry}`;
    case 'invalid':
      return `Gemini respondió, pero la estructura no es la esperada. ${retry}`;
    case 'http':
      return `Gemini respondió HTTP ${failure.status}: ${failure.message} ${retry}`;
  }
}

function format(value: number) {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

const styles = StyleSheet.create({
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  warning: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
  },
  name: {
    color: colors.greenDark,
    fontSize: 18,
    fontWeight: '700',
  },
  quantity: {
    color: colors.muted,
    fontSize: 14,
  },
  macros: {
    flexDirection: 'row',
    gap: 8,
  },
  numberField: {
    flex: 1,
    gap: 4,
  },
  numberLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  numberInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 15,
  },
  remove: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  total: {
    color: colors.greenDark,
    fontSize: 28,
    fontWeight: '700',
  },
});
