jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../supabase';
import {
  limpiarNotificacionesRacha,
  obtenerTotalNotificacionesProgramadas,
  programarNotificacionesRacha,
  solicitarPermisosNotificaciones,
} from '../notificationService.web';

const requestPermission = jest.fn();
const mockNotification = jest.fn();

describe('notificationService.web', () => {
  const originalNotification = globalThis.Notification;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(mockNotification, 'permission', {
      configurable: true,
      value: 'default',
    });
    Object.defineProperty(mockNotification, 'requestPermission', {
      configurable: true,
      value: requestPermission,
    });
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: mockNotification,
    });
  });

  afterAll(() => {
    if (originalNotification) {
      Object.defineProperty(globalThis, 'Notification', {
        configurable: true,
        value: originalNotification,
      });
    } else {
      Reflect.deleteProperty(globalThis, 'Notification');
    }
  });

  it('solicita permiso al navegador y respeta su respuesta', async () => {
    requestPermission.mockResolvedValue('granted');

    await expect(solicitarPermisosNotificaciones()).resolves.toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('programa y limpia recordatorios web cuando el navegador concedió permiso', async () => {
    Object.defineProperty(mockNotification, 'permission', { value: 'granted' });

    await expect(programarNotificacionesRacha(false, '23:59')).resolves.toBe(true);
    await expect(obtenerTotalNotificacionesProgramadas()).resolves.toBeGreaterThan(0);

    await limpiarNotificacionesRacha();
    await expect(obtenerTotalNotificacionesProgramadas()).resolves.toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('no programa recordatorios si el navegador no concede permiso', async () => {
    requestPermission.mockResolvedValue('denied');

    await expect(programarNotificacionesRacha(false, '19:00', true)).resolves.toBe(false);
    await expect(obtenerTotalNotificacionesProgramadas()).resolves.toBe(0);
  });
});
