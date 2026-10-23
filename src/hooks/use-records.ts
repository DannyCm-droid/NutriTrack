import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, type DocumentData } from 'firebase/firestore';

import { useAuth } from '@/context/auth-context';
import { db } from '@/services/firebase';
import { mapMeal, mapWeight } from '@/services/user-data';

export function useMeals() {
  return useRecords('meals', 'eatenAt', mapMeal);
}

export function useWeights() {
  return useRecords('weights', 'recordedAt', mapWeight);
}

function useRecords<T>(
  collectionName: 'meals' | 'weights',
  orderField: 'eatenAt' | 'recordedAt',
  mapRecord: (id: string, data: DocumentData) => T | null,
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [trackedUid, setTrackedUid] = useState(uid);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(uid != null);
  const [error, setError] = useState<string | null>(null);

  if (uid !== trackedUid) {
    setTrackedUid(uid);
    setItems([]);
    setLoading(uid != null);
    setError(null);
  }

  useEffect(() => {
    if (!uid) return;

    const records = query(
      collection(db, 'users', uid, collectionName),
      orderBy(orderField, 'desc'),
      limit(80),
    );

    return onSnapshot(
      records,
      (snapshot) => {
        setItems(
          snapshot.docs
            .map((item) => mapRecord(item.id, item.data()))
            .filter((item): item is T => item !== null),
        );
        setError(null);
        setLoading(false);
      },
      () => {
        setError('No se pudieron cargar tus datos. Revisa la conexión y la configuración de Firestore.');
        setLoading(false);
      },
    );
  }, [collectionName, mapRecord, orderField, uid]);

  return { items, loading, error };
}
