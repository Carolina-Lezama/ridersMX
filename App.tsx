import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './assets/theme/ThemeContext';
import { useAppTimeTracker } from './src/utils/hooks/useAppTimeTracker';
import { AvisoTiempoModal } from './src/components/AvisoTiempoModal';
import RootNavigator from './src/navigation/RootNavigator';
import { supabase } from './src/services/supabase';
import { MultiAccountService } from './src/services/MultiAccountService';

function AppContent({ isFirstLaunch, hasSession }: { isFirstLaunch: boolean; hasSession: boolean }) {
  const { mostrarModalAviso, minutosAvisoActual, cerrarModalAviso } = useAppTimeTracker();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        void MultiAccountService.updateKnownSession(session).catch(error => {
          console.error('No se pudieron actualizar los tokens de la cuenta guardada:', error);
        });
      }
    });

    const restoreStoredAccount = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session) await MultiAccountService.saveSession(session);
    };
    void restoreStoredAccount().catch(error => {
      console.error('No se pudo guardar la sesión activa en el gestor de cuentas:', error);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <RootNavigator isFirstLaunch={isFirstLaunch} hasSession={hasSession} />
      <AvisoTiempoModal
        visible={mostrarModalAviso}
        minutos={minutosAvisoActual}
        onClose={cerrarModalAviso}
      />
    </>
  );
}

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const [value, sessionResult] = await Promise.all([
          AsyncStorage.getItem('@ya_vio_onboarding'),
          supabase.auth.getSession(),
        ]);
        if (sessionResult.error) throw sessionResult.error;
        setIsFirstLaunch(value === null);
        setHasSession(sessionResult.data.session !== null);
      } catch (error) {
        console.error('No se pudo restaurar el estado de inicio de la app:', error);
        setIsFirstLaunch(false);
        setHasSession(false);
      }
    };
    void checkFirstLaunch();
  }, []);

  if (isFirstLaunch === null || hasSession === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent isFirstLaunch={isFirstLaunch} hasSession={hasSession} />
    </ThemeProvider>
  );
}