import { supabase } from '../supabase';
import { guardarResenaRodada, obtenerEventoPendiente } from '../reviewService';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('flujo de reseñas de agenda', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('no propone reseñar citas canceladas o reprogramadas', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 10, 12));
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      lte: jest.fn(),
      or: jest.fn(),
      order: jest.fn(),
    };
    for (const method of [query.select, query.eq, query.lte, query.or]) {
      method.mockReturnValue(query);
    }
    query.order.mockResolvedValue({
      data: [
        { id: 'cancelada', fecha: '2026-03-10', hora: '08:00', estado: 'Cancelada' },
        { id: 'reprogramada', fecha: '2026-03-10', hora: '08:00', estado: 'Reprogramada' },
        { id: 'futura', fecha: '2026-03-10', hora: '11:00', estado: 'Planeada' },
        { id: 'vencida', fecha: '2026-03-10', hora: '09:00', estado: 'Completada' },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(query);

    await expect(obtenerEventoPendiente('perfil-1')).resolves.toMatchObject({ id: 'vencida' });
  });

  it('no duplica una reseña de rodada al reintentar tras un fallo parcial previo', async () => {
    const consultaBitacora = {
      select: jest.fn(),
      eq: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'bitacora-existente' }, error: null }),
    };
    consultaBitacora.select.mockReturnValue(consultaBitacora);
    consultaBitacora.eq.mockReturnValue(consultaBitacora);
    consultaBitacora.limit.mockReturnValue(consultaBitacora);

    const updateQuery = {
      eq: jest.fn(),
    };
    updateQuery.eq.mockReturnValueOnce(updateQuery).mockResolvedValueOnce({ error: null });
    const update = jest.fn().mockReturnValue(updateQuery);
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(consultaBitacora)
      .mockReturnValueOnce({ update });

    const resultado = await guardarResenaRodada({
      userId: 'perfil-1',
      eventoId: 'evento-1',
      motocicletaId: null,
      calificacion: 5,
      distanciaKm: 20,
      duracionMinutos: 60,
      comentarios: '',
    });

    expect(resultado).toEqual({ id: 'bitacora-existente' });
    expect(update).toHaveBeenCalledWith({
      estado_review: 'completado',
      completado: true,
      estado: 'Completada',
    });
  });
});
