import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function MisMotosScreen({ navigation }: any) {
  const [motos, setMotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect que se recarga cada vez que la pantalla gana el foco (por si agregas una moto nueva y regresas)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarMotos();
    });
    return unsubscribe;
  }, [navigation]);

  const cargarMotos = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('motocicletas')
          .select('*')
          .eq('perfil_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMotos(data || []);
      }
    } catch (error: any) {
      Alert.alert('Error al cargar garaje', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Componente visual para cada motocicleta en la lista
// Componente visual para cada motocicleta en la lista
  const renderMoto = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.motoCard}
      // MAGIA 2: Navegamos pasándole el ID exacto de la moto que el usuario tocó
      onPress={() => navigation.navigate('MotoForm', { motoId: item.id })}
    >
      <View style={styles.motoIconContainer}>
        <Ionicons name="bicycle" size={32} color="#007bff" />
      </View>
      <View style={styles.motoInfo}>
        <Text style={styles.motoTitulo}>
          {item.marca} {item.modelo}
        </Text>
        <Text style={styles.motoSubtitulo}>
          {item.anio} • Placas: {item.placas || 'N/A'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Garaje</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Abriendo garaje...</Text>
        </View>
      ) : motos.length === 0 ? (
        // ESTADO VACÍO: Cuando no hay motos
        <View style={styles.centerContent}>
          <Ionicons name="build-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Tu garaje está vacío</Text>
          <Text style={styles.emptyText}>Agrega tu primera motocicleta para empezar a llevar su registro y mantenimiento.</Text>
        </View>
      ) : (
        // LISTA DE MOTOS
        <FlatList
          data={motos}
          keyExtractor={(item) => item.id}
          renderItem={renderMoto}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* BOTÓN FLOTANTE PARA AGREGAR MOTO */}
{/* BOTÓN FLOTANTE PARA AGREGAR MOTO */}
      <TouchableOpacity 
        style={styles.fab}
        // MAGIA 1: Navegamos sin parámetros para crear una moto nueva
        onPress={() => navigation.navigate('MotoForm')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 60, paddingBottom: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0'
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 15, color: '#64748b', fontSize: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginTop: 20, marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24 },
  
  listContainer: { padding: 20, paddingBottom: 100 }, // Padding bottom extra para que no estorbe el FAB
  motoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 15, borderRadius: 16, marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  motoIconContainer: {
    backgroundColor: '#eff6ff', width: 60, height: 60, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  motoInfo: { flex: 1 },
  motoTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  motoSubtitulo: { fontSize: 14, color: '#64748b' },

  // Estilo del botón flotante (FAB)
  fab: {
    position: 'absolute', bottom: 30, right: 20,
    backgroundColor: '#007bff', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#007bff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
  }
});