import AsyncStorage from '@react-native-async-storage/async-storage';
// Asegúrate de importar tu cliente configurado de Supabase
import { supabase } from './supabase'; 

export interface LimitesUso {
  limite_notificacion: number;
  limite_bloqueo: number;
}

// 1. Lectura: Consulta Supabase y respalda en AsyncStorage
export const obtenerLimites = async (userId: string): Promise<LimitesUso | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles') // Reemplaza con el nombre exacto de tu tabla si es distinto
      .select('limite_notificacion, limite_bloqueo')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (data) {
      // Guardamos la configuración en local como respaldo
      await AsyncStorage.setItem(`limites_${userId}`, JSON.stringify(data));
      return data as LimitesUso;
    }
    return null;
  } catch (error) {
    console.warn('Error al obtener límites de Supabase. Leyendo respaldo local...', error);
    
    // Fallback a AsyncStorage si no hay conexión o falla la DB
    const localData = await AsyncStorage.getItem(`limites_${userId}`);
    return localData ? JSON.parse(localData) : null;
  }
};

// 2. Escritura: Actualiza Supabase y luego AsyncStorage
export const guardarLimites = async (userId: string, limites: LimitesUso): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        limite_notificacion: limites.limite_notificacion,
        limite_bloqueo: limites.limite_bloqueo,
      })
      .eq('id', userId);

    if (error) throw error;

    // Si tuvo éxito en la DB, actualizamos el almacenamiento local
    await AsyncStorage.setItem(`limites_${userId}`, JSON.stringify(limites));
    return true;
  } catch (error) {
    console.error('Error guardando los límites:', error);
    return false;
  }
};