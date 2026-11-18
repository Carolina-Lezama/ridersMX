import * as Notifications from 'expo-notifications';

export const escucharRespuestasNotificacion = (
  listener: (response: Notifications.NotificationResponse) => void,
): (() => void) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(listener);
  return () => subscription.remove();
};

export const escucharNotificacionesRecibidas = (
  listener: (notification: Notifications.Notification) => void,
): (() => void) => {
  const subscription = Notifications.addNotificationReceivedListener(listener);
  return () => subscription.remove();
};
