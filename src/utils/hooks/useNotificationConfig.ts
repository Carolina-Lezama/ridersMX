import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { 
  obtenerConfigNotificaciones, 
  guardarConfigNotificaciones, 
  NotificacionesConfig, 
  DEFAULT_NOTIF_CONFIG 
} from '../../services/notificationConfigService';
import { 
  programarNotificacionesRacha, 
  limpiarNotificacionesRacha,
  limpiarNotificacionesEventos,
  programarNotificacionesEventos,
  solicitarPermisosNotificaciones,
} from '../../services/notificationService';

export const useNotificationConfig = (userId: string | undefined, rachaCompletadaHoy: boolean) => {
  const [config, setConfig] = useState<NotificacionesConfig>(DEFAULT_NOTIF_CONFIG);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const updateInProgress = useRef(false);

  useEffect(() => {
    let mounted = true;

    if (!userId) {
      setConfig(DEFAULT_NOTIF_CONFIG);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const inicializar = async () => {
      setLoading(true);
      try {
        const data = await obtenerConfigNotificaciones(userId);
        if (!mounted) return;

        if (Platform.OS !== 'web' && (data.checkInEnabled || data.eventosEnabled)) {
          const permissions = await Notifications.getPermissionsAsync();
          const permisosConcedidos = permissions.status === 'granted';
          if (mounted) {
            setConfig(permisosConcedidos
              ? data
              : { ...data, checkInEnabled: false, eventosEnabled: false });
          }
          if (permisosConcedidos && data.eventosEnabled) {
            void programarNotificacionesEventos(userId).catch((error) => {
              console.error('No se pudieron sincronizar recordatorios de agenda:', error);
            });
          }
        } else {
          setConfig(data);
        }
      } catch (error) {
        console.error('No se pudo cargar la configuración de notificaciones:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void inicializar();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const toggleCheckIn = useCallback(async (enabled: boolean) => {
    if (!userId || updateInProgress.current) return;
    updateInProgress.current = true;
    setUpdating(true);
    
    const nuevaConfig = { ...config, checkInEnabled: enabled };
    setConfig(nuevaConfig);

    try {
      if (enabled) {
        const programadas = await programarNotificacionesRacha(rachaCompletadaHoy, config.checkInTime, true);
        if (!programadas) {
          throw new Error('Concede permisos de notificación en tu dispositivo para activar los recordatorios.');
        }
      } else {
        await limpiarNotificacionesRacha();
      }

      if (!(await guardarConfigNotificaciones(userId, nuevaConfig))) {
        throw new Error('No se pudo guardar la configuración de notificaciones.');
      }
    } catch (error) {
      setConfig(config);
      try {
        if (config.checkInEnabled) {
          await programarNotificacionesRacha(rachaCompletadaHoy, config.checkInTime);
        } else {
          await limpiarNotificacionesRacha();
        }
      } catch (restoreError) {
        console.error('No se pudo restaurar la programación anterior de racha:', restoreError);
      }
      throw error;
    } finally {
      updateInProgress.current = false;
      setUpdating(false);
    }
  }, [userId, config, rachaCompletadaHoy]);

  const toggleEventos = useCallback(async (enabled: boolean) => {
    if (!userId || updateInProgress.current) return;
    updateInProgress.current = true;
    setUpdating(true);

    const nuevaConfig = { ...config, eventosEnabled: enabled };
    setConfig(nuevaConfig);

    try {
      if (enabled) {
        const permisosConcedidos = await solicitarPermisosNotificaciones();
        if (!permisosConcedidos) {
          throw new Error(
            Platform.OS === 'web'
              ? 'Los recordatorios de agenda están disponibles en iOS y Android.'
              : 'Concede permisos de notificación en tu dispositivo para activar los recordatorios.',
          );
        }

        const programadas = await programarNotificacionesEventos(userId);
        if (!programadas) throw new Error('No se pudieron programar los recordatorios de agenda.');
      } else {
        await limpiarNotificacionesEventos();
      }

      if (!(await guardarConfigNotificaciones(userId, nuevaConfig))) {
        throw new Error('No se pudo guardar la configuración de notificaciones.');
      }
    } catch (error) {
      setConfig(config);
      try {
        if (config.eventosEnabled) {
          await programarNotificacionesEventos(userId);
        } else {
          await limpiarNotificacionesEventos();
        }
      } catch (restoreError) {
        console.error('No se pudieron restaurar los recordatorios de agenda:', restoreError);
      }
      throw error;
    } finally {
      updateInProgress.current = false;
      setUpdating(false);
    }
  }, [userId, config]);

  const toggleLimite = useCallback(async (enabled: boolean) => {
    if (!userId || updateInProgress.current) return;
    updateInProgress.current = true;
    setUpdating(true);
    
    // Nota: El sistema de límites no programa alertas futuras, 
    // sino que dispara la alerta en tiempo real en base a este estado.
    const nuevaConfig = { ...config, limiteEnabled: enabled };
    setConfig(nuevaConfig);
    try {
      if (!(await guardarConfigNotificaciones(userId, nuevaConfig))) {
        throw new Error('No se pudo guardar la configuración de notificaciones.');
      }
    } catch (error) {
      setConfig(config);
      throw error;
    } finally {
      updateInProgress.current = false;
      setUpdating(false);
    }
  }, [userId, config]);

  const actualizarHoraCheckIn = useCallback(async (nuevaHora: string) => {
    if (!userId || updateInProgress.current) return;
    updateInProgress.current = true;
    setUpdating(true);
    
    const nuevaConfig = { ...config, checkInTime: nuevaHora };
    setConfig(nuevaConfig);
    try {
      if (config.checkInEnabled) {
        const programadas = await programarNotificacionesRacha(rachaCompletadaHoy, nuevaHora, true);
        if (!programadas) {
          throw new Error('Concede permisos de notificación en tu dispositivo para cambiar la hora.');
        }
      }

      if (!(await guardarConfigNotificaciones(userId, nuevaConfig))) {
        throw new Error('No se pudo guardar la hora del recordatorio.');
      }
    } catch (error) {
      setConfig(config);
      try {
        if (config.checkInEnabled) {
          await programarNotificacionesRacha(rachaCompletadaHoy, config.checkInTime);
        }
      } catch (restoreError) {
        console.error('No se pudo restaurar el horario anterior del recordatorio:', restoreError);
      }
      throw error;
    } finally {
      updateInProgress.current = false;
      setUpdating(false);
    }
  }, [userId, config, rachaCompletadaHoy]);

  return {
    config,
    loading,
    updating,
    toggleCheckIn,
    toggleLimite,
    toggleEventos,
    actualizarHoraCheckIn
  };
};