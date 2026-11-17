import { normalizarConfigNotificaciones } from '../notificationConfigService';

jest.mock('../supabase', () => ({
  supabase: {},
}));

describe('normalizarConfigNotificaciones', () => {
  it('mantiene activas ambas categorías de agenda para configuraciones antiguas habilitadas', () => {
    expect(normalizarConfigNotificaciones({ eventosEnabled: true })).toMatchObject({
      eventosEnabled: true,
      rodadasEnabled: true,
      mantenimientosEnabled: true,
      comunidadComentariosEnabled: true,
      comunidadReaccionesEnabled: true,
    });
  });

  it('respeta las nuevas preferencias individuales al normalizar una configuración guardada', () => {
    expect(normalizarConfigNotificaciones({
      eventosEnabled: true,
      rodadasEnabled: false,
      mantenimientosEnabled: true,
      comunidadComentariosEnabled: false,
      comunidadReaccionesEnabled: true,
    })).toMatchObject({
      eventosEnabled: true,
      rodadasEnabled: false,
      mantenimientosEnabled: true,
      comunidadComentariosEnabled: false,
      comunidadReaccionesEnabled: true,
    });
  });
});
