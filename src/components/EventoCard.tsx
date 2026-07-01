import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EventoCard({ evento, onPress }: any) {
  const esMantenimiento = evento.tipo === 'mantenimiento';
  const estado = evento.estado || 'Planeada'; // Fallback de seguridad

  // 1. Definir colores base por TIPO (Mantenimiento vs Rodada)
  let colorTema = esMantenimiento ? '#ef4444' : '#007bff';
  let icono = esMantenimiento ? 'build-outline' : 'map-outline';
  let bgColor = esMantenimiento ? '#fef2f2' : '#eff6ff';

  // 2. Variables dinámicas que cambiarán según el ESTADO
  let opacidad = 1;
  let badgeText = '';
  let badgeColor = '';
  let badgeBg = '';

  if (estado === 'Completada') {
    badgeText = 'Completada';
    badgeColor = '#10b981'; // Verde Éxito
    badgeBg = '#d1fae5';
    colorTema = '#10b981';  // Forzamos el icono a verde
    bgColor = '#d1fae5';
  } else if (estado === 'Cancelada') {
    badgeText = 'Cancelada';
    badgeColor = '#64748b'; // Gris
    badgeBg = '#f1f5f9';
    colorTema = '#94a3b8';
    bgColor = '#f8fafc';
    opacidad = 0.5; // Hacemos que toda la tarjeta se vea "apagada"
  } else if (estado === 'Reprogramada') {
    badgeText = 'Reprogramada';
    badgeColor = '#f59e0b'; // Naranja Alerta
    badgeBg = '#fef3c7';
  }

  return (
    <TouchableOpacity 
      style={[styles.card, { opacity: opacidad }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icono as any} size={28} color={colorTema} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          {/* Si está cancelada, tachamos el título */}
          <Text 
            style={[styles.titulo, estado === 'Cancelada' && { textDecorationLine: 'line-through', color: '#94a3b8' }]} 
            numberOfLines={1}
          >
            {evento.titulo}
          </Text>
          
          {/* Mostramos la hora o la etiqueta de estado */}
          {estado === 'Planeada' ? (
            <Text style={styles.hora}>{evento.hora}</Text>
          ) : (
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.descripcion} numberOfLines={2}>{evento.descripcion}</Text>
        
        <View style={styles.footerRow}>
          {evento.moto_asociada ? (
            <View style={styles.motoTag}>
              <Ionicons name="bicycle" size={14} color="#64748b" />
              <Text style={styles.motoText}>{evento.moto_asociada}</Text>
            </View>
          ) : <View />}

          {/* Si pusimos la etiqueta arriba, pasamos la hora a la parte inferior */}
          {estado !== 'Planeada' && (
            <Text style={styles.horaAbajo}>{evento.hora}</Text>
          )}
        </View>
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
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  motoTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  motoText: { fontSize: 12, color: '#64748b', marginLeft: 4, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  horaAbajo: { fontSize: 12, fontWeight: '600', color: '#94a3b8' }
});