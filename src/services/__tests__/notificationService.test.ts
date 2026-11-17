import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { programarNotificacionesEventos } from '../notificationService';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/eventoNotifications', () => ({
  obtenerFechaRecordatorioEvento: jest.fn(() => new Date(Date.now() + 60_000)),
}));

const platformOS = Platform.OS;

describe('programarNotificacionesEventos', () => {
  const eventos = [
    { id: 'rodada-1', titulo: 'Rodada', fecha: '2026-11-18', hora: '16:00', tipo: 'rodada', estado: 'Planeada' },
    { id: 'mantenimiento-1', titulo: 'Servicio', fecha: '2026-11-18', hora: '16:00', tipo: 'mantenimiento', estado: 'Planeada' },
  ];

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.clearAllMocks();
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: eventos, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(query);
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platformOS });
  });

  it('programa solo los avisos de las categorías activadas', async () => {
    await programarNotificacionesEventos('perfil-1', {
      rodadasEnabled: false,
      mantenimientosEnabled: true,
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: 'evento-mantenimiento-1',
      content: expect.objectContaining({ data: { eventId: 'mantenimiento-1' } }),
    }));
  });
});
