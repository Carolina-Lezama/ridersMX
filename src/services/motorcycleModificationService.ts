import { supabase } from './supabase';

export type MotorcycleModificationCategory = 'accesorio' | 'modificacion';

export interface MotorcycleModification {
  id: string;
  motocicleta_id: string;
  perfil_id: string;
  nombre: string;
  categoria: MotorcycleModificationCategory;
  marca: string | null;
  fecha_instalacion: string;
  garantia: string | null;
  costo: number | string;
  notas: string | null;
  created_at: string;
}

export interface MotorcycleModificationInput {
  nombre: string;
  categoria: MotorcycleModificationCategory;
  marca: string | null;
  fecha_instalacion: string;
  garantia: string | null;
  costo: number;
  notas: string | null;
}

const modificationColumns =
  'id, motocicleta_id, perfil_id, nombre, categoria, marca, fecha_instalacion, garantia, costo, notas, created_at';

async function getCurrentUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) throw new Error('Inicia sesión para administrar las mejoras de tu motocicleta.');
  return session.user.id;
}

export async function listMotorcycleModifications(motorcycleId: string): Promise<MotorcycleModification[]> {
  const { data, error } = await supabase
    .from('modificaciones_motocicleta')
    .select(modificationColumns)
    .eq('motocicleta_id', motorcycleId)
    .order('fecha_instalacion', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createMotorcycleModification(
  motorcycleId: string,
  input: MotorcycleModificationInput,
): Promise<MotorcycleModification> {
  const perfilId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('modificaciones_motocicleta')
    .insert({ ...input, motocicleta_id: motorcycleId, perfil_id: perfilId })
    .select(modificationColumns)
    .single();

  if (error) throw error;
  return data;
}

export async function updateMotorcycleModification(
  motorcycleId: string,
  modificationId: string,
  input: MotorcycleModificationInput,
): Promise<MotorcycleModification> {
  const { data, error } = await supabase
    .from('modificaciones_motocicleta')
    .update(input)
    .eq('id', modificationId)
    .eq('motocicleta_id', motorcycleId)
    .select(modificationColumns)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMotorcycleModification(
  motorcycleId: string,
  modificationId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('modificaciones_motocicleta')
    .delete()
    .eq('id', modificationId)
    .eq('motocicleta_id', motorcycleId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se encontró el registro o ya fue eliminado.');
}
