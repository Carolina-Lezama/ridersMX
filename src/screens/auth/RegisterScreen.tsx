import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function RegisterScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crea tu Cuenta</Text>
      <Text style={{textAlign: 'center', marginBottom: 20}}>Pantalla de registro en construcción...</Text>
      
      <CustomButton 
        title="Ya tengo cuenta (Volver)" 
        onPress={() => navigation.goBack()} // Esto quita la carta superior del mazo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }
});