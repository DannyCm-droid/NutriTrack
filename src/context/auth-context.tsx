import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db } from '@/services/firebase';
import { ACTIVITY_LEVELS, type ActivityLevel, type UserProfile } from '@/types/models';

// Lo que cualquier pantalla puede leer con useAuth.
// user es la cuenta de Firebase. profile es el documento de Firestore.
// initializing: todavía no sabemos si hay sesión. profileLoading: hay sesión, pero el perfil no ha llegado.
type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  initializing: boolean;
  profileLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// children son las pantallas que este componente envuelve.
// useState guarda un dato que, al cambiar, vuelve a dibujar la pantalla.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const uid = user?.uid ?? null;
  const [trackedUid, setTrackedUid] = useState<string | null>(null);

  // Si cambia la cuenta durante el render, se borra el perfil anterior
  // para no mostrar los datos de otro usuario mientras llega el documento nuevo.
  if (uid !== trackedUid) {
    setTrackedUid(uid);
    setProfile(null);
    setProfileLoading(uid != null);
  }

  // useEffect corre después de pintar. El arreglo vacío hace que esto ocurra una sola vez.
  // onAuthStateChanged escucha la sesión. Lo que devuelve el efecto es la función para dejar de escuchar.
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

  // Segundo listener: el documento users/{uid}. Se vuelve a suscribir si cambia uid.
  // Si el documento no existe, el perfil queda en null. Si la lectura falla, también,
  // y profileLoading pasa a false para que la pantalla deje de esperar.
  useEffect(() => {
    if (!uid) return;

    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? parseProfile(snapshot.data()) : null);
        setProfileLoading(false);
      },
      () => {
        setProfile(null);
        setProfileLoading(false);
      },
    );
  }, [uid]);

  return (
    <AuthContext.Provider value={{ user, profile, initializing, profileLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Lee el contexto. Si se llama fuera de AuthProvider, no hay valor y se lanza un error.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return value;
}

// Revisa el documento antes de usarlo. Si falta el nombre, el sexo, la edad, el peso,
// la estatura, la actividad, el peso meta o la fecha, o el tipo no coincide, devuelve null.
// El correo, si no es texto, queda vacío. updatedAt, si no es un número, usa Date.now().
function parseProfile(data: Record<string, unknown>): UserProfile | null {
  if (
    typeof data.name !== 'string' ||
    (data.sex !== 'female' && data.sex !== 'male') ||
    typeof data.age !== 'number' ||
    typeof data.weightKg !== 'number' ||
    typeof data.heightCm !== 'number' ||
    !isActivityLevel(data.activityLevel) ||
    typeof data.goalWeightKg !== 'number' ||
    typeof data.goalDeadline !== 'string'
  ) {
    return null;
  }

  return {
    name: data.name,
    email: typeof data.email === 'string' ? data.email : '',
    sex: data.sex,
    age: data.age,
    weightKg: data.weightKg,
    heightCm: data.heightCm,
    activityLevel: data.activityLevel,
    goalWeightKg: data.goalWeightKg,
    goalDeadline: data.goalDeadline,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
}

function isActivityLevel(value: unknown): value is ActivityLevel {
  return ACTIVITY_LEVELS.some((item) => item.id === value);
}
