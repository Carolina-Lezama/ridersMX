import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { useDiseno, nuevoDiseno, pedirFotoMoto, cargarAlmacen, nombreDeMoto } from './diseñostore';
import { LienzoEstatico } from './SimuladorEditorScreen';

export default function MantenimientoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const d = useDiseno();
  const [modalNuevo, setModalNuevo] = useState(false);
  const { width } = useWindowDimensions();
  const anchoVista = Math.min(width - 42, 520); // 20 de padding por lado + 2 de borde

  useEffect(() => { cargarAlmacen(); }, []);

  const totalStickers = d.elementos.length;
  const totalTrazos = d.trazos.length;
  const hayDiseno = totalStickers > 0 || totalTrazos > 0 || d.fuente !== 'vector';

  // Botón principal: elegir con qué moto empezar
  const iniciarDesdeFoto = async () => {
    setModalNuevo(false);
    if (await pedirFotoMoto(true)) navigation.navigate('SimuladorEditor', { tab: 'brocha' });
  };

  const iniciarDesdeCatalogo = () => {
    setModalNuevo(false);
    nuevoDiseno();
    navigation.navigate('SimuladorEditor', { tab: 'moto' });
  };

  return (
    <View style={styles.container}>
      {/* HEADER CON BOTÓN DE REGRESO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mantenimiento</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Botón principal: nuevo diseño */}
        <TouchableOpacity style={styles.mainButton} onPress={() => setModalNuevo(true)}>
          <Ionicons name="add-circle-outline" size={48} color={theme.primary} />
          <Text style={styles.mainButtonText}>Iniciar Nuevo Diseño</Text>
          <Text style={styles.subButtonText}>(Elige una moto del catálogo o sube la tuya)</Text>
        </TouchableOpacity>

        {/* Diseño actual: vista previa y datos reales */}
        <Text style={styles.sectionTitle}>Estado del Diseño Actual</Text>
        <TouchableOpacity
          style={styles.previewCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SimuladorEditor')}
        >
          <LienzoEstatico diseno={d} width={anchoVista} />
          <Text style={styles.previewHint}>
            {d.nombre || nombreDeMoto(d)} · toca para seguir editando
          </Text>
        </TouchableOpacity>

        <View style={styles.cardContainer}>
          <View style={styles.progressItem}>
            <View
              style={[
                styles.circle,
                { borderColor: theme.dangerText },
                d.fuente !== 'foto' && { backgroundColor: d.colorPrincipal },
              ]}
            >
              {d.fuente !== 'vector' && <Ionicons name="camera" size={24} color={theme.textPrimary} />}
            </View>
            <Text style={styles.progressLabel}>{d.fuente === 'vector' ? 'Color Base' : 'Moto real'}</Text>
          </View>
          <View style={styles.progressItem}>
            <View style={[styles.circle, { borderColor: theme.primary }]}>
              <Text style={styles.circleText}>{totalStickers}</Text>
            </View>
            <Text style={styles.progressLabel}>Stickers y rines</Text>
          </View>
          <View style={styles.progressItem}>
            <View style={[styles.circle, { borderColor: theme.dangerText }]}>
              <Text style={styles.circleText}>{totalTrazos}</Text>
            </View>
            <Text style={styles.progressLabel}>Trazos de brocha</Text>
          </View>
        </View>

        {!hayDiseno && (
          <Text style={styles.vacioTexto}>Todavía no has personalizado nada. ¡Empieza con “Iniciar Nuevo Diseño”!</Text>
        )}

        {/* Acciones rápidas */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('SimuladorLibreria', { tab: 'stickers' })}
          >
            <Ionicons name="pricetag-outline" size={28} color={theme.primary} />
            <Text style={styles.gridText}>Añadir Sticker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('SimuladorEditor', { tab: 'pintura' })}
          >
            <Ionicons name="color-palette-outline" size={28} color={theme.primary} />
            <Text style={styles.gridText}>Crear Paleta{d.paleta.length > 0 ? ` (${d.paleta.length})` : ''}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('SimuladorLibreria', { tab: 'garaje' })}
          >
            <Ionicons name="images-outline" size={28} color={theme.primary} />
            <Text style={styles.gridText}>Mis Diseños ({d.garaje.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('SimuladorEditor', { accion: 'compartir' })}
          >
            <Ionicons name="share-social-outline" size={28} color={theme.textSecondary} />
            <Text style={styles.gridText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={modalNuevo} transparent animationType="fade" onRequestClose={() => setModalNuevo(false)}>
        <Pressable style={styles.modalFondo} onPress={() => setModalNuevo(false)}>
          <Pressable style={styles.modalCaja} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitulo}>Iniciar nuevo diseño</Text>
            <Text style={styles.modalTexto}>Elige una foto propia o empieza con una moto del catálogo.</Text>
            <TouchableOpacity style={styles.modalOpcion} onPress={iniciarDesdeFoto}>
              <Ionicons name="camera-outline" size={22} color={theme.primary} />
              <Text style={styles.modalOpcionTexto}>Subir foto de mi moto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOpcion} onPress={iniciarDesdeCatalogo}>
              <Ionicons name="bicycle-outline" size={22} color={theme.primary} />
              <Text style={styles.modalOpcionTexto}>Elegir moto del catálogo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelar} onPress={() => setModalNuevo(false)}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  mainButton: { backgroundColor: theme.card, height: 160, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: theme.border, elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  mainButtonText: { color: theme.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  subButtonText: { color: theme.textSecondary, fontSize: 14, marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 15 },
  previewCard: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', marginBottom: 15, alignItems: 'center' },
  previewHint: { color: theme.textSecondary, fontSize: 12, paddingVertical: 8 },
  cardContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, backgroundColor: theme.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  progressItem: { alignItems: 'center', flex: 1 },
  circle: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  circleText: { color: theme.textPrimary, fontWeight: 'bold', fontSize: 20 },
  progressLabel: { color: theme.textSecondary, fontSize: 12, textAlign: 'center' },
  vacioTexto: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { backgroundColor: theme.card, width: '48%', height: 100, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  gridText: { color: theme.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 8 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  modalCaja: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
  modalTitulo: { color: theme.textPrimary, fontSize: 19, fontWeight: '700' },
  modalTexto: { color: theme.textSecondary, fontSize: 14, marginTop: 6, marginBottom: 14 },
  modalOpcion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, backgroundColor: theme.background, marginTop: 8 },
  modalOpcionTexto: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  modalCancelar: { alignItems: 'center', padding: 12, marginTop: 8 },
  modalCancelarTexto: { color: theme.textSecondary, fontWeight: '600' },
});
