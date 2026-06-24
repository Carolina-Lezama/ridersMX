import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

const handleRegister = async () => {
    if (!email || !password || !username) {
      alert('El correo, contraseña y nombre de usuario son obligatorios.'); // Usamos alert nativo web por si acaso
      return;
    }

    setLoading(true);

    try {
      console.log("PASO 1: Contactando a Supabase Auth...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        console.error("❌ ERROR EN PASO 1 (Auth):", authError);
        throw authError;
      }

      console.log("PASO 2: Usuario creado en secreto. ID:", authData.user?.id);

      if (authData.user) {
        console.log("PASO 3: Intentando guardar en tu tabla 'perfiles'...");
        const { error: profileError } = await supabase.from('perfiles').insert([
          { 
            id: authData.user.id, 
            username: username.toLowerCase(), 
            nombre_completo: nombre 
          }
        ]);

        if (profileError) {
          console.error("❌ ERROR EN PASO 3 (Tabla Perfiles):", profileError);
          throw profileError;
        }

        console.log("✅ PASO 4: ¡Registro 100% exitoso!");
        alert('¡Éxito! Tu cuenta ha sido creada.'); 
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("🚨 ERROR GENERAL CAPTURADO:", error);
      alert(`Error: ${error?.message || 'Algo salió mal'}`);
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
      />
      <CustomInput 
        label="Correo Electrónico" 
        placeholder="correo@ejemplo.com" 
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
          <CustomButton title="Registrarme" onPress={handleRegister} />
          <CustomButton title="Volver al Login" tipo="secundario" onPress={() => navigation.goBack()} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  subtitulo: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30 }
});