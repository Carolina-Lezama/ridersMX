import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface NotificacionesConfig {
  checkInEnabled: boolean;
  limiteEnabled: boolean;
  checkInTime: string; // ej: "19:00"
}

export const DEFAULT_NOTIF_CONFIG: NotificacionesConfig = {
  checkInEnabled: true,
  limiteEnabled: true,
  checkInTime: '19:00',
};

const getStorageKey = (userId: string) => `notif_config_${userId}`;

const normalizarConfig = (value: unknown): NotificacionesConfig => {
  if (!value || typeof value !== 'object') return DEFAULT_NOTIF_CONFIG;

  const candidate = value as Partial<NotificacionesConfig>;
  return {
    checkInEnabled:
      typeof candidate.checkInEnabled === 'boolean'
        ? candidate.checkInEnabled
        : DEFAULT_NOTIF_CONFIG.checkInEnabled,
    limiteEnabled:
      typeof candidate.limiteEnabled === 'boolean'
        ? candidate.limiteEnabled
        : DEFAULT_NOTIF_CONFIG.limiteEnabled,
    checkInTime:
      typeof candidate.checkInTime === 'string' &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.checkInTime)
        ? candidate.checkInTime
        : DEFAULT_NOTIF_CONFIG.checkInTime,
  };
};

export const obtenerConfigNotificaciones = async (userId: string): Promise<NotificacionesConfig> => {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('notificaciones_config')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const config = normalizarConfig(data?.notificaciones_config);

    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(config));
    return config;
  } catch (error) {
    console.warn('Error leyendo config remota, usando respaldo local:', error);
    const localData = await AsyncStorage.getItem(getStorageKey(userId));
    if (!localData) return DEFAULT_NOTIF_CONFIG;

    try {
      return normalizarConfig(JSON.parse(localData));
    } catch (parseError) {
      console.error('La configuración local de notificaciones no es válida:', parseError);
      return DEFAULT_NOTIF_CONFIG;
    }
  }
};

export const guardarConfigNotificaciones = async (userId: string, config: NotificacionesConfig): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .update({ notificaciones_config: config })
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No se encontró el perfil para guardar las notificaciones.');

    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error guardando configuración de notificaciones:', error);
    return false;
  }
};