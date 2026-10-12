import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

export default function ForoScreen({ navigation }: any) {
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Cargar publicaciones y reacciones al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // 1. Obtener la sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      // 2. Traer publicaciones ordenadas por fecha reciente con datos del autor
      const { data: posts, error: postsError } = await supabase
        .from('foro_publicaciones')
        .select(`
          *,
          perfiles (
            username,
            nombre_completo,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // 3. Obtener los likes registrados en la tabla 'foro_likes'
      const { data: likes, error: likesError } = await supabase
        .from('foro_likes')
        .select('publicacion_id, perfil_id');

      if (likesError) throw likesError;

      // 4. Mapear likes y estado del usuario actual
      const postsConLikes = (posts || []).map((post) => {
        const postLikes = likes ? likes.filter((l) => l.publicacion_id === post.id) : [];
        const dioLike = userId ? postLikes.some((l) => l.perfil_id === userId) : false;

        return {
          ...post,
          likesCount: postLikes.length,
          userLiked: dioLike,
        };
      });

      setPublicaciones(postsConLikes);
    } catch (error: any) {
      console.error('Error al cargar publicaciones del foro:', error.message);
      Alert.alert('Error', 'No se pudieron obtener las publicaciones del foro.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Acción para dar o quitar Me Gusta
  const handleToggleLike = async (post: any) => {
    if (!currentUserId) {
      Alert.alert('Inicia sesión', 'Debes estar autenticado para dar me gusta.');
      return;
    }

    const anteriorLiked = post.userLiked;
    const anteriorCount = post.likesCount;

    // Actualización visual inmediata (Optimistic UI)
    setPublicaciones((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? {
              ...item,
              userLiked: !item.userLiked,
              likesCount: item.userLiked ? item.likesCount - 1 : item.likesCount + 1,
            }
          : item
      )
    );

    try {
      if (anteriorLiked) {
        // Eliminar Like
        const { error } = await supabase
          .from('foro_likes')
          .delete()
          .eq('publicacion_id', post.id)
          .eq('perfil_id', currentUserId);

        if (error) throw error;
      } else {
        // Insertar Like
        const { error } = await supabase
          .from('foro_likes')
          .insert([{ publicacion_id: post.id, perfil_id: currentUserId }]);

        if (error) throw error;
      }
    } catch (error: any) {
      // Revertir estado si ocurre un error
      setPublicaciones((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, userLiked: anteriorLiked, likesCount: anteriorCount }
            : item
        )
      );
      console.error('Error al actualizar like:', error.message);
    }
  };

  const formatearFecha = (fechaIso: string) => {
    if (!fechaIso) return '';
    const date = new Date(fechaIso);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: any) => {
    const usuarioNombre =
      item.perfiles?.username
        ? `@${item.perfiles.username}`
        : item.perfiles?.nombre_completo || 'Rider Anónimo';

    const inicial = usuarioNombre.replace('@', '').charAt(0).toUpperCase();

    return (
      <View style={styles.card}>
        {/* Header del Post: Autor y Fecha */}
        <View style={styles.userContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.nombre}>{usuarioNombre}</Text>
            <Text style={styles.fecha}>{formatearFecha(item.created_at)}</Text>
          </View>

          <TouchableOpacity style={styles.btnOptions}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Contenido principal */}
        <Text style={styles.cardTitulo}>{item.titulo}</Text>
        <Text style={styles.descripcion}>{item.contenido}</Text>

        {/* Categoría Tag (si existe) */}
        {item.categoria && (
          <View style={styles.ubicacionContainer}>
            <Ionicons name="pricetag-outline" size={16} color="#3b82f6" />
            <Text style={styles.ubicacionTexto}>{item.categoria}</Text>
          </View>
        )}

        {/* Footer del Post: Interacciones */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleToggleLike(item)}
          >
            <Ionicons
              name={item.userLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={item.userLiked ? '#ef4444' : '#64748b'}
            />
            <Text
              style={[
                styles.actionText,
                item.userLiked && { color: '#ef4444', fontWeight: 'bold' },
              ]}
            >
              {item.likesCount > 0 ? `${item.likesCount} Me gusta` : 'Me gusta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
            <Text style={styles.actionText}>Comentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 1. HEADER INTEGRADO */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View>
          <Text style={styles.tituloHeader}>Comunidad Riders</Text>
          <Text style={styles.subtituloHeader}>Foro de discusión y rutas</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : (
        <FlatList
          data={publicaciones}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* 2. BOTÓN PRIMARIO CREAR */}
              <TouchableOpacity
                style={styles.crearBtn}
                onPress={() => navigation.navigate('ForoCrearPublicacion')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.crearBtnText}>Crear publicación</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Publicaciones recientes</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aún no hay publicaciones en el foro.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header principal
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tituloHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtituloHeader: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // Botón Principal Estilizado
  crearBtn: {
    backgroundColor: '#007bff',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  crearBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 15,
  },

  // Card Estilo Dashboard
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },

  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  userInfo: {
    flex: 1,
  },
  nombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  fecha: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  btnOptions: {
    padding: 4,
  },

  cardTitulo: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  descripcion: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },

  // Badge de Categoría
  ubicacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  ubicacionTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 6,
  },

  // Footer / Acciones
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});