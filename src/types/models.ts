// Opciones de actividad del perfil.
// factor multiplica el metabolismo para calcular las calorías de mantenimiento.
// "as const" deja fijos los id, para que TypeScript no los trate como un texto cualquiera.
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentario', detail: 'Poco o nada de ejercicio', factor: 1.2 },
  { id: 'light', label: 'Ligero', detail: 'Ejercicio 1 a 3 días por semana', factor: 1.375 },
  { id: 'moderate', label: 'Moderado', detail: 'Ejercicio 3 a 5 días por semana', factor: 1.55 },
  { id: 'active', label: 'Activo', detail: 'Ejercicio 6 a 7 días por semana', factor: 1.725 },
  { id: 'very_active', label: 'Muy activo', detail: 'Trabajo físico o doble sesión', factor: 1.9 },
] as const;

// ActivityLevel solo puede ser uno de los id de la lista de arriba.
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]['id'];
export type Sex = 'female' | 'male';

// Perfil que se guarda en Firestore, en users/{uid}.
// goalDeadline es una fecha AAAA-MM-DD. updatedAt son milisegundos.
export type UserProfile = {
  name: string;
  email: string;
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goalWeightKg: number;
  goalDeadline: string;
  updatedAt: number;
};

// Un alimento dentro de una comida.
// recognized queda en true cuando Gemini estima el alimento y también cuando la persona lo escribe a mano.
// En comidas antiguas puede venir en false. Entonces el historial pide revisar ese valor.
export type MealItem = {
  name: string;
  quantityLabel: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recognized: boolean;
};

// Una comida guardada. eatenAt también va en milisegundos.
export type Meal = {
  id: string;
  description: string;
  items: MealItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  eatenAt: number;
};

// Un peso registrado. El id lo asigna Firestore.
export type WeightEntry = {
  id: string;
  weightKg: number;
  recordedAt: number;
};

// Calorías y macronutrientes, en gramos salvo las calorías.
export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// La meta del día: los macros más el mantenimiento, los días que faltan y el cambio de peso.
export type DailyTargets = Macros & {
  maintenance: number;
  daysRemaining: number;
  kilogramChange: number;
};
