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

export async function saveProfile(uid: string, profile: UserProfile, logWeight = false) {
  await setDoc(doc(db, 'users', uid), profile);
  if (logWeight) {
    await addDoc(collection(db, 'users', uid, 'weights'), {
      weightKg: profile.weightKg,
      recordedAt: profile.updatedAt,
    });
  }
}

export async function saveMeal(uid: string, meal: Omit<Meal, 'id'>) {
  await addDoc(collection(db, 'users', uid, 'meals'), meal);
}

export async function deleteMeal(uid: string, mealId: string) {
  await deleteDoc(doc(db, 'users', uid, 'meals', mealId));
}

export async function logWeight(uid: string, weightKg: number) {
  const recordedAt = Date.now();
  await addDoc(collection(db, 'users', uid, 'weights'), { weightKg, recordedAt });
  await updateDoc(doc(db, 'users', uid), { weightKg, updatedAt: recordedAt });
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

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

export function mapWeight(id: string, data: DocumentData): WeightEntry | null {
  if (typeof data.weightKg !== 'number') return null;
  return {
    id,
    weightKg: data.weightKg,
    recordedAt: asNumber(data.recordedAt),
  };
}
