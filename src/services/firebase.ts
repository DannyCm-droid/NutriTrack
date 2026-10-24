import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En Firebase Console activa Authentication con correo y contraseña, y Cloud Firestore.
// Copia firestore.rules en las reglas de la base de datos para que cada usuario solo vea sus datos.

// Datos públicos del proyecto. Sirven para conectar la app con Firebase.
// No son la contraseña del usuario. Los valores no se repiten en los comentarios.
const firebaseConfig = {
  apiKey: 'AIzaSyCsZvYRZ2nzJOWSd0_CwpS79MpODnjgMDI',
  authDomain: 'nutritrack-93d74.firebaseapp.com',
  projectId: 'nutritrack-93d74',
  storageBucket: 'nutritrack-93d74.firebasestorage.app',
  messagingSenderId: '20391222228',
  appId: '1:20391222228:web:c705acbe2436db7bd75441',
};

// Si el módulo se vuelve a cargar, Firebase ya tiene una app. Se reutiliza en vez de crear otra.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// En la web la sesión la guarda el navegador. En el celular se guarda con AsyncStorage,
// para que siga iniciada al cerrar la app.
function createAuth(firebaseApp: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  // getReactNativePersistence existe en el build de React Native, no en los tipos públicos de web.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authModule = require('firebase/auth') as typeof import('firebase/auth') & {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
  };

  if (!authModule.getReactNativePersistence) {
    throw new Error(
      'Firebase Auth para React Native no incluye getReactNativePersistence. La sesión no puede guardarse.',
    );
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: authModule.getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Fast Refresh vuelve a evaluar este módulo. Auth ya existe: hay que reutilizarlo, no crear otro.
    if (authErrorCode(error) === 'auth/already-initialized') {
      return getAuth(firebaseApp);
    }

    console.error(
      'Firebase Auth no se pudo inicializar.',
      authErrorCode(error) || 'sin-codigo',
    );
    throw error;
  }
}

// auth se usa para entrar y registrarse. db es la base Firestore.
export const auth = createAuth(app);
export const db = getFirestore(app);

// Los errores de Auth traen un código que empieza por "auth/". Si no lo traen, devolvemos texto vacío.
function authErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (typeof code === 'string' && code.startsWith('auth/')) return code;
  }
  return '';
}

// Traduce ese código a una frase en español. El default cubre cualquier código no listado.
export function authErrorMessage(error: unknown) {
  switch (authErrorCode(error)) {
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/wrong-password':
      return 'La contraseña no coincide con la de esta cuenta.';
    case 'auth/user-not-found':
      return 'No hay una cuenta con ese correo.';
    case 'auth/invalid-email':
      return 'Escribe un correo electrónico válido.';
    case 'auth/email-already-in-use':
      return 'Este correo ya tiene una cuenta. Inicia sesión.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/missing-password':
      return 'Escribe la contraseña.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El acceso con correo y contraseña no está activado en Firebase Authentication.';
    case 'auth/user-disabled':
      return 'Esta cuenta está desactivada en Firebase Authentication.';
    case 'auth/unverified-email':
      return 'Firebase está bloqueando el acceso porque el correo no está verificado.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
    case 'auth/invalid-app-credential':
      return 'Esta app no está autorizada para usar Firebase Auth. Revisa la clave y sus restricciones en la consola.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase Authentication.';
    case 'auth/web-storage-unsupported':
      return 'Este navegador no permite guardar la sesión.';
    case 'auth/internal-error':
      return 'Firebase Auth falló de forma interna. Revisa la conexión y la consola.';
    default: {
      const code = authErrorCode(error);
      return code
        ? `No se pudo completar la acción (${code}).`
        : 'No se pudo completar la acción. Inténtalo de nuevo.';
    }
  }
}

// Frase fija para cuando una escritura en Firestore falla.
export function saveErrorMessage() {
  return 'No se pudo guardar. Revisa tu conexión y que Firestore permita escribir los datos de tu usuario.';
}
