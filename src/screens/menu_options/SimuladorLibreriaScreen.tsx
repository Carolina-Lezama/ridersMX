import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { catalogoStickers, coloresTexto, textosRapidos, ItemCatalogo } from './catalogos';
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Theme } from '../../../assets/theme/theme';
import {
  useDiseno, agregarElemento, abrirDiseno, eliminarDeGaraje, cargarAlmacen, hayPersistencia, nombreDeMoto, DisenoGuardado,
} from './diseñostore';
import { LienzoEstatico } from './SimuladorEditorScreen';

type Tab = 'stickers' | 'texto' | 'garaje';

const TABS: { key: Tab; label: string }[] = [
  { key: 'stickers', label: 'Stickers' },
  { key: 'texto', label: 'Texto' },
  { key: 'garaje', label: 'Mi Garaje' },
];

const fecha = (t: number) =>
  new Date(t).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

export default function SimuladorLibreriaScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [activeTab, setActiveTab] = useState<Tab>(route?.params?.tab ?? 'stickers');
  const [busqueda, setBusqueda] = useState('');
  const [texto, setTexto] = useState('');
  const [colorTexto, setColorTexto] = useState('#ffffff');
  const { elementos, garaje } = useDiseno();

  useEffect(() => { cargarAlmacen(); }, []);

  // El editor puede abrir esta pantalla directamente en "Stickers" o en "Mi Garaje"
  useEffect(() => {
    if (route?.params?.tab) setActiveTab(route.params.tab);
  }, [route?.params?.tab]);

  const q = busqueda.toLowerCase();
  const stickersFiltrados = catalogoStickers.filter((i) => i.nombre.toLowerCase().includes(q));

  // Agrega el sticker y te QUEDAS en la librería para poder agregar más
  const seleccionarSticker = (item: ItemCatalogo) => {
    agregarElemento({ tipo: 'sticker', icono: item.icono, color: item.color });
  };

  const agregarTexto = (valor?: string) => {
    const t = (valor ?? texto).trim();
    if (!t) return;
    agregarElemento({ tipo: 'texto', texto: t.slice(0, 12), color: colorTexto });
    if (valor === undefined) setTexto('');
  };

  const abrir = (g: DisenoGuardado) => {
    abrirDiseno(g.id);
    navigation.goBack(); // vuelve al editor con el diseño cargado
  };

  const borrar = (g: DisenoGuardado) =>
    Alert.alert('Eliminar diseño', `¿Eliminar "${g.nombre}" de tu garaje?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarDeGaraje(g.id) },
    ]);

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

      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ---------- STICKERS ---------- */}
      {activeTab === 'stickers' && (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar sticker..."
                placeholderTextColor="#94a3b8"
                value={busqueda}
                onChangeText={setBusqueda}
              />
            </View>
          </View>
          <FlatList
            style={styles.listContainer}
            data={stickersFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const cantidad = elementos.filter((e) => e.tipo === 'sticker' && e.icono === item.icono && e.color === item.color).length;
              return (
                <TouchableOpacity style={styles.listItem} onPress={() => seleccionarSticker(item)}>
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
        </>
      )}

      {/* ---------- TEXTO / NÚMERO ---------- */}
      {activeTab === 'texto' && (
        <View style={styles.listContainer}>
          <Text style={styles.etiqueta}>Escribe un número o texto (máx. 12 caracteres)</Text>
          <View style={styles.filaTexto}>
            <TextInput
              style={styles.inputTexto}
              value={texto}
              onChangeText={setTexto}
              placeholder="Ej. 46"
              placeholderTextColor="#94a3b8"
              maxLength={12}
            />
            <TouchableOpacity style={styles.botonAgregar} onPress={() => agregarTexto()}>
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.etiqueta}>Color</Text>
          <View style={styles.filaTexto}>
            {coloresTexto.map((hex) => (
              <TouchableOpacity
                key={hex}
                onPress={() => setColorTexto(hex)}
                style={[styles.colorCircle, { backgroundColor: hex }, colorTexto === hex && styles.colorSeleccionado]}
              />
            ))}
          </View>

          <Text style={styles.etiqueta}>Rápidos</Text>
          <View style={[styles.filaTexto, { flexWrap: 'wrap' }]}>
            {textosRapidos.map((t) => (
              <TouchableOpacity key={t} style={styles.chip} onPress={() => agregarTexto(t)}>
                <Text style={styles.chipTexto}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ---------- GARAJE ---------- */}
      {activeTab === 'garaje' && (
        <FlatList
          style={styles.listContainer}
          data={garaje}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={
            !hayPersistencia() ? (
              <Text style={styles.aviso}>
                Aviso: sin @react-native-async-storage/async-storage tus diseños solo duran mientras la app está abierta.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <MaterialCommunityIcons name="garage-open-variant" size={72} color="#cbd5e1" />
              <Text style={styles.vacioTitulo}>Tu garaje está vacío</Text>
              <Text style={styles.vacioTexto}>Diseña una moto y toca el botón de guardar para verla aquí.</Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <TouchableOpacity style={styles.card} onPress={() => abrir(item)} activeOpacity={0.85}>
                <LienzoEstatico diseno={item.diseno} width={108} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={styles.itemSubText}>{nombreDeMoto(item.diseno)} · {item.diseno.elementos.length} elementos · {item.diseno.trazos.length} trazos</Text>
                  <Text style={styles.itemSubText}>Editado {fecha(item.actualizado)}</Text>
                </View>
                <TouchableOpacity onPress={() => borrar(item)} style={styles.backButton}>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  itemName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemSubText: { color: '#64748b', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },

  etiqueta: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 8, marginBottom: 8 },
  filaTexto: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputTexto: { flex: 1, height: 46, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  botonAgregar: { width: 46, height: 46, marginLeft: 10, borderRadius: 23, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  colorCircle: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: '#cbd5e1' },
  colorSeleccionado: { borderColor: '#3b82f6', borderWidth: 3 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, marginRight: 10, marginBottom: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  chipTexto: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  aviso: { fontSize: 12, color: '#b45309', backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 12 },
  vacio: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginTop: 12 },
  vacioTexto: { fontSize: 14, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
});
