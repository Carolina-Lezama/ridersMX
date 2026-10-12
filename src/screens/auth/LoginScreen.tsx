import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';
import { MultiAccountService } from '../../services/MultiAccountService';
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Session } from '@supabase/supabase-js';

interface Props {
  navigation: any;
  addingAccount?: boolean;
}

export default function LoginScreen({ navigation, addingAccount = false }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    let previousSession: Session | null = null;
    let authenticatedSession: Session | null = null;

    try {
      const { data: previousSessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      previousSession = previousSessionData.session;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('Supabase no devolvió una sesión para esta cuenta.');

      authenticatedSession = data.session;
      await MultiAccountService.saveSession(data.session);
      authenticatedSession = null;
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch (error: unknown) {
      console.error('Error al iniciar sesión:', error);
      if (authenticatedSession && previousSession) {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: previousSession.access_token,
          refresh_token: previousSession.refresh_token,
        });
        if (restoreError) console.error('No se pudo restaurar la sesión anterior:', restoreError);
      } else if (authenticatedSession) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) console.error('No se pudo cerrar la sesión que no se logró guardar:', signOutError);
      }

      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      Alert.alert('Error de acceso', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{addingAccount ? 'Agregar cuenta' : 'Bienvenido a Riders'}</Text>
      
      <CustomInput 
        label="Correo electrónico" 
        placeholder="ejemplo@correo.com" 
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <CustomInput 
        label="Contraseña" 
        placeholder="********" 
        secureTextEntry 
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <CustomButton title="Iniciar Sesión" onPress={handleLogin} />
          <CustomButton
            title="Crear cuenta nueva"
            tipo="secundario"
            onPress={() => navigation.navigate('Register', { returnToMain: addingAccount })}
          />
        </>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: theme.background },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: theme.textPrimary }
});