import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Leemos las variables desde el archivo .env o del eas.json en producción
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validación de seguridad antibloqueo
if (!supabaseUrl || !supabaseAnonKey) {
  // Solo lanzamos advertencia, NO un throw Error para evitar el crasheo "SIGABRT" en Android
  console.warn('⚠️ Faltan las variables de entorno de Supabase. La app abrirá, pero la BD no conectará.');
}

// Inicializamos el cliente (usamos un string vacío/falso si no existen para que createClient no explote)
export const supabase = createClient(
  supabaseUrl || 'https://url-de-respaldo-para-evitar-crash.supabase.co', 
  supabaseAnonKey || 'llave-de-respaldo-para-evitar-crash', 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);