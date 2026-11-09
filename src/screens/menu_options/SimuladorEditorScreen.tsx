
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Image, ScrollView, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { catalogoMotos, catalogoColores } from './catalogos';
import {
  useDiseno, setEstado, actualizarElemento, eliminarElemento,
  ElementoDiseno, LIENZO, TAM_ELEMENTO,
} from './diseñostore';

// Qué tanto se nota el color sobre la foto (0 a 1)
const INTENSIDAD_TINTE = 0.7;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Moto: foto del usuario (con tinte de color) o ícono vectorial
function MotoVisual({ foto, icono, color }: { foto: string | null; icono: string; color: string | null }) {
  if (foto) {
    return (
      <>
        <Image source={{ uri: foto }} style={styles.fotoUsuario} resizeMode="contain" />
        {color && (
          // Misma foto encima, pintada de un color. Respeta la transparencia del PNG
          <Image
            source={{ uri: foto }}
            style={[styles.fotoUsuario, { tintColor: color, opacity: INTENSIDAD_TINTE }]}
            resizeMode="contain"
          />
        )}
      </>
    );
  }
  return <MaterialCommunityIcons name={icono as any} size={220} color={color ?? '#0f172a'} />;
}

function ElementoArrastrable({
  item, isActive, onActivate,
}: {
  item: ElementoDiseno;
  isActive: boolean;
  onActivate: () => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: item.x, y: item.y })).current;
  const posRef = useRef({ x: item.x, y: item.y });
  const startPos = useRef({ x: 0, y: 0 });

  const scale = useRef(new Animated.Value(item.scale)).current;
  const rotation = useRef(new Animated.Value(item.rotation)).current;
  const scaleValueRef = useRef(item.scale);
  const rotationValueRef = useRef(item.rotation);
  const startScaleRef = useRef(item.scale);
  const startRotationRef = useRef(item.rotation);

  useEffect(() => {
    const idScale = scale.addListener(({ value }) => (scaleValueRef.current = value));
    const idRot = rotation.addListener(({ value }) => (rotationValueRef.current = value));
    return () => {
      scale.removeListener(idScale);
      rotation.removeListener(idRot);
    };
  }, []);

  // Guarda posición, tamaño y giro en el almacén (así no se pierde nunca)
  const guardar = () =>
    actualizarElemento(item.id, {
      x: posRef.current.x,
      y: posRef.current.y,
      scale: scaleValueRef.current,
      rotation: rotationValueRef.current,
    });

  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onActivate();
        startPos.current = { ...posRef.current };
      },
      onPanResponderMove: (_e, g) => {
        const x = clamp(startPos.current.x + g.dx, 0, LIENZO - TAM_ELEMENTO);
        const y = clamp(startPos.current.y + g.dy, 0, LIENZO - TAM_ELEMENTO);
        posRef.current = { x, y };
        pan.setValue({ x, y });
      },
      onPanResponderRelease: guardar,
      onPanResponderTerminate: guardar,
    })
  ).current;

  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => { startScaleRef.current = scaleValueRef.current; },
      onPanResponderMove: (_e, g) => {
        scale.setValue(clamp(startScaleRef.current + g.dx / 150, 0.3, 3));
      },
      onPanResponderRelease: guardar,
      onPanResponderTerminate: guardar,
    })
  ).current;

  const rotatePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => { startRotationRef.current = rotationValueRef.current; },
      onPanResponderMove: (_e, g) => { rotation.setValue(startRotationRef.current + g.dx); },
      onPanResponderRelease: guardar,
      onPanResponderTerminate: guardar,
    })
  ).current;

  const rotateInterpolado = rotation.interpolate({
    inputRange: [-1000, 1000],
    outputRange: ['-1000deg', '1000deg'],
    extrapolate: 'extend',
  });

  return (
    <Animated.View
      style={[
        styles.elementoWrapper,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }, { rotate: rotateInterpolado }] },
      ]}
    >
      <View style={[styles.elementoBorde, isActive && styles.elementoBordeActivo]}>
        <View {...movePanResponder.panHandlers} style={styles.elementoContenido}>
          <MaterialCommunityIcons name={item.icono as any} size={64} color={item.color} />
        </View>

        {isActive && (
          <>
            <TouchableOpacity style={styles.manijaEliminar} onPress={() => eliminarElemento(item.id)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.manija, styles.manijaRotar]} {...rotatePanResponder.panHandlers}>
              <Ionicons name="sync" size={12} color="#fff" />
            </View>
            <View style={[styles.manija, styles.manijaEscalar]} {...resizePanResponder.panHandlers} />
          </>
        )}
      </View>
    </Animated.View>
  );
}

export default function SimuladorEditorScreen({ navigation }: any) {
  // Todo el diseño viene del almacén: sobrevive aunque la pantalla se reinicie
  const { motoId, colorMoto, foto, elementos } = useDiseno();
  const motoActual = catalogoMotos.find((m) => m.id === motoId) ?? catalogoMotos[0];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mostrarPaleta, setMostrarPaleta] = useState(false);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);

  // Cuando se agrega un sticker nuevo, queda seleccionado
  const prevLen = useRef(elementos.length);
  useEffect(() => {
    if (elementos.length > prevLen.current) {
      setActiveId(elementos[elementos.length - 1].id);
    }
    prevLen.current = elementos.length;
  }, [elementos.length]);

  const subirFotoPropia = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir tu moto.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!resultado.canceled && resultado.assets?.length) {
      setEstado({ foto: resultado.assets[0].uri, colorMoto: null });
      setMostrarCatalogo(false);
      setMostrarPaleta(true); // abre la paleta para pintar de una vez
    }
  };

  const guardarDiseno = () => {
    setActiveId(null);
    setMostrarPaleta(false);
    setMostrarCatalogo(false);
    // TODO: persistir { motoId, colorMoto, foto, elementos } (AsyncStorage / backend)
    Alert.alert('Diseño guardado', 'Se ha guardado tu diseño en tu garaje.');
  };

  const nombreMoto = foto ? 'Tu moto' : motoActual.nombre;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>{nombreMoto}</Text>
        <TouchableOpacity onPress={guardarDiseno}>
          <Ionicons name="save" size={28} color="#10b981" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.canvas}
        activeOpacity={1}
        onPress={() => { setActiveId(null); setMostrarPaleta(false); setMostrarCatalogo(false); }}
      >
        {/* Moto y stickers en el MISMO lienzo: los stickers quedan pegados a la moto */}
        <View style={styles.lienzo}>
          <View style={styles.motoCapa} pointerEvents="none">
            <MotoVisual foto={foto} icono={motoActual.icono} color={colorMoto} />
          </View>

          {elementos.map((el) => (
            <ElementoArrastrable
              key={el.id}
              item={el}
              isActive={activeId === el.id}
              onActivate={() => setActiveId(el.id)}
            />
          ))}
        </View>
      </TouchableOpacity>

      <View style={styles.floatingRightPanel}>
        <TouchableOpacity style={styles.panelButton} onPress={subirFotoPropia}>
          <Ionicons name="camera" size={30} color={foto ? '#3b82f6' : '#64748b'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.panelButton}
          onPress={() => { setMostrarCatalogo(true); setMostrarPaleta(false); }}
        >
          <MaterialCommunityIcons name="motorbike" size={30} color={mostrarCatalogo ? '#3b82f6' : '#64748b'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.panelButton}
          onPress={() => { setMostrarPaleta(true); setMostrarCatalogo(false); }}
        >
          <Ionicons name="color-palette" size={30} color={mostrarPaleta ? '#3b82f6' : '#10b981'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelButton} onPress={() => navigation.navigate('SimuladorLibreria')}>
          <Ionicons name="add-circle" size={34} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {mostrarPaleta && (
        <View style={styles.bottomMenuContainer}>
          <Text style={styles.menuTitle}>Pintura de la moto</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuScroll}>
            {foto && (
              <TouchableOpacity
                style={[styles.colorCircle, styles.colorOriginal, colorMoto === null && styles.colorSeleccionado]}
                onPress={() => setEstado({ colorMoto: null })}
              >
                <Ionicons name="ban" size={24} color="#64748b" />
              </TouchableOpacity>
            )}
            {catalogoColores.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.hex },
                  colorMoto === c.hex && styles.colorSeleccionado,
                ]}
                onPress={() => setEstado({ colorMoto: c.hex })}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {mostrarCatalogo && (
        <View style={styles.bottomMenuContainer}>
          <Text style={styles.menuTitle}>Cambiar motocicleta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuScroll}>
            {catalogoMotos.map((moto) => (
              <TouchableOpacity
                key={moto.id}
                style={[styles.motoOption, !foto && motoActual.id === moto.id && styles.motoOptionActive]}
                onPress={() => {
                  setEstado({ motoId: moto.id, foto: null, colorMoto: colorMoto ?? '#0f172a' });
                  setMostrarCatalogo(false);
                }}
              >
                <Text style={[styles.motoOptionText, !foto && motoActual.id === moto.id && { color: '#3b82f6', fontWeight: 'bold' }]}>
                  {moto.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff', zIndex: 10 },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  canvas: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  lienzo: { width: LIENZO, height: LIENZO, backgroundColor: '#f8fafc', borderRadius: 16 },
  motoCapa: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  // Las dos imágenes (foto + tinte) se encallan en el mismo lugar
  fotoUsuario: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  elementoWrapper: { position: 'absolute', top: 0, left: 0 },
  elementoBorde: { padding: 10, borderWidth: 2, borderColor: 'transparent' },
  elementoBordeActivo: { borderColor: '#3b82f6', borderStyle: 'dashed', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  elementoContenido: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  manija: { position: 'absolute', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 20, borderWidth: 2, borderColor: '#fff' },
  manijaEscalar: { bottom: -12, right: -12, backgroundColor: '#10b981' },
  manijaRotar: { top: -12, right: -12, backgroundColor: '#3b82f6' },
  manijaEliminar: { position: 'absolute', top: -12, left: -12, width: 24, height: 24, backgroundColor: '#ef4444', borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  floatingRightPanel: { position: 'absolute', right: 15, top: '25%', backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', elevation: 5 },
  panelButton: { marginVertical: 12 },
  bottomMenuContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 },
  menuTitle: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  menuScroll: { paddingHorizontal: 20, alignItems: 'center' },
  colorCircle: { width: 50, height: 50, borderRadius: 25, marginHorizontal: 10, borderWidth: 2, borderColor: '#e2e8f0' },
  colorOriginal: { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  colorSeleccionado: { borderColor: '#3b82f6', borderWidth: 3 },
  motoOption: { paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 5, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  motoOptionActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  motoOptionText: { fontSize: 16, color: '#475569' },
});