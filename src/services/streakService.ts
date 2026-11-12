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
  const obtenerDiaUTC = (fechaISO: string) => {
    const [year, month, day] = fechaISO.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  return (obtenerDiaUTC(fechaFinISO) - obtenerDiaUTC(fechaInicioISO)) / (1000 * 60 * 60 * 24);
};

export const evaluarEstadoAlAbrirApp = (
  estadoActual: StreakState,
  fechaActual: Date = new Date(),
): StreakState => {
  if (!estadoActual.ultimoCheckIn) return estadoActual;

  const hoyISO = obtenerFechaISO(fechaActual);
  const diffDias = calcularDiferenciaDias(estadoActual.ultimoCheckIn, hoyISO);

  if (diffDias <= 1) {
    return estadoActual;
  }

  if (diffDias === 2) {
    if (estadoActual.comodines > 0) {
      const ayer = new Date(fechaActual);
      ayer.setDate(ayer.getDate() - 1);
      const ayerISO = obtenerFechaISO(ayer);

      return {
        ...estadoActual,
        comodines: estadoActual.comodines - 1,
        ultimoCheckIn: ayerISO,
        diasCongelados: estadoActual.diasCongelados.includes(ayerISO)
          ? estadoActual.diasCongelados
          : [...estadoActual.diasCongelados, ayerISO],
        rachaSalvadaRecientemente: true,
      };
    } else {
      return { ...estadoActual, diasRacha: 0, rachaSalvadaRecientemente: false };
    }
  }

  return { ...estadoActual, diasRacha: 0, rachaSalvadaRecientemente: false };
};

export const registrarCheckInExitoso = (
  estadoActual: StreakState,
  fechaActual: Date = new Date(),
): StreakState => {
  const hoyISO = obtenerFechaISO(fechaActual);
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
      .select('racha_actual, comodines_disponibles, ultimo_checkin, ultimo_comodin_usado')
      .eq('perfil_id', userId)
      .maybeSingle();

    if (error) throw error;

    let estadoBase = ESTADO_INICIAL_RACHA;
    if (data) {
      const fechaActual = new Date();
      const ayer = new Date(fechaActual);
      ayer.setDate(ayer.getDate() - 1);
      const hoyISO = obtenerFechaISO(fechaActual);
      estadoBase = {
        ...ESTADO_INICIAL_RACHA,
        diasRacha: data.racha_actual,
        comodines: data.comodines_disponibles,
        ultimoCheckIn: data.ultimo_checkin,
        rachaSalvadaRecientemente: data.ultimo_checkin === hoyISO
          && data.ultimo_comodin_usado === obtenerFechaISO(ayer),
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
      const estadoEvaluado = evaluarEstadoAlAbrirApp(JSON.parse(localData));
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(estadoEvaluado));
      return estadoEvaluado;
    }
    return ESTADO_INICIAL_RACHA;
  }
};

export const ejecutarCheckInDB = async (userId: string, estadoOptimista: StreakState): Promise<StreakState> => {
  let data: {
    exito: boolean;
    racha_actual: number;
    comodines_disponibles: number;
    comodin_usado_hoy?: boolean;
    fecha_checkin: string;
  } | null = null;

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) {
      throw new Error('No se pudo determinar la zona horaria local del dispositivo.');
    }

    const result = await supabase.rpc('procesar_checkin_diario', {
      p_user_id: userId,
      p_timezone: timeZone,
    });

    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    console.error('Error procesando check-in en el backend:', error);
    throw error;
  }

  if (!data) {
    throw new Error('El servidor no devolvió el estado actualizado de la racha.');
  }
  if (data.exito !== true || !data.fecha_checkin) {
    throw new Error('El servidor devolvió una respuesta inválida al procesar la racha.');
  }

  const fecha = data.fecha_checkin;
  const fechaComodin = new Date(`${fecha}T00:00:00.000Z`);
  fechaComodin.setUTCDate(fechaComodin.getUTCDate() - 1);
  const fechaComodinISO = fechaComodin.toISOString().slice(0, 10);

  const diasCongelados = data.comodin_usado_hoy && !estadoOptimista.diasCongelados.includes(fechaComodinISO)
    ? [...estadoOptimista.diasCongelados, fechaComodinISO]
    : estadoOptimista.diasCongelados;
  const nuevoEstado: StreakState = {
    ...estadoOptimista,
    diasRacha: data.racha_actual,
    comodines: data.comodines_disponibles,
    ultimoCheckIn: fecha,
    diasCongelados,
    rachaSalvadaRecientemente: data.comodin_usado_hoy || estadoOptimista.rachaSalvadaRecientemente,
  };

  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nuevoEstado));
  return nuevoEstado;
};