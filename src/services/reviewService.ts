import { supabase } from './supabase';

export interface ReviewEvent {
  id: string;
  titulo?: string;
  fecha?: string;
  hora?: string;
  perfil_id?: string;
  estado_review?: string;
  recordar_despues_de?: string | null;
  descripcion?: string;
  moto_asociada?: string;
  tipo?: string;
  completado?: boolean;
  [key: string]: any;
}

export const parseEventoDateTime = (fecha?: string, hora?: string) => {
  if (!fecha) return null;

  try {
    const base = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;

    if (!hora) return base;

    const limpio = hora.trim();
    const match = limpio.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

    if (!match) {
      return base;
    }

    let horas = Number(match[1]);
    const minutos = Number(match[2]);
    const periodo = (match[3] || '').toUpperCase();
    if (
      minutos > 59
      || (periodo && (horas < 1 || horas > 12))
      || (!periodo && horas > 23)
    ) {
      return null;
    }

    if (periodo === 'PM' && horas < 12) horas += 12;
    if (periodo === 'AM' && horas === 12) horas = 0;

    const fechaConHora = new Date(base);
    fechaConHora.setHours(horas, minutos, 0, 0);
    return fechaConHora;
  } catch (error) {
    console.warn('No fue posible convertir fecha del evento', error);
    return null;
  }
};

export const obtenerEventoPendiente = async (userId: string): Promise<ReviewEvent | null> => {
  if (!userId) return null;

  const ahora = new Date();
  const fechaLocal = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('-');

  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('perfil_id', userId)
    .eq('estado_review', 'pendiente')
    .lte('fecha', fechaLocal)
    .or(`recordar_despues_de.is.null,recordar_despues_de.lte.${ahora.toISOString()}`)
    .order('fecha', { ascending: false });

  if (error) {
    throw error;
  }

  const evento = (data ?? []).find((item) => {
    const fechaHora = parseEventoDateTime(item.fecha, item.hora);
    return !!fechaHora && fechaHora.getTime() <= ahora.getTime();
  });

  return evento ?? null;
};

export const posponerEventoPendiente = async (userId: string, eventoId: string) => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);

  const { error } = await supabase
    .from('eventos')
    .update({
      recordar_despues_de: manana.toISOString(),
    })
    .eq('id', eventoId)
    .eq('perfil_id', userId)
    .eq('estado_review', 'pendiente');

  if (error) {
    throw error;
  }
};

export const obtenerTotalKilometros = async (userId: string): Promise<number> => {
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('bitacoras_rodadas')
    .select('distancia_km')
    .eq('perfil_id', userId);

  if (error) {
    console.error('Error calculando total de kilómetros:', error);
    return 0;
  }

  return (data ?? []).reduce((total, item) => total + (Number(item.distancia_km) || 0), 0);
};

export const ignorarEventoPendiente = async (userId: string, eventoId: string) => {
  const { error } = await supabase
    .from('eventos')
    .update({
      estado_review: 'ignorado',
    })
    .eq('id', eventoId)
    .eq('perfil_id', userId);

  if (error) {
    throw error;
  }
};

export const guardarResenaRodada = async ({
  userId,
  eventoId,
  motocicletaId,
  calificacion,
  distanciaKm,
  duracionMinutos,
  comentarios,
  fotoUri,
}: {
  userId: string;
  eventoId: string;
  motocicletaId: string | null;
  calificacion: number;
  distanciaKm: number;
  duracionMinutos: number;
  comentarios: string;
  fotoUri?: string | null;
}) => {
  let fotoUrl: string | null = null;

  if (fotoUri) {
    try {
      const response = await fetch(fotoUri);
      const blob = await response.blob();
      const fileName = `review-${eventoId}-${Date.now()}.jpg`;
      const uploadPath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ride-reviews')
        .upload(uploadPath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('ride-reviews').getPublicUrl(uploadPath);
        fotoUrl = publicUrlData?.publicUrl ?? null;
      } else {
        console.warn('No se pudo subir la foto de la reseña, se guardará sin imagen.', uploadError);
      }
    } catch (error) {
      console.warn('Error al subir la foto de la reseña:', error);
    }
  }

  const { data: bitacoraData, error: insertError } = await supabase
    .from('bitacoras_rodadas')
    .insert([
      {
        evento_id: eventoId,
        perfil_id: userId,
        motocicleta_id: motocicletaId,
        distancia_km: Number(distanciaKm) || 0,
        duracion_minutos: Number(duracionMinutos) || 0,
        calificacion: Number(calificacion) || 0,
        comentarios_review: comentarios.trim(),
        foto_url: fotoUrl,
      },
    ])
    .select();

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from('eventos')
    .update({
      estado_review: 'completado',
      completado: true,
    })
    .eq('id', eventoId);

  if (updateError) {
    throw updateError;
  }

  return bitacoraData?.[0] ?? null;
};
