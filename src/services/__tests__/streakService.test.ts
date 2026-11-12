import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  calcularDiferenciaDias,
  ejecutarCheckInDB,
  evaluarEstadoAlAbrirApp,
  obtenerFechaISO,
  registrarCheckInExitoso,
  type StreakState,
} from '../streakService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const estadoBase: StreakState = {
  diasRacha: 2,
  comodines: 1,
  ultimoCheckIn: '2026-03-08',
  diasCongelados: [],
  rachaSalvadaRecientemente: false,
};

describe('servicio de rachas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('calcula diferencias de fecha sin depender de cambios de horario estacional', () => {
    expect(calcularDiferenciaDias('2026-03-08', '2026-03-09')).toBe(1);
    expect(calcularDiferenciaDias('2026-11-01', '2026-11-02')).toBe(1);
  });

  it('consume un solo comodín para cubrir el día faltante y no marca hoy como completado', () => {
    const fechaActual = new Date(2026, 2, 10, 12);
    const evaluado = evaluarEstadoAlAbrirApp(estadoBase, fechaActual);

    expect(evaluado.ultimoCheckIn).toBe('2026-03-09');
    expect(evaluado.comodines).toBe(0);
    expect(evaluado.diasCongelados).toEqual(['2026-03-09']);
    expect(evaluado.ultimoCheckIn).not.toBe(obtenerFechaISO(fechaActual));
    expect(evaluarEstadoAlAbrirApp(evaluado, fechaActual).comodines).toBe(0);
  });

  it('registra el check-in usando el día local recibido', () => {
    const actualizado = registrarCheckInExitoso(estadoBase, new Date(2026, 2, 10, 23, 45));

    expect(actualizado.ultimoCheckIn).toBe('2026-03-10');
    expect(actualizado.diasRacha).toBe(3);
  });

  it('no considera exitoso un check-in cuando falla la llamada al backend', async () => {
    const error = new Error('sin conexión');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error });

    await expect(ejecutarCheckInDB('perfil-1', estadoBase)).rejects.toBe(error);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('registra el día salvado cuando el servidor confirma el uso de un comodín', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 10, 12));
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        exito: true,
        racha_actual: 3,
        comodines_disponibles: 0,
        comodin_usado_hoy: true,
        fecha_checkin: '2026-03-10',
      },
      error: null,
    });

    await ejecutarCheckInDB('perfil-1', estadoBase);

    expect(supabase.rpc).toHaveBeenCalledWith('procesar_checkin_diario', {
      p_user_id: 'perfil-1',
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'racha_estado_perfil-1',
      expect.stringContaining('"diasCongelados":["2026-03-09"]'),
    );
    jest.useRealTimers();
  });
});
