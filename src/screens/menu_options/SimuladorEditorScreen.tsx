import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder, ScrollView, Alert, Pressable, Share, Image,
  Modal, TextInput, useWindowDimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Ellipse, Path, Circle, G, Line } from 'react-native-svg';
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Theme } from '../../../assets/theme/theme';

import {
  Acabado, Decoracion, EstiloRin, RolParte, GROSORES, OPACIDADES, acabados, catalogoColores, catalogoFondos,
  catalogoMotos, catalogoMotosReales, catalogoRines, coloresRin, coloresTexto,
} from './catalogos';
import {
  useDiseno, getEstado, setEstado, actualizarElemento, eliminarElemento, agregarElemento, duplicarElemento,
  traerAlFrente, nuevoDiseno, guardarEnGaraje, cargarAlmacen, agregarTrazo, eliminarTrazo, deshacerTrazo,
  borrarTrazos, agregarColorPaleta, quitarColorPaleta, pedirFotoMoto, quitarFoto, nombreDeMoto, describirDiseno,
  Diseno, ElementoDiseno, Mezcla, Trazo,
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
//  UTILIDADES DE COLOR / GEOMETRÍA
// =====================================================================
const mezclar = (hex: string, hacia: string, t: number) => {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(hacia.slice(1), 16);
  const c = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${[c(16), c(8), c(0)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

const luminancia = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

// Modo de mezcla para que la pintura se vea "sobre" la moto y no pegada encima
const mezclaPara = (hex: string, realista: boolean): Mezcla => {
  if (!realista) return 'normal';
  const l = luminancia(hex);
  if (l < 0.12) return 'multiply'; // negros: oscurecen conservando detalles
  if (l > 0.85) return 'screen'; // blancos: aclaran conservando detalles
  return 'color'; // resto: tinte que conserva brillos y sombras
};

const pol = (cx: number, cy: number, radio: number, grados: number) => {
  const rad = (grados * Math.PI) / 180;
  return { x: cx + radio * Math.cos(rad), y: cy + radio * Math.sin(rad) };
};

type Pt = { x: number; y: number };

const puntosDe = (d: string): Pt[] => {
  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const r: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) r.push({ x: n[i], y: n[i + 1] });
  return r;
};

const distSegmento = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

const dentroDePoligono = (p: Pt, poly: Pt[]) => {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
};

// Devuelve el trazo (el de más arriba) que está bajo el dedo, para el borrador
const trazoEnPunto = (trazos: Trazo[], p: Pt): string | null => {
  for (let i = trazos.length - 1; i >= 0; i--) {
    const t = trazos[i];
    const pts = puntosDe(t.d);
    if (t.relleno && pts.length > 2) {
      if (dentroDePoligono(p, pts)) return t.id;
    } else {
      const tol = t.ancho / 2 + 6;
      if (pts.length === 1 && Math.hypot(pts[0].x - p.x, pts[0].y - p.y) <= tol) return t.id;
      for (let k = 0; k + 1 < pts.length; k++) {
        if (distSegmento(p, pts[k], pts[k + 1]) <= tol) return t.id;
      }
    }
  }
  return null;
};

// =====================================================================
//  DIBUJO DE LA MOTO (SVG)
// =====================================================================

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

  // dibujo de la llanta: banda de rodamiento con "tacos"
  const tacos: React.ReactNode[] = [];
  if (!overlay) {
    for (let i = 0; i < 44; i++) {
      const a = (360 / 44) * i;
      const p1 = pol(cx, cy, r * 0.91, a);
      const p2 = pol(cx, cy, r * 0.995, a);
      tacos.push(<Line key={`t${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#030712" strokeWidth={1.6} />);
    }
  }

  return (
    <G>
      {!overlay && <Circle cx={cx} cy={cy} r={r} fill="#0b0f19" />}
      {tacos}
      {!overlay && <Circle cx={cx} cy={cy} r={r * 0.88} fill="none" stroke="#1f2937" strokeWidth={r * 0.09} />}
      {!overlay && <Circle cx={cx} cy={cy} r={r * 0.97} fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1.5} />}
      <Circle cx={cx} cy={cy} r={rr} fill="#0b1220" />
      {!overlay && <Circle cx={cx} cy={cy} r={rr * 0.6} fill="none" stroke="#94a3b8" strokeOpacity={0.8} strokeWidth={r * 0.06} />}
      <Circle cx={cx} cy={cy} r={rr} fill="none" stroke={color} strokeWidth={r * 0.09} />
      <Circle cx={cx} cy={cy} r={rr * 1.04} fill="none" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={r * 0.02} />
      {piezas}
      <Circle cx={cx} cy={cy} r={hub} fill={color} stroke="#0b1220" strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={hub * 0.4} fill="#0b1220" />
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

// ---------- decoración de los fondos ----------
const EDIFICIOS: [number, number, number][] = [
  [8, 38, 90], [52, 30, 120], [88, 44, 80], [138, 34, 132], [178, 50, 100],
  [234, 30, 140], [270, 44, 96], [318, 34, 126], [358, 40, 86],
];

function Edificios({ y, cuerpo, v1, v2 }: { y: number; cuerpo: string; v1: string; v2: string }) {
  const piezas: React.ReactNode[] = [];
  EDIFICIOS.forEach(([x, w, h], i) => {
    piezas.push(<Rect key={`e${i}`} x={x} y={y - h} width={w} height={h} fill={cuerpo} />);
    for (let j = 0; j < Math.floor(h / 16); j++) {
      for (let k = 0; k < Math.floor(w / 12); k++) {
        if ((i + j + k) % 3 === 0) continue;
        piezas.push(
          <Rect key={`v${i}-${j}-${k}`} x={x + 5 + k * 12} y={y - h + 6 + j * 16} width={5} height={7} fill={(i + j + k) % 2 === 0 ? v1 : v2} opacity={0.85} />
        );
      }
    }
  });
  return <G>{piezas}</G>;
}

const ESTRELLAS: [number, number][] = [[20, 20], [60, 50], [95, 18], [140, 40], [190, 15], [230, 55], [270, 25], [320, 45], [360, 18], [385, 60], [45, 80], [210, 30]];

const FondoDecor = React.memo(function FondoDecor({ tipo, suelo }: { tipo: Decoracion; suelo: number }) {
  const y = suelo;
  switch (tipo) {
    case 'taller':
      return (
        <G>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Rect key={i} x={i * 50 + 2} y={0} width={46} height={y} fill="#ffffff" opacity={0.2} />
          ))}
          <Rect x={0} y={y - 70} width={400} height={5} fill="#64748b" opacity={0.35} />
          <Rect x={24} y={28} width={90} height={62} fill="#94a3b8" opacity={0.4} />
          <Rect x={296} y={24} width={72} height={66} fill="#38bdf8" opacity={0.25} />
          <Line x1={332} y1={24} x2={332} y2={90} stroke="#f8fafc" strokeWidth={3} opacity={0.6} />
        </G>
      );
    case 'atardecer':
      return (
        <G>
          <Circle cx={300} cy={y - 34} r={64} fill="#fde68a" opacity={0.25} />
          <Circle cx={300} cy={y - 34} r={38} fill="#fde68a" opacity={0.95} />
          <Path d={`M 0 ${y} L 0 ${y - 42} L 70 ${y - 88} L 130 ${y - 52} L 200 ${y - 98} L 280 ${y - 46} L 340 ${y - 78} L 400 ${y - 42} L 400 ${y} Z`} fill="#4c1d95" opacity={0.85} />
        </G>
      );
    case 'neon':
      return (
        <G>
          {ESTRELLAS.map(([sx, sy], i) => (
            <Circle key={i} cx={sx} cy={sy} r={1.3} fill="#ffffff" opacity={0.85} />
          ))}
          <Circle cx={330} cy={46} r={16} fill="#e9d5ff" opacity={0.9} />
          <Edificios y={y} cuerpo="#0b1020" v1="#ff2d95" v2="#22d3ee" />
        </G>
      );
    case 'ciudad':
      return (
        <G>
          <Ellipse cx={90} cy={44} rx={38} ry={11} fill="#ffffff" opacity={0.75} />
          <Ellipse cx={290} cy={64} rx={46} ry={12} fill="#ffffff" opacity={0.65} />
          <Edificios y={y} cuerpo="#64748b" v1="#e0f2fe" v2="#bae6fd" />
        </G>
      );
    case 'montana':
      return (
        <G>
          <Circle cx={70} cy={46} r={20} fill="#fef9c3" opacity={0.95} />
          <Path d={`M 0 ${y} L 0 ${y - 60} L 90 ${y - 120} L 170 ${y - 55} L 250 ${y - 130} L 340 ${y - 60} L 400 ${y - 90} L 400 ${y} Z`} fill="#64748b" />
          <Path d={`M 250 ${y - 130} L 226 ${y - 96} L 244 ${y - 100} L 252 ${y - 92} L 266 ${y - 104} Z`} fill="#f8fafc" />
          <Path d={`M 90 ${y - 120} L 68 ${y - 88} L 84 ${y - 92} L 92 ${y - 84} L 106 ${y - 96} Z`} fill="#f8fafc" />
          <Path d={`M 0 ${y} L 0 ${y - 30} Q 120 ${y - 70} 230 ${y - 30} T 400 ${y - 35} L 400 ${y} Z`} fill="#166534" opacity={0.9} />
        </G>
      );
    default: // desierto
      return (
        <G>
          <Circle cx={90} cy={56} r={30} fill="#fff7ed" opacity={0.95} />
          <Path d={`M 0 ${y} L 0 ${y - 34} Q 100 ${y - 84} 200 ${y - 38} T 400 ${y - 44} L 400 ${y} Z`} fill="#d97706" opacity={0.85} />
          <Path d={`M 0 ${y} L 0 ${y - 16} Q 130 ${y - 50} 260 ${y - 14} T 400 ${y - 20} L 400 ${y} Z`} fill="#b45309" opacity={0.9} />
          <Rect x={334} y={y - 62} width={7} height={46} rx={3} fill="#166534" />
          <Rect x={322} y={y - 48} width={5} height={20} rx={2} fill="#166534" />
          <Rect x={348} y={y - 52} width={5} height={22} rx={2} fill="#166534" />
        </G>
      );
  }
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
      case 'oscuro': return 'url(#metal)';
      case 'asiento': return '#0f172a';
      case 'cromo': return 'url(#cromo)';
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
        <LinearGradient id="brillo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.75} />
          <Stop offset="0.35" stopColor="#ffffff" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6b7280" />
          <Stop offset="0.5" stopColor="#1f2937" />
          <Stop offset="1" stopColor="#0b1220" />
        </LinearGradient>
        <LinearGradient id="cromo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.45" stopColor="#94a3b8" />
          <Stop offset="0.55" stopColor="#e2e8f0" />
          <Stop offset="1" stopColor="#64748b" />
        </LinearGradient>
        <RadialGradient id="sombra" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={400} height={240} fill="url(#cielo)" />
      <FondoDecor tipo={fondo.decoracion} suelo={modelo.suelo} />
      <Rect x={0} y={modelo.suelo - 1} width={400} height={240 - modelo.suelo + 1} fill={fondo.suelo} />
      <Rect x={0} y={modelo.suelo - 1} width={400} height={1.5} fill="#ffffff" opacity={0.25} />

      {!soloFondo && (
        <>
          <Ellipse cx={200} cy={modelo.suelo + 2} rx={190} ry={11} fill="url(#sombra)" />
          {modelo.ruedas.map((w, i) => (
            <Rueda key={i} cx={w.cx} cy={w.cy} r={w.r} estilo={estiloRin} color={rinColor} />
          ))}
          {modelo.lineas.map((l, i) => (
            <G key={i}>
              <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.rol === 'cromo' ? '#cbd5e1' : '#1f2937'} strokeWidth={l.ancho} strokeLinecap="round" />
              <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#ffffff" strokeOpacity={l.rol === 'cromo' ? 0.65 : 0.18} strokeWidth={l.ancho * 0.3} strokeLinecap="round" />
            </G>
          ))}
          {modelo.partes.map((p, i) => (
            <G key={i}>
              <Path
                d={p.d}
                fill={relleno(p.rol)}
                fillOpacity={p.rol === 'cristal' ? 0.5 : 1}
                stroke={p.rol === 'principal' || p.rol === 'acento' ? 'rgba(0,0,0,0.35)' : 'none'}
                strokeWidth={1.5}
              />
              {p.rol === 'principal' && acabado !== 'mate' && (
                <Path d={p.d} fill="url(#brillo)" opacity={acabado === 'metalico' ? 0.55 : 0.85} />
              )}
            </G>
          ))}
          <Circle cx={modelo.faro.cx} cy={modelo.faro.cy} r={modelo.faro.r * 2} fill="#fef08a" opacity={0.22} />
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

const MEZCLAS: Mezcla[] = ['normal', 'color', 'multiply', 'screen'];

function TrazoSvg({ t }: { t: Trazo }) {
  if (t.relleno) {
    return (
      <Path d={t.d} fill={t.color} fillOpacity={t.opacidad} stroke={t.color} strokeOpacity={t.opacidad} strokeWidth={1.5} strokeLinejoin="round" />
    );
  }
  return (
    <Path d={t.d} stroke={t.color} strokeWidth={t.ancho} strokeOpacity={t.opacidad} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );
}

const CapaBase = React.memo(function CapaBase(p: BaseProps) {
  const real = p.fuente === 'real' ? catalogoMotosReales.find((m) => m.id === p.realId) ?? null : null;
  const fuenteImg: any = p.fuente === 'foto' && p.fotoUri ? { uri: p.fotoUri } : real ? real.imagen : null;
  const tinte = !!real?.tintable;
  const imgStyle = { position: 'absolute' as const, top: 0, left: 0, width: p.width, height: p.height };

  return (
    // isolation: la mezcla de la pintura solo afecta a esta capa (moto + fondo)
    <View style={[{ width: p.width, height: p.height }, { isolation: 'isolate' } as any]}>
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
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
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
          style={{
            position: 'absolute',
            left: el.x * W,
            top: el.y * H,
            pointerEvents: 'none',
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
type Herramienta = 'pincel' | 'relleno' | 'borrador';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'moto', label: 'Moto', icon: 'motorbike' },
  { key: 'pintura', label: 'Pintura', icon: 'format-color-fill' },
  { key: 'rines', label: 'Rines', icon: 'tire' },
  { key: 'brocha', label: 'Brocha', icon: 'brush' },
  { key: 'fondo', label: 'Fondo', icon: 'image-filter-hdr' },
];

const HERRAMIENTAS: { id: Herramienta; nombre: string }[] = [
  { id: 'pincel', nombre: 'Pincel' },
  { id: 'relleno', nombre: 'Rellenar zona' },
  { id: 'borrador', nombre: 'Borrar trazo' },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const PAD = 14; // zona táctil de las manijas (dentro de los límites del elemento, para que funcione en Android)
const OFFSET = PAD + 3.5; // PAD + borde (1.5) + relleno (2): el contenido queda exactamente en (x, y)
type EditorStyles = ReturnType<typeof createStyles>;

const normalizarHex = (v: string) => {
  const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : null;
};

const construirPath = (pts: Pt[], cerrar = false) => {
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${Math.round((pts[0].x + 0.1) * 10) / 10} ${pts[0].y}`;
  const base = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return cerrar && pts.length > 2 ? `${base} Z` : base;
};

// Colores disponibles para stickers / textos / rines ya colocados
const coloresElemento = [
  ...coloresRin,
  ...coloresTexto.filter((h) => !coloresRin.some((c) => c.hex === h)).map((h) => ({ id: `t${h}`, nombre: h, hex: h })),
];

function ElementoArrastrable({
  item, activo, onActivar, W, H, styles,
}: { item: ElementoDiseno; activo: boolean; onActivar: () => void; W: number; H: number; styles: EditorStyles }) {
  const { theme } = useTheme();
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
            <Ionicons name="close" size={16} color={theme.onPrimary} />
          </TouchableOpacity>
          <View style={[styles.manija, styles.manijaRotar, inv]} {...rotar.panHandlers}>
            <Ionicons name="sync" size={14} color={theme.onPrimary} />
          </View>
          <View style={[styles.manija, styles.manijaEscalar, inv]} {...escalar.panHandlers}>
            <Ionicons name="resize" size={14} color={theme.onPrimary} />
          </View>
        </>
      )}
    </View>
  );
}

function FilaColores({
  colores, valor, onElegir, onBorrar, styles,
}: {
  colores: { id: string; hex: string }[];
  valor: string;
  onElegir: (hex: string) => void;
  onBorrar?: (hex: string) => void;
  styles: EditorStyles;
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
  icono, texto, onPress, destacado, styles,
}: { icono: string; texto: string; onPress: () => void; destacado?: boolean; styles: EditorStyles }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity style={[styles.accion, destacado && styles.accionDestacada]} onPress={onPress}>
      <Ionicons name={icono as any} size={20} color={destacado ? theme.onPrimary : theme.textPrimary} />
      <Text style={[styles.accionTexto, destacado && { color: theme.onPrimary }]}>{texto}</Text>
    </TouchableOpacity>
  );
}

function Chip({
  texto, activo, onPress, styles, color,
}: { texto: string; activo: boolean; onPress: () => void; styles: EditorStyles; color: string }) {
  return (
    <TouchableOpacity style={[styles.chip, activo && styles.chipActivo]} onPress={onPress}>
      <Text style={[styles.chipTexto, activo && { color, fontWeight: 'bold' }]}>{texto}</Text>
    </TouchableOpacity>
  );
}

export default function SimuladorEditorScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const d = useDiseno();
  const { width } = useWindowDimensions();
  const W = Math.min(width - 24, 560);
  const H = W * 0.6;

  const lienzoRef = useRef<View>(null);
  const [tab, setTab] = useState<Tab>((route?.params?.tab as Tab) ?? 'moto');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalGuardar, setModalGuardar] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalCompartirWeb, setModalCompartirWeb] = useState(false);
  const [nombreInput, setNombreInput] = useState('');
  const [hexInput, setHexInput] = useState('');

  // brocha
  const [brochaColor, setBrochaColor] = useState(d.colorPrincipal);
  const [grosorId, setGrosorId] = useState('medio');
  const [opacidadId, setOpacidadId] = useState('translucido');
  const [herramienta, setHerramienta] = useState<Herramienta>('pincel');
  const [realista, setRealista] = useState(true);
  const [vivo, setVivo] = useState<Trazo | null>(null);
  const puntos = useRef<Pt[]>([]);
  const config = useRef({ color: brochaColor, ancho: 9, opacidad: 0.6, relleno: false, mezcla: 'normal' as Mezcla, herramienta });
  config.current = {
    color: brochaColor,
    ancho: GROSORES.find((g) => g.id === grosorId)?.ancho ?? 9,
    opacidad: OPACIDADES.find((o) => o.id === opacidadId)?.valor ?? 0.6,
    relleno: herramienta === 'relleno',
    mezcla: mezclaPara(brochaColor, realista),
    herramienta,
  };
  const dims = useRef({ W, H });
  dims.current = { W, H };

  const nombreMoto = nombreDeMoto(d);
  const editando = d.disenoId !== null && d.garaje.some((g) => g.id === d.disenoId);
  const coloresPintura = [...catalogoColores, ...d.paleta.map((hex) => ({ id: `p${hex}`, hex }))];
  const motoReal = d.fuente === 'real' ? catalogoMotosReales.find((m) => m.id === d.realId) : null;
  const elActivo = d.elementos.find((e) => e.id === activeId) ?? null;

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
      if (Platform.OS === 'web') {
        setModalCompartirWeb(true);
        navigation.setParams({ accion: undefined });
      } else {
        const id = setTimeout(() => {
          compartir();
          navigation.setParams({ accion: undefined });
        }, 400);
        return () => clearTimeout(id);
      }
    }
  }, [route?.params?.accion]);

  // ---------- brocha ----------
  const aVista = (px: number, py: number): Pt => ({
    x: Math.round(((px * 400) / dims.current.W) * 10) / 10,
    y: Math.round(((py * 240) / dims.current.H) * 10) / 10,
  });

  const borrarEn = (p: Pt) => {
    const id = trazoEnPunto(getEstado().trazos, p);
    if (id) eliminarTrazo(id);
  };

  const trazoVivo = (): Trazo => {
    const { color, ancho, opacidad, relleno, mezcla } = config.current;
    return { id: 'vivo', color, ancho, opacidad, relleno, mezcla, d: construirPath(puntos.current, relleno) };
  };

  const terminarTrazo = () => {
    const c = config.current;
    const pts = puntos.current;
    puntos.current = [];
    setVivo(null);
    if (c.herramienta === 'borrador' || pts.length === 0) return;
    if (c.relleno && pts.length < 3) return; // una zona necesita al menos 3 puntos
    agregarTrazo({
      color: c.color, ancho: c.ancho, opacidad: c.opacidad, relleno: c.relleno, mezcla: c.mezcla,
      d: construirPath(pts, c.relleno),
    });
  };

  const dibujar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const p = aVista(e.nativeEvent.locationX, e.nativeEvent.locationY);
        if (config.current.herramienta === 'borrador') { borrarEn(p); return; }
        puntos.current = [p];
        setVivo(trazoVivo());
      },
      onPanResponderMove: (e) => {
        const p = aVista(e.nativeEvent.locationX, e.nativeEvent.locationY);
        if (config.current.herramienta === 'borrador') { borrarEn(p); return; }
        const ult = puntos.current[puntos.current.length - 1];
        if (ult && Math.hypot(p.x - ult.x, p.y - ult.y) < 1.5) return;
        puntos.current.push(p);
        setVivo(trazoVivo());
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

  const elegirColorPrincipal = (hex: string) => {
    setEstado({ colorPrincipal: hex });
    if (d.fuente !== 'vector') setBrochaColor(hex); // en fotos, el color elegido se usa con la brocha
  };

  const irAPintarFoto = () => {
    setBrochaColor(d.colorPrincipal);
    setHerramienta('relleno');
    setTab('brocha');
  };

  // ---------- compartir / galería ----------
  const capturar = async (opciones: any) => {
    if (!captureRef) throw new Error('view-shot no instalado');
    setActiveId(null);
    await new Promise((r) => setTimeout(r, 80));
    return captureRef(lienzoRef, opciones);
  };

  const compartir = async () => {
    const mensaje = describirDiseno(d);

    if (Platform.OS === 'web') {
      const browser = globalThis as any;
      const webNavigator = browser.navigator;
      const archivoPrueba = typeof browser.File === 'function'
        ? new browser.File([''], 'ridersmx.png', { type: 'image/png' })
        : null;
      const puedeCompartirArchivo = !!(
        webNavigator?.share && archivoPrueba && webNavigator.canShare?.({ files: [archivoPrueba] })
      );
      const pestanaWhatsapp = !puedeCompartirArchivo && !webNavigator?.share
        ? browser.open('about:blank', '_blank')
        : null;

      try {
        const uri = await capturar({ format: 'png', quality: 1, result: 'data-uri' });
        const blob = await (await fetch(uri)).blob();
        const archivo = new browser.File([blob], 'mi-moto-ridersmx.png', { type: 'image/png' });

        if (webNavigator?.share && webNavigator.canShare?.({ files: [archivo] })) {
          await webNavigator.share({ files: [archivo], title: `Mi ${nombreMoto} en RidersMX`, text: mensaje });
          if (pestanaWhatsapp) pestanaWhatsapp.close?.();
          setModalCompartirWeb(false);
          return;
        }

        // Navegador de escritorio: descarga la imagen y abre WhatsApp Web con el texto listo.
        const enlace = document.createElement('a');
        enlace.href = uri;
        enlace.download = 'mi-moto-ridersmx.png';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        if (webNavigator?.share) {
          await webNavigator.share({ title: `Mi ${nombreMoto} en RidersMX`, text: mensaje });
        } else {
          const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
          if (pestanaWhatsapp) pestanaWhatsapp.location.href = urlWhatsapp;
          else browser.location.assign(urlWhatsapp);
        }
        setModalCompartirWeb(false);
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        if (pestanaWhatsapp) pestanaWhatsapp.close?.();
        browser.alert?.('No se pudo compartir la imagen automáticamente. Usa “Descargar para Instagram” y adjunta el PNG en la red social.');
        setModalCompartirWeb(false);
        return;
      }
    }

    // En Android/iOS abre el menú del sistema con las aplicaciones compatibles,
    // por ejemplo WhatsApp o Instagram si están instaladas.
    if (captureRef && Sharing && (await Sharing.isAvailableAsync())) {
      try {
        const uri = await capturar({ format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Mi ${nombreMoto} en RidersMX` });
        return;
      } catch {
        // continúa con el envío de texto como alternativa
      }
    }

    try {
      await Share.share({ message: mensaje });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el diseño.');
    }
  };

  const descargarParaInstagramWeb = async () => {
    const browser = globalThis as any;
    const pestanaInstagram = browser.open('https://www.instagram.com/', '_blank');
    try {
      const uri = await capturar({ format: 'png', quality: 1, result: 'data-uri' });
      const enlace = document.createElement('a');
      enlace.href = uri;
      enlace.download = 'mi-moto-ridersmx.png';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setModalCompartirWeb(false);
      browser.alert?.('La imagen se descargó. En Instagram, crea una publicación y selecciona mi-moto-ridersmx.png.');
      if (!pestanaInstagram) browser.open('https://www.instagram.com/', '_blank');
    } catch {
      if (pestanaInstagram) pestanaInstagram.close?.();
      browser.alert?.('No se pudo descargar la imagen. Intenta compartir desde la aplicación móvil.');
    }
  };

  const descargar = async () => {
    if (Platform.OS === 'web') {
      try {
        const uri = await capturar({ format: 'png', quality: 1, result: 'data-uri' });
        const enlace = document.createElement('a');
        enlace.href = uri;
        enlace.download = 'mi-moto-ridersmx.png';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        (globalThis as any).alert?.('Se descargó mi-moto-ridersmx.png.');
      } catch {
        (globalThis as any).alert?.('No se pudo generar la imagen. Intenta de nuevo.');
      }
      return;
    }

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

  const confirmarNuevo = () => setModalNuevo(true);

  const empezarNuevoDiseno = () => {
    setModalNuevo(false);
    setActiveId(null);
    nuevoDiseno();
  };

  const confirmarQuitarFoto = () =>
    Alert.alert('Quitar foto', '¿Volver a una moto del catálogo? Tus stickers y trazos se conservan.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: quitarFoto },
    ]);

  // ---------- pantalla ----------
  const avisoPintura =
    d.fuente === 'foto'
      ? 'En tu foto el color no cambia solo. Elige un color y usa "Pintar mi moto con este color": rellena la zona que dibujes (tanque, carenado…) con un tinte realista que conserva brillos y sombras.'
      : d.fuente === 'real' && !motoReal?.tintable
      ? 'Esta foto real conserva sus colores originales. Usa la brocha en modo "Rellenar zona" para probar tonos, o agrega rines y stickers.'
      : null;

  const notaBrocha =
    herramienta === 'relleno'
      ? 'Rodea con el dedo la pieza que quieres pintar (tanque, carenado, etc.). Al soltar, la zona se rellena. Para más precisión haz varias zonas pequeñas.'
      : herramienta === 'borrador'
      ? 'Toca o desliza sobre un trazo para borrarlo. Las zonas rellenas se borran al tocar dentro de ellas.'
      : 'Pinta trazos encima de la imagen. Usa grosor fino para detalles y líneas limpias.';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo} numberOfLines={1}>{d.nombre || nombreMoto}</Text>
        <TouchableOpacity onPress={compartir} style={styles.iconBtn}>
          <Ionicons name="share-social" size={26} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={abrirModalGuardar} style={styles.iconBtn}>
          <Ionicons name="save" size={28} color={theme.successText} />
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
              styles={styles}
            />
          ))}
          {tab === 'brocha' && <View style={StyleSheet.absoluteFill} {...dibujar.panHandlers} />}
        </View>
      </View>

      <View style={styles.acciones}>
        <Accion icono="add-circle" texto="Stickers" onPress={() => navigation.navigate('SimuladorLibreria', { tab: 'stickers' })} destacado styles={styles} />
        <Accion icono="albums" texto="Garaje" onPress={() => navigation.navigate('SimuladorLibreria', { tab: 'garaje' })} styles={styles} />
        <Accion icono="download" texto="Galería" onPress={descargar} styles={styles} />
        <Accion icono="refresh" texto="Nuevo" onPress={confirmarNuevo} styles={styles} />
      </View>

      {/* barra del elemento seleccionado */}
      {elActivo && (
        <View style={styles.barraEl}>
          <View style={styles.barraElFila}>
            <Text style={styles.barraElTexto} numberOfLines={1}>
              {elActivo.tipo === 'texto' ? `Texto "${elActivo.texto}"` : elActivo.tipo === 'rin' ? 'Rin' : 'Sticker'}
            </Text>
            <Accion icono="copy" texto="Duplicar" onPress={() => duplicarElemento(elActivo.id)} styles={styles} />
            <Accion icono="arrow-up-circle" texto="Al frente" onPress={() => traerAlFrente(elActivo.id)} styles={styles} />
            <Accion
              icono="trash"
              texto="Quitar"
              onPress={() => { eliminarElemento(elActivo.id); setActiveId(null); }}
              styles={styles}
            />
          </View>
          <FilaColores
            colores={coloresElemento}
            valor={elActivo.color}
            onElegir={(hex) => actualizarElemento(elActivo.id, { color: hex })}
            styles={styles}
          />
        </View>
      )}

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActivo]} onPress={() => setTab(t.key)}>
            <MaterialCommunityIcons name={t.icon as any} size={22} color={tab === t.key ? theme.primary : theme.textSecondary} />
            <Text style={[styles.tabTexto, tab === t.key && { color: theme.primary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* ---------- MOTO ---------- */}
        {tab === 'moto' && (
          <>
            <Text style={styles.etiqueta}>Tu moto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
                {d.fotoUri ? (
                <TouchableOpacity
                  style={[styles.tarjeta, d.fuente === 'foto' && styles.tarjetaActiva]}
                  onPress={() => setEstado({ fuente: 'foto' })}
                >
                  <Image source={{ uri: d.fotoUri }} style={{ width: 140, height: 84, borderRadius: 8 }} resizeMode="cover" />
                    <Text style={styles.tarjetaTitulo}>Mi moto</Text>
                    <Text style={styles.tarjetaSub}>Toca para cambiar la foto</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.tarjeta, styles.tarjetaFoto]}
                    onPress={() => {
                      void pedirFotoMoto().catch((error: unknown) => {
                        Alert.alert('No se pudo seleccionar la foto', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
                      });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Subir una foto de mi moto"
                  >
                    <Ionicons name="camera" size={34} color={theme.primary} />
                    <Text style={styles.tarjetaTitulo}>Mi moto</Text>
                    <Text style={styles.tarjetaSub}>Sube una foto</Text>
                  </TouchableOpacity>
                )}
            </ScrollView>
            {d.fotoUri && (
              <View style={styles.fila}>
                <Accion icono="close-circle" texto="Quitar mi foto" onPress={confirmarQuitarFoto} styles={styles} />
              </View>
            )}
            <Text style={styles.nota}>
              Tip: para mejores resultados toma la foto de lado, con la moto completa y buena luz.
            </Text>

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
            <FilaColores colores={coloresPintura} valor={d.colorPrincipal} onElegir={(hex) => setEstado({ colorPrincipal: hex })} onBorrar={borrarColor} styles={styles} />
            <Text style={styles.etiqueta}>Color de acento</Text>
            <FilaColores colores={coloresPintura} valor={d.colorAcento} onElegir={(hex) => setEstado({ colorAcento: hex })} onBorrar={borrarColor} styles={styles} />
            <Text style={styles.etiqueta}>Acabado</Text>
            <View style={styles.fila}>
              {acabados.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.chip, d.acabado === a.id && styles.chipActivo]}
                  onPress={() => setEstado({ acabado: a.id })}
                >
                  <Text style={[styles.chipTexto, d.acabado === a.id && { color: theme.primary, fontWeight: 'bold' }]}>{a.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.etiqueta}>Crear mi color (hex, ej. #ff8800)</Text>
            <View style={[styles.fila, { alignItems: 'center' }]}>
              <View style={[styles.colorCircle, { backgroundColor: normalizarHex(hexInput) ?? theme.border }]} />
              <TextInput
                style={styles.input}
                value={hexInput}
                onChangeText={setHexInput}
                placeholder="#ff8800"
                placeholderTextColor={theme.iconSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
              />
              <TouchableOpacity style={styles.botonAgregar} onPress={guardarColor}>
                <Ionicons name="add" size={24} color={theme.onPrimary} />
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
                Toca un rin para ponerlo sobre tu moto. Arrástralo hasta la rueda y ajusta el tamaño con la manija inferior (agrega uno por rueda).
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
            <FilaColores colores={coloresRin} valor={d.rinColor} onElegir={(hex) => setEstado({ rinColor: hex })} styles={styles} />
          </>
        )}

        {/* ---------- BROCHA ---------- */}
        {tab === 'brocha' && (
          <>
            <Text style={styles.nota}>Dibuja directo sobre la moto para pintar zonas: carrocería, rines, detalles.</Text>
            <Text style={styles.etiqueta}>Color de la brocha</Text>
            <FilaColores colores={coloresPintura} valor={brochaColor} onElegir={setBrochaColor} styles={styles} />
            <Text style={styles.etiqueta}>Grosor</Text>
            <View style={styles.fila}>
              {GROSORES.map((g) => (
                <TouchableOpacity key={g.id} style={[styles.chip, grosorId === g.id && styles.chipActivo]} onPress={() => setGrosorId(g.id)}>
                  <Text style={[styles.chipTexto, grosorId === g.id && { color: theme.primary, fontWeight: 'bold' }]}>{g.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.etiqueta}>Intensidad</Text>
            <View style={styles.fila}>
              {OPACIDADES.map((o) => (
                <TouchableOpacity key={o.id} style={[styles.chip, opacidadId === o.id && styles.chipActivo]} onPress={() => setOpacidadId(o.id)}>
                  <Text style={[styles.chipTexto, opacidadId === o.id && { color: theme.primary, fontWeight: 'bold' }]}>{o.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {herramienta !== 'borrador' && (
              <>
                <Text style={styles.etiqueta}>Color de la brocha</Text>
                <FilaColores colores={coloresPintura} valor={brochaColor} onElegir={setBrochaColor} styles={styles} />
                <Text style={styles.etiqueta}>Efecto</Text>
                <View style={styles.fila}>
                  <Chip texto="Realista (tinte)" activo={realista} onPress={() => setRealista(true)} styles={styles} color={theme.primary} />
                  <Chip texto="Pintura normal" activo={!realista} onPress={() => setRealista(false)} styles={styles} color={theme.primary} />
                </View>
                {herramienta === 'pincel' && (
                  <>
                    <Text style={styles.etiqueta}>Grosor</Text>
                    <View style={styles.fila}>
                      {GROSORES.map((g) => (
                        <Chip key={g.id} texto={g.nombre} activo={grosorId === g.id} onPress={() => setGrosorId(g.id)} styles={styles} color={theme.primary} />
                      ))}
                    </View>
                  </>
                )}
                <Text style={styles.etiqueta}>Intensidad</Text>
                <View style={styles.fila}>
                  {OPACIDADES.map((o) => (
                    <Chip key={o.id} texto={o.nombre} activo={opacidadId === o.id} onPress={() => setOpacidadId(o.id)} styles={styles} color={theme.primary} />
                  ))}
                </View>
              </>
            )}
            <View style={[styles.fila, { gap: 10 }]}>
              <Accion icono="arrow-undo" texto="Deshacer" onPress={deshacerTrazo} styles={styles} />
              <Accion icono="trash" texto="Borrar todo" onPress={confirmarBorrarTrazos} styles={styles} />
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
              placeholderTextColor={theme.iconSecondary}
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

      <Modal visible={modalNuevo} transparent animationType="fade" onRequestClose={() => setModalNuevo(false)}>
        <Pressable style={styles.modalFondo} onPress={() => setModalNuevo(false)}>
          <Pressable style={styles.modalCaja} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitulo}>Empezar un diseño nuevo</Text>
            <Text style={styles.nota}>El diseño actual sin guardar se reemplazará. Si quieres conservarlo, guárdalo primero en tu garaje.</Text>
            <View style={[styles.modalBotones, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <TouchableOpacity style={styles.botonGris} onPress={() => setModalNuevo(false)}>
                <Text style={styles.botonGrisTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonAzul} onPress={empezarNuevoDiseno}>
                <Text style={styles.botonAzulTexto}>Empezar de nuevo</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalCompartirWeb} transparent animationType="fade" onRequestClose={() => setModalCompartirWeb(false)}>
        <Pressable style={styles.modalFondo} onPress={() => setModalCompartirWeb(false)}>
          <Pressable style={styles.modalCaja} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitulo}>Compartir diseño</Text>
            <Text style={styles.nota}>
              En móvil se abrirán las aplicaciones compatibles. En computadora puedes enviar por WhatsApp o descargar la imagen para subirla a Instagram.
            </Text>
            <View style={[styles.modalBotones, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <TouchableOpacity style={styles.botonGris} onPress={() => setModalCompartirWeb(false)}>
                <Text style={styles.botonGrisTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonAzul} onPress={descargarParaInstagramWeb}>
                <Text style={styles.botonAzulTexto}>Preparar Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonAzul} onPress={compartir}>
                <Text style={styles.botonAzulTexto}>Compartir imagen</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: Theme) {
return StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card },
  iconBtn: { padding: 5, marginHorizontal: 2 },
  titulo: { flex: 1, fontSize: 20, fontWeight: 'bold', color: theme.textPrimary, marginLeft: 8 },
  canvas: { alignItems: 'center', paddingVertical: 12, backgroundColor: theme.cardHeader },

  elementoBorde: { borderWidth: 1.5, borderColor: 'transparent', padding: 2 },
  elementoBordeActivo: { borderColor: theme.primary, borderStyle: 'dashed', backgroundColor: `${theme.primary}20` },
  manija: { position: 'absolute', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.onPrimary, zIndex: 20 },
  manijaEliminar: { top: 0, left: 0, backgroundColor: theme.dangerText },
  manijaRotar: { top: 0, right: 0, backgroundColor: theme.primary },
  manijaEscalar: { bottom: 0, right: 0, backgroundColor: theme.successText },

  acciones: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.cardHeader },
  accionDestacada: { backgroundColor: theme.primary },
  accionTexto: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  barraEl: { backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 8 },
  barraElFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8 },
  barraElTexto: { flexShrink: 1, color: theme.textPrimary, fontSize: 13, fontWeight: '700', paddingHorizontal: 8 },

  tabs: { flexDirection: 'row', backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActivo: { borderBottomWidth: 3, borderBottomColor: theme.primary },
  tabTexto: { fontSize: 11, color: theme.textSecondary, marginTop: 2, fontWeight: '600' },

  panel: { flex: 1, backgroundColor: theme.card },
  fila: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row' },
  etiqueta: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 12, marginLeft: 16 },
  nota: { fontSize: 12, color: theme.textSecondary, backgroundColor: theme.cardHeader, padding: 10, borderRadius: 8, marginHorizontal: 16, marginTop: 12 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: theme.border },
  colorSeleccionado: { borderColor: theme.primary, borderWidth: 3 },

  tarjeta: { alignItems: 'center', padding: 8, marginRight: 12, borderRadius: 14, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.background },
  tarjetaFoto: { width: 140, height: 84, borderRadius: 8, backgroundColor: theme.cardHeader, justifyContent: 'center', alignItems: 'center' },
  tarjetaRin: { alignItems: 'center', padding: 8, marginRight: 12, borderRadius: 14, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.background, width: 92 },
  tarjetaActiva: { borderColor: theme.primary, backgroundColor: `${theme.primary}15` },
  tarjetaTitulo: { fontSize: 14, fontWeight: 'bold', color: theme.textPrimary, marginTop: 4 },
  tarjetaSub: { fontSize: 11, color: theme.textSecondary, textAlign: 'center' },

  chip: { paddingHorizontal: 18, paddingVertical: 10, marginRight: 10, borderRadius: 20, backgroundColor: theme.cardHeader, borderWidth: 1, borderColor: theme.border },
  chipActivo: { borderColor: theme.primary, backgroundColor: `${theme.primary}15` },
  chipTexto: { fontSize: 14, color: theme.textSecondary },

  input: { flex: 1, height: 44, backgroundColor: theme.background, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: theme.textPrimary },
  botonAgregar: { width: 44, height: 44, marginLeft: 10, borderRadius: 22, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },

  fondoChip: { width: 96, height: 84, marginRight: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: theme.border },
  fondoNombre: { position: 'absolute', bottom: 16, alignSelf: 'center', fontSize: 11, fontWeight: 'bold', color: theme.onPrimary, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },

  modalFondo: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', padding: 24 },
  modalCaja: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 12 },
  modalInput: { height: 46, backgroundColor: theme.background, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: theme.textPrimary },
  modalBotones: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  botonGris: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.cardHeader },
  botonGrisTexto: { color: theme.textSecondary, fontWeight: '600' },
  botonAzul: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.primary },
  botonAzulTexto: { color: theme.onPrimary, fontWeight: 'bold' },
});
}
