import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import CustomButton from '../../components/CustomButton';

// "navigation: any" es para ir rápido ahora, luego lo tiparemos estrictamente con TS
export default function LoginScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bienvenido a Riders</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Correo electrónico" 
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Contraseña" 
        secureTextEntry 
      />

      {/* Navegación al Dashboard (simulando un login exitoso) */}
      <CustomButton 
        title="Iniciar Sesión" 
        onPress={() => navigation.navigate('MainApp')} 
      />
      
      {/* Navegación a la pantalla de Registro */}
      <CustomButton 
        title="Crear cuenta nueva" 
        tipo="secundario" 
        onPress={() => navigation.navigate('Register')} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 15 }
});