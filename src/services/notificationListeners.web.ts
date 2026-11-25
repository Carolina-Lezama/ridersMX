import type * as Notifications from 'expo-notifications';

export const escucharRespuestasNotificacion = (
  _listener: (response: Notifications.NotificationResponse) => void,
): (() => void) => () => {};

export const escucharNotificacionesRecibidas = (
  _listener: (notification: Notifications.Notification) => void,
): (() => void) => () => {};
