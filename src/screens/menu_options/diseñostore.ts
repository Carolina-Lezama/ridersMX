import { useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Acabado, EstiloRin, TipoElemento, catalogoColores, catalogoMotos, catalogoMotosReales, catalogoRines,
} from './catalogos';

// Módulos opcionales: si no están instalados, esa función se desactiva sin romper la app
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = null;
}

let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system/legacy');
} catch {
  try {
    FileSystem = require('expo-file-system');
  } catch {
    FileSystem = null;
  }
}

const K_BORRADOR = '@ridersmx/simulador/borrador';
const K_GARAJE = '@ridersmx/simulador/garaje';

// Posición en fracciones del lienzo (0..1): el diseño se ve igual en cualquier pantalla
export type ElementoDiseno = {
  id: string;
  tipo: TipoElemento;
  icono?: string; // sticker
  texto?: string; // texto / número
  rinEstilo?: EstiloRin; // rin superpuesto sobre una foto
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

// Trazo de brocha, en coordenadas del lienzo vectorial (400 x 240)
export type Trazo = {
  id: string;
  color: string;
  ancho: number;
  opacidad: number;
  d: string;
};

export type FuenteMoto = 'vector' | 'real' | 'foto';

export type Diseno = {
  fuente: FuenteMoto; // vector = catálogo dibujado | real = imagen del catálogo | foto = moto del usuario
  motoId: string;
  realId: string | null;
  fotoUri: string | null;
  colorPrincipal: string;
  colorAcento: string;
  acabado: Acabado;
  rinId: string;
  rinColor: string;
  fondoId: string;
  elementos: ElementoDiseno[];
  trazos: Trazo[];
};

export type DisenoGuardado = {
  id: string;
  nombre: string;
  creado: number;
  actualizado: number;
  diseno: Diseno;
};

type Estado = Diseno & {
  disenoId: string | null; // diseño del garaje que se está editando
  nombre: string;
  garaje: DisenoGuardado[];
  paleta: string[]; // colores creados por el usuario
  ultimoAgregado: string | null;
};

const disenoInicial: Diseno = {
  fuente: 'vector',
  motoId: 'm1',
  realId: null,
  fotoUri: null,
  colorPrincipal: '#ef4444',
  colorAcento: '#0f172a',
  acabado: 'brillante',
  rinId: 'r1',
  rinColor: '#cbd5e1',
  fondoId: 'taller',
  elementos: [],
  trazos: [],
};

let estado: Estado = {
  ...disenoInicial,
  disenoId: null,
  nombre: '',
  garaje: [],
  paleta: [],
  ultimoAgregado: null,
};

const listeners = new Set<() => void>();
const emitir = () => listeners.forEach((l) => l());

export const getEstado = () => estado;
export const suscribir = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const useDiseno = () => useSyncExternalStore(suscribir, getEstado);

const extraerDiseno = (e: Estado): Diseno => ({
  fuente: e.fuente,
  motoId: e.motoId,
  realId: e.realId,
  fotoUri: e.fotoUri,
  colorPrincipal: e.colorPrincipal,
  colorAcento: e.colorAcento,
  acabado: e.acabado,
  rinId: e.rinId,
  rinColor: e.rinColor,
  fondoId: e.fondoId,
  elementos: e.elementos,
  trazos: e.trazos,
});

// ---------- textos útiles ----------
export function nombreDeMoto(d: Diseno): string {
  if (d.fuente === 'foto') return 'Mi moto';
  if (d.fuente === 'real') return catalogoMotosReales.find((m) => m.id === d.realId)?.nombre ?? 'Moto';
  return catalogoMotos.find((m) => m.id === d.motoId)?.nombre ?? 'Moto';
}

export function describirDiseno(d: Diseno): string {
  const extras = `${d.elementos.length} stickers/textos y ${d.trazos.length} trazos de pintura`;
  if (d.fuente === 'foto') return `Mira mi moto personalizada en RidersMX: ${extras}.`;
  const color = catalogoColores.find((c) => c.hex === d.colorPrincipal)?.nombre ?? 'personalizado';
  const rin = catalogoRines.find((r) => r.id === d.rinId)?.nombre ?? '';
  const rines = d.fuente === 'vector' ? `, rines ${rin}` : '';
  return `Mira cómo quedó mi ${nombreDeMoto(d)} en RidersMX: color ${color} (${d.acabado})${rines}, ${extras}.`;
}

// ---------- persistencia ----------
let timer: ReturnType<typeof setTimeout> | undefined;
function persistirBorrador() {
  if (!AsyncStorage) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const data = {
      ...extraerDiseno(estado),
      disenoId: estado.disenoId,
      nombre: estado.nombre,
      paleta: estado.paleta,
    };
    AsyncStorage.setItem(K_BORRADOR, JSON.stringify(data)).catch(() => {});
  }, 500);
}

const persistirGaraje = () => {
  if (!AsyncStorage) return;
  AsyncStorage.setItem(K_GARAJE, JSON.stringify(estado.garaje)).catch(() => {});
};

let cargado = false;
export async function cargarAlmacen() {
  if (cargado || !AsyncStorage) return;
  cargado = true;
  try {
    const [b, g] = await Promise.all([AsyncStorage.getItem(K_BORRADOR), AsyncStorage.getItem(K_GARAJE)]);
    const parcial: Partial<Estado> = {};
    if (b) Object.assign(parcial, JSON.parse(b));
    if (g) parcial.garaje = (JSON.parse(g) as DisenoGuardado[]).map((x) => ({ ...x, diseno: { ...disenoInicial, ...x.diseno } }));
    estado = { ...estado, ...parcial };
    emitir();
  } catch {
    // si falla la lectura se arranca con el diseño inicial
  }
}

export const hayPersistencia = () => AsyncStorage !== null;

// ---------- edición ----------
export function setEstado(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  emitir();
  persistirBorrador();
}

export function agregarElemento(
  base: Omit<ElementoDiseno, 'id' | 'x' | 'y' | 'scale' | 'rotation'>
) {
  const offset = (estado.elementos.length % 4) * 0.04;
  const nuevo: ElementoDiseno = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...base,
    x: 0.42 + offset,
    y: 0.28 + offset,
    scale: 1,
    rotation: 0,
  };
  setEstado({ elementos: [...estado.elementos, nuevo], ultimoAgregado: nuevo.id });
}

export function actualizarElemento(id: string, parcial: Partial<ElementoDiseno>) {
  setEstado({ elementos: estado.elementos.map((e) => (e.id === id ? { ...e, ...parcial } : e)) });
}

export function eliminarElemento(id: string) {
  setEstado({ elementos: estado.elementos.filter((e) => e.id !== id) });
}

// ---------- brocha ----------
export function agregarTrazo(t: Omit<Trazo, 'id'>) {
  const nuevo: Trazo = { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...t };
  setEstado({ trazos: [...estado.trazos, nuevo] });
}

export function deshacerTrazo() {
  setEstado({ trazos: estado.trazos.slice(0, -1) });
}

export function borrarTrazos() {
  setEstado({ trazos: [] });
}

// ---------- paleta propia ----------
export function agregarColorPaleta(hex: string) {
  if (estado.paleta.includes(hex)) return;
  setEstado({ paleta: [hex, ...estado.paleta].slice(0, 12) });
}

export function quitarColorPaleta(hex: string) {
  setEstado({ paleta: estado.paleta.filter((h) => h !== hex) });
}

// ---------- moto del usuario (foto) ----------
// Copia la foto a una carpeta permanente (si expo-file-system está disponible) para que
// no se pierda cuando el sistema limpie el caché del selector de imágenes.
async function guardarFotoPermanente(uri: string): Promise<string> {
  try {
    if (!FileSystem?.documentDirectory || !FileSystem.copyAsync) return uri;
    const ext = (uri.split('.').pop() || 'jpg').split('?')[0].slice(0, 4);
    const destino = `${FileSystem.documentDirectory}moto-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: destino });
    return destino;
  } catch {
    return uri;
  }
}

// Abre la galería y usa la foto como moto. Si nuevo = true empieza un diseño en limpio.
export async function pedirFotoMoto(nuevo = false): Promise<boolean> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir tu moto.');
    return false;
  }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [5, 3], // mismo formato que el lienzo
  });
  if (r.canceled || !r.assets?.length) return false;
  const uri = await guardarFotoPermanente(r.assets[0].uri);
  if (nuevo) nuevoDiseno({ fuente: 'foto', fotoUri: uri });
  else setEstado({ fuente: 'foto', fotoUri: uri });
  return true;
}

// ---------- garaje ----------
export function guardarEnGaraje(nombre: string, comoNuevo = false) {
  const base = extraerDiseno(estado);
  const ahora = Date.now();
  let garaje = estado.garaje;
  let id = estado.disenoId;

  if (id && !comoNuevo && garaje.some((g) => g.id === id)) {
    garaje = garaje.map((g) => (g.id === id ? { ...g, nombre, diseno: base, actualizado: ahora } : g));
  } else {
    id = `d-${ahora}-${Math.random().toString(36).slice(2, 6)}`;
    garaje = [{ id, nombre, creado: ahora, actualizado: ahora, diseno: base }, ...garaje];
  }
  setEstado({ garaje, disenoId: id, nombre });
  persistirGaraje();
}

export function eliminarDeGaraje(id: string) {
  const garaje = estado.garaje.filter((g) => g.id !== id);
  setEstado({ garaje, disenoId: estado.disenoId === id ? null : estado.disenoId });
  persistirGaraje();
}

export function abrirDiseno(id: string) {
  const g = estado.garaje.find((x) => x.id === id);
  if (!g) return;
  setEstado({
    ...disenoInicial,
    ...g.diseno,
    elementos: g.diseno.elementos.map((e) => ({ ...e })),
    trazos: g.diseno.trazos.map((t) => ({ ...t })),
    disenoId: g.id,
    nombre: g.nombre,
    ultimoAgregado: null,
  });
}

export function nuevoDiseno(parcial: Partial<Diseno> = {}) {
  setEstado({
    ...disenoInicial,
    elementos: [],
    trazos: [],
    ...parcial,
    disenoId: null,
    nombre: '',
    ultimoAgregado: null,
  });
}