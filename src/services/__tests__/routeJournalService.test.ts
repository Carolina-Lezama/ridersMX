import { supabase } from '../supabase';
import { guardarEntradaDiario, type JournalEntry, type JournalEntryDraft } from '../routeJournalService';

jest.mock('../supabase', () => ({
  supabase: { from: jest.fn() },
}));

describe('routeJournalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda una ruta favorita con upsert por reseña para evitar duplicados', async () => {
    const savedEntry: JournalEntry = {
      id: 'diario-1',
      perfil_id: 'rider-1',
      bitacora_id: 'bitacora-1',
      tipo_registro: 'ruta',
      nombre: 'Ruta Sierra',
      tipo_camino: null,
      ubicacion_url: null,
      latitud: null,
      longitud: null,
      notas_asfalto: null,
      notas_clima: null,
      created_at: '2026-11-24T18:00:00.000Z',
    };
    const query = {
      upsert: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    };
    query.upsert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue({ data: savedEntry, error: null });
    jest.mocked(supabase.from).mockReturnValue(query as never);

    const draft: JournalEntryDraft = {
      bitacora_id: 'bitacora-1',
      tipo_registro: 'ruta',
      nombre: 'Ruta Sierra',
      tipo_camino: null,
      ubicacion_url: null,
      latitud: null,
      longitud: null,
      notas_asfalto: null,
      notas_clima: null,
    };

    await expect(guardarEntradaDiario('rider-1', draft)).resolves.toEqual(savedEntry);
    expect(supabase.from).toHaveBeenCalledWith('diario_rutas');
    expect(query.upsert).toHaveBeenCalledWith(
      { ...draft, perfil_id: 'rider-1' },
      { onConflict: 'bitacora_id' },
    );
    expect(query.select).toHaveBeenCalledWith('*');
  });
});
