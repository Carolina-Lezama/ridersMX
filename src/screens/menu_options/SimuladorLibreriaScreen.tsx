import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { catalogoStickers, catalogoRines, catalogoColores, ItemCatalogo } from './catalogos';
import { useDiseno, agregarElemento, setEstado } from './diseñostore';
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Theme } from '../../../assets/theme/theme';

type Tab = 'stickers' | 'rines' | 'colores';

const TABS: { key: Tab; label: string }[] = [
  { key: 'stickers', label: 'Stickers' },
  { key: 'rines', label: 'Rines' },
  { key: 'colores', label: 'Colores' },
];

export default function SimuladorLibreriaScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
            <Ionicons name="add-circle" size={26} color={theme.primary} />
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
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Inventario</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.listoButton}>
          <Text style={styles.listoText}>Listo ({elementos.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.iconSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar sticker, rin o color..."
            placeholderTextColor={theme.textSecondary}
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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  listoButton: { backgroundColor: theme.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  listoText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  searchContainer: { backgroundColor: theme.card, paddingHorizontal: 20, paddingBottom: 15, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardHeader, borderRadius: 10, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, color: theme.textPrimary, fontSize: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: theme.primary },
  tabText: { color: theme.textSecondary, fontSize: 16, fontWeight: '600' },
  activeTabText: { color: theme.primary },
  listContainer: { flex: 1, padding: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  stickerPreview: { width: 50, height: 50, backgroundColor: theme.cardHeader, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  listTextInfo: { flex: 1 },
  itemName: { color: theme.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemSubText: { color: theme.textSecondary, fontSize: 12 },
  emptyText: { textAlign: 'center', color: theme.textSecondary, marginTop: 40 },
  colorItem: { width: '33.33%', alignItems: 'center', marginBottom: 20 },
  colorSwatch: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: theme.border, marginBottom: 6 },
  colorSwatchActivo: { borderColor: theme.primary, borderWidth: 4 },
  colorName: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  colorGroup: { fontSize: 11, color: theme.textSecondary },
});
