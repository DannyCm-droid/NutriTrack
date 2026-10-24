import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/services/firebase';
import type { Meal, MealItem, UserProfile, WeightEntry } from '@/types/models';

// setDoc crea o reemplaza users/{uid}. Si logWeight es true, también agrega un peso.
// addDoc genera el id del documento solo.
export async function saveProfile(uid: string, profile: UserProfile, logWeight = false) {
  await setDoc(doc(db, 'users', uid), profile);
  if (logWeight) {
    await addDoc(collection(db, 'users', uid, 'weights'), {
      weightKg: profile.weightKg,
      recordedAt: profile.updatedAt,
    });
  }
}

// Guarda la comida en users/{uid}/meals. El parámetro no trae id: Firestore lo asigna.
export async function saveMeal(uid: string, meal: Omit<Meal, 'id'>) {
  await addDoc(collection(db, 'users', uid, 'meals'), meal);
}

// Borra una comida concreta. No toca el perfil ni los pesos.
export async function deleteMeal(uid: string, mealId: string) {
  await deleteDoc(doc(db, 'users', uid, 'meals', mealId));
}

// Agrega un registro de peso y actualiza weightKg y updatedAt del perfil.
export async function logWeight(uid: string, weightKg: number) {
  const recordedAt = Date.now();
  await addDoc(collection(db, 'users', uid, 'weights'), { weightKg, recordedAt });
  await updateDoc(doc(db, 'users', uid), { weightKg, updatedAt: recordedAt });
}

// Si el dato de Firestore no es un número finito, se usa 0 para no romper la pantalla.
function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

// Convierte un documento de Firestore en Meal. Si no hay descripción o items, se descarta.
// recognized solo queda en false cuando el documento lo dice de forma explícita.
export function mapMeal(id: string, data: DocumentData): Meal | null {
  if (typeof data.description !== 'string' || !Array.isArray(data.items)) return null;

  const items: MealItem[] = data.items.map((item) => {
    const value = (item ?? {}) as Partial<MealItem>;
    return {
      name: typeof value.name === 'string' ? value.name : 'Alimento',
      quantityLabel: typeof value.quantityLabel === 'string' ? value.quantityLabel : '',
      grams: asNumber(value.grams),
      calories: asNumber(value.calories),
      protein: asNumber(value.protein),
      carbs: asNumber(value.carbs),
      fat: asNumber(value.fat),
      recognized: value.recognized !== false,
    };
  });

  return {
    id,
    description: data.description,
    items,
    calories: asNumber(data.calories),
    protein: asNumber(data.protein),
    carbs: asNumber(data.carbs),
    fat: asNumber(data.fat),
    eatenAt: asNumber(data.eatenAt),
  };
}

// Igual que mapMeal, pero para un peso. Sin weightKg numérico, el documento no se usa.
export function mapWeight(id: string, data: DocumentData): WeightEntry | null {
  if (typeof data.weightKg !== 'number') return null;
  return {
    id,
    weightKg: data.weightKg,
    recordedAt: asNumber(data.recordedAt),
  };
}
