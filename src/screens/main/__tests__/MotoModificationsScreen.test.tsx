import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import MotoModificationsScreen from '../MotoModificationsScreen';
import {
  createMotorcycleModification,
  listMotorcycleModifications,
} from '../../../services/motorcycleModificationService';

jest.mock('../../../../assets/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: require('../../../../assets/theme/theme').lightTheme,
  }),
}));

jest.mock('../../../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { alias: 'La viajera', marca: 'Honda', modelo: 'CB500X' },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

jest.mock('../../../services/motorcycleModificationService', () => ({
  createMotorcycleModification: jest.fn(),
  deleteMotorcycleModification: jest.fn(),
  listMotorcycleModifications: jest.fn(),
  updateMotorcycleModification: jest.fn(),
}));

describe('MotoModificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listMotorcycleModifications).mockResolvedValue([]);
    jest.mocked(createMotorcycleModification).mockResolvedValue({
      id: 'modification-1',
      motocicleta_id: 'moto-1',
      perfil_id: 'user-1',
      nombre: 'Sliders',
      categoria: 'accesorio',
      marca: 'R&G',
      fecha_instalacion: '2026-02-01',
      garantia: '12 meses',
      costo: 1500,
      notas: null,
      created_at: '2026-02-01T10:00:00Z',
    });
  });

  it('registra una pieza con tipo, fecha, garantía y costo para la moto seleccionada', async () => {
    const navigation = { goBack: jest.fn() };
    const { getByLabelText, getByPlaceholderText, getByText } = await render(
      <MotoModificationsScreen
        navigation={navigation}
        route={{ params: { motoId: 'moto-1' } }}
      />,
    );

    await waitFor(() => expect(getByText('La viajera')).toBeTruthy());
    await fireEvent.press(getByLabelText('Registrar mejora o accesorio'));
    await fireEvent.changeText(getByPlaceholderText('Ej. Escape, sliders, maletero'), 'Sliders');
    await fireEvent.changeText(getByPlaceholderText('Opcional'), 'R&G');
    await fireEvent.changeText(getByPlaceholderText('Ej. 12 meses o hasta 2027-01'), '12 meses');
    await fireEvent.changeText(getByPlaceholderText('0.00'), '1500');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(createMotorcycleModification).toHaveBeenCalledWith(
      'moto-1',
      {
        nombre: 'Sliders',
        categoria: 'accesorio',
        marca: 'R&G',
        fecha_instalacion: expect.any(String),
        garantia: '12 meses',
        costo: 1500,
        notas: null,
      },
    ));
  });
});
