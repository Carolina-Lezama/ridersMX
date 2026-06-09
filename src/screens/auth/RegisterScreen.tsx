import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

export default function RegisterScreen({ navigation }: any) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Crear Cuenta</Text>
      <Text style={styles.subtitulo}>Únete a la comunidad de Riders</Text>

      <CustomInput label="Nombre Completo" placeholder="Ej. Juan Pérez" />
      <CustomInput label="Correo Electrónico" placeholder="correo@ejemplo.com" keyboardType="email-address" />
      <CustomInput label="Contraseña" placeholder="********" secureTextEntry />
      <CustomInput label="Confirmar Contraseña" placeholder="********" secureTextEntry />

      <CustomButton title="Registrarme" onPress={() => {}} />
      <CustomButton title="Volver al Login" tipo="secundario" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  subtitulo: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30 }
});