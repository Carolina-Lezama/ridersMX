import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Expo ya incluye iconos

export default function MenuScreen() {
  const opciones = [
    { icon: 'person-outline', label: 'Mi Perfil' },
    { icon: 'notifications-outline', label: 'Notificaciones' },
    { icon: 'wallet-outline', label: 'Pagos y Billetera' },
    { icon: 'time-outline', label: 'Historial de Viajes' },
    { icon: 'help-circle-outline', label: 'Ayuda y Soporte' },
    { icon: 'settings-outline', label: 'Configuración' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.tituloMenu}>Menú</Text>
      {opciones.map((item, index) => (
        <TouchableOpacity key={index} style={styles.opcion}>
          <Ionicons name={item.icon as any} size={24} color="#007bff" />
          <Text style={styles.opcionLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tituloMenu: { fontSize: 24, fontWeight: 'bold', padding: 25, paddingTop: 60 },
  opcion: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, 
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9' 
  },
  opcionLabel: { flex: 1, marginLeft: 15, fontSize: 16, color: '#334155' }
});