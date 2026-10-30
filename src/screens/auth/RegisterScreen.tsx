import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';
import { MultiAccountService } from '../../services/MultiAccountService';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '../../utils/validations';

function isExistingAccountError(error: unknown): error is { code: 'user_already_exists' } {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'user_already_exists';
}

export default function RegisterScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const usernameError = username.trim().length === 0 && submitted
    ? 'El nombre de usuario es obligatorio.'
    : undefined;
  const emailError = email.length > 0 && !isValidEmail(email)
    ? 'Ingresa un correo electrónico válido.'
    : submitted && !email
      ? 'El correo electrónico es obligatorio.'
      : undefined;
  const passwordError = password.length > 0 && !isValidPassword(password)
    ? `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    : submitted && !password
      ? 'La contraseña es obligatoria.'
      : undefined;

  const handleRegister = async () => {
    setSubmitted(true);
    if (!email || !password || !username.trim() || !isValidEmail(email) || !isValidPassword(password)) {
      return;
    }

    setLoading(true);
    let previousSession = null;

    try {
      const { data: previousSessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      previousSession = previousSessionData.session;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            full_name: nombre.trim(),
          },
        },
      });

      if (authError) throw authError;

      if (authData.user && authData.session) {
        const { error: profileError } = await supabase.from('perfiles').insert([{
          id: authData.user.id,
          username: username.trim().toLowerCase(),
          nombre_completo: nombre.trim(),
        }]);
        if (profileError) throw profileError;
      }

      if (authData.session) {
        await MultiAccountService.saveSession(authData.session);
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      } else {
        if (previousSession) {
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: previousSession.access_token,
            refresh_token: previousSession.refresh_token,
          });
          if (restoreError) throw restoreError;
        }

        Alert.alert('Cuenta creada', 'Revisa tu correo para confirmar la cuenta.');
        if (previousSession || route?.params?.returnToMain) {
          navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
        } else {
          navigation.goBack();
        }
      }
    } catch (error: unknown) {
      const accountAlreadyExists = isExistingAccountError(error);
      if (!accountAlreadyExists) {
        console.error('Error al crear la cuenta:', error);
      }

      if (previousSession) {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: previousSession.access_token,
          refresh_token: previousSession.refresh_token,
        });
        if (restoreError) console.error('No se pudo restaurar la sesión anterior:', restoreError);
      } else if (!accountAlreadyExists) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) console.error('No se pudo cerrar la sesión incompleta del registro:', signOutError);
      }

      if (accountAlreadyExists) {
        Alert.alert(
          'Cuenta ya registrada',
          'Ya existe una cuenta con este correo. Inicia sesión o usa la opción de recuperación de contraseña.',
          [
            { text: 'Ir a iniciar sesión', onPress: () => navigation.goBack() },
            { text: 'Entendido', style: 'cancel' },
          ],
        );
        return;
      }

      const message = error instanceof Error ? error.message : 'Algo salió mal.';
      Alert.alert('Error al crear la cuenta', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>Crear Cuenta</Text>
      <Text style={styles.subtitulo}>Únete a la comunidad</Text>

      <CustomInput 
        label="Nombre Completo" 
        placeholder="Ej. Juan Pérez" 
        value={nombre} 
        onChangeText={setNombre} 
        autoCapitalize="words" 
      />
      <CustomInput 
        label="Nombre de Usuario (Único)" 
        placeholder="ej. rider_pro" 
        value={username} 
        onChangeText={setUsername} 
        error={usernameError}
      />
      <CustomInput 
        label="Correo Electrónico" 
        placeholder="correo@ejemplo.com" 
        keyboardType="email-address" 
        value={email} 
        onChangeText={setEmail} 
        error={emailError}
      />
      <CustomInput 
        label="Contraseña" 
        placeholder="********" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
        error={passwordError}
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <CustomButton title="Registrarme" onPress={handleRegister} />
          <CustomButton title="Volver al Login" tipo="secundario" onPress={() => navigation.goBack()} />
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { padding: 25, backgroundColor: theme.background, flexGrow: 1, justifyContent: 'center' },
  titulo: { fontSize: 32, fontWeight: 'bold', color: theme.textPrimary, textAlign: 'center' },
  subtitulo: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 30 }
});