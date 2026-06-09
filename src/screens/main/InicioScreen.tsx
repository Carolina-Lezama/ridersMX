import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

export default function InicioScreen() {
  // Datos falsos para simular actividad
  const actividades = [
    { id: '1', titulo: 'Viaje a Centro', fecha: 'Hoy, 10:00 AM' },
    { id: '2', titulo: 'Viaje a Norte', fecha: 'Ayer, 04:30 PM' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.saludo}>Hola, Rider</Text>
        <Text style={styles.info}>Este es tu resumen de hoy</Text>
      </View>
      
      <View style={styles.cardResumen}>
        <Text style={styles.cardTitle}>Viajes Totales</Text>
        <Text style={styles.cardNumero}>24</Text>
      </View>

      <Text style={styles.sectionTitle}>Actividad Reciente</Text>
      <FlatList 
        data={actividades}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemActividad}>
            <Text style={styles.itemTitulo}>{item.titulo}</Text>
            <Text style={styles.itemFecha}>{item.fecha}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 20 },
  header: { marginTop: 40, marginBottom: 20 },
  saludo: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  info: { fontSize: 16, color: '#64748b' },
  cardResumen: { 
    backgroundColor: '#007bff', padding: 20, borderRadius: 15, marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10
  },
  cardTitle: { color: '#fff', opacity: 0.8, fontSize: 14 },
  cardNumero: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  itemActividad: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  itemTitulo: { fontSize: 16, fontWeight: '600' },
  itemFecha: { color: '#94a3b8', fontSize: 12 }
});