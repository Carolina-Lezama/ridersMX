import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ForoScreen({ navigation }: any) {
  const publicaciones = [
    {
      id: '1',
      usuario: 'Leonardo',
      fecha: 'Rodada el 12 de mayo',
      titulo: 'Rodada Italika',
      descripcion:
        'Este es el texto de la publicación. Aquí se describe el contenido de la rodada y detalles de la ruta.',
      ubicacion: 'Italika BAS',
    },
    {
      id: '2',
      usuario: 'Joshua',
      fecha: 'Rodada el 12 de mayo',
      titulo: 'Rodada Puebla',
      descripcion:
        'Ruta para motociclistas principiantes. Salida desde el centro histórico hacia los fuertes.',
      ubicacion: 'Base 24',
    },
  ];

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      {/* Header del Post: Autor y Fecha */}
      <View style={styles.userContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.usuario.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.nombre}>{item.usuario}</Text>
          <Text style={styles.fecha}>{item.fecha}</Text>
        </View>

        <TouchableOpacity style={styles.btnOptions}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      <Text style={styles.cardTitulo}>{item.titulo}</Text>
      <Text style={styles.descripcion}>{item.descripcion}</Text>

      {/* Tag de Ubicación */}
      <View style={styles.ubicacionContainer}>
        <Ionicons name="location-outline" size={16} color="#3b82f6" />
        <Text style={styles.ubicacionTexto}>{item.ubicacion}</Text>
      </View>

      {/* Footer del Post: Interacciones */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="heart-outline" size={20} color="#64748b" />
          <Text style={styles.actionText}>Me gusta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
          <Text style={styles.actionText}>Comentar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

      <FlatList
        data={publicaciones}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* 2. BOTÓN PRIMARIO CREAR */}
            <TouchableOpacity
              style={styles.crearBtn}
              onPress={() => navigation.navigate('ForoCrearPublicacion')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={22} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.crearBtnText}>Crear publicación</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Publicaciones recientes</Text>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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

  // Badge de Ubicación
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
});