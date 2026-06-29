import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SimuladorEditorScreen({ navigation }: any) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isStickerActive, setIsStickerActive] = useState(true);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        setIsStickerActive(true);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { pan.flattenOffset(); }
    })
  ).current;

  return (
    <View style={styles.container}>
      
      {/* HEADER CON BOTÓN DE REGRESO Y ACCIONES */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Moto (Editor)</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={{ marginRight: 10 }}><Ionicons name="arrow-undo-outline" size={24} color="#64748b" /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="checkmark-circle" size={28} color="#10b981" /></TouchableOpacity>
        </View>
      </View>

      {/* CANVAS DEL EDITOR (Fondo oscuro para resaltar la foto) */}
      <TouchableOpacity 
        style={styles.canvas} 
        activeOpacity={1} 
        onPress={() => setIsStickerActive(false)}
      >
        <Image 
          source={{ uri: 'https://via.placeholder.com/800x600/cbd5e1/0f172a?text=Foto+de+tu+Moto' }} 
          style={styles.bikeImage} 
          resizeMode="contain"
        />

        {/* Sticker Arrastrable */}
        <Animated.View
          style={[styles.stickerWrapper, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.stickerBorder, isStickerActive && styles.stickerBorderActive]}>
            <Image source={{ uri: 'https://via.placeholder.com/120x120/ef4444/ffffff?text=Sticker' }} style={styles.stickerImage} />
            {isStickerActive && (
              <>
                <View style={[styles.handle, styles.handleTopLeft]} />
                <View style={[styles.handle, styles.handleTopRight]} />
                <View style={[styles.handle, styles.handleBottomLeft]} />
                <View style={[styles.handle, styles.handleBottomRight]} />
                <View style={styles.handleCenter}><Ionicons name="sync-outline" size={16} color="#fff" /></View>
              </>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* PANEL DE HERRAMIENTAS LATERAL */}
      <View style={styles.floatingRightPanel}>
        <TouchableOpacity style={styles.panelButton}><Ionicons name="add-circle" size={36} color="#3b82f6" /></TouchableOpacity>
        <TouchableOpacity style={styles.panelButton}><Ionicons name="color-filter" size={32} color="#10b981" /></TouchableOpacity>
        <TouchableOpacity style={styles.panelButton}><Ionicons name="layers" size={32} color="#f59e0b" /></TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff', zIndex: 10 },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  canvas: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  bikeImage: { width: '100%', height: '100%', position: 'absolute' },
  stickerWrapper: { position: 'absolute' },
  stickerBorder: { padding: 10, borderWidth: 2, borderColor: 'transparent' },
  stickerBorderActive: { borderColor: '#3b82f6', borderStyle: 'dashed', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  stickerImage: { width: 120, height: 120, resizeMode: 'contain' },
  handle: { position: 'absolute', width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 2, borderColor: '#3b82f6' },
  handleTopLeft: { top: -8, left: -8 },
  handleTopRight: { top: -8, right: -8 },
  handleBottomLeft: { bottom: -8, left: -8 },
  handleBottomRight: { bottom: -8, right: -8 },
  handleCenter: { position: 'absolute', top: -30, alignSelf: 'center', backgroundColor: '#3b82f6', borderRadius: 12, padding: 2 },
  floatingRightPanel: { position: 'absolute', right: 15, top: '35%', backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  panelButton: { marginVertical: 12 }
});