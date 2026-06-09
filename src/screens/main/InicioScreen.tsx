import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InicioScreen() {
  // Datos falsos enriquecidos para mejorar el diseño
  const actividades = [
    { id: '1', titulo: 'Entregado en Centro', fecha: 'Hoy, 10:00 AM', estado: 'Completado', iconColor: '#10b981' },
    { id: '2', titulo: 'Viaje a Zona Norte', fecha: 'Ayer, 04:30 PM', estado: 'Completado', iconColor: '#10b981' },
    { id: '3', titulo: 'Viaje a Sur (Cancelado)', fecha: 'Ayer, 01:15 PM', estado: 'Cancelado', iconColor: '#ef4444' },
  ];

  return (
    <View style={styles.container}>
      
      {/* 1. ENCABEZADO SUPERIOR */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Hola, Carolina 👋</Text>
          <Text style={styles.info}>¿Lista para rodar hoy?</Text>
        </View>
        <TouchableOpacity style={styles.btnNotificacion}>
          <Ionicons name="notifications-outline" size={24} color="#0f172a" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>
      
      {/* 2. TARJETAS DE RESUMEN (GRID) */}
      <View style={styles.gridResumen}>
        {/* Tarjeta Izquierda */}
        <View style={[styles.card, styles.cardPrimaria]}>
          <View style={styles.cardIconWrapper}>
            <Ionicons name="bicycle" size={24} color="#007bff" />
          </View>
          <Text style={styles.cardNumeroPrimario}>24</Text>
          <Text style={styles.cardTitlePrimario}>Viajes Totales</Text>
        </View>

        {/* Tarjeta Derecha */}
        <View style={[styles.card, styles.cardSecundaria]}>
          <View style={styles.cardIconWrapperDark}>
            <Ionicons name="speedometer-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.cardNumeroSecundario}>180</Text>
          <Text style={styles.cardTitleSecundario}>Km Recorridos</Text>
        </View>
      </View>

      {/* 3. ACTIVIDAD RECIENTE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        <TouchableOpacity>
          <Text style={styles.verTodo}>Ver todo</Text>
        </TouchableOpacity>
      </View>

      <FlatList 
        data={actividades}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.itemActividad}>
            {/* Icono del ítem */}
            <View style={[styles.itemIconContainer, { backgroundColor: item.iconColor + '20' }]}>
              <Ionicons name="location-outline" size={20} color={item.iconColor} />
            </View>
            
            {/* Textos del ítem */}
            <View style={styles.itemTextos}>
              <Text style={styles.itemTitulo} numberOfLines={1}>{item.titulo}</Text>
              <Text style={styles.itemFecha}>{item.fecha}</Text>
            </View>

            {/* Flecha de detalle */}
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 60, 
    marginBottom: 30 
  },
  saludo: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  info: { fontSize: 16, color: '#64748b', marginTop: 4 },
  btnNotificacion: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  badge: {
    position: 'absolute', top: 10, right: 12, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4
  },

  // Grid de Tarjetas
  gridResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35,
  },
  card: {
    width: '48%', // Toma casi la mitad del ancho dejando espacio en medio
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4
  },
  cardPrimaria: { backgroundColor: '#fff' },
  cardSecundaria: { backgroundColor: '#0f172a' }, // Tarjeta oscura para dar contraste
  
  cardIconWrapper: {
    backgroundColor: '#eff6ff', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15
  },
  cardIconWrapperDark: {
    backgroundColor: '#1e293b', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15
  },
  
  cardNumeroPrimario: { color: '#0f172a', fontSize: 32, fontWeight: 'bold' },
  cardTitlePrimario: { color: '#64748b', fontSize: 14, fontWeight: '500', marginTop: 5 },
  
  cardNumeroSecundario: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  cardTitleSecundario: { color: '#94a3b8', fontSize: 14, fontWeight: '500', marginTop: 5 },

  // Lista de Actividad
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  verTodo: { fontSize: 14, color: '#007bff', fontWeight: '600' },
  
  itemActividad: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    padding: 15, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
  },
  itemIconContainer: {
    width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  itemTextos: { flex: 1 },
  itemTitulo: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  itemFecha: { color: '#94a3b8', fontSize: 13 }
});