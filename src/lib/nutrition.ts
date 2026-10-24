import { ACTIVITY_LEVELS, type DailyTargets, type UserProfile } from '@/types/models';
import { daysUntil, round1 } from '@/lib/format';

// Busca el nombre en español del nivel. Si el id no está en la lista, devuelve el propio id.
export function activityLabel(level: UserProfile['activityLevel']) {
  return ACTIVITY_LEVELS.find((item) => item.id === level)?.label ?? level;
}

// Calcula la meta del día a partir del perfil y devuelve calorías, macros, mantenimiento,
// días que faltan y kilos de diferencia.
// El metabolismo en reposo usa peso, estatura, edad y sexo (Mifflin-St Jeor).
// Ese valor se multiplica por el factor de actividad. El resultado es el mantenimiento.
// Si el nivel no está en la lista, el factor queda en 1.2.
// La diferencia es el peso objetivo menos el actual. Cada kilo se cuenta como 7700 kcal
// y se reparte entre los días que faltan. Si faltan 0 días o la fecha ya pasó, esa división usa 1 día.
// El ajuste se recorta entre -1000 y 750. Luego se redondea y no baja de 1500 kcal
// en hombres ni de 1200 en mujeres.
// Proteína, en gramos por kilo de peso actual: 1.8 si hay que bajar más de 0.3 kg,
// 1.6 si hay que subir más de 0.3 kg y 1.4 en los demás casos.
// La grasa es el 28% de la meta de calorías, a 9 kcal por gramo.
// Los carbohidratos usan las kcal que sobran, a 4 kcal por gramo, y no bajan de 0.
// daysRemaining puede salir negativo. kilogramChange se devuelve con un decimal.
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

// Elige una frase. Si el cambio ya redondeado es menor a 0.3 kg, dice que hay que mantener.
// Si no, y la fecha ya pasó, pide actualizarla. En el otro caso dice si hay que subir o bajar.
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
