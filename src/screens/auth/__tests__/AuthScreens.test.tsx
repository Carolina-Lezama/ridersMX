import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { supabase } from '../../../services/supabase';
import LoginScreen from '../LoginScreen';
import RegisterScreen from '../RegisterScreen';

jest.mock('../../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      setSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock('../../../services/MultiAccountService', () => ({
  MultiAccountService: { saveSession: jest.fn() },
}));

describe('pantallas de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('impide iniciar sesión con correo y contraseña inválidos', async () => {
    const navigation = { reset: jest.fn(), navigate: jest.fn() };
    const { getByPlaceholderText, getByText } = await render(
      <LoginScreen navigation={navigation} />,
    );

    await fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'correo-invalido');
    await fireEvent.changeText(getByPlaceholderText('********'), '12345');
    await fireEvent.press(getByText('Iniciar Sesión'));

    expect(getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    expect(getByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();
    expect(jest.mocked(supabase.auth.getSession)).not.toHaveBeenCalled();
    expect(jest.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled();
  });

  it('elimina espacios externos del correo antes de iniciar sesión', async () => {
    const navigation = { reset: jest.fn(), navigate: jest.fn() };
    const user = {
      id: 'user-id',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const session = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      token_type: 'bearer' as const,
      user,
    };
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    jest.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session, user },
      error: null,
    });
    const { getByPlaceholderText, getByText } = await render(
      <LoginScreen navigation={navigation} />,
    );

    await fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), ' rider@example.com ');
    await fireEvent.changeText(getByPlaceholderText('********'), 'secret1');
    await fireEvent.press(getByText('Iniciar Sesión'));

    await waitFor(() => {
      expect(jest.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledWith({
        email: 'rider@example.com',
        password: 'secret1',
      });
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    });
  });

  it('impide registrar una cuenta con campos inválidos', async () => {
    const navigation = { reset: jest.fn(), goBack: jest.fn() };
    const { getByPlaceholderText, getByText } = await render(
      <RegisterScreen navigation={navigation} route={{ params: {} }} />,
    );

    await fireEvent.changeText(getByPlaceholderText('ej. rider_pro'), '   ');
    await fireEvent.changeText(getByPlaceholderText('correo@ejemplo.com'), 'correo-invalido');
    await fireEvent.changeText(getByPlaceholderText('********'), '12345');
    await fireEvent.press(getByText('Registrarme'));

    expect(getByText('El nombre de usuario es obligatorio.')).toBeTruthy();
    expect(getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    expect(getByText(
      'Usa al menos 6 caracteres, incluyendo una minúscula, una mayúscula, un número y un símbolo.',
    )).toBeTruthy();
    expect(jest.mocked(supabase.auth.getSession)).not.toHaveBeenCalled();
    expect(jest.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
  });

  it('impide enviar el registro si la contraseña no cumple la política de Supabase', async () => {
    const navigation = { reset: jest.fn(), goBack: jest.fn() };
    const { getByPlaceholderText, getByText } = await render(
      <RegisterScreen navigation={navigation} route={{ params: {} }} />,
    );

    await fireEvent.changeText(getByPlaceholderText('ej. rider_pro'), 'rider_pro');
    await fireEvent.changeText(getByPlaceholderText('correo@ejemplo.com'), 'rider@example.com');
    await fireEvent.changeText(getByPlaceholderText('********'), 'password1');
    await fireEvent.press(getByText('Registrarme'));

    expect(getByText(
      'Usa al menos 6 caracteres, incluyendo una minúscula, una mayúscula, un número y un símbolo.',
    )).toBeTruthy();
    expect(jest.mocked(supabase.auth.getSession)).not.toHaveBeenCalled();
    expect(jest.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
  });
});
