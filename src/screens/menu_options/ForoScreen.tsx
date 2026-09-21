import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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
        'Este es el texto de la publicación. Aquí se describe el contenido de la rodada.',
      ubicacion: 'Italika BAS',
    },
    {
      id: '2',
      usuario: 'Joshua',
      fecha: 'Rodada el 12 de mayo',
      titulo: 'Rodada Puebla',
      descripcion:
        'Ruta para motociclistas principiantes. Salida desde el centro.',
      ubicacion: 'Base 24',
    },
  ];

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.userContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.usuario.charAt(0)}
          </Text>
        </View>

        <View>
          <Text style={styles.nombre}>{item.usuario}</Text>
          <Text style={styles.fecha}>{item.fecha}</Text>
        </View>
      </View>

      <Text style={styles.cardTitulo}>{item.titulo}</Text>

      <Text style={styles.descripcion}>
        {item.descripcion}
      </Text>

      <Text style={styles.ubicacion}>
        📍 {item.ubicacion}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color="#0f172a"
          />
        </TouchableOpacity>

        <Text style={styles.titulo}>Foro</Text>

        <View style={{ width: 28 }} />
      </View>

      {/* BOTÓN CREAR */}
      <TouchableOpacity
        style={styles.crearBtn}
        onPress={() => navigation.navigate('ForoCrearPublicacion')}
      >
        <Text style={styles.crearBtnText}>
          Crear publicación
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        Publicaciones
      </Text>

      <FlatList
        data={publicaciones}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  crearBtn: {
    margin: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  crearBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 10,
    color: '#0f172a',
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },

  nombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  fecha: {
    color: '#64748b',
    fontSize: 13,
  },

  cardTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },

  descripcion: {
    color: '#475569',
    lineHeight: 22,
  },

  ubicacion: {
    marginTop: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
});