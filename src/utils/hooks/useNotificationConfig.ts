import { useState, useEffect, useCallback } from 'react';
import { 
  obtenerConfigNotificaciones, 
  guardarConfigNotificaciones, 
  NotificacionesConfig, 
  DEFAULT_NOTIF_CONFIG 
} from '../../services/notificationConfigService';
import { 
  programarNotificacionesRacha, 
  limpiarNotificacionesRacha 
} from '../../services/notificationService';

export const useNotificationConfig = (userId: string | undefined, rachaCompletadaHoy: boolean) => {
  const [config, setConfig] = useState<NotificacionesConfig>(DEFAULT_NOTIF_CONFIG);
  const [loading, setLoading] = useState(true);

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
        if (mounted) setConfig(data);
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
    if (!userId) return;
    
    const nuevaConfig = { ...config, checkInEnabled: enabled };
    setConfig(nuevaConfig);

    try {
      if (enabled) {
        const programadas = await programarNotificacionesRacha(rachaCompletadaHoy, config.checkInTime);
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
    }
  }, [userId, config, rachaCompletadaHoy]);

  const toggleLimite = useCallback(async (enabled: boolean) => {
    if (!userId) return;
    
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
    }
  }, [userId, config]);

  const actualizarHoraCheckIn = useCallback(async (nuevaHora: string) => {
    if (!userId) return;
    
    const nuevaConfig = { ...config, checkInTime: nuevaHora };
    setConfig(nuevaConfig);
    try {
      if (config.checkInEnabled) {
        const programadas = await programarNotificacionesRacha(rachaCompletadaHoy, nuevaHora);
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
    }
  }, [userId, config, rachaCompletadaHoy]);

  return {
    config,
    loading,
    toggleCheckIn,
    toggleLimite,
    actualizarHoraCheckIn
  };
};