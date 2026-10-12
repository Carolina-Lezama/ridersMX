export type TipoElemento = 'sticker' | 'rin';

export type ItemCatalogo = {
    id: string;
    nombre: string;
    icono: string; // nombre de MaterialCommunityIcons
    color: string;
};

export type ColorPintura = {
    id: string;
    nombre: string;
    hex: string;
    grupo: 'Clásicos' | 'Neón' | 'Metálicos';
};

export const catalogoMotos = [
  { id: 'm1', nombre: 'Deportiva', icono: 'motorbike' },
  { id: 'm2', nombre: 'Cruiser', icono: 'moped' },
  { id: 'm3', nombre: 'Urbana', icono: 'scooter' },
];

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

export const catalogoRines: ItemCatalogo[] = [
  { id: 'r1', nombre: 'Rin Deportivo', icono: 'circle-slice-8', color: '#111827' },
  { id: 'r2', nombre: 'Rin Cromado', icono: 'record-circle-outline', color: '#94a3b8' },
  { id: 'r3', nombre: 'Rin Dona', icono: 'chart-donut-variant', color: '#475569' },
  { id: 'r4', nombre: 'Rin Engrane', icono: 'cog-outline', color: '#d4af37' },
];

export const catalogoColores: ColorPintura[] = [
  { id: 'c1', nombre: 'Negro mate', hex: '#0f172a', grupo: 'Clásicos' },
  { id: 'c2', nombre: 'Blanco perla', hex: '#ffffff', grupo: 'Clásicos' },
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