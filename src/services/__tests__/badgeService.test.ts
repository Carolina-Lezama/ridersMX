import { supabase } from '../supabase';
import { obtenerResumenInsignias } from '../badgeService';

jest.mock('../supabase', () => ({
  supabase: { from: jest.fn() },
}));

const crearConsulta = (resultado: unknown) => {
  const consulta: any = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
    then: (resolver: (value: unknown) => unknown, rechazar: (reason: unknown) => unknown) =>
      Promise.resolve(resultado).then(resolver, rechazar),
  };
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.maybeSingle.mockResolvedValue(resultado);
  consulta.single.mockResolvedValue(resultado);
  return consulta;
};

describe('badgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const resultados: Record<string, unknown> = {
      rachas_usuario: { data: null, error: null },
      historial_checkins: { count: 0, error: null },
      bitacoras_rodadas: { data: [], error: null },
      motocicletas: { count: 0, error: null },
      eventos: {
        data: [
          { tipo: 'rodada', estado: 'Planeada' },
          { tipo: 'rodada', estado: 'Cancelada' },
        ],
        error: null,
      },
      foro_publicaciones: { count: 0, error: null },
      resenas: { count: 0, error: null },
      perfiles: { data: { insignia_favorita_id: null }, error: null },
    };
    jest.mocked(supabase.from).mockImplementation(((tabla: string) =>
      crearConsulta(resultados[tabla]) as never) as never);
  });

  it('desbloquea la primera rodada al agendarla y no cuenta eventos cancelados como kilómetros', async () => {
    const { insignias } = await obtenerResumenInsignias('rider-1');
    const primeraRodada = insignias.find((insignia) => insignia.id === 'primera-rodada');
    const cienKilometros = insignias.find((insignia) => insignia.id === 'cien-kilometros');

    expect(primeraRodada?.desbloqueada).toBe(true);
    expect(primeraRodada?.descripcion).toBe('Agendaste tu primera rodada.');
    expect(cienKilometros?.desbloqueada).toBe(false);
  });
});
