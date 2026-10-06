import { useState, useEffect, useCallback } from 'react';
import {
  StreakState,
  ESTADO_INICIAL_RACHA,
  obtenerFechaISO,
  obtenerEstadoRachaDB,
  ejecutarCheckInDB,
  registrarCheckInExitoso
} from '../../services/streakService';

import {
  limpiarNotificacionesRacha,
  programarNotificacionesRacha,
} from '../../services/notificationService';
import { obtenerConfigNotificaciones } from '../../services/notificationConfigService';


export const useStreak = (userId: string | undefined) => {
  const [streakState, setStreakState] = useState<StreakState>(ESTADO_INICIAL_RACHA);
  const [loading, setLoading] = useState<boolean>(true);
  const [procesando, setProcesando] = useState<boolean>(false);

  const sincronizarNotificacionesRacha = useCallback(async (
    completadoHoy: boolean,
    currentUserId: string,
  ) => {
    try {
      const config = await obtenerConfigNotificaciones(currentUserId);
      if (config.checkInEnabled) {
        const programadas = await programarNotificacionesRacha(completadoHoy, config.checkInTime);
        if (!programadas) {
          console.warn('Los recordatorios de racha están activos, pero no hay permisos concedidos.');
        }
      } else {
        await limpiarNotificacionesRacha();
      }
    } catch (error) {
      console.error('No se pudieron sincronizar los recordatorios de racha:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!userId) {
      setStreakState(ESTADO_INICIAL_RACHA);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const inicializarRacha = async () => {
      setLoading(true);
      try {
        const estado = await obtenerEstadoRachaDB(userId);
        if (!mounted) return;

        setStreakState(estado);
        const yaCompletadoHoy = estado.ultimoCheckIn === obtenerFechaISO();
        await sincronizarNotificacionesRacha(yaCompletadoHoy, userId);
      } catch (error) {
        console.error('No se pudo inicializar la racha:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void inicializarRacha();
    return () => {
      mounted = false;
    };
  }, [userId, sincronizarNotificacionesRacha]);

  const completadoHoy = streakState.ultimoCheckIn === obtenerFechaISO();

  const realizarCheckIn = useCallback(async () => {
    if (!userId || completadoHoy || procesando) return;

    setProcesando(true);
    try {
      const estadoOptimista = registrarCheckInExitoso(streakState);
      setStreakState(estadoOptimista);
      await sincronizarNotificacionesRacha(true, userId);

      const estadoConfirmado = await ejecutarCheckInDB(userId, estadoOptimista);
      setStreakState(estadoConfirmado);
    } finally {
      setProcesando(false);
    }
    
  }, [userId, completadoHoy, procesando, streakState, sincronizarNotificacionesRacha]);

  return {
    loading,
    procesando,
    diasRacha: streakState.diasRacha,
    comodines: streakState.comodines,
    completadoHoy,
    rachaSalvadaRecientemente: streakState.rachaSalvadaRecientemente,
    realizarCheckIn,
  };
};