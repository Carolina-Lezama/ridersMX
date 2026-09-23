import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SimuladorLibreriaScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'stickers' | 'paletas'>('stickers');

  const dummyStickers = [
    { id: '1', nombre: 'Logo Racing Flamas', usos: 3 },
    { id: '2', nombre: 'Emblema Depósito Honda', usos: 1 },
    { id: '3', nombre: 'Número 46 Estilo GP', usos: 0 },
  ];

  const dummyPaletas = [
    { id: '1', nombre: 'Paleta Deportiva Rojo/Negro', colores: ['#ef4444', '#0f172a', '#ffffff'] },
    { id: '2', nombre: 'Paleta Clásica Azul', colores: ['#3b82f6', '#94a3b8', '#1e293b'] },
  ];

  return (
    <View style={styles.container}>
      
      {/* HEADER CON BOTÓN DE REGRESO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Inventario</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar sticker o paleta..." 
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* PESTAÑAS (TABS) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'stickers' && styles.activeTab]} onPress={() => setActiveTab('stickers')}>
          <Text style={[styles.tabText, activeTab === 'stickers' && styles.activeTabText]}>Mis Stickers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'paletas' && styles.activeTab]} onPress={() => setActiveTab('paletas')}>
          <Text style={[styles.tabText, activeTab === 'paletas' && styles.activeTabText]}>Paletas de Color</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO DE LA LISTA */}
      <View style={styles.listContainer}>
        {activeTab === 'stickers' ? (
          <FlatList
            data={dummyStickers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.stickerPreview}>
                  <Ionicons name="image-outline" size={28} color="#94a3b8" />
                </View>
                <View style={styles.listTextInfo}>
                  <Text style={styles.itemName}>{item.nombre}</Text>
                  <Text style={styles.itemSubText}>{item.usos} diseños usan este sticker</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
              </View>
            )}
          />
        ) : (
          <FlatList
            data={dummyPaletas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.palettePreview}>
                  {item.colores.map((color, index) => (
                    <View key={index} style={[styles.colorBlock, { backgroundColor: color }]} />
                  ))}
                </View>
                <View style={styles.listTextInfo}>
                  <Text style={styles.itemName}>{item.nombre}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
              </View>
            )}
          />
        )}
      </View>

      {/* BOTÓN FLOTANTE */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, color: '#0f172a', fontSize: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 16, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },
  listContainer: { flex: 1, padding: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  stickerPreview: { width: 50, height: 50, backgroundColor: '#f1f5f9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  palettePreview: { flexDirection: 'row', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', marginRight: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  colorBlock: { flex: 1, height: '100%' },
  listTextInfo: { flex: 1 },
  itemName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemSubText: { color: '#64748b', fontSize: 12 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 }
});