import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function InicioScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const accesosRapidos = [
    { id: 'diagnostico', icon: 'pulse-outline', titulo: 'Diagnóstico', color: '#ef4444' },
    { id: 'mantenimiento', icon: 'build-outline', titulo: 'Mantenimiento', color: '#3b82f6' },
    { id: 'foro', icon: 'chatbubbles-outline', titulo: 'Foro Riders', color: '#10b981' },
    { id: 'resenas', icon: 'star-outline', titulo: 'Top Reseñas', color: '#f59e0b' },
  ];

  useEffect(() => {
    obtenerPerfil();
  }, []);

  const obtenerPerfil = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Pedimos la columna 'username' en lugar de 'nombre_completo'
        const { data, error } = await supabase
          .from('perfiles')
          .select('username')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (data && data.username) {
          setUsername(data.username);
        }
      }
    } catch (error: any) {
      console.error('Error cargando username en Inicio:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* ENCABEZADO CON USERNAME */}
      <View style={styles.header}>
        <View>
          {loading ? (
            <ActivityIndicator size="small" color="#007bff" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
          ) : (
            <Text style={styles.saludo}>
              Hola, {username ? `@${username}` : 'Rider'} 👋
            </Text>
          )}
          <Text style={styles.info}>Tu garaje digital está listo</Text>
        </View>
        <TouchableOpacity style={styles.btnNotificacion}>
          <Ionicons name="notifications-outline" size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* RESTO DEL COMPONENTE IGUAL */}
      <View style={styles.emptyStateCard}>
        <View style={styles.emptyStateIcono}>
          <Ionicons name="map-outline" size={32} color="#007bff" />
        </View>
        <Text style={styles.emptyStateTitulo}>¿Listo para tu primera ruta?</Text>
        <Text style={styles.emptyStateTexto}>
          Aún no tienes viajes registrados. Cuando comiences a rodar, tus estadísticas y rutas aparecerán aquí.
        </Text>
        <TouchableOpacity style={styles.btnPrimario}>
          <Text style={styles.btnTexto}>Planear un Viaje</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Preparación y Comunidad</Text>
      <View style={styles.gridAccesos}>
        {accesosRapidos.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.accesoCard}
            onPress={() => {
              if (item.id === 'foro') navigation.navigate('Foro');
            }}
          >
            <View style={[styles.accesoIcono, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={28} color={item.color} />
            </View>
            <Text style={styles.accesoTitulo}>{item.titulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
          <Text style={styles.tipTitulo}>Consejo para tu primera rodada</Text>
        </View>
        <Text style={styles.tipTexto}>
          Antes de salir, revisa siempre la presión de tus llantas desde el apartado de Diagnóstico. Una presión adecuada mejora el consumo y la seguridad en curvas.
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginTop: 60, marginBottom: 25 
  },
  saludo: { fontSize: 26, fontWeight: 'bold', color: '#0f172a' },
  info: { fontSize: 16, color: '#64748b', marginTop: 4 },
  btnNotificacion: {
    backgroundColor: '#fff', padding: 10, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  emptyStateCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 25, alignItems: 'center', marginBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  emptyStateIcono: {
    backgroundColor: '#eff6ff', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15
  },
  emptyStateTitulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  emptyStateTexto: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  btnPrimario: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  gridAccesos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  accesoCard: {
    backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 20, marginBottom: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2
  },
  accesoIcono: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  accesoTitulo: { fontSize: 15, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  tipCard: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#fef3c7' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipTitulo: { fontSize: 16, fontWeight: 'bold', color: '#b45309', marginLeft: 8 },
  tipTexto: { fontSize: 14, color: '#92400e', lineHeight: 22 }
});