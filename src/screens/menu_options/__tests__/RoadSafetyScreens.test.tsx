import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PreRideChecklistScreen from '../PreRideChecklistScreen';
import EmergencyServicesScreen from '../EmergencyServicesScreen';
import { PRE_RIDE_CHECKLIST_STORAGE_KEY } from '../../../services/preRideChecklistService';
import MenuScreen from '../../main/MenuScreen';

jest.mock('../../../../assets/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: require('../../../../assets/theme/theme').lightTheme,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  __esModule: true,
  default: { openURL: jest.fn() },
}));

jest.mock('../../../components/AnimatedTouchableOpacity', () => {
  const ReactNative = require('react-native');
  return {
    AnimatedTouchableOpacity: ReactNative.TouchableOpacity,
  };
});

jest.mock('../../../components/AnimatedSection', () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../services/MultiAccountService', () => ({
  MultiAccountService: { signOutActiveAccount: jest.fn() },
}));

const navigation = { goBack: jest.fn() };

describe('Road safety screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
    jest.mocked(Linking.openURL).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('carga, guarda, restaura y reinicia el checklist pre-rodada localmente', async () => {
    let storedProgress: string | null = null;
    jest.mocked(AsyncStorage.getItem).mockImplementation(async () => storedProgress);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
      storedProgress = value;
    });

    const firstRender = await render(<PreRideChecklistScreen navigation={navigation} />);
    await waitFor(() => expect(firstRender.getByText('0 de 17')).toBeTruthy());

    await fireEvent.press(firstRender.getByLabelText(/Presión de llantas/));
    await waitFor(() => expect(firstRender.getByText('1 de 17')).toBeTruthy());
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      PRE_RIDE_CHECKLIST_STORAGE_KEY,
      JSON.stringify({ 'tire-pressure': true }),
    );

    await firstRender.unmount();
    const restoredRender = await render(<PreRideChecklistScreen navigation={navigation} />);
    await waitFor(() => expect(restoredRender.getByText('1 de 17')).toBeTruthy());
    expect(AsyncStorage.getItem).toHaveBeenLastCalledWith(PRE_RIDE_CHECKLIST_STORAGE_KEY);

    await fireEvent.press(restoredRender.getByRole('button', { name: 'Reiniciar checklist' }));
    await waitFor(() => expect(restoredRender.getByText('0 de 17')).toBeTruthy());
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(PRE_RIDE_CHECKLIST_STORAGE_KEY, '{}');
    await restoredRender.unmount();
  });

  it('abre el marcador para 911 y ofrece una guía de incidente y falla sin conexión', async () => {
    const { getByText, getByLabelText } = await render(<EmergencyServicesScreen navigation={navigation} />);

    expect(getByText('En caso de incidente vial')).toBeTruthy();
    expect(getByText('En caso de falla mecánica')).toBeTruthy();
    expect(getByText(/disponibles sin conexión/)).toBeTruthy();

    await fireEvent.press(getByLabelText('Llamar a Emergencias, 911'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:911'));
  });

  it('muestra un error visible si no se puede abrir el marcador', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(Linking.openURL).mockRejectedValue(new Error('sin aplicación de teléfono'));
    const { getByLabelText, getByText } = await render(<EmergencyServicesScreen navigation={navigation} />);

    await fireEvent.press(getByLabelText('Llamar a CAPUFE, 074'));

    await waitFor(() => expect(getByText(/Marca 074 directamente/)).toBeTruthy());
  });

  it('permite editar un número de auxilio y lo conserva al volver a abrir la pantalla', async () => {
    let storedContacts: string | null = null;
    jest.mocked(AsyncStorage.getItem).mockImplementation(async () => storedContacts);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
      storedContacts = value;
    });

    const firstRender = await render(<EmergencyServicesScreen navigation={navigation} />);
    await waitFor(() => expect(firstRender.getByLabelText('Editar número de CAPUFE')).toBeTruthy());

    await fireEvent.press(firstRender.getByLabelText('Editar número de CAPUFE'));
    await fireEvent.changeText(firstRender.getByLabelText('Número de teléfono'), 'abc');
    await fireEvent.press(firstRender.getByRole('button', { name: 'Guardar' }));
    expect(firstRender.getByText('Escribe un número válido con al menos 3 dígitos.')).toBeTruthy();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await fireEvent.changeText(firstRender.getByLabelText('Número de teléfono'), '800 123 4567');
    await fireEvent.press(firstRender.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(firstRender.getByLabelText('Llamar a CAPUFE, 800 123 4567')).toBeTruthy());
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@ridersmx/emergency-contacts',
      JSON.stringify({ '911': '911', 'angeles-verdes': '078', 'cruz-roja': '065', capufe: '800 123 4567' }),
    );

    await firstRender.unmount();
    const restoredRender = await render(<EmergencyServicesScreen navigation={navigation} />);
    await waitFor(() => expect(restoredRender.getByLabelText('Llamar a CAPUFE, 800 123 4567')).toBeTruthy());
    await fireEvent.press(restoredRender.getByLabelText('Llamar a CAPUFE, 800 123 4567'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:8001234567');
    await restoredRender.unmount();
  });

  it('ofrece acceso a los módulos de seguridad vial y autonomía desde el menú', async () => {
    const menuNavigation = { ...navigation, navigate: jest.fn(), reset: jest.fn() };
    const { getByText } = await render(<MenuScreen navigation={menuNavigation} />);

    await fireEvent.press(getByText('Checklist pre-rodada'));
    await fireEvent.press(getByText('Auxilio en carretera'));
    await fireEvent.press(getByText('Calculadora de autonomía'));
    await fireEvent.press(getByText('Diario de rutas'));

    expect(menuNavigation.navigate).toHaveBeenNthCalledWith(1, 'PreRideChecklist');
    expect(menuNavigation.navigate).toHaveBeenNthCalledWith(2, 'EmergencyServices');
    expect(menuNavigation.navigate).toHaveBeenNthCalledWith(3, 'FuelRangeCalculator');
    expect(menuNavigation.navigate).toHaveBeenNthCalledWith(4, 'DiarioRutas');
  });
});
