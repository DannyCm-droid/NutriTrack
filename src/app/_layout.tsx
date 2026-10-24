import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';

// Evita que la pantalla de carga nativa se oculte sola al abrir la app.
SplashScreen.preventAutoHideAsync();

// Envuelve todas las pantallas. AuthProvider deja la sesión disponible en cualquier ruta.
// El Stack de aqui no muestra barra superior: cada grupo de pantallas decide la suya.
export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashGate />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F5F8F2' },
        }}
      />
    </AuthProvider>
  );
}

// Espera a saber si hay sesión y, si la hay, a que llegue el perfil.
// useEffect corre cuando waiting cambia. Si ya no estamos esperando, oculta la pantalla de carga.
// No dibuja nada: return null solo sirve para ejecutar ese efecto.
function SplashGate() {
  const { initializing, user, profileLoading } = useAuth();
  const waiting = initializing || (user != null && profileLoading);

  useEffect(() => {
    if (!waiting) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [waiting]);

  return null;
}
