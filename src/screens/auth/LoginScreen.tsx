import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Si no hay error, el inicio de sesión fue exitoso
      navigation.replace('MainApp'); // Usamos replace para que no pueda volver atrás con el botón de Android
      
    } catch (error: any) {
      Alert.alert('Error de acceso', 'Credenciales incorrectas o el usuario no existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bienvenido a Riders</Text>
      
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
        <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
      ) : (
        <>
          <CustomButton title="Iniciar Sesión" onPress={handleLogin} />
          <CustomButton title="Crear cuenta nueva" tipo="secundario" onPress={() => navigation.navigate('Register')} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' }
});