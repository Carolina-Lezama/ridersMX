import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { supabase } from '../../services/supabase';
import { navigate } from '../../utils/helper/navigationRef';
import InAppNotificationHost from '../InAppNotificationHost';

interface ReceivedNotification {
  request: {
    identifier: string;
    content: {
      title: string | null;
      body: string | null;
      data: Record<string, unknown>;
    };
  };
}

let mockExpoListener: ((notification: ReceivedNotification) => void) | undefined;

jest.mock('../../../assets/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#FF6347',
      accentBg: '#fff1ee',
      border: '#e2e8f0',
      card: '#ffffff',
      infoBg: '#e0f2fe',
      infoText: '#0369a1',
      primary: '#007bff',
      shadow: '#000000',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      iconSecondary: '#94a3b8',
    },
  }),
}));

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: { onAuthStateChange: jest.fn() },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../utils/helper/navigationRef', () => ({
  navigate: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn((listener) => {
    mockExpoListener = listener;
    return { remove: jest.fn() };
  }),
}));

describe('InAppNotificationHost', () => {
  let authListener: ((event: string, session: { user: { id: string } } | null) => void) | undefined;
  let realtimeListener: ((payload: { new: Record<string, unknown> }) => void) | undefined;
  const platformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    mockExpoListener = undefined;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authListener = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    const channel = { on: jest.fn(), subscribe: jest.fn() };
    channel.on.mockImplementation((_event, _filter, callback) => {
      realtimeListener = callback;
      return channel;
    });
    channel.subscribe.mockReturnValue(channel);
    (supabase.channel as jest.Mock).mockReturnValue(channel);
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platformOS });
  });

  it('muestra en pantalla una notificación recibida en tiempo real y permite abrir el foro', async () => {
    const screen = await render(
      <InAppNotificationHost>
        <Text>Contenido de la app</Text>
      </InAppNotificationHost>,
    );

    expect(authListener).toBeDefined();
    await act(async () => authListener?.('INITIAL_SESSION', { user: { id: 'perfil-1' } }));
    expect(supabase.channel).toHaveBeenCalledWith('in-app-foro-notifications-perfil-1');

    await act(async () => realtimeListener?.({
      new: {
        id: 'notificacion-1',
        tipo: 'comentario',
        mensaje: 'Un rider comentó tu publicación.',
        created_at: new Date().toISOString(),
      },
    }));

    expect(await screen.findByText('Nuevo comentario')).toBeTruthy();
    expect(screen.getByText('Un rider comentó tu publicación.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Nuevo comentario. Abrir el foro.'));
    expect(navigate).toHaveBeenCalledWith('Foro');
  });

  it('muestra avisos locales de Expo como notificaciones flotantes', async () => {
    const screen = await render(
      <InAppNotificationHost>
        <Text>Contenido de la app</Text>
      </InAppNotificationHost>,
    );

    await act(async () => mockExpoListener?.({
      request: {
        identifier: 'alerta-tiempo-uso',
        content: {
          title: 'Límite de tiempo alcanzado',
          body: 'Considera tomar un descanso.',
          data: {},
        },
      },
    }));

    expect(await screen.findByText('Límite de tiempo alcanzado')).toBeTruthy();
    expect(screen.getByText('Considera tomar un descanso.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Límite de tiempo alcanzado. Abrir notificaciones.'));
    expect(navigate).toHaveBeenCalledWith('Notificaciones');
  });
});
