import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db } from '@/services/firebase';
import { ACTIVITY_LEVELS, type ActivityLevel, type UserProfile } from '@/types/models';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  initializing: boolean;
  profileLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const uid = user?.uid ?? null;
  const [trackedUid, setTrackedUid] = useState<string | null>(null);

  if (uid !== trackedUid) {
    setTrackedUid(uid);
    setProfile(null);
    setProfileLoading(uid != null);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

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

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return value;
}

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
