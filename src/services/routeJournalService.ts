import { supabase } from './supabase';

export type JournalEntryType = 'ruta' | 'gasolinera' | 'mirador' | 'taller' | 'otro';
export type RoadType = 'curvas' | 'terraceria' | 'autopista' | 'mixto' | 'otro';

export interface JournalEntry {
  id: string;
  perfil_id: string;
  bitacora_id: string | null;
  tipo_registro: JournalEntryType;
  nombre: string;
  tipo_camino: RoadType | null;
  ubicacion_url: string | null;
  latitud: number | null;
  longitud: number | null;
  notas_asfalto: string | null;
  notas_clima: string | null;
  created_at: string;
}

export interface RideJournalReview {
  id: string;
  eventoId: string;
  titulo: string;
  destino: string | null;
  fecha: string | null;
  distanciaKm: number;
  calificacion: number | null;
  comentario: string | null;
}

export type JournalEntryDraft = Omit<JournalEntry, 'id' | 'perfil_id' | 'created_at'> & {
  id?: string;
};

interface RideEvent {
  titulo?: string | null;
  fecha?: string | null;
  rodada_destino?: string | null;
}

export async function cargarDiarioRutas(perfilId: string): Promise<{
  rutasRevisadas: RideJournalReview[];
  entradas: JournalEntry[];
}> {
  const [reviewsResult, entriesResult] = await Promise.all([
    supabase
      .from('bitacoras_rodadas')
      .select('id, evento_id, distancia_km, calificacion, comentarios_review, eventos!inner(titulo, fecha, rodada_destino, tipo)')
      .eq('perfil_id', perfilId)
      .eq('eventos.tipo', 'rodada')
      .order('created_at', { ascending: false }),
    supabase
      .from('diario_rutas')
      .select('*')
      .eq('perfil_id', perfilId)
      .order('created_at', { ascending: false }),
  ]);

  if (reviewsResult.error) throw reviewsResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (!reviewsResult.data || !entriesResult.data) {
    throw new Error('La base de datos no devolvió los datos del diario.');
  }

  const rutasRevisadas = reviewsResult.data.map((review): RideJournalReview => {
    const evento = review.eventos as RideEvent | RideEvent[] | null;
    const datosEvento = Array.isArray(evento) ? evento[0] : evento;
    if (!datosEvento || typeof review.id !== 'string' || typeof review.evento_id !== 'string') {
      throw new Error('Una reseña de rodada no tiene datos válidos.');
    }

    return {
      id: review.id,
      eventoId: review.evento_id,
      titulo: datosEvento.titulo || datosEvento.rodada_destino || 'Rodada sin título',
      destino: datosEvento.rodada_destino || null,
      fecha: datosEvento.fecha || null,
      distanciaKm: Number(review.distancia_km) || 0,
      calificacion: typeof review.calificacion === 'number' ? review.calificacion : null,
      comentario: review.comentarios_review || null,
    };
  });

  return {
    rutasRevisadas,
    entradas: entriesResult.data as JournalEntry[],
  };
}

export async function guardarEntradaDiario(
  perfilId: string,
  draft: JournalEntryDraft,
): Promise<JournalEntry> {
  const { id, ...entry } = draft;
  const payload = { ...entry, perfil_id: perfilId };
  const query = supabase.from('diario_rutas');
  const result = id
    ? await query.update(payload).eq('id', id).eq('perfil_id', perfilId).select('*').maybeSingle()
    : draft.tipo_registro === 'ruta'
      ? await query.upsert(payload, { onConflict: 'bitacora_id' }).select('*').single()
      : await query.insert(payload).select('*').single();

  if (result.error) throw result.error;
  if (!result.data) throw new Error('No se pudo confirmar el guardado de la entrada.');
  return result.data as JournalEntry;
}

export async function eliminarEntradaDiario(perfilId: string, entryId: string): Promise<void> {
  const { data, error } = await supabase
    .from('diario_rutas')
    .delete()
    .eq('id', entryId)
    .eq('perfil_id', perfilId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se encontró la entrada o no tienes permiso para eliminarla.');
}
