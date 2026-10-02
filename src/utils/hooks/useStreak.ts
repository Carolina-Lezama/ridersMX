import { useState, useEffect, useCallback } from 'react';
import {
  StreakState,
  ESTADO_INICIAL_RACHA,
  obtenerFechaISO,
  obtenerEstadoRachaDB,
  ejecutarCheckInDB,
  registrarCheckInExitoso
} from '../../services/streakService';

export const useStreak = (userId: string | undefined) => {
  const [streakState, setStreakState] = useState<StreakState>(ESTADO_INICIAL_RACHA);
  const [loading, setLoading] = useState<boolean>(true);
  const [procesando, setProcesando] = useState<boolean>(false);

  // Cargar y evaluar racha al iniciar
  useEffect(() => {
    if (!userId) return;

    const inicializarRacha = async () => {
      setLoading(true);
      const estado = await obtenerEstadoRachaDB(userId);
      setStreakState(estado);
      setLoading(false);
    };

    inicializarRacha();
  }, [userId]);

  const completadoHoy = streakState.ultimoCheckIn === obtenerFechaISO();

  const realizarCheckIn = useCallback(async () => {
    if (!userId || completadoHoy || procesando) return;

    setProcesando(true);

    // 1. Actualización optimista (instantánea en la UI)
    const estadoOptimista = registrarCheckInExitoso(streakState);
    setStreakState(estadoOptimista);

    // 2. Confirmación en backend
    const estadoConfirmado = await ejecutarCheckInDB(userId, estadoOptimista);
    
    // Si hay discrepancia entre nuestro cálculo y la BD, manda la BD
    setStreakState(estadoConfirmado);
    setProcesando(false);
    
  }, [userId, completadoHoy, procesando, streakState]);

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