import { useSyncExternalStore } from 'react';
import { TipoElemento } from './catalogos';
 
// Tamaño del lienzo de la moto y de cada sticker (compartido por Editor y Librería)
export const LIENZO = 300;
export const TAM_ELEMENTO = 88;
 
export type ElementoDiseno = {
  id: string;
  icono: string;
  color: string;
  tipo: TipoElemento;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};
 
type Estado = {
  motoId: string;
  colorMoto: string | null; // null = color original (en foto) / negro por defecto (en ícono)
  foto: string | null; // uri de la foto del usuario
  elementos: ElementoDiseno[];
};
 
let estado: Estado = {
  motoId: 'm1',
  colorMoto: '#0f172a',
  foto: null,
  elementos: [],
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
 
// Hook para leer el diseño desde cualquier pantalla
export const useDiseno = () => useSyncExternalStore(suscribir, getEstado);
 
export function setEstado(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  emitir();
}
 
// Agrega un sticker/rin SIN borrar los anteriores
export function agregarElemento(base: { icono: string; color: string; tipo: TipoElemento }) {
  const n = estado.elementos.length;
  const offset = (n * 20) % 60;
  const centro = (LIENZO - TAM_ELEMENTO) / 2;
  const nuevo: ElementoDiseno = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...base,
    x: centro + offset,
    y: centro + offset,
    scale: 1,
    rotation: 0,
  };
  setEstado({ elementos: [...estado.elementos, nuevo] });
}
 
export function actualizarElemento(id: string, parcial: Partial<ElementoDiseno>) {
  setEstado({
    elementos: estado.elementos.map((e) => (e.id === id ? { ...e, ...parcial } : e)),
  });
}
 
export function eliminarElemento(id: string) {
  setEstado({ elementos: estado.elementos.filter((e) => e.id !== id) });
}