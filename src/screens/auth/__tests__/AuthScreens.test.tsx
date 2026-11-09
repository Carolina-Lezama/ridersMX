import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
    expect(getByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();
    expect(jest.mocked(supabase.auth.getSession)).not.toHaveBeenCalled();
    expect(jest.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
  });
});
