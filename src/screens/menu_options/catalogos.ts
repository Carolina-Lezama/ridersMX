export type TipoElemento = 'sticker' | 'texto' | 'rin';

export type ItemCatalogo = {
  id: string;
  nombre: string;
  icono: string; // nombre de MaterialCommunityIcons
  color: string;
};

export type ColorPintura = {
  id: string;
  nombre: string;
  hex: string; // siempre 6 dígitos: #rrggbb
  grupo: 'Clásicos' | 'Neón' | 'Metálicos';
};

export type Acabado = 'brillante' | 'mate' | 'metalico';

export const acabados: { id: Acabado; nombre: string }[] = [
  { id: 'brillante', nombre: 'Brillante' },
  { id: 'mate', nombre: 'Mate' },
  { id: 'metalico', nombre: 'Metálico' },
];

// ---------- motos predeterminadas (vectores, viewBox 400 x 240) ----------
// Cada pieza tiene un "rol" que decide cómo se pinta:
//  principal -> color elegido (con acabado) | acento -> segundo color
//  oscuro / asiento / cristal / cromo -> fijos
export type RolParte = 'principal' | 'acento' | 'oscuro' | 'asiento' | 'cristal' | 'cromo';

export type ModeloMoto = {
  id: string;
  nombre: string;
  descripcion: string;
  suelo: number; // y del piso
  ruedas: { cx: number; cy: number; r: number }[]; // [trasera, delantera]
  lineas: { x1: number; y1: number; x2: number; y2: number; ancho: number; rol: 'cromo' | 'oscuro' }[];
  partes: { d: string; rol: RolParte }[];
  faro: { cx: number; cy: number; r: number };
};

export const catalogoMotos: ModeloMoto[] = [
  {
    id: 'm1',
    nombre: 'Deportiva',
    descripcion: 'Carenado completo',
    suelo: 227,
    ruedas: [{ cx: 85, cy: 175, r: 52 }, { cx: 315, cy: 175, r: 52 }],
    lineas: [
      { x1: 150, y1: 150, x2: 85, y2: 175, ancho: 8, rol: 'oscuro' },
      { x1: 292, y1: 100, x2: 315, y2: 175, ancho: 7, rol: 'cromo' },
      { x1: 175, y1: 168, x2: 125, y2: 166, ancho: 9, rol: 'cromo' },
      { x1: 268, y1: 88, x2: 285, y2: 84, ancho: 5, rol: 'oscuro' },
    ],
    partes: [
      { rol: 'oscuro', d: 'M 165 138 L 250 138 L 242 180 L 172 180 Z' },
      { rol: 'principal', d: 'M 52 122 C 85 100 125 96 150 100 L 176 135 L 118 140 C 85 140 62 134 52 122 Z' },
      { rol: 'acento', d: 'M 60 126 C 90 112 125 110 150 112 L 152 118 C 125 116 92 118 66 132 Z' },
      { rol: 'principal', d: 'M 150 100 C 175 82 215 82 245 92 C 275 100 300 118 312 138 L 290 148 L 230 142 L 176 136 Z' },
      { rol: 'acento', d: 'M 232 143 L 290 149 L 300 152 L 262 164 L 238 158 Z' },
      { rol: 'asiento', d: 'M 100 98 C 122 90 150 90 172 98 L 168 106 C 148 101 124 101 104 108 Z' },
      { rol: 'cristal', d: 'M 252 92 L 284 78 L 292 100 L 262 100 Z' },
    ],
    faro: { cx: 301, cy: 124, r: 7 },
  },
  {
    id: 'm2',
    nombre: 'Cruiser',
    descripcion: 'Estilo chopper',
    suelo: 227,
    ruedas: [{ cx: 80, cy: 175, r: 52 }, { cx: 325, cy: 175, r: 52 }],
    lineas: [
      { x1: 165, y1: 160, x2: 80, y2: 175, ancho: 8, rol: 'oscuro' },
      { x1: 292, y1: 92, x2: 325, y2: 175, ancho: 7, rol: 'cromo' },
      { x1: 175, y1: 170, x2: 30, y2: 172, ancho: 9, rol: 'cromo' },
      { x1: 268, y1: 62, x2: 292, y2: 92, ancho: 5, rol: 'oscuro' },
    ],
    partes: [
      { rol: 'oscuro', d: 'M 160 125 L 245 125 L 238 182 L 168 182 Z' },
      { rol: 'cromo', d: 'M 175 140 L 230 140 L 228 152 L 177 152 Z' },
      { rol: 'principal', d: 'M 28 168 C 35 116 125 110 135 160 L 126 160 C 118 128 48 130 38 168 Z' },
      { rol: 'principal', d: 'M 282 150 C 297 116 350 116 368 150 L 358 156 C 344 134 306 134 294 158 Z' },
      { rol: 'asiento', d: 'M 72 114 C 105 100 148 102 160 112 L 150 122 C 128 114 100 114 78 124 Z' },
      { rol: 'principal', d: 'M 150 98 C 172 70 232 70 252 98 C 236 120 172 122 150 108 Z' },
      { rol: 'acento', d: 'M 165 92 C 190 84 220 84 240 92 L 238 98 C 215 92 190 92 168 99 Z' },
    ],
    faro: { cx: 300, cy: 108, r: 9 },
  },
  {
    id: 'm3',
    nombre: 'Urbana',
    descripcion: 'Scooter',
    suelo: 230,
    ruedas: [{ cx: 92, cy: 188, r: 42 }, { cx: 308, cy: 188, r: 42 }],
    lineas: [
      { x1: 150, y1: 178, x2: 92, y2: 188, ancho: 8, rol: 'oscuro' },
      { x1: 292, y1: 70, x2: 308, y2: 188, ancho: 7, rol: 'cromo' },
      { x1: 272, y1: 64, x2: 310, y2: 56, ancho: 5, rol: 'oscuro' },
    ],
    partes: [
      { rol: 'principal', d: 'M 50 135 C 52 100 108 88 165 100 L 196 142 L 192 160 L 138 158 L 134 146 L 50 146 Z' },
      { rol: 'acento', d: 'M 58 128 C 70 108 112 100 158 108 L 162 116 C 116 110 82 118 68 138 Z' },
      { rol: 'oscuro', d: 'M 192 158 L 262 158 L 266 168 L 192 170 Z' },
      { rol: 'principal', d: 'M 250 150 C 252 120 272 92 284 70 L 306 74 C 300 100 296 128 302 150 L 268 150 Z' },
      { rol: 'acento', d: 'M 270 150 C 282 134 336 134 350 156 L 342 160 C 330 146 290 146 276 160 Z' },
      { rol: 'asiento', d: 'M 62 104 C 100 90 150 92 178 104 L 172 114 C 140 106 100 106 68 116 Z' },
      { rol: 'cristal', d: 'M 284 70 L 300 38 L 312 42 L 306 74 Z' },
    ],
    faro: { cx: 296, cy: 92, r: 8 },
  },
];

// ---------- rines ----------
export type EstiloRin = 'deportivo' | 'multi' | 'radios' | 'disco' | 'turbina';

export type Rin = { id: string; nombre: string; estilo: EstiloRin };

export const catalogoRines: Rin[] = [
  { id: 'r1', nombre: 'Deportivo 5 rayos', estilo: 'deportivo' },
  { id: 'r2', nombre: 'Multirayos', estilo: 'multi' },
  { id: 'r3', nombre: 'Alambre (radios)', estilo: 'radios' },
  { id: 'r4', nombre: 'Disco', estilo: 'disco' },
  { id: 'r5', nombre: 'Turbina', estilo: 'turbina' },
];

export const coloresRin: { id: string; nombre: string; hex: string }[] = [
  { id: 'cr1', nombre: 'Negro', hex: '#111827' },
  { id: 'cr2', nombre: 'Plata', hex: '#cbd5e1' },
  { id: 'cr3', nombre: 'Oro', hex: '#d4af37' },
  { id: 'cr4', nombre: 'Rojo', hex: '#ef4444' },
  { id: 'cr5', nombre: 'Azul', hex: '#3b82f6' },
  { id: 'cr6', nombre: 'Verde neón', hex: '#22ff88' },
  { id: 'cr7', nombre: 'Blanco', hex: '#f8fafc' },
];

// ---------- pintura ----------
export const catalogoColores: ColorPintura[] = [
  { id: 'c1', nombre: 'Negro mate', hex: '#0f172a', grupo: 'Clásicos' },
  { id: 'c2', nombre: 'Blanco perla', hex: '#f8fafc', grupo: 'Clásicos' },
  { id: 'c3', nombre: 'Rojo', hex: '#ef4444', grupo: 'Clásicos' },
  { id: 'c4', nombre: 'Azul', hex: '#3b82f6', grupo: 'Clásicos' },
  { id: 'c5', nombre: 'Verde', hex: '#10b981', grupo: 'Clásicos' },
  { id: 'c6', nombre: 'Naranja', hex: '#f59e0b', grupo: 'Clásicos' },
  { id: 'c7', nombre: 'Verde neón', hex: '#22ff88', grupo: 'Neón' },
  { id: 'c8', nombre: 'Rosa neón', hex: '#ff2d95', grupo: 'Neón' },
  { id: 'c9', nombre: 'Cian neón', hex: '#22d3ee', grupo: 'Neón' },
  { id: 'c10', nombre: 'Amarillo neón', hex: '#facc15', grupo: 'Neón' },
  { id: 'c11', nombre: 'Plata', hex: '#94a3b8', grupo: 'Metálicos' },
  { id: 'c12', nombre: 'Oro', hex: '#d4af37', grupo: 'Metálicos' },
  { id: 'c13', nombre: 'Bronce', hex: '#b45309', grupo: 'Metálicos' },
  { id: 'c14', nombre: 'Grafito', hex: '#475569', grupo: 'Metálicos' },
];

// ---------- fondos ----------
export type Fondo = {
  id: string;
  nombre: string;
  cielo: [string, string]; // degradado arriba -> abajo
  suelo: string;
};

export const catalogoFondos: Fondo[] = [
  { id: 'taller', nombre: 'Taller', cielo: ['#f1f5f9', '#cbd5e1'], suelo: '#94a3b8' },
  { id: 'atardecer', nombre: 'Atardecer', cielo: ['#7c3aed', '#fb923c'], suelo: '#3b0764' },
  { id: 'neon', nombre: 'Noche neón', cielo: ['#020617', '#4c1d95'], suelo: '#0f172a' },
  { id: 'ciudad', nombre: 'Ciudad', cielo: ['#0ea5e9', '#e0f2fe'], suelo: '#475569' },
];

// ---------- stickers y texto ----------
export const catalogoStickers: ItemCatalogo[] = [
  { id: 's1', nombre: 'Flama', icono: 'fire', color: '#f97316' },
  { id: 's2', nombre: 'Rayo', icono: 'flash', color: '#facc15' },
  { id: 's3', nombre: 'Calavera', icono: 'skull', color: '#0f172a' },
  { id: 's4', nombre: 'Estrella', icono: 'star', color: '#3b82f6' },
  { id: 's5', nombre: 'Corazón', icono: 'heart', color: '#ef4444' },
  { id: 's6', nombre: 'Meta', icono: 'flag-checkered', color: '#111827' },
  { id: 's7', nombre: 'Corona', icono: 'crown', color: '#d4af37' },
  { id: 's8', nombre: 'Escudo', icono: 'shield', color: '#10b981' },
  { id: 's9', nombre: 'Fantasma', icono: 'ghost', color: '#8b5cf6' },
  { id: 's10', nombre: 'Espada', icono: 'sword', color: '#64748b' },
  { id: 's11', nombre: 'Copo', icono: 'snowflake', color: '#22d3ee' },
  { id: 's12', nombre: 'Diablo', icono: 'emoticon-devil', color: '#dc2626' },
];

export const coloresTexto = ['#ffffff', '#0f172a', '#facc15', '#ef4444', '#22ff88', '#ff2d95'];

export const textosRapidos = ['1', '7', '46', '69', '99', 'RIDERS'];

// ---------- brocha (pintar a mano sobre la moto) ----------
export const GROSORES = [
  { id: 'fino', nombre: 'Fino', ancho: 4 },
  { id: 'medio', nombre: 'Medio', ancho: 9 },
  { id: 'grueso', nombre: 'Grueso', ancho: 18 },
];

export const OPACIDADES = [
  { id: 'translucido', nombre: 'Translúcido', valor: 0.6 },
  { id: 'solido', nombre: 'Sólido', valor: 1 },
];

// ---------- motos REALES predeterminadas (tus propias imágenes) ----------
// Pon las imágenes en assets/motos/ y regístralas aquí. Lo ideal es PNG con fondo
// transparente (quita el fondo en remove.bg o similar): así "tintable: true" pinta la moto
// respetando la silueta. Usa solo fotos propias o con licencia/permiso.
// Las rutas son relativas a este archivo (src/screens/menu_options).
//
// Ejemplo (descomenta cuando tengas el archivo, si no Metro marcará error):
//   { id: 'real1', nombre: 'Naked 300', descripcion: 'Foto real', tintable: true,
//     imagen: require('../../../assets/motos/naked300.png') },
export type MotoReal = {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: any; // resultado de require('...')
  tintable: boolean; // true solo si el PNG tiene fondo transparente
};

export const catalogoMotosReales: MotoReal[] = [];