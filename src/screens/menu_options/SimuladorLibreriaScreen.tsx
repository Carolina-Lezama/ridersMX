import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { catalogoStickers, catalogoRines, catalogoColores, ItemCatalogo } from './catalogos';
import { useDiseno, agregarElemento, setEstado } from './diseñostore';

type Tab = 'stickers' | 'rines' | 'colores';

const TABS: { key: Tab; label: string }[] = [
  { key: 'stickers', label: 'Stickers' },
  { key: 'rines', label: 'Rines' },
  { key: 'colores', label: 'Colores' },
];

export default function SimuladorLibreriaScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('stickers');
  const [busqueda, setBusqueda] = useState('');
  const { elementos, colorMoto } = useDiseno();

  const q = busqueda.toLowerCase();

  const stickersFiltrados = catalogoStickers.filter((i) => i.nombre.toLowerCase().includes(q));
  const rinesFiltrados = catalogoRines.filter((i) => i.nombre.toLowerCase().includes(q));
  const coloresFiltrados = catalogoColores.filter(
    (c) => c.nombre.toLowerCase().includes(q) || c.grupo.toLowerCase().includes(q)
  );

  // Agrega el sticker y te QUEDAS en la librería para poder agregar más
  const seleccionarElemento = (item: ItemCatalogo, tipo: 'sticker' | 'rin') => {
    agregarElemento({ icono: item.icono, color: item.color, tipo });
  };

  // Pinta la moto y regresa al editor para ver el resultado
  const seleccionarColor = (hex: string) => {
    setEstado({ colorMoto: hex });
    navigation.goBack();
  };

  const renderLista = (data: ItemCatalogo[], tipo: 'sticker' | 'rin') => (
    <FlatList
      key={tipo}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const cantidad = elementos.filter((e) => e.icono === item.icono && e.color === item.color).length;
        return (
          <TouchableOpacity style={styles.listItem} onPress={() => seleccionarElemento(item, tipo)}>
            <View style={styles.stickerPreview}>
              <MaterialCommunityIcons name={item.icono as any} size={30} color={item.color} />
            </View>
            <View style={styles.listTextInfo}>
              <Text style={styles.itemName}>{item.nombre}</Text>
              <Text style={styles.itemSubText}>
                {cantidad > 0 ? `En tu moto: ${cantidad} · toca para agregar otro` : 'Toca para agregarlo a tu moto'}
              </Text>
            </View>
            <Ionicons name="add-circle" size={26} color="#3b82f6" />
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron resultados</Text>}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Inventario</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.listoButton}>
          <Text style={styles.listoText}>Listo ({elementos.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar sticker, rin o color..."
            placeholderTextColor="#94a3b8"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </View>

      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listContainer}>
        {activeTab === 'stickers' && renderLista(stickersFiltrados, 'sticker')}
        {activeTab === 'rines' && renderLista(rinesFiltrados, 'rin')}
        {activeTab === 'colores' && (
          <FlatList
            key="colores"
            data={coloresFiltrados}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.colorItem} onPress={() => seleccionarColor(item.hex)}>
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: item.hex },
                    colorMoto === item.hex && styles.colorSwatchActivo,
                  ]}
                />
                <Text style={styles.colorName} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.colorGroup}>{item.grupo}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron resultados</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  listoButton: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  listoText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
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
  listTextInfo: { flex: 1 },
  itemName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemSubText: { color: '#64748b', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  colorItem: { width: '33.33%', alignItems: 'center', marginBottom: 20 },
  colorSwatch: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#e2e8f0', marginBottom: 6 },
  colorSwatchActivo: { borderColor: '#3b82f6', borderWidth: 4 },
  colorName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  colorGroup: { fontSize: 11, color: '#94a3b8' },
});
