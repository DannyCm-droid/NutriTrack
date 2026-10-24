import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, type DocumentData } from 'firebase/firestore';

import { useAuth } from '@/context/auth-context';
import { db } from '@/services/firebase';
import { mapMeal, mapWeight } from '@/services/user-data';

// Dos atajos sobre la misma lectura. Las comidas se ordenan por eatenAt y los pesos por recordedAt.
// mapMeal y mapWeight devuelven null cuando el documento no tiene la forma esperada.
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
  // items, loading y error son estado: al cambiar, la pantalla que usa el hook se vuelve a dibujar.
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [trackedUid, setTrackedUid] = useState(uid);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(uid != null);
  const [error, setError] = useState<string | null>(null);

  // Si la cuenta cambia durante el render, se vacía la lista anterior
  // para no mostrar datos de otro usuario.
  if (uid !== trackedUid) {
    setTrackedUid(uid);
    setItems([]);
    setLoading(uid != null);
    setError(null);
  }

  // Sin uid no se escucha nada. onSnapshot avisa cada vez que esa colección cambia.
  // La consulta pide como máximo 80 documentos, del más reciente al más antiguo.
  // El return del efecto es la función que deja de escuchar.
  // Un documento que mapRecord convierte en null no entra en la lista.
  // Si la lectura falla, queda el mensaje y loading pasa a false. Ese fallo no borra la lista.
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
