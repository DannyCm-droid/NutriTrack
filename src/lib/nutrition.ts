import { ACTIVITY_LEVELS, type DailyTargets, type UserProfile } from '@/types/models';
import { daysUntil, round1 } from '@/lib/format';

export function activityLabel(level: UserProfile['activityLevel']) {
  return ACTIVITY_LEVELS.find((item) => item.id === level)?.label ?? level;
}

export function dailyTargets(profile: UserProfile): DailyTargets {
  const bmr =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    (profile.sex === 'male' ? 5 : -161);

  const factor = ACTIVITY_LEVELS.find((item) => item.id === profile.activityLevel)?.factor ?? 1.2;
  const maintenance = bmr * factor;
  const daysRemaining = daysUntil(profile.goalDeadline);
  const kilogramChange = profile.goalWeightKg - profile.weightKg;
  const days = Math.max(daysRemaining, 1);
  const rawAdjustment = (kilogramChange * 7700) / days;
  const adjustment = Math.max(-1000, Math.min(750, rawAdjustment));
  const minimum = profile.sex === 'male' ? 1500 : 1200;
  const calories = Math.max(minimum, Math.round(maintenance + adjustment));

  const proteinPerKg = kilogramChange < -0.3 ? 1.8 : kilogramChange > 0.3 ? 1.6 : 1.4;
  const protein = Math.round(profile.weightKg * proteinPerKg);
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    maintenance: Math.round(maintenance),
    daysRemaining,
    kilogramChange: round1(kilogramChange),
  };
}

export function goalSummary(profile: UserProfile, targets: DailyTargets) {
  if (Math.abs(targets.kilogramChange) < 0.3) {
    return `Tu peso y tu objetivo están muy cerca. La meta de ${targets.calories} kcal busca mantenerte.`;
  }

  const direction = targets.kilogramChange < 0 ? 'bajar' : 'subir';
  const kilograms = Math.abs(targets.kilogramChange).toLocaleString('es-MX', {
    maximumFractionDigits: 1,
  });

  if (targets.daysRemaining < 0) {
    return `La fecha de tu objetivo ya pasó. Actualízala para recalcular las ${targets.calories} kcal de referencia.`;
  }

  return `Para ${direction} ${kilograms} kg, la meta es de ${targets.calories} kcal al día.`;
}
