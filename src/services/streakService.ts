import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase'; // Ajusta tu ruta

export interface StreakState {
  diasRacha: number;
  comodines: number;
  ultimoCheckIn: string | null;
  diasCongelados: string[];
  rachaSalvadaRecientemente: boolean;
}

export const ESTADO_INICIAL_RACHA: StreakState = {
  diasRacha: 0,
  comodines: 1,
  ultimoCheckIn: null,
  diasCongelados: [],
  rachaSalvadaRecientemente: false,
};

const MAX_COMODINES = 2;
const HITOS_RECOMPENSA = [7, 30];
const getStorageKey = (userId: string) => `racha_estado_${userId}`;

// ==========================================
// 1. UTILIDADES LOCALES (Optimistic UI / Offline)
// ==========================================

export const obtenerFechaISO = (fecha: Date = new Date()): string => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calcularDiferenciaDias = (fechaInicioISO: string, fechaFinISO: string): number => {
  const f1 = new Date(`${fechaInicioISO}T00:00:00`);
  const f2 = new Date(`${fechaFinISO}T00:00:00`);
  const diffTiempo = f2.getTime() - f1.getTime();
  return Math.round(diffTiempo / (1000 * 3600 * 24));
};

export const evaluarEstadoAlAbrirApp = (estadoActual: StreakState): StreakState => {
  if (!estadoActual.ultimoCheckIn) return estadoActual;

  const hoyISO = obtenerFechaISO();
  const diffDias = calcularDiferenciaDias(estadoActual.ultimoCheckIn, hoyISO);

  if (diffDias <= 1) {
    return { ...estadoActual, rachaSalvadaRecientemente: false };
  }

  if (diffDias === 2) {
    if (estadoActual.comodines > 0) {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const ayerISO = obtenerFechaISO(ayer);

      return {
        ...estadoActual,
        comodines: estadoActual.comodines - 1,
        ultimoCheckIn: ayerISO,
        diasCongelados: [...estadoActual.diasCongelados, ayerISO],
        rachaSalvadaRecientemente: true,
      };
    } else {
      return { ...estadoActual, diasRacha: 0, rachaSalvadaRecientemente: false };
    }
  }

  return { ...estadoActual, diasRacha: 0, rachaSalvadaRecientemente: false };
};

export const registrarCheckInExitoso = (estadoActual: StreakState): StreakState => {
  const hoyISO = obtenerFechaISO();
  const nuevaRacha = estadoActual.diasRacha + 1;
  let nuevosComodines = estadoActual.comodines;

  if (HITOS_RECOMPENSA.includes(nuevaRacha)) {
    nuevosComodines = Math.min(estadoActual.comodines + 1, MAX_COMODINES);
  }

  return {
    ...estadoActual,
    diasRacha: nuevaRacha,
    comodines: nuevosComodines,
    ultimoCheckIn: hoyISO,
    rachaSalvadaRecientemente: false,
  };
};

// ==========================================
// 2. INTEGRACIÓN SUPABASE & ASYNCSTORAGE
// ==========================================

export const obtenerEstadoRachaDB = async (userId: string): Promise<StreakState> => {
  try {
    const { data, error } = await supabase
      .from('rachas_usuario')
      .select('racha_actual, comodines_disponibles, ultimo_checkin')
      .eq('perfil_id', userId)
      .maybeSingle();

    if (error) throw error;

    let estadoBase = ESTADO_INICIAL_RACHA;
    if (data) {
      estadoBase = {
        ...ESTADO_INICIAL_RACHA,
        diasRacha: data.racha_actual,
        comodines: data.comodines_disponibles,
        ultimoCheckIn: data.ultimo_checkin,
      };
    }

    // Evaluamos si pasaron días antes de devolverlo (por si el backend no lo hizo aún)
    const estadoEvaluado = evaluarEstadoAlAbrirApp(estadoBase);
    
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(estadoEvaluado));
    return estadoEvaluado;
    
  } catch (error) {
    console.warn('Fallo Supabase, leyendo caché local de rachas...', error);
    const localData = await AsyncStorage.getItem(getStorageKey(userId));
    if (localData) {
      // Evaluamos el estado cacheado (así gastamos comodines visualmente si estuvo offline 2 días)
      return evaluarEstadoAlAbrirApp(JSON.parse(localData));
    }
    return ESTADO_INICIAL_RACHA;
  }
};

export const ejecutarCheckInDB = async (userId: string, estadoOptimista: StreakState): Promise<StreakState> => {
  try {
    const { data, error } = await supabase.rpc('procesar_checkin_diario', {
      p_user_id: userId,
    });

    if (error) throw error;

    // Adaptamos la respuesta del backend a nuestro estado local
    const nuevoEstado: StreakState = {
      ...estadoOptimista,
      diasRacha: data.racha_actual,
      comodines: data.comodines_disponibles,
      ultimoCheckIn: obtenerFechaISO(),
      rachaSalvadaRecientemente: data.comodin_usado_hoy || estadoOptimista.rachaSalvadaRecientemente,
    };

    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nuevoEstado));
    return nuevoEstado;
    
  } catch (error) {
    console.error('Error procesando checkin en backend, guardando offline', error);
    // Si falla el backend (sin internet), guardamos el estado optimista (local) para subirlo luego
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(estadoOptimista));
    return estadoOptimista;
  }
};