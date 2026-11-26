import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import MotoGalleryScreen from '../MotoGalleryScreen';
import {
  createMotorcycleGalleryPhoto,
  listMotorcycleGalleryPhotos,
} from '../../../services/motorcycleGalleryService';

jest.mock('../../../../assets/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: require('../../../../assets/theme/theme').lightTheme,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactModule = require('react');
    ReactModule.useEffect(callback, [callback]);
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{
      uri: 'file:///tmp/destino.jpg',
      fileName: 'destino.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      type: 'image',
    }],
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

jest.mock('../../../services/motorcycleGalleryService', () => ({
  createMotorcycleGalleryPhoto: jest.fn(),
  deleteMotorcycleGalleryPhoto: jest.fn(),
  listMotorcycleGalleryPhotos: jest.fn(),
  updateMotorcycleGalleryPhoto: jest.fn(),
  MOTORCYCLE_GALLERY_MAX_FILE_SIZE: 10 * 1024 * 1024,
}));

describe('MotoGalleryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listMotorcycleGalleryPhotos).mockResolvedValue([]);
    jest.mocked(createMotorcycleGalleryPhoto).mockResolvedValue(undefined);
  });

  it('selecciona y agrega una foto con fecha y nota al álbum de la moto', async () => {
    const navigation = { goBack: jest.fn() };
    const { getByLabelText, getByText } = await render(
      <MotoGalleryScreen
        navigation={navigation}
        route={{ params: { motoId: 'moto-1' } }}
      />,
    );

    await waitFor(() => expect(getByText('La viajera')).toBeTruthy());
    await fireEvent.press(getByLabelText('Agregar foto a la galería'));
    await fireEvent.press(getByText('Elegir de galería'));
    await fireEvent.changeText(getByLabelText('Nota de la foto'), 'Atardecer en la sierra');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(createMotorcycleGalleryPhoto).toHaveBeenCalledWith(
      'moto-1',
      'file:///tmp/destino.jpg',
      'image/jpeg',
      { fecha: expect.any(String), nota: 'Atardecer en la sierra' },
    ));
  });
});
