import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, LoadingScreen, ProgressBar, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { useMeals } from '@/hooks/use-records';
import { formatMacro, formatTime, formatToday, startOfDay, sumMacros } from '@/lib/format';
import { dailyTargets, goalSummary } from '@/lib/nutrition';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { items: meals, loading, error } = useMeals();

  if (!profile) return <LoadingScreen />;

  const targets = dailyTargets(profile);
  const todayMeals = meals.filter((meal) => meal.eatenAt >= startOfDay());
  const today = sumMacros(todayMeals);
  const firstName = profile.name.trim().split(/\s+/)[0] || 'hola';
  const calorieColor = today.calories > targets.calories ? colors.danger : colors.green;
  const remaining = Math.round(targets.calories - today.calories);

  return (
    <Screen scroll>
      <View>
        <Text style={styles.kicker}>{formatToday()}</Text>
        <Text style={styles.title}>Hola, {firstName}</Text>
      </View>

      <Card>
        <Text style={styles.cardLabel}>Calorías de hoy</Text>
        <Text style={styles.calories}>
          {Math.round(today.calories)}
          <Text style={styles.caloriesGoal}> / {targets.calories} kcal</Text>
        </Text>
        <ProgressBar value={today.calories} max={targets.calories} color={calorieColor} />
        <Text style={styles.hint}>
          {remaining >= 0
            ? `Te quedan ${remaining} kcal dentro de la meta.`
            : `Superaste la meta por ${Math.abs(remaining)} kcal.`}
        </Text>
      </Card>

      <View style={styles.macros}>
        <MacroCard
          label="Proteína"
          value={today.protein}
          goal={targets.protein}
          color={colors.protein}
        />
        <MacroCard label="Carbos" value={today.carbs} goal={targets.carbs} color={colors.carbs} />
        <MacroCard label="Grasas" value={today.fat} goal={targets.fat} color={colors.fat} />
      </View>

      <Card>
        <Text style={styles.cardLabel}>Tu objetivo</Text>
        <Text style={styles.goalText}>{goalSummary(profile, targets)}</Text>
        <Text style={styles.hint}>
          Mantenimiento estimado: {targets.maintenance} kcal. La meta ajusta esa cifra según el peso
          y la fecha que elegiste.
        </Text>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comidas de hoy</Text>
        {loading && meals.length === 0 ? <ActivityIndicator color={colors.green} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && todayMeals.length === 0 ? (
          <Text style={styles.hint}>Cuando registres una comida, aparecerá aquí.</Text>
        ) : null}
        {todayMeals.map((meal) => (
          <View key={meal.id} style={styles.meal}>
            <View style={styles.mealText}>
              <Text style={styles.mealTitle} numberOfLines={2}>
                {meal.description}
              </Text>
              <Text style={styles.hint}>{formatTime(meal.eatenAt)}</Text>
            </View>
            <Text style={styles.mealCalories}>{Math.round(meal.calories)} kcal</Text>
          </View>
        ))}
      </View>

      <Button label="Registrar comida" onPress={() => router.push('/new-meal')} />
    </Screen>
  );
}

function MacroCard({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{formatMacro(value)} g</Text>
      <ProgressBar value={value} max={goal} color={color} />
      <Text style={styles.macroGoal}>de {formatMacro(goal)} g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.muted,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  title: {
    color: colors.greenDark,
    fontSize: 30,
    fontWeight: '700',
    marginTop: 2,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  calories: {
    color: colors.greenDark,
    fontSize: 34,
    fontWeight: '700',
  },
  caloriesGoal: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  macros: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  macroLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  macroValue: {
    color: colors.greenDark,
    fontSize: 16,
    fontWeight: '700',
  },
  macroGoal: {
    color: colors.mutedSoft,
    fontSize: 11,
  },
  goalText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.greenDark,
    fontSize: 18,
    fontWeight: '700',
  },
  meal: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealText: {
    flex: 1,
    gap: 4,
  },
  mealTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  mealCalories: {
    color: colors.green,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
