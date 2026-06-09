import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AyudaScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      
      {/* HEADER CON BOTÓN DE REGRESO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Ayuda</Text>
        <View style={{ width: 28 }} /> {/* Espaciador invisible para centrar el título */}
      </View>

      {/* CONTENIDO CENTRAL (ESTADO VACÍO TEMPORAL) */}
      <View style={styles.content}>
        {/* Cambia el nombre del icono según la pantalla (ej. pulse-outline, chatbubbles-outline) */}
        <Ionicons name="build-outline" size={80} color="#cbd5e1" />
        <Text style={styles.mensaje}>Sección en construcción</Text>
        <Text style={styles.subMensaje}>Pronto podrás gestionar esto aquí.</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 60, // Margen para la barra de estado del celular
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff'
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  mensaje: { fontSize: 22, fontWeight: 'bold', color: '#64748b', marginTop: 20 },
  subMensaje: { fontSize: 16, color: '#94a3b8', marginTop: 10, textAlign: 'center' }
});