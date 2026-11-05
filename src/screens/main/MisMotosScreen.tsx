import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';
import Skeleton from '../../components/Skeleton';
import {
  clearSelectedMotorcycleId,
  getSelectedMotorcycleId,
  setSelectedMotorcycleId,
} from '../../services/motorcycleSelectionService';

export default function MisMotosScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [motos, setMotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoPrincipalId, setMotoPrincipalId] = useState<string | null>(null);

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
        const userId = session.user.id;
        const { data, error } = await supabase
          .from('motocicletas')
          .select('*')
          .eq('perfil_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        const motosData = data || [];
        const storedMotorcycleId = await getSelectedMotorcycleId(userId);
        const selectedMotorcycleId = motosData.some((moto) => moto.id === storedMotorcycleId)
          ? storedMotorcycleId
          : motosData[0]?.id ?? null;
        setMotos(motosData);
        setMotoPrincipalId(selectedMotorcycleId);
        if (selectedMotorcycleId && selectedMotorcycleId !== storedMotorcycleId) {
          await setSelectedMotorcycleId(userId, selectedMotorcycleId);
        } else if (!selectedMotorcycleId && storedMotorcycleId) {
          await clearSelectedMotorcycleId(userId);
        }
      } else {
        setMotos([]);
        setMotoPrincipalId(null);
      }
    } catch (error: any) {
      Alert.alert('Error al cargar garaje', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Componente visual para cada motocicleta en la lista
// Componente visual para cada motocicleta en la lista
  const seleccionarMotoPrincipal = async (motoId: string) => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.user) throw new Error('Inicia sesión para elegir tu moto principal.');

    await setSelectedMotorcycleId(session.user.id, motoId);
    setMotoPrincipalId(motoId);
  };

  const renderMoto = ({ item }: { item: any }) => {
    const isPrincipal = item.id === motoPrincipalId;
    return (
      <View style={styles.motoCard}>
        <TouchableOpacity
          style={styles.motoCardContent}
          onPress={() => navigation.navigate('MotoForm', { motoId: item.id })}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${item.alias || `${item.marca} ${item.modelo}`}`}
        >
          <View style={styles.motoIconContainer}>
            <Ionicons name="bicycle" size={32} color={theme.primary} />
          </View>
          <View style={styles.motoInfo}>
            <Text style={styles.motoTitulo}>
              {item.alias || `${item.marca} ${item.modelo}`}
            </Text>
            <Text style={styles.motoSubtitulo}>
              {item.anio ? `${item.anio} • ` : ''}Placas: {item.placas || 'N/A'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="speedometer-outline" size={12} color={theme.primary} />
              <Text style={[styles.motoSubtitulo, { color: theme.primary, fontWeight: '600', marginLeft: 4 }]}>
                {(item.kilometraje_actual || 0).toLocaleString('es-MX')} km
              </Text>
            </View>
            {isPrincipal && (
              <View style={styles.principalLabel}>
                <Ionicons name="checkmark-circle" size={14} color={theme.primary} />
                <Text style={styles.principalLabelText}>Moto principal</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.iconSecondary} />
        </TouchableOpacity>
        {!isPrincipal && (
          <TouchableOpacity
            style={styles.setPrincipalButton}
            onPress={() => {
              void seleccionarMotoPrincipal(item.id).catch((error) => {
                Alert.alert(
                  'No se pudo guardar la moto principal',
                  error instanceof Error ? error.message : 'Inténtalo de nuevo.',
                );
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Elegir ${item.alias || `${item.marca} ${item.modelo}`} como moto principal`}
          >
            <Text style={styles.setPrincipalText}>Hacer principal</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Garaje</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* CONTENIDO */}
      {loading ? (
        <View style={styles.listContainer}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.motoCard} accessible={false}>
              <Skeleton width={60} height={60} borderRadius={15} style={{ marginRight: 15 }} />
              <View style={styles.motoInfo}>
                <Skeleton width={150} height={18} style={{ marginBottom: 9 }} />
                <Skeleton width={190} height={14} />
              </View>
              <Skeleton width={20} height={20} borderRadius={10} />
            </View>
          ))}
        </View>
      ) : motos.length === 0 ? (
        // ESTADO VACÍO: Cuando no hay motos
        <View style={styles.centerContent}>
          <Ionicons name="build-outline" size={80} color={theme.iconSecondary} />
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
        <Ionicons name="add" size={30} color={theme.card} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 60, paddingBottom: 20,
    backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, marginTop: 20, marginBottom: 10 },
  emptyText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
  
  listContainer: { padding: 20, paddingBottom: 100 }, // Padding bottom extra para que no estorbe el FAB
  motoCard: {
    backgroundColor: theme.card,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  motoCardContent: { flexDirection: 'row', alignItems: 'center' },
  motoIconContainer: {
    backgroundColor: theme.background, width: 60, height: 60, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  motoInfo: { flex: 1 },
  motoTitulo: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 4 },
  motoSubtitulo: { fontSize: 14, color: theme.textSecondary },
  principalLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  principalLabelText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  setPrincipalButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
  setPrincipalText: { color: theme.primary, fontSize: 13, fontWeight: '700' },

  // Estilo del botón flotante (FAB)
  fab: {
    position: 'absolute', bottom: 30, right: 20,
    backgroundColor: theme.primary, width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
  }
});