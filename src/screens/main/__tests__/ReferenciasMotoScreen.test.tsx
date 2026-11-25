import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { supabase } from '../../../services/supabase';
import ReferenciasMotoScreen from '../ReferenciasMotoScreen';

jest.mock('../../../services/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

const moto = {
  id: 'moto-1',
  alias: 'La viajera',
  marca: 'Honda',
  modelo: 'CB190R',
  referencia_aceite: '10W-40 sintético',
  referencia_filtro_aceite: null,
  referencia_llantas: 'Del. 90/90-19 · Tras. 110/90-17',
  referencia_bujia: 'CPR8EA-9',
  referencia_paso_cadena: '520',
  referencia_bateria: 'YTX7L-BS',
};

const crearConsulta = () => {
  const consulta = {
    select: jest.fn(),
    eq: jest.fn(),
    update: jest.fn(),
    maybeSingle: jest.fn(),
  };
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.update.mockReturnValue(consulta);
  consulta.maybeSingle.mockResolvedValue({ data: moto, error: null });
  return consulta;
};

describe('ReferenciasMotoScreen', () => {
  const navigation = { goBack: jest.fn() };
  const route = { params: { motoId: 'moto-1' } };
  let consulta: ReturnType<typeof crearConsulta>;

  beforeEach(() => {
    jest.clearAllMocks();
    consulta = crearConsulta();
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'rider-1' } } },
      error: null,
    } as never);
    jest.mocked(supabase.from).mockReturnValue(consulta as never);
  });

  it('carga las referencias de la moto y guarda los cambios asociados al propietario', async () => {
    const { getByDisplayValue, getByPlaceholderText, getByRole, getByText } = await render(
      <ReferenciasMotoScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => expect(getByDisplayValue('10W-40 sintético')).toBeTruthy());
    expect(getByText('La viajera')).toBeTruthy();
    expect(getByDisplayValue('Del. 90/90-19 · Tras. 110/90-17')).toBeTruthy();

    await fireEvent.changeText(getByPlaceholderText('Código o modelo del filtro'), ' HF 204 ');
    await fireEvent.press(getByRole('button', { name: 'Guardar ficha' }));

    await waitFor(() => expect(getByText('Ficha técnica guardada correctamente.')).toBeTruthy());
    expect(supabase.from).toHaveBeenCalledWith('motocicletas');
    expect(consulta.update).toHaveBeenCalledWith({
      referencia_aceite: '10W-40 sintético',
      referencia_filtro_aceite: 'HF 204',
      referencia_llantas: 'Del. 90/90-19 · Tras. 110/90-17',
      referencia_bujia: 'CPR8EA-9',
      referencia_paso_cadena: '520',
      referencia_bateria: 'YTX7L-BS',
    });
    expect(consulta.eq).toHaveBeenCalledWith('id', 'moto-1');
    expect(consulta.eq).toHaveBeenCalledWith('perfil_id', 'rider-1');
  });
});
