import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';

export default function ForoScreen({ navigation }: any) {
  const { isDarkMode, theme } = useTheme();
  const styles = createStyles(theme);

  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const obtenerPublicaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('foro_publicaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicaciones(data || []);
    } catch (error) {
      console.error('Error al cargar publicaciones:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    obtenerPublicaciones();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* ENCABEZADO CON ESPACIADOR EN LUGAR DEL BOTÓN SUPERIOR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Foro de Riders</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* FEED DE PUBLICACIONES */}
      {cargando ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={publicaciones}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => {
                setRefrescando(true);
                obtenerPublicaciones();
              }}
              colors={[theme.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.categoriaBadge}>{item.categoria || 'General'}</Text>
                <Text style={styles.fechaText}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
              <Text style={styles.tituloText}>{item.titulo}</Text>
              <Text style={styles.contenidoText}>{item.contenido}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>No hay publicaciones aún.</Text>
              <Text style={styles.emptySubtext}>Sé el primero en crear una rodada o duda.</Text>
            </View>
          }
        />
      )}

      {/* ÚNICO BOTÓN FLOTANTE (FAB) PARA CREAR */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ForoCrearPublicacion')}
      >
        <Ionicons name="create-outline" size={26} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: 15,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
    listContent: { padding: 20 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoriaBadge: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
    },
    fechaText: { fontSize: 12, color: theme.textSecondary },
    tituloText: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 6 },
    contenidoText: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginTop: 12 },
    emptySubtext: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    fab: {
      position: 'absolute',
      bottom: 25,
      right: 20,
      backgroundColor: theme.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
    },
  });