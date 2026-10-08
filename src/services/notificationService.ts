import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuración para que la alerta se muestre en pantalla incluso si la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificaciones',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

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

/**
 * Proyecta las notificaciones de racha para los próximos 7 días.
 * @param completadoHoy Si es true, omite programar las alertas para el día en curso.
 */
export const programarNotificacionesRacha = async (
  completadoHoy: boolean,
  horaRecordatorio = '19:00',
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

  const tienePermiso = await solicitarPermisosNotificaciones();
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
          title: '🔥 ¡No pierdas tu racha!',
          body: 'Es hora de hacer tu check-in diario. Entra y asegura tu progreso.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaRecordatorio,
        },
      });
    }

    if (minutosUrgencia > hora * 60 + minuto && fechaUrgencia > ahora) {
      await Notifications.scheduleNotificationAsync({
        identifier: `racha-urgencia-dia${i}`,
        content: {
          title: '⚠️ ¡Última llamada para tu racha!',
          body: 'Faltan un par de horas para que termine el día. ¡Salva tu racha ahora!',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaUrgencia,
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