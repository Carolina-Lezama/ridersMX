import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EventoCard({ evento, onPress }: any) {
  const esMantenimiento = evento.tipo === 'mantenimiento';
  const colorTema = esMantenimiento ? '#ef4444' : '#007bff';
  const icono = esMantenimiento ? 'build-outline' : 'map-outline';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: esMantenimiento ? '#fef2f2' : '#eff6ff' }]}>
        <Ionicons name={icono} size={28} color={colorTema} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.titulo} numberOfLines={1}>{evento.titulo}</Text>
          <Text style={styles.hora}>{evento.hora}</Text>
        </View>
        <Text style={styles.descripcion} numberOfLines={2}>{evento.descripcion}</Text>
        
        {evento.moto_asociada ? (
          <View style={styles.motoTag}>
            <Ionicons name="bicycle" size={14} color="#64748b" />
            <Text style={styles.motoText}>{evento.moto_asociada}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  contentContainer: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', flex: 1, marginRight: 10 },
  hora: { fontSize: 12, fontWeight: '600', color: '#007bff' },
  descripcion: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  motoTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  motoText: { fontSize: 12, color: '#64748b', marginLeft: 4, fontWeight: '500' }
});