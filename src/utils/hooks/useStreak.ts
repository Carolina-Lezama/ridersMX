import { useState, useEffect, useCallback } from 'react';
import {
  StreakState,
  ESTADO_INICIAL_RACHA,
  evaluarEstadoAlAbrirApp,
  registrarCheckInExitoso,
  obtenerFechaISO,
} from '../../services/streakService';

export const useStreak = () => {
  const [streakState, setStreakState] = useState<StreakState>(ESTADO_INICIAL_RACHA);

  // Evaluar la racha al abrir el hook/pantalla
  useEffect(() => {
    setStreakState((prev) => evaluarEstadoAlAbrirApp(prev));
  }, []);

  const completadoHoy = streakState.ultimoCheckIn === obtenerFechaISO();

  const realizarCheckIn = useCallback(() => {
    setStreakState((prev) => registrarCheckInExitoso(prev));
  }, []);

  return {
    diasRacha: streakState.diasRacha,
    comodines: streakState.comodines,
    completadoHoy,
    rachaSalvadaRecientemente: streakState.rachaSalvadaRecientemente,
    realizarCheckIn,
  };
};