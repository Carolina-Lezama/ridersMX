import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { obtenerFechaRecordatorioEvento } from '../utils/eventoNotifications';

const CANAL_RECORDATORIOS = 'riders-reminders';
const PREFIJO_NOTIFICACION_EVENTO = 'evento-';

interface EventoProgramable {
  id: string;
  titulo: string;
  fecha: string;
  hora: string | null;
  tipo: string | null;
  estado: string | null;
}

// Configuración para que la alerta se muestre en pantalla incluso si la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const configurarCanalNotificaciones = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
    name: 'RidersMX · Recordatorios',
    description: 'Avisos para cuidar tu racha diaria.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#3B82F6',
  });
};

export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  await configurarCanalNotificaciones();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

/**
 * Limpia únicamente las notificaciones relacionadas con la racha
 * (Deja intactas las futuras de vehículos o comunidad)
 */
// Asegúrate de agregar el "export" a esta función que ya teníamos:
export const limpiarNotificacionesRacha = async () => {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.identifier.startsWith('racha-')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
};

export const limpiarNotificacionesEventos = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(PREFIJO_NOTIFICACION_EVENTO)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
};

export const obtenerTotalNotificacionesProgramadas = async (): Promise<number> => {
  if (Platform.OS === 'web') return 0;
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications.length;
};

export const programarNotificacionesEventos = async (userId: string): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;

  await configurarCanalNotificaciones();
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const { data: eventos, error } = await supabase
    .from('eventos')
    .select('id, titulo, fecha, hora, tipo, estado')
    .eq('perfil_id', userId)
    .eq('estado', 'Planeada')
    .gte('fecha', fechaHoy)
    .order('fecha', { ascending: true })
    .limit(100);

  if (error) throw error;

  await limpiarNotificacionesEventos();
  const ahora = Date.now();

  for (const evento of (eventos ?? []) as EventoProgramable[]) {
    if (!evento.hora) continue;

    const fechaRecordatorio = obtenerFechaRecordatorioEvento(evento.fecha, evento.hora);
    if (!fechaRecordatorio || fechaRecordatorio.getTime() <= ahora) continue;

    const esMantenimiento = evento.tipo === 'mantenimiento';
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIJO_NOTIFICACION_EVENTO}${evento.id}`,
      content: {
        title: esMantenimiento ? 'Recordatorio de mantenimiento' : 'Tu rodada se acerca',
        body: `${evento.titulo} comienza en 30 minutos.`,
        data: { eventId: evento.id },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechaRecordatorio,
        channelId: CANAL_RECORDATORIOS,
      },
    });
  }

  return true;
};

/**
 * Proyecta las notificaciones de racha para los próximos 7 días.
 * @param completadoHoy Si es true, omite programar las alertas para el día en curso.
 */
export const programarNotificacionesRacha = async (
  completadoHoy: boolean,
  horaRecordatorio = '19:00',
  pedirPermiso = false,
): Promise<boolean> => {
  const [hora, minuto] = horaRecordatorio.split(':').map(Number);
  if (
    !Number.isInteger(hora) ||
    hora < 0 ||
    hora > 23 ||
    !Number.isInteger(minuto) ||
    minuto < 0 ||
    minuto > 59
  ) {
    throw new Error(`Hora de recordatorio no válida: ${horaRecordatorio}`);
  }

  if (Platform.OS === 'web') return false;
  await configurarCanalNotificaciones();
  const { status } = await Notifications.getPermissionsAsync();
  const tienePermiso = status === 'granted'
    || (pedirPermiso && await solicitarPermisosNotificaciones());
  if (!tienePermiso) return false;

  await limpiarNotificacionesRacha();

  // Programamos alertas para una ventana de 7 días
  for (let i = 0; i < 7; i++) {
    // Si es hoy (i === 0) y ya hizo checkin, no programamos las alertas de hoy
    if (i === 0 && completadoHoy) continue;

    const fechaRecordatorio = new Date();
    fechaRecordatorio.setDate(fechaRecordatorio.getDate() + i);
    fechaRecordatorio.setHours(hora, minuto, 0, 0);

    const minutosUrgencia = Math.min(hora * 60 + minuto + 180, 23 * 60 + 59);
    const fechaUrgencia = new Date(fechaRecordatorio);
    fechaUrgencia.setHours(Math.floor(minutosUrgencia / 60), minutosUrgencia % 60, 0, 0);

    const ahora = new Date();

    // Primer recordatorio configurable y segundo aviso tres horas después.
    if (fechaRecordatorio > ahora) {
      await Notifications.scheduleNotificationAsync({
        identifier: `racha-recordatorio-dia${i}`,
        content: {
          title: '🏍️ RidersMX · Tu racha te espera',
          body: 'Haz tu check-in de hoy y mantén vivo tu progreso.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaRecordatorio,
          channelId: CANAL_RECORDATORIOS,
        },
      });
    }

    if (minutosUrgencia > hora * 60 + minuto && fechaUrgencia > ahora) {
      await Notifications.scheduleNotificationAsync({
        identifier: `racha-urgencia-dia${i}`,
        content: {
          title: '🔥 RidersMX · Último aviso del día',
          body: 'Aún puedes completar tu check-in y conservar tu racha.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaUrgencia,
          channelId: CANAL_RECORDATORIOS,
        },
      });
    }
  }
  return true;
};

/**
 * Dispara una notificación inmediata cuando se alcanza el límite de tiempo de uso
 */
export const notificarLimiteTiempoUso = async (minutos: number) => {
  const tienePermiso = await solicitarPermisosNotificaciones();
  if (!tienePermiso) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: 'alerta-tiempo-uso',
    content: {
      title: '⏱️ Límite de tiempo alcanzado',
      body: `Has superado tu límite de ${minutos} minutos de uso en la sesión de hoy.`,
      sound: true,
    },
    trigger: null, // null dispara la notificación de manera inmediata
  });
  return true;
};