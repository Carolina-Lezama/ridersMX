import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

export default function PerfilScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
        <Text style={styles.cambiarFoto}>Editar foto de perfil</Text>
      </View>

      <CustomInput label="Nombre de usuario" placeholder="rider_pro" />
      <CustomInput label="Teléfono" placeholder="+52 000 000 0000" keyboardType="numeric" />
      <CustomInput label="Ciudad" placeholder="Puebla, México" />
      <CustomInput label="Bio" placeholder="Escribe algo sobre ti..." />

      <View style={{ marginTop: 20 }}>
        <CustomButton title="Guardar Cambios" onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#fff', flexGrow: 1 },
  avatarContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  avatarPlaceholder: { 
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#e2e8f0', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 10 
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#64748b' },
  cambiarFoto: { color: '#007bff', fontWeight: '600' }
});