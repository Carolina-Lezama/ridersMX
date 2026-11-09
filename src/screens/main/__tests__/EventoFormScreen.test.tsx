import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { supabase } from '../../../services/supabase';
import EventoFormScreen from '../EventoFormScreen';

jest.mock('../../../services/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('../../../services/notificationConfigService', () => ({
  obtenerConfigNotificaciones: jest.fn(),
}));

jest.mock('../../../services/notificationService', () => ({
  programarNotificacionesEventos: jest.fn(),
}));

const crearNavegacion = () => ({ goBack: jest.fn() });

const crearConsultaMotos = () => {
  const consulta = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
  };
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.order.mockResolvedValue({ data: [], error: null });
  return consulta;
};

describe('EventoFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'perfil-prueba' } } },
      error: null,
    } as never);
    jest.mocked(supabase.from).mockReturnValue(crearConsultaMotos() as never);
  });

  it('muestra preguntas de ruta y cambia a los campos de mantenimiento', async () => {
    const { getByText, queryByText } = await render(
      <EventoFormScreen
        navigation={crearNavegacion()}
        route={{ params: { tipo: 'rodada', fechaBase: '2026-11-02' } }}
      />,
    );

    await waitFor(() => expect(getByText('Detalles de la rodada')).toBeTruthy());
    expect(getByText('Destino o ruta *')).toBeTruthy();
    expect(queryByText('Servicio requerido *')).toBeNull();

    await fireEvent.press(getByText(/Taller \/ Mantenimiento/));

    expect(getByText('Detalles del mantenimiento')).toBeTruthy();
    expect(getByText('Servicio requerido *')).toBeTruthy();
    expect(getByText('Kilometraje al ingresar')).toBeTruthy();
    expect(queryByText('Destino o ruta *')).toBeNull();
  });

  it('abre directamente el formulario específico de mantenimiento', async () => {
    const { getByText, queryByText } = await render(
      <EventoFormScreen
        navigation={crearNavegacion()}
        route={{ params: { tipo: 'mantenimiento', fechaBase: '2026-11-02' } }}
      />,
    );

    await waitFor(() => expect(getByText('Detalles del mantenimiento')).toBeTruthy());
    expect(getByText('Taller o mecánico')).toBeTruthy();
    expect(queryByText('Punto de reunión')).toBeNull();
  });
});
