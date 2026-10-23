export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentario', detail: 'Poco o nada de ejercicio', factor: 1.2 },
  { id: 'light', label: 'Ligero', detail: 'Ejercicio 1 a 3 días por semana', factor: 1.375 },
  { id: 'moderate', label: 'Moderado', detail: 'Ejercicio 3 a 5 días por semana', factor: 1.55 },
  { id: 'active', label: 'Activo', detail: 'Ejercicio 6 a 7 días por semana', factor: 1.725 },
  { id: 'very_active', label: 'Muy activo', detail: 'Trabajo físico o doble sesión', factor: 1.9 },
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]['id'];
export type Sex = 'female' | 'male';

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

export type WeightEntry = {
  id: string;
  weightKg: number;
  recordedAt: number;
};

export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DailyTargets = Macros & {
  maintenance: number;
  daysRemaining: number;
  kilogramChange: number;
};
