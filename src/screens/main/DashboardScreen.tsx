import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function DashboardScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Panel Principal</Text>
      <Text>¡Has iniciado sesión con éxito!</Text>
      
      <CustomButton 
        title="Cerrar Sesión" 
        tipo="secundario"
        // Este método borra el historial del mazo y te manda al login
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 }
});