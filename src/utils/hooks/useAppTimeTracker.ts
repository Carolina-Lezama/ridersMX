import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { navigate } from '../helper/navigationRef'; // Importamos el navegador global

export const useAppTimeTracker = () => {
  const appState = useRef(AppState.currentState);
  const sessionStartTime = useRef(Date.now());
  
  // Estados para el Modal In-App
  const [mostrarModalAviso, setMostrarModalAviso] = useState(false);
  const [minutosAvisoActual, setMinutosAvisoActual] = useState(0);

  // Banderas en memoria para no spamear al usuario en el mismo día
  const avisoMostradoHoy = useRef(false);
  const limiteIgnoradoHoy = useRef(false);

  // Cargar límites guardados en AsyncStorage/Supabase
  const evaluarReglasDeNegocio = async (minutosTranscurridosHoy: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      const cachedLimites = await AsyncStorage.getItem(`limites_${userId}`);
      if (!cachedLimites) return;

      const { limite_notificacion, limite_bloqueo } = JSON.parse(cachedLimites);

      // DISPARADOR 1: Aviso de tiempo (Modal)
      if (
        limite_notificacion > 0 &&
        minutosTranscurridosHoy >= limite_notificacion &&
        !avisoMostradoHoy.current
      ) {
        avisoMostradoHoy.current = true;
        setMinutosAvisoActual(limite_notificacion);
        setMostrarModalAviso(true);
      }

      // DISPARADOR 2: Bloqueo forzado (Redirección)
      if (
        limite_bloqueo > 0 &&
        minutosTranscurridosHoy >= limite_bloqueo &&
        !limiteIgnoradoHoy.current
      ) {
        navigate('LimiteAlcanzado', {
          onIgnorar: () => {
            limiteIgnoradoHoy.current = true; // El usuario presiona "Ignorar por hoy"
          },
        });
      }
    } catch (error) {
      console.error('Error evaluando reglas del vigilante:', error);
    }
  };

  const guardarTiempoAcumulado = async () => {
    const timeSpentMs = Date.now() - sessionStartTime.current;
    const minutesSpent = timeSpentMs / 60000;

    if (minutesSpent > 0.08) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.rpc('registrar_tiempo_uso', { p_minutos: minutesSpent });
        }
      } catch (error) {
        // Respaldo offline en AsyncStorage
        const guardadoPrevio = await AsyncStorage.getItem('@tiempo_uso_pendiente');
        const totalOffline = (guardadoPrevio ? parseFloat(guardadoPrevio) : 0) + minutesSpent;
        await AsyncStorage.setItem('@tiempo_uso_pendiente', totalOffline.toString());
      }
    }
    sessionStartTime.current = Date.now();
  };

  useEffect(() => {
    // Revisa cada 60 segundos si se alcanzaron los límites
    const timerVigilante = setInterval(async () => {
      if (appState.current === 'active') {
        const tiempoSesionMinutos = (Date.now() - sessionStartTime.current) / 60000;
        
        // Consultar el acumulado de hoy
        const { data } = await supabase
          .from('tiempo_uso')
          .select('minutos_usados')
          .eq('fecha', new Date().toISOString().split('T')[0])
          .single();

        const tiempoTotalHoy = (data?.minutos_usados || 0) + tiempoSesionMinutos;
        evaluarReglasDeNegocio(tiempoTotalHoy);
      }
    }, 60000); // 1 minuto

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        sessionStartTime.current = Date.now();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        guardarTiempoAcumulado();
      }
      appState.current = nextAppState;
    });

    if (Platform.OS === 'web') {
      const handleBeforeUnload = () => guardarTiempoAcumulado();
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        clearInterval(timerVigilante);
        subscription.remove();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }

    return () => {
      clearInterval(timerVigilante);
      subscription.remove();
    };
  }, []);

  return {
    mostrarModalAviso,
    minutosAvisoActual,
    cerrarModalAviso: () => setMostrarModalAviso(false),
  };
};