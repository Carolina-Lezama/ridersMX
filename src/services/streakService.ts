export interface StreakState {
  diasRacha: number;
  comodines: number; // Máximo 2
  ultimoCheckIn: string | null; // Formato YYYY-MM-DD
  diasCongelados: string[]; // Fechas salvadas con ❄️
  rachaSalvadaRecientemente: boolean; // Para mostrar badge "Salvado con ❄️" en UI
}

export const ESTADO_INICIAL_RACHA: StreakState = {
  diasRacha: 0,
  comodines: 1, // 1 comodín por defecto al iniciar
  ultimoCheckIn: null,
  diasCongelados: [],
  rachaSalvadaRecientemente: false,
};

const MAX_COMODINES = 2;
const HITOS_RECOMPENSA = [7, 30]; // Días de racha que regalan un comodín

/**
 * Convierte un objeto Date a formato ISO YYYY-MM-DD local
 */
export const obtenerFechaISO = (fecha: Date = new Date()): string => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calcula la diferencia en días naturales entre dos fechas ISO (YYYY-MM-DD)
 */
export const calcularDiferenciaDias = (fechaInicioISO: string, fechaFinISO: string): number => {
  const f1 = new Date(`${fechaInicioISO}T00:00:00`);
  const f2 = new Date(`${fechaFinISO}T00:00:00`);
  const diffTiempo = f2.getTime() - f1.getTime();
  return Math.round(diffTiempo / (1000 * 3600 * 24));
};

/**
 * Evalúa y actualiza el estado de la racha según el paso del tiempo
 */
export const evaluarEstadoAlAbrirApp = (estadoActual: StreakState): StreakState => {
  if (!estadoActual.ultimoCheckIn) return estadoActual;

  const hoyISO = obtenerFechaISO();
  const diffDias = calcularDiferenciaDias(estadoActual.ultimoCheckIn, hoyISO);

  // 0 días = Ya hizo check-in hoy
  // 1 día = Hizo check-in ayer, racha intacta
  if (diffDias <= 1) {
    return { ...estadoActual, rachaSalvadaRecientemente: false };
  }

  // 2 días = Faltó ayer (Día-2 desde su último check-in)
  if (diffDias === 2) {
    if (estadoActual.comodines > 0) {
      // ❄️ CONSUMIR COMODÍN
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const ayerISO = obtenerFechaISO(ayer);

      return {
        ...estadoActual,
        comodines: estadoActual.comodines - 1,
        // El último check-in virtual se actualiza a ayer para mantener continuidad
        ultimoCheckIn: ayerISO,
        diasCongelados: [...estadoActual.diasCongelados, ayerISO],
        rachaSalvadaRecientemente: true,
      };
    } else {
      // 💥 REINICIO A ZERO (Sin comodines)
      return {
        ...estadoActual,
        diasRacha: 0,
        rachaSalvadaRecientemente: false,
      };
    }
  }

  // Mas de 2 días de ausencia = Reinicio inevitable
  return {
    ...estadoActual,
    diasRacha: 0,
    rachaSalvadaRecientemente: false,
  };
};

/**
 * Registra un check-in diario exitoso y otorga comodines en hitos clave
 */
export const registrarCheckInExitoso = (estadoActual: StreakState): StreakState => {
  const hoyISO = obtenerFechaISO();
  const nuevaRacha = estadoActual.diasRacha + 1;

  // Evaluar regeneración de comodín por hito (ej. 7 y 30 días)
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