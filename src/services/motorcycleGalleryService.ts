import { supabase } from './supabase';

export const MOTORCYCLE_GALLERY_BUCKET = 'moto-galeria';
export const MOTORCYCLE_GALLERY_MAX_FILE_SIZE = 10 * 1024 * 1024;
const signedUrlLifetimeSeconds = 60 * 60;

export interface MotorcycleGalleryPhoto {
  id: string;
  motocicleta_id: string;
  perfil_id: string;
  storage_path: string;
  fecha: string;
  nota: string | null;
  created_at: string;
  signedUrl?: string;
}

export interface MotorcycleGalleryPhotoInput {
  fecha: string;
  nota: string | null;
}

const galleryColumns = 'id, motocicleta_id, perfil_id, storage_path, fecha, nota, created_at';
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function getCurrentUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user) throw new Error('Inicia sesión para guardar fotos en el garaje.');
  return session.user.id;
}

export function getGalleryImageExtension(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  throw new Error('Elige una imagen JPG, PNG o WebP.');
}

export async function listMotorcycleGalleryPhotos(motorcycleId: string): Promise<MotorcycleGalleryPhoto[]> {
  const { data, error } = await supabase
    .from('galeria_motocicleta')
    .select(galleryColumns)
    .eq('motocicleta_id', motorcycleId)
    .order('fecha', { ascending: false });
  if (error) throw error;

  const photos: MotorcycleGalleryPhoto[] = data ?? [];
  if (photos.length === 0) return [];

  const { data: signedUrls, error: signedUrlError } = await supabase.storage
    .from(MOTORCYCLE_GALLERY_BUCKET)
    .createSignedUrls(photos.map((photo) => photo.storage_path), signedUrlLifetimeSeconds);
  if (signedUrlError) throw signedUrlError;

  const signedUrlByPath = new Map(
    (signedUrls ?? []).map((item) => [item.path, item.signedUrl]),
  );
  return photos.map((photo) => {
    const signedUrl = signedUrlByPath.get(photo.storage_path);
    if (!signedUrl) throw new Error('No se pudo generar un enlace temporal para una foto del álbum.');
    return { ...photo, signedUrl };
  });
}

export async function createMotorcycleGalleryPhoto(
  motorcycleId: string,
  uri: string,
  contentType: string,
  input: MotorcycleGalleryPhotoInput,
): Promise<void> {
  if (!allowedMimeTypes.has(contentType)) throw new Error('Elige una imagen JPG, PNG o WebP.');
  const perfilId = await getCurrentUserId();
  const response = await fetch(uri);
  if (!response.ok) throw new Error('No se pudo leer la imagen seleccionada.');
  const imageData = await response.arrayBuffer();
  if (imageData.byteLength === 0) throw new Error('La imagen seleccionada está vacía.');
  if (imageData.byteLength > MOTORCYCLE_GALLERY_MAX_FILE_SIZE) {
    throw new Error('La foto debe pesar menos de 10 MB.');
  }

  const extension = getGalleryImageExtension(contentType);
  const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.${extension}`;
  const storagePath = `${perfilId}/${motorcycleId}/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from(MOTORCYCLE_GALLERY_BUCKET)
    .upload(storagePath, imageData, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from('galeria_motocicleta')
    .insert({
      motocicleta_id: motorcycleId,
      perfil_id: perfilId,
      storage_path: storagePath,
      fecha: input.fecha,
      nota: input.nota,
    });

  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from(MOTORCYCLE_GALLERY_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      console.error('No se pudo limpiar la foto cuyo registro no se guardó:', cleanupError);
    }
    throw insertError;
  }
}

export async function updateMotorcycleGalleryPhoto(
  motorcycleId: string,
  photoId: string,
  input: MotorcycleGalleryPhotoInput,
): Promise<void> {
  const { data, error } = await supabase
    .from('galeria_motocicleta')
    .update({ fecha: input.fecha, nota: input.nota })
    .eq('id', photoId)
    .eq('motocicleta_id', motorcycleId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se encontró la foto para actualizarla.');
}

export async function deleteMotorcycleGalleryPhoto(
  motorcycleId: string,
  photoId: string,
  storagePath: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('galeria_motocicleta')
    .delete()
    .eq('id', photoId)
    .eq('motocicleta_id', motorcycleId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No se encontró la foto o ya fue eliminada.');

  const { error: storageError } = await supabase.storage
    .from(MOTORCYCLE_GALLERY_BUCKET)
    .remove([storagePath]);
  if (storageError) {
    throw new Error('La entrada se eliminó, pero no se pudo borrar la imagen del almacenamiento. Contacta a soporte.');
  }
}
