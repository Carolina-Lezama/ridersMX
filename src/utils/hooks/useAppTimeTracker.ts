import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';

export const useAppTimeTracker = () => {
  const appState = useRef(AppState.currentState);
  const sessionStartTime = useRef(Date.now());

  // NUEVO: Sincronizar tiempo offline pendiente
  const sincronizarTiempoPendiente = async () => {
    try {
      const tiempoPendiente = await AsyncStorage.getItem('@tiempo_uso_pendiente');
      if (tiempoPendiente) {
        const minutos = parseFloat(tiempoPendiente);
        if (minutos > 0) {
          const { error } = await supabase.rpc('registrar_tiempo_uso', { p_minutos: minutos });
          if (!error) {
            await AsyncStorage.removeItem('@tiempo_uso_pendiente'); // Limpiamos caché si subió con éxito
            console.log(`Sincronizados ${minutos.toFixed(2)} minutos guardados offline.`);
          }
        }
      }
    } catch (error) {
      console.log("No se pudo sincronizar el tiempo pendiente aún.");
    }
  };

  const guardarTiempoAcumulado = async () => {
    const timeSpentMs = Date.now() - sessionStartTime.current;
    const minutesSpent = timeSpentMs / 60000;

    if (minutesSpent > 0.08) { // Más de ~5 segundos
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase.rpc('registrar_tiempo_uso', { p_minutos: minutesSpent });
          if (error) throw error; // Si falla, salta al catch
          
          await sincronizarTiempoPendiente(); // Si la red va bien, intentamos subir los atrasados
        }
      } catch (error) {
        // RESPALDO OFFLINE
        console.warn("Modo offline: Guardando tiempo localmente...");
        const guardadoPrevio = await AsyncStorage.getItem('@tiempo_uso_pendiente');
        const totalOffline = (guardadoPrevio ? parseFloat(guardadoPrevio) : 0) + minutesSpent;
        await AsyncStorage.setItem('@tiempo_uso_pendiente', totalOffline.toString());
      }
    }
    sessionStartTime.current = Date.now();
  };

  useEffect(() => {
    sincronizarTiempoPendiente(); // Intentar subir datos al abrir la app

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        sessionStartTime.current = Date.now();
        sincronizarTiempoPendiente();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        guardarTiempoAcumulado();
      }
      appState.current = nextAppState;
    });

    if (Platform.OS === 'web') {
      const handleBeforeUnload = () => guardarTiempoAcumulado();
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        subscription.remove();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }

    return () => subscription.remove();
  }, []);
};