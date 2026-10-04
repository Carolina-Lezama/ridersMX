import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface LimitesUso {
  limite_notificacion: number;
  limite_bloqueo: number;
}

const normalizarLimites = (value: unknown): LimitesUso | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<LimitesUso>;
  const limiteNotificacion = Number(candidate.limite_notificacion);
  const limiteBloqueo = Number(candidate.limite_bloqueo);
  if (
    !Number.isInteger(limiteNotificacion) ||
    limiteNotificacion < 0 ||
    !Number.isInteger(limiteBloqueo) ||
    limiteBloqueo < 0
  ) {
    return null;
  }

  return {
    limite_notificacion: limiteNotificacion,
    limite_bloqueo: limiteBloqueo,
  };
};

// 1. Lectura: Consulta Supabase y respalda en AsyncStorage
export const obtenerLimites = async (userId: string): Promise<LimitesUso | null> => {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('limite_notificacion, limite_bloqueo')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (data) {
      const limites = normalizarLimites(data);
      if (!limites) throw new Error('Supabase devolvió límites de uso no válidos.');
      // Guardamos la configuración en local como respaldo
      await AsyncStorage.setItem(`limites_${userId}`, JSON.stringify(limites));
      return limites;
    }
    return null;
  } catch (error) {
    console.warn('Error al obtener límites de Supabase. Leyendo respaldo local...', error);
    
    // Fallback a AsyncStorage si no hay conexión o falla la DB
    const localData = await AsyncStorage.getItem(`limites_${userId}`);
    if (!localData) return null;

    try {
      const limites = normalizarLimites(JSON.parse(localData));
      if (!limites) throw new Error('El respaldo local de límites no es válido.');
      return limites;
    } catch (parseError) {
      console.error('No se pudo interpretar el respaldo local de límites:', parseError);
      return null;
    }
  }
};

// 2. Escritura: Actualiza Supabase y luego AsyncStorage
export const guardarLimites = async (userId: string, limites: LimitesUso): Promise<boolean> => {
  try {
    const normalizados = normalizarLimites(limites);
    if (!normalizados) throw new Error('Los límites deben ser enteros no negativos.');

    const { data, error } = await supabase
      .from('perfiles')
      .update({
        limite_notificacion: normalizados.limite_notificacion,
        limite_bloqueo: normalizados.limite_bloqueo,
      })
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No se encontró el perfil para guardar los límites.');

    // Si tuvo éxito en la DB, actualizamos el almacenamiento local
    await AsyncStorage.setItem(`limites_${userId}`, JSON.stringify(normalizados));
    return true;
  } catch (error) {
    console.error('Error guardando los límites:', error);
    return false;
  }
};