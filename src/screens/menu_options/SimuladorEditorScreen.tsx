import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder, ScrollView, Alert, Pressable, Share, Image,
  Modal, TextInput, useWindowDimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect, Ellipse, Path, Circle, G, Line } from 'react-native-svg';

import {
  Acabado, EstiloRin, RolParte, GROSORES, OPACIDADES, acabados, catalogoColores, catalogoFondos, catalogoMotos,
  catalogoMotosReales, catalogoRines, coloresRin,
} from './catalogos';
import {
  useDiseno, setEstado, actualizarElemento, eliminarElemento, agregarElemento, nuevoDiseno, guardarEnGaraje,
  cargarAlmacen, agregarTrazo, deshacerTrazo, borrarTrazos, agregarColorPaleta, quitarColorPaleta, pedirFotoMoto,
  nombreDeMoto, describirDiseno, Diseno, ElementoDiseno, Trazo,
} from './diseñostore';

// Módulos opcionales: si no están instalados, solo se desactiva esa función (la app no se rompe)
let captureRef: ((r: any, o?: any) => Promise<string>) | null = null;
let Sharing: any = null;
let MediaLibrary: any = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch { captureRef = null; }
try { Sharing = require('expo-sharing'); } catch { Sharing = null; }
try { MediaLibrary = require('expo-media-library'); } catch { MediaLibrary = null; }

// Qué tanto se nota el color sobre una moto real (PNG con fondo transparente)
const INTENSIDAD_TINTE = 0.7;

// =====================================================================
//  DIBUJO DE LA MOTO (SVG)
// =====================================================================
const mezclar = (hex: string, hacia: string, t: number) => {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(hacia.slice(1), 16);
  const c = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${[c(16), c(8), c(0)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

const pol = (cx: number, cy: number, radio: number, grados: number) => {
  const rad = (grados * Math.PI) / 180;
  return { x: cx + radio * Math.cos(rad), y: cy + radio * Math.sin(rad) };
};

// overlay = solo el rin (sin llanta): sirve para ponerlo encima de la rueda de una foto
function Rueda({
  cx, cy, r, estilo, color, overlay,
}: { cx: number; cy: number; r: number; estilo: EstiloRin; color: string; overlay?: boolean }) {
  const rr = r * 0.72; // radio del rin
  const hub = r * 0.14;
  const piezas: React.ReactNode[] = [];

  if (estilo === 'deportivo' || estilo === 'multi') {
    const n = estilo === 'deportivo' ? 5 : 10;
    const ancho = estilo === 'deportivo' ? r * 0.12 : r * 0.045;
    for (let i = 0; i < n; i++) {
      const a = (360 / n) * i - 90;
      const p1 = pol(cx, cy, hub, a);
      const p2 = pol(cx, cy, rr * 0.95, a);
      piezas.push(<Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={ancho} strokeLinecap="round" />);
    }
  } else if (estilo === 'radios') {
    for (let i = 0; i < 24; i++) {
      const a = (360 / 24) * i;
      const p1 = pol(cx, cy, hub, a);
      const p2 = pol(cx, cy, rr, a + 25);
      piezas.push(<Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={1.1} />);
    }
  } else if (estilo === 'disco') {
    piezas.push(<Circle key="d" cx={cx} cy={cy} r={rr * 0.95} fill={color} opacity={0.95} />);
    for (let i = 0; i < 6; i++) {
      const p = pol(cx, cy, rr * 0.58, (360 / 6) * i);
      piezas.push(<Circle key={i} cx={p.x} cy={p.y} r={r * 0.1} fill="#0b1220" />);
    }
  } else {
    for (let i = 0; i < 8; i++) {
      const a = (360 / 8) * i;
      const p1 = pol(cx, cy, hub, a);
      const ctrl = pol(cx, cy, rr * 0.6, a + 30);
      const p2 = pol(cx, cy, rr * 0.97, a + 55);
      piezas.push(
        <Path key={i} d={`M ${p1.x} ${p1.y} Q ${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}`} stroke={color} strokeWidth={r * 0.07} strokeLinecap="round" fill="none" />
      );
    }
  }

  return (
    <G>
      {!overlay && <Circle cx={cx} cy={cy} r={r} fill="#111827" />}
      {!overlay && <Circle cx={cx} cy={cy} r={r * 0.93} fill="none" stroke="#374151" strokeWidth={1.5} />}
      <Circle cx={cx} cy={cy} r={rr} fill="#0b1220" />
      <Circle cx={cx} cy={cy} r={rr} fill="none" stroke={color} strokeWidth={r * 0.09} />
      {piezas}
      <Circle cx={cx} cy={cy} r={hub} fill={color} stroke="#0b1220" strokeWidth={2} />
    </G>
  );
}

export const RinPreview = React.memo(function RinPreview({
  estilo, color, size = 56, overlay,
}: { estilo: EstiloRin; color: string; size?: number; overlay?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 104 104">
      <Rueda cx={52} cy={52} r={50} estilo={estilo} color={color} overlay={overlay} />
    </Svg>
  );
});

type MotoProps = {
  motoId: string;
  colorPrincipal: string;
  colorAcento: string;
  acabado: Acabado;
  rinId: string;
  rinColor: string;
  fondoId: string;
  width: number;
  height: number;
  soloFondo?: boolean; // true cuando la moto viene de una imagen (real o foto)
};

function MotoSvgBase({
  motoId, colorPrincipal, colorAcento, acabado, rinId, rinColor, fondoId, width, height, soloFondo,
}: MotoProps) {
  const modelo = catalogoMotos.find((m) => m.id === motoId) ?? catalogoMotos[0];
  const fondo = catalogoFondos.find((f) => f.id === fondoId) ?? catalogoFondos[0];
  const estiloRin = (catalogoRines.find((r) => r.id === rinId) ?? catalogoRines[0]).estilo;

  const c = colorPrincipal;
  const stops =
    acabado === 'brillante'
      ? [[0, mezclar(c, '#ffffff', 0.45)], [0.45, c], [1, mezclar(c, '#000000', 0.35)]]
      : acabado === 'mate'
      ? [[0, mezclar(c, '#ffffff', 0.08)], [1, mezclar(c, '#000000', 0.15)]]
      : [
          [0, mezclar(c, '#ffffff', 0.6)],
          [0.25, c],
          [0.5, mezclar(c, '#000000', 0.4)],
          [0.75, c],
          [1, mezclar(c, '#ffffff', 0.25)],
        ];

  const relleno = (rol: RolParte) => {
    switch (rol) {
      case 'principal': return 'url(#pintura)';
      case 'acento': return colorAcento;
      case 'oscuro': return '#1f2937';
      case 'asiento': return '#0f172a';
      case 'cromo': return '#cbd5e1';
      default: return '#93c5fd';
    }
  };

  return (
    <Svg width={width} height={height} viewBox="0 0 400 240">
      <Defs>
        <LinearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fondo.cielo[0]} />
          <Stop offset="1" stopColor={fondo.cielo[1]} />
        </LinearGradient>
        <LinearGradient id="pintura" x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, col], i) => (
            <Stop key={i} offset={String(o)} stopColor={col as string} />
          ))}
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={400} height={240} fill="url(#cielo)" />
      <Rect x={0} y={modelo.suelo - 1} width={400} height={240 - modelo.suelo + 1} fill={fondo.suelo} />

      {!soloFondo && (
        <>
          <Ellipse cx={200} cy={modelo.suelo + 2} rx={175} ry={7} fill="#000" opacity={0.25} />
          {modelo.ruedas.map((w, i) => (
            <Rueda key={i} cx={w.cx} cy={w.cy} r={w.r} estilo={estiloRin} color={rinColor} />
          ))}
          {modelo.lineas.map((l, i) => (
            <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.rol === 'cromo' ? '#cbd5e1' : '#1f2937'} strokeWidth={l.ancho} strokeLinecap="round" />
          ))}
          {modelo.partes.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              fill={relleno(p.rol)}
              fillOpacity={p.rol === 'cristal' ? 0.5 : 1}
              stroke={p.rol === 'principal' || p.rol === 'acento' ? 'rgba(0,0,0,0.35)' : 'none'}
              strokeWidth={1.5}
            />
          ))}
          <Circle cx={modelo.faro.cx} cy={modelo.faro.cy} r={modelo.faro.r} fill="#fef9c3" stroke="#94a3b8" strokeWidth={2} />
        </>
      )}
    </Svg>
  );
}

export const MotoSvg = React.memo(MotoSvgBase);

// =====================================================================
//  CAPA BASE: fondo + moto (vector, real o foto) + trazos de brocha
// =====================================================================
const pickBase = (d: Diseno) => ({
  fuente: d.fuente,
  realId: d.realId,
  fotoUri: d.fotoUri,
  motoId: d.motoId,
  colorPrincipal: d.colorPrincipal,
  colorAcento: d.colorAcento,
  acabado: d.acabado,
  rinId: d.rinId,
  rinColor: d.rinColor,
  fondoId: d.fondoId,
  trazos: d.trazos,
});

type BaseProps = ReturnType<typeof pickBase> & { vivo?: Trazo | null; width: number; height: number };

const CapaBase = React.memo(function CapaBase(p: BaseProps) {
  const real = p.fuente === 'real' ? catalogoMotosReales.find((m) => m.id === p.realId) ?? null : null;
  const fuenteImg: any = p.fuente === 'foto' && p.fotoUri ? { uri: p.fotoUri } : real ? real.imagen : null;
  const tinte = !!real?.tintable;
  const imgStyle = { position: 'absolute' as const, top: 0, left: 0, width: p.width, height: p.height };

  return (
    <View style={{ width: p.width, height: p.height }}>
      <MotoSvg
        motoId={p.motoId}
        colorPrincipal={p.colorPrincipal}
        colorAcento={p.colorAcento}
        acabado={p.acabado}
        rinId={p.rinId}
        rinColor={p.rinColor}
        fondoId={p.fondoId}
        width={p.width}
        height={p.height}
        soloFondo={fuenteImg !== null}
      />
      {fuenteImg && <Image source={fuenteImg} style={imgStyle} resizeMode="contain" />}
      {fuenteImg && tinte && (
        // Misma imagen encima, pintada de un color. Respeta la transparencia del PNG
        <Image source={fuenteImg} style={[imgStyle, { tintColor: p.colorPrincipal, opacity: INTENSIDAD_TINTE }]} resizeMode="contain" />
      )}
      {(p.trazos.length > 0 || p.vivo) && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={p.width} height={p.height} viewBox="0 0 400 240">
            {p.trazos.map((t) => (
              <Path key={t.id} d={t.d} stroke={t.color} strokeWidth={t.ancho} strokeOpacity={t.opacidad} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {p.vivo && (
              <Path d={p.vivo.d} stroke={p.vivo.color} strokeWidth={p.vivo.ancho} strokeOpacity={p.vivo.opacidad} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </Svg>
        </View>
      )}
    </View>
  );
});

// Contenido visual de un sticker / texto / rin (lo usan el editor y las vistas de solo lectura)
function ElementoVisual({ item, ICON }: { item: ElementoDiseno; ICON: number }) {
  if (item.tipo === 'texto') {
    return (
      <Text
        style={{
          fontSize: ICON * 0.9,
          fontWeight: '900',
          fontStyle: 'italic',
          color: item.color,
          textShadowColor: 'rgba(0,0,0,0.35)',
          textShadowRadius: 2,
          textShadowOffset: { width: 1, height: 1 },
        }}
      >
        {item.texto}
      </Text>
    );
  }
  if (item.tipo === 'rin') {
    return <RinPreview estilo={item.rinEstilo ?? 'deportivo'} color={item.color} size={ICON * 1.9} overlay />;
  }
  return <MaterialCommunityIcons name={item.icono as any} size={ICON} color={item.color} />;
}

// Vista de solo lectura del diseño completo (garaje, pantalla de Mantenimiento)
export function LienzoEstatico({ diseno, width }: { diseno: Diseno; width: number }) {
  const W = width;
  const H = width * 0.6;
  const ICON = W * 0.11;
  return (
    <View style={{ width: W, height: H, borderRadius: 12, overflow: 'hidden' }}>
      <CapaBase {...pickBase(diseno)} width={W} height={H} />
      {diseno.elementos.map((el) => (
        <View
          key={el.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: el.x * W,
            top: el.y * H,
            transform: [{ rotate: `${el.rotation}deg` }, { scale: el.scale }],
          }}
        >
          <ElementoVisual item={el} ICON={ICON} />
        </View>
      ))}
    </View>
  );
}

// =====================================================================
//  EDITOR
// =====================================================================
type Tab = 'moto' | 'pintura' | 'rines' | 'brocha' | 'fondo';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'moto', label: 'Moto', icon: 'motorbike' },
  { key: 'pintura', label: 'Pintura', icon: 'format-color-fill' },
  { key: 'rines', label: 'Rines', icon: 'tire' },
  { key: 'brocha', label: 'Brocha', icon: 'brush' },
  { key: 'fondo', label: 'Fondo', icon: 'image-filter-hdr' },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const PAD = 14; // zona táctil de las manijas (dentro de los límites del elemento, para que funcione en Android)
const OFFSET = PAD + 3.5; // PAD + borde (1.5) + relleno (2): el contenido queda exactamente en (x, y)

const normalizarHex = (v: string) => {
  const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : null;
};

const construirPath = (pts: { x: number; y: number }[]) =>
  pts.length === 1
    ? `M ${pts[0].x} ${pts[0].y} l 0.1 0`
    : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

function ElementoArrastrable({
  item, activo, onActivar, W, H,
}: { item: ElementoDiseno; activo: boolean; onActivar: () => void; W: number; H: number }) {
  const itemRef = useRef(item);
  itemRef.current = item;
  const dims = useRef({ W, H });
  dims.current = { W, H };
  const inicio = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });
  const ICON = W * 0.11;

  const guardarInicio = () => { inicio.current = { ...itemRef.current }; };

  const mover = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { onActivar(); guardarInicio(); },
      onPanResponderMove: (_e, g) =>
        actualizarElemento(itemRef.current.id, {
          x: clamp(inicio.current.x + g.dx / dims.current.W, 0, 0.88),
          y: clamp(inicio.current.y + g.dy / dims.current.H, 0, 0.85),
        }),
    })
  ).current;

  const escalar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: guardarInicio,
      onPanResponderMove: (_e, g) =>
        actualizarElemento(itemRef.current.id, { scale: clamp(inicio.current.scale + g.dx / 120, 0.3, 3.5) }),
    })
  ).current;

  const rotar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: guardarInicio,
      onPanResponderMove: (_e, g) =>
        actualizarElemento(itemRef.current.id, { rotation: inicio.current.rotation + g.dx * 0.7 }),
    })
  ).current;

  const inv = { transform: [{ scale: 1 / item.scale }] }; // las manijas conservan su tamaño

  return (
    <View
      style={{
        position: 'absolute',
        left: item.x * W - OFFSET,
        top: item.y * H - OFFSET,
        padding: PAD,
        transform: [{ rotate: `${item.rotation}deg` }, { scale: item.scale }],
      }}
    >
      <View style={[styles.elementoBorde, activo && styles.elementoBordeActivo]} {...mover.panHandlers}>
        <ElementoVisual item={item} ICON={ICON} />
      </View>

      {activo && (
        <>
          <TouchableOpacity style={[styles.manija, styles.manijaEliminar, inv]} onPress={() => eliminarElemento(item.id)}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.manija, styles.manijaRotar, inv]} {...rotar.panHandlers}>
            <Ionicons name="sync" size={14} color="#fff" />
          </View>
          <View style={[styles.manija, styles.manijaEscalar, inv]} {...escalar.panHandlers}>
            <Ionicons name="resize" size={14} color="#fff" />
          </View>
        </>
      )}
    </View>
  );
}

function FilaColores({
  colores, valor, onElegir, onBorrar,
}: {
  colores: { id: string; hex: string }[];
  valor: string;
  onElegir: (hex: string) => void;
  onBorrar?: (hex: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
      {colores.map((c) => (
        <TouchableOpacity
          key={c.id}
          onPress={() => onElegir(c.hex)}
          onLongPress={() => onBorrar?.(c.hex)}
          style={[styles.colorCircle, { backgroundColor: c.hex }, valor === c.hex && styles.colorSeleccionado]}
        />
      ))}
    </ScrollView>
  );
}

function Accion({
  icono, texto, onPress, destacado,
}: { icono: string; texto: string; onPress: () => void; destacado?: boolean }) {
  return (
    <TouchableOpacity style={[styles.accion, destacado && styles.accionDestacada]} onPress={onPress}>
      <Ionicons name={icono as any} size={20} color={destacado ? '#fff' : '#0f172a'} />
      <Text style={[styles.accionTexto, destacado && { color: '#fff' }]}>{texto}</Text>
    </TouchableOpacity>
  );
}

export default function SimuladorEditorScreen({ navigation, route }: any) {
  const d = useDiseno();
  const { width } = useWindowDimensions();
  const W = Math.min(width - 24, 560);
  const H = W * 0.6;

  const lienzoRef = useRef<View>(null);
  const [tab, setTab] = useState<Tab>((route?.params?.tab as Tab) ?? 'moto');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalGuardar, setModalGuardar] = useState(false);
  const [nombreInput, setNombreInput] = useState('');
  const [hexInput, setHexInput] = useState('');

  // brocha
  const [brochaColor, setBrochaColor] = useState(d.colorPrincipal);
  const [grosorId, setGrosorId] = useState('medio');
  const [opacidadId, setOpacidadId] = useState('translucido');
  const [vivo, setVivo] = useState<Trazo | null>(null);
  const puntos = useRef<{ x: number; y: number }[]>([]);
  const config = useRef({ color: brochaColor, ancho: 9, opacidad: 0.6 });
  config.current = {
    color: brochaColor,
    ancho: GROSORES.find((g) => g.id === grosorId)?.ancho ?? 9,
    opacidad: OPACIDADES.find((o) => o.id === opacidadId)?.valor ?? 0.6,
  };
  const dims = useRef({ W, H });
  dims.current = { W, H };

  const nombreMoto = nombreDeMoto(d);
  const editando = d.disenoId !== null && d.garaje.some((g) => g.id === d.disenoId);
  const coloresPintura = [...catalogoColores, ...d.paleta.map((hex) => ({ id: `p${hex}`, hex }))];
  const motoReal = d.fuente === 'real' ? catalogoMotosReales.find((m) => m.id === d.realId) : null;

  useEffect(() => { cargarAlmacen(); }, []);

  // Lo que se acaba de agregar queda seleccionado
  useEffect(() => {
    if (d.ultimoAgregado) setActiveId(d.ultimoAgregado);
  }, [d.ultimoAgregado]);

  // Desde Mantenimiento se puede abrir directo en una pestaña
  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);

  // Al entrar a la brocha se quita la selección de stickers
  useEffect(() => {
    if (tab === 'brocha') setActiveId(null);
  }, [tab]);

  // Desde Mantenimiento: botón "Compartir"
  useEffect(() => {
    if (route?.params?.accion === 'compartir') {
      const id = setTimeout(() => {
        compartir();
        navigation.setParams({ accion: undefined });
      }, 600);
      return () => clearTimeout(id);
    }
  }, [route?.params?.accion]);

  // ---------- brocha ----------
  const aVista = (px: number, py: number) => ({
    x: Math.round(((px * 400) / dims.current.W) * 10) / 10,
    y: Math.round(((py * 240) / dims.current.H) * 10) / 10,
  });

  const terminarTrazo = () => {
    if (puntos.current.length > 0) {
      agregarTrazo({ ...config.current, d: construirPath(puntos.current) });
    }
    puntos.current = [];
    setVivo(null);
  };

  const dibujar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        puntos.current = [aVista(e.nativeEvent.locationX, e.nativeEvent.locationY)];
        setVivo({ id: 'vivo', ...config.current, d: construirPath(puntos.current) });
      },
      onPanResponderMove: (e) => {
        const p = aVista(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const ult = puntos.current[puntos.current.length - 1];
        if (ult && Math.hypot(p.x - ult.x, p.y - ult.y) < 1.5) return;
        puntos.current.push(p);
        setVivo({ id: 'vivo', ...config.current, d: construirPath(puntos.current) });
      },
      onPanResponderRelease: terminarTrazo,
      onPanResponderTerminate: terminarTrazo,
    })
  ).current;

  const confirmarBorrarTrazos = () => {
    if (d.trazos.length === 0) return;
    Alert.alert('Borrar pintura', '¿Quitar todos los trazos de brocha?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: borrarTrazos },
    ]);
  };

  // ---------- paleta propia ----------
  const guardarColor = () => {
    const hex = normalizarHex(hexInput);
    if (!hex) {
      Alert.alert('Color no válido', 'Escribe un color hexadecimal de 6 dígitos, por ejemplo #ff8800.');
      return;
    }
    agregarColorPaleta(hex);
    setHexInput('');
  };

  const borrarColor = (hex: string) => {
    if (!d.paleta.includes(hex)) return;
    Alert.alert('Quitar color', `¿Quitar ${hex} de tu paleta?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => quitarColorPaleta(hex) },
    ]);
  };

  // ---------- compartir / galería ----------
  const capturar = async (opciones: any) => {
    if (!captureRef) throw new Error('view-shot no instalado');
    setActiveId(null);
    await new Promise((r) => setTimeout(r, 80));
    return captureRef(lienzoRef, opciones);
  };

  const compartir = async () => {
    // 1) imagen del diseño (si están instalados view-shot y expo-sharing)
    if (captureRef && Sharing && (await Sharing.isAvailableAsync())) {
      try {
        const uri = await capturar({ format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Mi ${nombreMoto} en RidersMX` });
        return;
      } catch {
        // si falla, se comparte como texto
      }
    }
    // 2) respaldo: texto con la descripción del diseño
    try {
      await Share.share({ message: describirDiseno(d) });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el diseño.');
    }
  };

  const descargar = async () => {
    if (!captureRef || !MediaLibrary) {
      Alert.alert(
        'Función no disponible',
        'Para guardar en la galería hay que instalar react-native-view-shot y expo-media-library.'
      );
      return;
    }
    try {
      const permiso = await MediaLibrary.requestPermissionsAsync(true);
      if (!permiso.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos permiso para guardar la imagen en tu galería.');
        return;
      }
      const uri = await capturar({ format: 'png', quality: 1, result: 'tmpfile' });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Listo', 'Tu moto se guardó en la galería.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la imagen.');
    }
  };

  // ---------- garaje ----------
  const abrirModalGuardar = () => {
    setNombreInput(d.nombre || `${nombreMoto} ${d.garaje.length + 1}`);
    setModalGuardar(true);
  };

  const confirmarGuardar = (comoNuevo: boolean) => {
    const nombre = nombreInput.trim() || `${nombreMoto} ${d.garaje.length + 1}`;
    setModalGuardar(false);
    setActiveId(null);
    guardarEnGaraje(nombre, comoNuevo);
    Alert.alert('¡Guardado!', 'Tu diseño ya está en tu garaje.');
  };

  const confirmarNuevo = () =>
    Alert.alert('Nuevo diseño', '¿Empezar de cero? El diseño actual no guardado se perderá.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Empezar', style: 'destructive', onPress: () => { setActiveId(null); nuevoDiseno(); } },
    ]);

  // ---------- pantalla ----------
  const avisoPintura =
    d.fuente === 'foto'
      ? 'Tu foto no cambia de color con estos controles. Para pintarla usa la pestaña Brocha, o elige una moto del catálogo.'
      : d.fuente === 'real' && !motoReal?.tintable
      ? 'Esta imagen no tiene fondo transparente, así que el color base no se aplica. Usa la pestaña Brocha.'
      : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo} numberOfLines={1}>{d.nombre || nombreMoto}</Text>
        <TouchableOpacity onPress={compartir} style={styles.iconBtn}>
          <Ionicons name="share-social" size={26} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={abrirModalGuardar} style={styles.iconBtn}>
          <Ionicons name="save" size={28} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* lienzo: esto es lo que se comparte / guarda */}
      <View style={styles.canvas}>
        <View ref={lienzoRef} collapsable={false} style={{ width: W, height: H, borderRadius: 16, overflow: 'hidden' }}>
          <CapaBase {...pickBase(d)} vivo={vivo} width={W} height={H} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveId(null)} />
          {d.elementos.map((el) => (
            <ElementoArrastrable
              key={el.id}
              item={el}
              activo={activeId === el.id}
              onActivar={() => setActiveId(el.id)}
              W={W}
              H={H}
            />
          ))}
          {tab === 'brocha' && <View style={StyleSheet.absoluteFill} {...dibujar.panHandlers} />}
        </View>
      </View>

      <View style={styles.acciones}>
        <Accion icono="add-circle" texto="Stickers" onPress={() => navigation.navigate('SimuladorLibreria', { tab: 'stickers' })} destacado />
        <Accion icono="albums" texto="Garaje" onPress={() => navigation.navigate('SimuladorLibreria', { tab: 'garaje' })} />
        <Accion icono="download" texto="Galería" onPress={descargar} />
        <Accion icono="refresh" texto="Nuevo" onPress={confirmarNuevo} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActivo]} onPress={() => setTab(t.key)}>
            <MaterialCommunityIcons name={t.icon as any} size={22} color={tab === t.key ? '#3b82f6' : '#64748b'} />
            <Text style={[styles.tabTexto, tab === t.key && { color: '#3b82f6' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* ---------- MOTO ---------- */}
        {tab === 'moto' && (
          <>
            <Text style={styles.etiqueta}>Tu moto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
              <TouchableOpacity
                style={[styles.tarjeta, d.fuente === 'foto' && styles.tarjetaActiva]}
                onPress={() => pedirFotoMoto(false)}
              >
                {d.fotoUri ? (
                  <Image source={{ uri: d.fotoUri }} style={{ width: 140, height: 84, borderRadius: 8 }} resizeMode="cover" />
                ) : (
                  <View style={styles.tarjetaFoto}>
                    <Ionicons name="camera" size={34} color="#3b82f6" />
                  </View>
                )}
                <Text style={styles.tarjetaTitulo}>Mi moto</Text>
                <Text style={styles.tarjetaSub}>{d.fotoUri ? 'Toca para cambiar la foto' : 'Sube una foto'}</Text>
              </TouchableOpacity>
            </ScrollView>

            {catalogoMotosReales.length > 0 && (
              <>
                <Text style={styles.etiqueta}>Motos reales</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
                  {catalogoMotosReales.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.tarjeta, d.fuente === 'real' && d.realId === m.id && styles.tarjetaActiva]}
                      onPress={() => setEstado({ fuente: 'real', realId: m.id })}
                    >
                      <Image source={m.imagen} style={{ width: 140, height: 84 }} resizeMode="contain" />
                      <Text style={styles.tarjetaTitulo}>{m.nombre}</Text>
                      <Text style={styles.tarjetaSub}>{m.descripcion}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.etiqueta}>Catálogo dibujado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
              {catalogoMotos.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.tarjeta, d.fuente === 'vector' && d.motoId === m.id && styles.tarjetaActiva]}
                  onPress={() => setEstado({ fuente: 'vector', motoId: m.id })}
                >
                  <MotoSvg
                    motoId={m.id}
                    colorPrincipal={d.colorPrincipal}
                    colorAcento={d.colorAcento}
                    acabado={d.acabado}
                    rinId={d.rinId}
                    rinColor={d.rinColor}
                    fondoId={d.fondoId}
                    width={140}
                    height={84}
                  />
                  <Text style={styles.tarjetaTitulo}>{m.nombre}</Text>
                  <Text style={styles.tarjetaSub}>{m.descripcion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ---------- PINTURA ---------- */}
        {tab === 'pintura' && (
          <>
            {avisoPintura && <Text style={styles.nota}>{avisoPintura}</Text>}
            <Text style={styles.etiqueta}>Color principal</Text>
            <FilaColores colores={coloresPintura} valor={d.colorPrincipal} onElegir={(hex) => setEstado({ colorPrincipal: hex })} onBorrar={borrarColor} />
            <Text style={styles.etiqueta}>Color de acento</Text>
            <FilaColores colores={coloresPintura} valor={d.colorAcento} onElegir={(hex) => setEstado({ colorAcento: hex })} onBorrar={borrarColor} />
            <Text style={styles.etiqueta}>Acabado</Text>
            <View style={styles.fila}>
              {acabados.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.chip, d.acabado === a.id && styles.chipActivo]}
                  onPress={() => setEstado({ acabado: a.id })}
                >
                  <Text style={[styles.chipTexto, d.acabado === a.id && { color: '#3b82f6', fontWeight: 'bold' }]}>{a.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.etiqueta}>Crear mi color (hex, ej. #ff8800)</Text>
            <View style={[styles.fila, { alignItems: 'center' }]}>
              <View style={[styles.colorCircle, { backgroundColor: normalizarHex(hexInput) ?? '#e2e8f0' }]} />
              <TextInput
                style={styles.input}
                value={hexInput}
                onChangeText={setHexInput}
                placeholder="#ff8800"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
              />
              <TouchableOpacity style={styles.botonAgregar} onPress={guardarColor}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {d.paleta.length > 0 && (
              <Text style={styles.nota}>Tus colores aparecen al final de las filas de color. Mantén presionado uno para quitarlo.</Text>
            )}
          </>
        )}

        {/* ---------- RINES ---------- */}
        {tab === 'rines' && (
          <>
            {d.fuente !== 'vector' && (
              <Text style={styles.nota}>
                Toca un rin para ponerlo sobre tu moto. Arrástralo hasta la rueda y ajusta el tamaño con la manija verde (agrega uno por rueda).
              </Text>
            )}
            <Text style={styles.etiqueta}>Modelo de rin</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
              {catalogoRines.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.tarjetaRin, d.fuente === 'vector' && d.rinId === r.id && styles.tarjetaActiva]}
                  onPress={() =>
                    d.fuente === 'vector'
                      ? setEstado({ rinId: r.id })
                      : agregarElemento({ tipo: 'rin', rinEstilo: r.estilo, color: d.rinColor })
                  }
                >
                  <RinPreview estilo={r.estilo} color={d.rinColor} />
                  <Text style={styles.tarjetaSub}>{r.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.etiqueta}>Color del rin</Text>
            <FilaColores colores={coloresRin} valor={d.rinColor} onElegir={(hex) => setEstado({ rinColor: hex })} />
          </>
        )}

        {/* ---------- BROCHA ---------- */}
        {tab === 'brocha' && (
          <>
            <Text style={styles.nota}>Dibuja directo sobre la moto para pintar zonas: carrocería, rines, detalles.</Text>
            <Text style={styles.etiqueta}>Color de la brocha</Text>
            <FilaColores colores={coloresPintura} valor={brochaColor} onElegir={setBrochaColor} />
            <Text style={styles.etiqueta}>Grosor</Text>
            <View style={styles.fila}>
              {GROSORES.map((g) => (
                <TouchableOpacity key={g.id} style={[styles.chip, grosorId === g.id && styles.chipActivo]} onPress={() => setGrosorId(g.id)}>
                  <Text style={[styles.chipTexto, grosorId === g.id && { color: '#3b82f6', fontWeight: 'bold' }]}>{g.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.etiqueta}>Intensidad</Text>
            <View style={styles.fila}>
              {OPACIDADES.map((o) => (
                <TouchableOpacity key={o.id} style={[styles.chip, opacidadId === o.id && styles.chipActivo]} onPress={() => setOpacidadId(o.id)}>
                  <Text style={[styles.chipTexto, opacidadId === o.id && { color: '#3b82f6', fontWeight: 'bold' }]}>{o.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.fila, { gap: 10 }]}>
              <Accion icono="arrow-undo" texto="Deshacer" onPress={deshacerTrazo} />
              <Accion icono="trash" texto="Borrar todo" onPress={confirmarBorrarTrazos} />
            </View>
          </>
        )}

        {/* ---------- FONDO ---------- */}
        {tab === 'fondo' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
            {catalogoFondos.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.fondoChip, d.fondoId === f.id && styles.tarjetaActiva]}
                onPress={() => setEstado({ fondoId: f.id })}
              >
                <View style={{ flex: 1, backgroundColor: f.cielo[0] }} />
                <View style={{ flex: 1, backgroundColor: f.cielo[1] }} />
                <View style={{ height: 14, backgroundColor: f.suelo }} />
                <Text style={styles.fondoNombre}>{f.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <Modal visible={modalGuardar} transparent animationType="fade" onRequestClose={() => setModalGuardar(false)}>
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <Text style={styles.modalTitulo}>Guardar en tu garaje</Text>
            <TextInput
              style={styles.modalInput}
              value={nombreInput}
              onChangeText={setNombreInput}
              placeholder="Nombre de tu diseño"
              placeholderTextColor="#94a3b8"
              maxLength={30}
              autoFocus
            />
            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonGris} onPress={() => setModalGuardar(false)}>
                <Text style={styles.botonGrisTexto}>Cancelar</Text>
              </TouchableOpacity>
              {editando && (
                <TouchableOpacity style={styles.botonGris} onPress={() => confirmarGuardar(true)}>
                  <Text style={styles.botonGrisTexto}>Como nuevo</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.botonAzul} onPress={() => confirmarGuardar(false)}>
                <Text style={styles.botonAzulTexto}>{editando ? 'Actualizar' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  iconBtn: { padding: 5, marginHorizontal: 2 },
  titulo: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginLeft: 8 },
  canvas: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#e2e8f0' },

  elementoBorde: { borderWidth: 1.5, borderColor: 'transparent', padding: 2 },
  elementoBordeActivo: { borderColor: '#3b82f6', borderStyle: 'dashed', backgroundColor: 'rgba(59,130,246,0.12)' },
  manija: { position: 'absolute', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 20 },
  manijaEliminar: { top: 0, left: 0, backgroundColor: '#ef4444' },
  manijaRotar: { top: 0, right: 0, backgroundColor: '#3b82f6' },
  manijaEscalar: { bottom: 0, right: 0, backgroundColor: '#10b981' },

  acciones: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  accionDestacada: { backgroundColor: '#3b82f6' },
  accionTexto: { fontSize: 13, fontWeight: '600', color: '#0f172a' },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActivo: { borderBottomWidth: 3, borderBottomColor: '#3b82f6' },
  tabTexto: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },

  panel: { flex: 1, backgroundColor: '#fff' },
  fila: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row' },
  etiqueta: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 12, marginLeft: 16 },
  nota: { fontSize: 12, color: '#475569', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginHorizontal: 16, marginTop: 12 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: '#e2e8f0' },
  colorSeleccionado: { borderColor: '#3b82f6', borderWidth: 3 },

  tarjeta: { alignItems: 'center', padding: 8, marginRight: 12, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  tarjetaFoto: { width: 140, height: 84, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  tarjetaRin: { alignItems: 'center', padding: 8, marginRight: 12, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', width: 92 },
  tarjetaActiva: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  tarjetaTitulo: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  tarjetaSub: { fontSize: 11, color: '#64748b', textAlign: 'center' },

  chip: { paddingHorizontal: 18, paddingVertical: 10, marginRight: 10, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  chipActivo: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  chipTexto: { fontSize: 14, color: '#475569' },

  input: { flex: 1, height: 44, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: '#0f172a' },
  botonAgregar: { width: 44, height: 44, marginLeft: 10, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },

  fondoChip: { width: 96, height: 84, marginRight: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#e2e8f0' },
  fondoNombre: { position: 'absolute', bottom: 16, alignSelf: 'center', fontSize: 11, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },

  modalFondo: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  modalCaja: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  modalInput: { height: 46, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: '#0f172a' },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  botonGris: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9' },
  botonGrisTexto: { color: '#475569', fontWeight: '600' },
  botonAzul: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#3b82f6' },
  botonAzulTexto: { color: '#fff', fontWeight: 'bold' },
});