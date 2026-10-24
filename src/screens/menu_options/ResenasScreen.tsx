import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
  StatusBar,
  ImageSourcePropType,
  LayoutChangeEvent,
  Modal,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import emailjs from '@emailjs/react-native';

// Cliente de Supabase (src/services/supabase.ts)
import { supabase } from '../../services/supabase';

// Tema global (el mismo que usa Configuración)
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Theme } from '../../../assets/theme/theme';

// ─── CONFIGURACIÓN DEL CORREO DE SOPORTE (EmailJS) ───────────────────────────

// Las llaves viven en el archivo .env (que NO se sube a git). Ver .env.example
const EMAILJS = {
  serviceId: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? '',
  templateId: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? '',
  publicKey: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? '',
};
const EMAILJS_CONFIGURADO = Object.values(EMAILJS).every((v) => v.length > 0);

// ─── CONFIGURACIÓN DE BASE DE DATOS ──────────────────────────────────────────

// Tabla de la que se lee el nombre de quien escribió cada reseña.
// Si ves "Usuario" en vez del nombre real en reseñas de OTRAS personas, es porque la política RLS
// de `perfiles` solo deja leer tu propia fila. Solución: crear la vista `perfiles_publicos`
// (está en el .sql, opcional) y cambiar este valor a 'perfiles_publicos'.
const TABLA_PERFILES = 'perfiles';

// Valor que se guarda en resenas.tipo_entidad para las reseñas de motos.
// ⚠️ La restricción `resenas_tipo_entidad_check` de la BD solo aceptaba
// 'Taller', 'Accesorio', 'Ruta' y 'Refaccionaria': hay que agregar 'Moto' (ver el .sql, bloque 3).
// Respeta las mayúsculas: 'moto' en minúscula sería rechazado.
const TIPO_ENTIDAD_MOTO = 'Moto';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Comentario {
  usuario: string;
  texto: string;
  puntuacion?: number;
  esPropia?: boolean;
  deBD?: boolean; // true si viene de la tabla `resenas`
}

interface Moto {
  id: string;
  nombre: string;
  marca: string;
  modelo: number; 
  tipo: string;
  cilindrada: number; 
  precio: number; 
  puntuacion: number;
  descripcion: string;
  /**
   * Aquí pones tu imagen. Acepta:
   *  - una URL:            'https://mi-sitio.com/moto.png'
   *  - un archivo local:   require('../../assets/motos/rt250.png')
   * Si la dejas vacía se muestra un ícono de moto como marcador.
   */
  imagen?: ImageSourcePropType | string;
  comentarios: Comentario[];
  propietario?: string; // quién publicó la moto
  esPropia?: boolean; // true si la subió el usuario desde el formulario
}

type FiltroKey = 'marca' | 'precio' | 'cilindrada' | 'modelo';
type Filtros = Record<FiltroKey, string | null>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Opcion {
  valor: string;
  etiqueta: string;
}

/** Lo que captura el formulario de "Publicar mi moto". */
type DatosMoto = Pick<
  Moto,
  'nombre' | 'marca' | 'modelo' | 'tipo' | 'cilindrada' | 'precio' | 'descripcion' | 'imagen' | 'propietario'
>;

// ─── AYUDAS PARA LA BASE DE DATOS ────────────────────────────────────────────

// Bucket de Supabase Storage donde se guardan las fotos de las motos publicadas.
// ⚠️ Debe existir (público) y permitir subir a la carpeta del usuario: ver el .sql, bloque 2.
// Si no existe, la moto se publica igual pero SIN foto.
const BUCKET_MOTOS = 'motos';

/** Convierte una fila de la tabla `motos_catalogo` en una Moto de la pantalla. */
const filaAMoto = (f: any, uid: string | null): Moto => ({
  id: String(f.id),
  nombre: f.nombre ?? '',
  marca: f.marca ?? '',
  modelo: Number(f.modelo ?? 0),
  tipo: f.tipo ?? '',
  cilindrada: Number(f.cilindrada ?? 0),
  precio: Number(f.precio ?? 0),
  puntuacion: 0, // el promedio se calcula con las reseñas
  descripcion: f.descripcion ?? '',
  imagen: f.imagen_url ?? undefined,
  comentarios: [],
  propietario: f.propietario ?? undefined,
  esPropia: !!uid && f.perfil_id === uid,
});

/** Sube la foto elegida (ruta local) al bucket `motos` y devuelve su URL pública, o null si falla. */
const subirFotoMoto = async (uri: string, perfilId: string): Promise<string | null> => {
  try {
    const res = await fetch(uri);
    const buffer = await res.arrayBuffer();
    const extUri = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
    const tipoHeader = res.headers.get('content-type') ?? '';
    const contentType = tipoHeader.startsWith('image/')
      ? tipoHeader
      : extUri === 'png'
      ? 'image/png'
      : extUri === 'webp'
      ? 'image/webp'
      : 'image/jpeg';
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    // La carpeta es el id del usuario: así lo exige la política del bucket
    const ruta = `${perfilId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_MOTOS).upload(ruta, buffer, { contentType });
    // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
    console.log('[Moto] subida de foto → ruta:', ruta, '| error:', error?.message ?? null);
    if (error) return null;
    return supabase.storage.from(BUCKET_MOTOS).getPublicUrl(ruta).data.publicUrl;
  } catch (e: any) {
    console.warn('[Moto] no se pudo subir la foto:', e?.message);
    return null;
  }
};

/** Borra una foto del bucket `motos` a partir de su URL pública. Si la foto es externa, no hace nada. */
const borrarFotoMoto = async (url: string) => {
  try {
    const marcador = `/storage/v1/object/public/${BUCKET_MOTOS}/`;
    const i = url.indexOf(marcador);
    if (i === -1) return; // foto de otra página: no está en nuestro bucket
    const ruta = decodeURIComponent(url.slice(i + marcador.length).split('?')[0]);
    const { error } = await supabase.storage.from(BUCKET_MOTOS).remove([ruta]);
    // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
    console.log('[Moto] borrar foto →', ruta, '| error:', error?.message ?? null);
  } catch (e: any) {
    console.warn('[Moto] no se pudo borrar la foto:', e?.message);
  }
};

// ─── NOTIFICACIÓN FLOTANTE (reemplaza los cuadros del navegador) ─────────────

interface AccionAviso {
  texto: string;
  onPress: () => void;
  tipo?: 'primario' | 'secundario' | 'peligro' | 'neutro';
}

interface AvisoData {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  tono: 'exito' | 'error' | 'alerta' | 'info';
  titulo: string;
  mensaje: string;
  moto?: Moto; // vista previa de una moto dentro del aviso
  acciones?: AccionAviso[]; // con botones el aviso espera una decisión; sin botones se cierra solo
  alCerrar?: () => void; // botón "atrás" de Android cuando hay botones
}

// ─── DATOS DE EJEMPLO ────────────────────────────────────────────────────────
// Precios y textos son de ejemplo: cámbialos por los reales de tu proyecto.
//
// Estas motos son locales (semilla). Las que publica la gente se guardan en la tabla
// `motos_catalogo` y se muestran ANTES de estas en la lista.

const MOTOS: Moto[] = [
  {
    id: '1',
    nombre: 'Italika RT 250 con GPS Roja',
    marca: 'Italika',
    modelo: 2025,
    tipo: 'Deportiva',
    cilindrada: 250,
    precio: 42999,
    puntuacion: 4.5,
    descripcion:
      'La moto deportiva RT250 con GPS tiene un motor de 4 tiempos monocilíndrico con una potencia máxima de 19.64 HP. Cilindrada de 250 cc y un torque máximo de 20.9 N-m @ 8000 RPM.',
    imagen: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500',
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto:
          'Excelente moto para ciudad y carretera. El GPS integrado es muy útil y la potencia es más que suficiente para uso diario.',
        puntuacion: 5,
      },
      {
        usuario: 'Usuario 2',
        texto:
          'Buen rendimiento de combustible. El diseño deportivo llama mucho la atención. Recomendada para quienes buscan estilo y practicidad.',
        puntuacion: 4,
      },
    ],
  },
  {
    id: '2',
    nombre: 'Italika-Morbidelli F200',
    marca: 'Italika',
    modelo: 2025,
    tipo: 'Urbana',
    cilindrada: 200,
    precio: 37999,
    puntuacion: 3.5,
    descripcion:
      'Motocicleta urbana de estilo naked y diseño deportivo, resultado de la reciente colaboración entre la marca mexicana Italika y la firma italiana Morbidelli. Tiene un motor de 200 centímetros cúbicos.',
    imagen: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500',
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto:
          'Me encanta el diseño naked que tiene. Es una moto muy ágil para moverse entre el tráfico de la ciudad y el consumo de gasolina es bastante moderado para ser un motor 200. Muy conforme con la compra.',
        puntuacion: 4,
      },
      {
        usuario: 'Usuario 2',
        texto:
          'La potencia es adecuada y responde bien en avenidas rápidas. Sin embargo, el asiento se siente un poco rígido en viajes de más de una hora y las vibraciones se notan al pasar los 90 km/h.',
        puntuacion: 3,
      },
    ],
  },
  {
    id: '3',
    nombre: 'Chopper Italika RC200 Gris',
    marca: 'Italika',
    modelo: 2024,
    tipo: 'Chopper',
    cilindrada: 200,
    precio: 31999,
    puntuacion: 4.0,
    descripcion:
      'La Italika RC200 Gris es una motocicleta de estilo chopper cruiser, con bastidor de baja cilindrada, diseñada principalmente para quienes buscan uno. Cuenta con un motor de 200 cc.',
    imagen: 'https://elektra.vtexassets.com/arquivos/ids/33579086/34005722-d1.jpg?v=639264376627000000',
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto:
          'Una chopper accesible que cumple bien para paseos cortos y ciudad. El estilo es llamativo y varios me han preguntado por la moto.',
        puntuacion: 4,
      },
      {
        usuario: 'Usuario 2',
        texto:
          'Buena relación precio-calidad. El motor de 200 cc es suficiente para uso urbano, aunque en carretera hay que tener paciencia para acelerar.',
        puntuacion: 4,
      },
    ],
  },
  {
    id: '4',
    nombre: 'Italika DM150 Negra',
    marca: 'Italika',
    modelo: 2024,
    tipo: 'Urbana',
    cilindrada: 150,
    precio: 19999,
    puntuacion: 4.0,
    descripcion:
      'Moto urbana de 150 cc pensada para el día a día: ligera, fácil de maniobrar y con un consumo de gasolina muy bajo. Una buena primera moto.',
    imagen: 'https://comotos.co/wp-content/uploads/2021/11/Italika-DM150-1024x1024.jpg', // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Perfecta para moverme en la ciudad. Muy ligera y el mantenimiento es barato.',
        puntuacion: 4,
      },
    ],
  },
  {
    id: '5',
    nombre: 'Italika FT150 GS',
    marca: 'Italika',
    modelo: 2024,
    tipo: 'Trabajo',
    cilindrada: 150,
    precio: 21999,
    puntuacion: 3.5,
    descripcion:
      'Moto de trabajo resistente, con suspensión reforzada y espacio para carga. Ideal para repartos y trayectos diarios largos.',
    imagen: 'https://http2.mlstatic.com/D_Q_NP_2X_686522-MLM116127930218_092026-T.webp', // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Aguanta bien la carga y no me ha dado problemas en el trabajo diario. Es algo tosca a velocidades altas.',
        puntuacion: 3,
      },
    ],
  },
  {
    id: '12',
    nombre: 'Kawasaki Ninja 400',
    marca: 'Kawasaki',
    modelo: 2026,
    tipo: 'Deportiva',
    cilindrada: 400,
    precio: 139900,
    puntuacion: 4.5,
    descripcion:
      'Deportiva bicilíndrica de 400 cc con carenado completo y postura racing. Equilibrio ideal entre pista, carretera y uso diario.',
    imagen: 'https://kawasakicapital.com.mx/cdn/shop/files/Ninja-zx4RR-abs_2026-04.jpg?v=1778895431&width=533', // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Una deportiva noble: es rápida pero fácil de controlar, incluso si vienes de una 250.',
        puntuacion: 5,
      },
    ],
  },
  {
    id: '13',
    nombre: 'Royal Enfield Classic 350',
    marca: 'Royal Enfield',
    modelo: 2025,
    tipo: 'Clásica',
    cilindrada: 350,
    precio: 89900,
    puntuacion: 4.5,
    descripcion:
      'Clásica de estilo retro con motor monocilíndrico de 350 cc. Su sonido y su torque a bajas revoluciones la hacen perfecta para paseos tranquilos.',
    imagen: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCx6RrNdFXS_H3gBVrZpVHPDdgkM2ukoNgqMNv5sGowXDAZIzrjBy1RJA&s=10', // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'El sonido y el diseño son increíbles. No es la más rápida, pero disfrutas cada kilómetro.',
        puntuacion: 5,
      },
    ],
  },
  {
    id: '14',
    nombre: 'KTM Duke 200',
    marca: 'KTM',
    modelo: 2024,
    tipo: 'Naked',
    cilindrada: 200,
    precio: 62900,
    puntuacion: 4.0,
    descripcion:
      'Naked compacta y muy ágil, con carácter deportivo y estructura ligera. Perfecta para moverse rápido entre el tráfico.',
    imagen: 'https://www.hiperbikes.com.mx/wp-content/uploads/2019/02/KTM-DUKE-200-2025.jpg', // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Es pequeña pero con mucho carácter. En ciudad es una delicia manejarla.',
        puntuacion: 4,
      },
    ],
  },
  {
    id: '15',
    nombre: 'Vento Rocketman 250',
    marca: 'Vento',
    modelo: 2025,
    tipo: 'Urbana',
    cilindrada: 250,
    precio: 34999,
    puntuacion: 3.5,
    descripcion:
      'Urbana de 250 cc con look retro-moderno y precio accesible. Una opción con estilo para quienes quieren más cilindrada sin gastar de más.',
    imagen: 'https://www.vento.com/wp-content/uploads/ROCKETMAN-RACING-250-16.jpg', // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Bonita y económica. Los acabados podrían mejorar, pero por el precio está bien.',
        puntuacion: 3,
      },
    ],
  },
];

// ─── FILTROS (se generan solos a partir de MOTOS) ────────────────────────────

// Marcas disponibles al publicar una moto (se mezclan con las que ya existan en la lista)
const MARCAS_MOTO = [
  'Italika', 'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Bajaj', 'TVS', 'Royal Enfield',
  'KTM', 'BMW', 'Vento', 'Keeway', 'CFMoto', 'Husqvarna', 'Ducati', 'Triumph',
];

const PASO_PRECIO = 1000;

/** Límites de la barra de precio: del precio más bajo al más alto, redondeados a 10,000. */
const calcularLimitesPrecio = (motos: Moto[]) => {
  const precios = motos.map((m) => m.precio);
  if (precios.length === 0) return { min: 0, max: 100000 };
  const min = Math.floor(Math.min(...precios) / 10000) * 10000;
  const max = Math.ceil(Math.max(...precios) / 10000) * 10000;
  return { min, max: max > min ? max : min + 10000 };
};

/** El filtro de precio se guarda como texto "min-max", por ejemplo "30000-80000". */
const parsearRango = (v: string): [number, number] => {
  const [a, b] = v.split('-').map(Number);
  return [a, b];
};

const FILTROS_META: { key: FiltroKey; label: string; icon: IconName }[] = [
  { key: 'marca', label: 'Marca', icon: 'pricetag-outline' },
  { key: 'precio', label: 'Precio', icon: 'cash-outline' },
  { key: 'cilindrada', label: 'Cilindraje', icon: 'speedometer-outline' },
  { key: 'modelo', label: 'Modelo', icon: 'calendar-outline' },
];

const FILTRO_KEYS = FILTROS_META.map((f) => f.key);

const unicos = <T,>(arr: T[]) => Array.from(new Set(arr));

const TIPOS_MOTO = ['Deportiva', 'Urbana', 'Naked', 'Chopper', 'Doble propósito', 'Clásica', 'Trabajo', 'Scooter'];

/** Opciones de cada filtro, generadas a partir de las motos que existen en este momento. */
const generarOpciones = (motos: Moto[]): Record<FiltroKey, Opcion[]> => ({
  marca: unicos(motos.map((m) => m.marca))
    .sort((a, b) => a.localeCompare(b))
    .map((m) => ({ valor: m, etiqueta: m })),
  precio: [], // el precio se filtra con la barra, no con opciones
  cilindrada: unicos(motos.map((m) => m.cilindrada))
    .sort((a, b) => a - b)
    .map((c) => ({ valor: String(c), etiqueta: `${c} cc` })),
  modelo: unicos(motos.map((m) => m.modelo))
    .sort((a, b) => b - a)
    .map((a) => ({ valor: String(a), etiqueta: String(a) })),
});

const FILTROS_VACIOS: Filtros = { marca: null, precio: null, cilindrada: null, modelo: null };

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

const formatearPrecio = (n: number) => '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// ─── DETECCIÓN DE MOTOS REPETIDAS ────────────────────────────────────────────

/** Deja solo letras y números: "FT-150", "ft 150" y "FT150" quedan iguales. */
const soloAlfanumerico = (t: string) => normalizar(t).replace(/[^a-z0-9]/g, '');

/** Nombre comparable: sin símbolos y sin repetir la marca ("Italika FT150" = "FT150" de Italika). */
const claveNombre = (m: { marca: string; nombre: string }) => {
  const marca = soloAlfanumerico(m.marca);
  const nombre = soloAlfanumerico(m.nombre);
  return marca ? nombre.split(marca).join('') : nombre;
};

type DatosComparables = { marca: string; nombre: string; modelo: number; cilindrada: number };

/**
 * Dos motos son "la misma" si coinciden marca, nombre, año y cilindrada.
 * Una versión distinta (ej. carburada vs inyección) se distingue escribiéndolo en el nombre:
 * "FT150 Carburada" y "FT150 Inyección" ya NO se consideran repetidas.
 */
const esMismaMoto = (a: DatosComparables, b: DatosComparables) =>
  soloAlfanumerico(a.marca) === soloAlfanumerico(b.marca) &&
  claveNombre(a) === claveNombre(b) &&
  Number(a.modelo) === Number(b.modelo) &&
  Number(a.cilindrada) === Number(b.cilindrada);

function cumpleFiltro(m: Moto, key: FiltroKey, valor: string): boolean {
  switch (key) {
    case 'marca':
      return m.marca === valor;
    case 'precio': {
      const [lo, hi] = parsearRango(valor);
      return m.precio >= lo && m.precio <= hi;
    }
    case 'cilindrada':
      return String(m.cilindrada) === valor;
    case 'modelo':
      return String(m.modelo) === valor;
  }
}

function filtrar(motos: Moto[], filtros: Filtros, busqueda: string): Moto[] {
  const q = normalizar(busqueda.trim());
  return motos.filter((m) => {
    for (const k of FILTRO_KEYS) {
      const v = filtros[k];
      if (v && !cumpleFiltro(m, k, v)) return false;
    }
    if (q) {
      const texto = normalizar(`${m.nombre} ${m.marca} ${m.tipo} ${m.modelo} ${m.cilindrada}cc`);
      return texto.includes(q);
    }
    return true;
  });
}

/** La calificación de la moto se actualiza cuando el usuario publica su reseña. */
function calcularPuntuacion(moto: Moto, comentarios: Comentario[]): number {
  // Cuentan las reseñas guardadas en la BD (de cualquier usuario) y las propias recién publicadas
  const propias = comentarios.filter((c) => (c.esPropia || c.deBD) && c.puntuacion);
  if (propias.length === 0) return moto.puntuacion;
  const base = moto.comentarios.length; // reseñas de ejemplo originales (0 en motos nuevas)
  const suma = propias.reduce((acc, c) => acc + (c.puntuacion ?? 0), 0);
  return Math.round(((moto.puntuacion * base + suma) / (base + propias.length)) * 10) / 10;
}

const TEXTOS_CALIFICACION = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

// ─── COMPONENTE: ESTRELLAS ────────────────────────────────────────────────────

function Estrellas({ puntuacion, size = 16 }: { puntuacion: number; size?: number }) {
  const { C, styles } = useResenasTheme();
  const r = Math.round(puntuacion * 2) / 2; // redondea a medias estrellas
  return (
    <View style={styles.estrellasRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= r ? 'star' : i - 0.5 === r ? 'star-half' : 'star-outline'}
          size={size}
          color={C.star}
        />
      ))}
    </View>
  );
}

function CalificacionInteractiva({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (v: number) => void;
}) {
  const { C, styles } = useResenasTheme();
  return (
    <View style={styles.calificacionWrap}>
      <View style={styles.estrellasRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(i)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel={`${i} ${i === 1 ? 'estrella' : 'estrellas'}`}
          >
            <Ionicons name={i <= valor ? 'star' : 'star-outline'} size={34} color={C.star} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.calificacionTexto}>
        {valor > 0 ? TEXTOS_CALIFICACION[valor - 1] : 'Toca una estrella'}
      </Text>
    </View>
  );
}

// ─── COMPONENTE: IMAGEN (con marcador si no hay foto) ────────────────────────

function ImagenMoto({ imagen, style }: { imagen?: ImageSourcePropType | string; style: any }) {
  const { C, styles } = useResenasTheme();
  const source = typeof imagen === 'string' ? { uri: imagen } : imagen;
  if (!source) {
    return (
      <View style={[style, styles.imagenVacia]}>
        <MaterialCommunityIcons name="motorbike" size={40} color={C.textMuted} />
      </View>
    );
  }
  return <Image source={source} style={[style, { backgroundColor: C.surfaceAlt }]} resizeMode="contain" />;
}

// ─── COMPONENTE: BARRA DE PRECIO (dos manijas) ───────────────────────────────

const AREA_MANIJA = 44; // zona táctil de cada manija
const TAM_MANIJA = 26; // círculo visible

function SliderPrecio({
  min,
  max,
  inicial,
  onFin,
}: {
  min: number;
  max: number;
  inicial: [number, number];
  onFin: (lo: number, hi: number) => void;
}) {
  const { C } = useResenasTheme();
  const [ancho, setAncho] = useState(0);
  const [rango, setRango] = useState<[number, number]>(inicial);

  // Referencias para que los gestos siempre lean los valores más recientes
  const rangoRef = useRef(rango);
  rangoRef.current = rango;
  const anchoRef = useRef(0);
  anchoRef.current = ancho;
  const limRef = useRef({ min, max });
  limRef.current = { min, max };
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;
  const inicioX = useRef(0);

  const util = Math.max(ancho - AREA_MANIJA, 1);
  const aPos = (v: number, u = util) => ((v - min) / (max - min)) * u;

  const crearGesto = (lado: 0 | 1) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // evita que el scroll le quite el gesto
      onPanResponderGrant: () => {
        const u = Math.max(anchoRef.current - AREA_MANIJA, 1);
        const { min: mn, max: mx } = limRef.current;
        inicioX.current = ((rangoRef.current[lado] - mn) / (mx - mn)) * u;
      },
      onPanResponderMove: (_, g) => {
        const u = Math.max(anchoRef.current - AREA_MANIJA, 1);
        const { min: mn, max: mx } = limRef.current;
        const crudo = mn + ((inicioX.current + g.dx) / u) * (mx - mn);
        const v = Math.min(mx, Math.max(mn, Math.round(crudo / PASO_PRECIO) * PASO_PRECIO));
        const [lo, hi] = rangoRef.current;
        setRango(lado === 0 ? [Math.min(v, hi - PASO_PRECIO), hi] : [lo, Math.max(v, lo + PASO_PRECIO)]);
      },
      onPanResponderRelease: () => onFinRef.current(rangoRef.current[0], rangoRef.current[1]),
      onPanResponderTerminate: () => onFinRef.current(rangoRef.current[0], rangoRef.current[1]),
    });

  const gestoMin = useRef(crearGesto(0)).current;
  const gestoMax = useRef(crearGesto(1)).current;

  const [lo, hi] = rango;
  const x0 = aPos(lo) + AREA_MANIJA / 2; // centro de cada manija
  const x1 = aPos(hi) + AREA_MANIJA / 2;
  const juntos = ancho > 0 && x1 - x0 < 90;
  const limitar = (x: number, w: number) => Math.min(Math.max(x - w / 2, 0), Math.max(ancho - w, 0));

  const etiqueta = (left: number, w: number, texto: string) => (
    <Text style={{ position: 'absolute', top: 0, left, width: w, textAlign: 'center', fontSize: 13, fontWeight: '800', color: C.textPri }}>
      {texto}
    </Text>
  );

  const manija = (left: number, gesto: ReturnType<typeof crearGesto>, nombre: string) => (
    <View
      {...gesto.panHandlers}
      accessibilityLabel={nombre}
      style={{ position: 'absolute', top: 24, left, width: AREA_MANIJA, height: AREA_MANIJA, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: TAM_MANIJA,
          height: TAM_MANIJA,
          borderRadius: TAM_MANIJA / 2,
          backgroundColor: C.surface,
          borderWidth: 3,
          borderColor: C.accent,
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }}
      />
    </View>
  );

  return (
    <View style={{ height: 96 }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {ancho > 0 && (
        <>
          {/* Valores sobre las manijas */}
          {juntos
            ? etiqueta(limitar((x0 + x1) / 2, 170), 170, `${formatearPrecio(lo)} – ${formatearPrecio(hi)}`)
            : (
              <>
                {etiqueta(limitar(x0, 80), 80, formatearPrecio(lo))}
                {etiqueta(limitar(x1, 80), 80, formatearPrecio(hi))}
              </>
            )}

          {/* Barra base */}
          <View
            style={{
              position: 'absolute',
              top: 24 + AREA_MANIJA / 2 - 4,
              left: AREA_MANIJA / 2,
              right: AREA_MANIJA / 2,
              height: 8,
              borderRadius: 4,
              backgroundColor: C.border,
            }}
          />
          {/* Tramo seleccionado */}
          <View
            style={{
              position: 'absolute',
              top: 24 + AREA_MANIJA / 2 - 4,
              left: x0,
              width: Math.max(x1 - x0, 0),
              height: 8,
              borderRadius: 4,
              backgroundColor: C.accent,
            }}
          />

          {manija(aPos(lo), gestoMin, 'Precio mínimo')}
          {manija(aPos(hi), gestoMax, 'Precio máximo')}

          {/* Límites de la barra */}
          <Text style={{ position: 'absolute', bottom: 0, left: 4, fontSize: 12, color: C.textMuted, fontWeight: '600' }}>
            {formatearPrecio(min)}
          </Text>
          <Text style={{ position: 'absolute', bottom: 0, right: 4, fontSize: 12, color: C.textMuted, fontWeight: '600' }}>
            {formatearPrecio(max)}
          </Text>
        </>
      )}
    </View>
  );
}

// ─── COMPONENTE: HOJA CON LISTA (panel que sube desde abajo) ─────────────────

type OpcionHoja = { valor: string | null; etiqueta: string; cantidad?: number | null; deshabilitada?: boolean };

function HojaLista({
  visible,
  titulo,
  opciones,
  seleccionado,
  onElegir,
  onCerrar,
}: {
  visible: boolean;
  titulo: string;
  opciones: OpcionHoja[];
  seleccionado: string | null;
  onElegir: (valor: string | null) => void;
  onCerrar: () => void;
}) {
  const { C, styles } = useResenasTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCerrar} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitulo}>{titulo}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {opciones.map((o) => {
              const activa = seleccionado === o.valor;
              return (
                <TouchableOpacity
                  key={o.valor ?? 'todos'}
                  style={[styles.sheetItem, o.deshabilitada && { opacity: 0.4 }]}
                  activeOpacity={0.7}
                  disabled={o.deshabilitada}
                  onPress={() => onElegir(o.valor)}
                >
                  <Text style={[styles.sheetItemTexto, activa && { color: C.accent, fontWeight: '800' }]}>
                    {o.etiqueta}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {o.cantidad != null && (
                      <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600' }}>{o.cantidad}</Text>
                    )}
                    {activa && <Ionicons name="checkmark" size={20} color={C.accent} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── COMPONENTE: BARRA DE FILTROS ────────────────────────────────────────────

function BarraFiltros({
  filtros,
  onChange,
  onLimpiar,
  contar,
  opciones,
  limitesPrecio,
}: {
  filtros: Filtros;
  opciones: Record<FiltroKey, Opcion[]>;
  limitesPrecio: { min: number; max: number };
  onChange: (key: FiltroKey, valor: string | null) => void;
  onLimpiar: () => void;
  contar: (key: FiltroKey, valor: string) => number;
}) {
  const { C, styles } = useResenasTheme();
  const [abierto, setAbierto] = useState<FiltroKey | null>(null);
  const hayActivos = FILTRO_KEYS.some((k) => filtros[k]);
  const metaAbierta = FILTROS_META.find((f) => f.key === abierto);

  return (
    <View style={styles.filtrosWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {FILTROS_META.map((f) => {
          const valor = filtros[f.key];
          const activo = !!valor;
          const estaAbierto = abierto === f.key;
          const etiqueta = !activo
            ? f.label
            : f.key === 'precio'
              ? parsearRango(valor!).map(formatearPrecio).join(' – ')
              : opciones[f.key].find((o) => o.valor === valor)?.etiqueta ?? f.label;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.8}
              onPress={() => setAbierto(estaAbierto ? null : f.key)}
              style={[styles.chip, estaAbierto && styles.chipAbierto, activo && styles.chipActivo]}
            >
              <Ionicons name={f.icon} size={15} color={activo ? C.onPrimary : C.textSec} />
              <Text style={[styles.chipText, activo && styles.chipTextActivo]}>{etiqueta}</Text>
              <Ionicons
                name={estaAbierto ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={activo ? C.onPrimary : C.textMuted}
              />
            </TouchableOpacity>
          );
        })}

        {hayActivos && (
          <TouchableOpacity
            style={styles.chipLimpiar}
            onPress={() => {
              onLimpiar();
              setAbierto(null);
            }}
          >
            <Ionicons name="close-circle" size={16} color={C.accent} />
            <Text style={styles.chipLimpiarText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <HojaLista
        visible={abierto === 'modelo'}
        titulo="Filtrar por año"
        seleccionado={filtros.modelo}
        opciones={[
          { valor: null, etiqueta: 'Todos los años' },
          ...opciones.modelo.map((o) => {
            const n = contar('modelo', o.valor);
            return { valor: o.valor, etiqueta: o.etiqueta, cantidad: n, deshabilitada: n === 0 && filtros.modelo !== o.valor };
          }),
        ]}
        onElegir={(v) => {
          onChange('modelo', v);
          setAbierto(null);
        }}
        onCerrar={() => setAbierto(null)}
      />

      {abierto === 'precio' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitulo}>Filtrar por precio</Text>
          <SliderPrecio
            min={limitesPrecio.min}
            max={limitesPrecio.max}
            inicial={filtros.precio ? parsearRango(filtros.precio) : [limitesPrecio.min, limitesPrecio.max]}
            onFin={(lo, hi) =>
              onChange('precio', lo <= limitesPrecio.min && hi >= limitesPrecio.max ? null : `${lo}-${hi}`)
            }
          />
        </View>
      )}

      {abierto && abierto !== 'precio' && abierto !== 'modelo' && metaAbierta && (
        <View style={styles.panel}>
          <Text style={styles.panelTitulo}>Filtrar por {metaAbierta.label.toLowerCase()}</Text>
          <View style={styles.pillsWrap}>
            {[{ valor: null as string | null, etiqueta: 'Todos' }, ...opciones[abierto]].map((o) => {
              const seleccionada = filtros[abierto] === o.valor;
              const cantidad = o.valor === null ? null : contar(abierto, o.valor);
              const sinResultados = cantidad === 0 && !seleccionada;
              return (
                <TouchableOpacity
                  key={o.valor ?? 'todos'}
                  disabled={sinResultados}
                  activeOpacity={0.8}
                  onPress={() => {
                    onChange(abierto, o.valor);
                    setAbierto(null);
                  }}
                  style={[
                    styles.pill,
                    seleccionada && styles.pillActiva,
                    sinResultados && styles.pillDeshabilitada,
                  ]}
                >
                  <Text style={[styles.pillText, seleccionada && styles.pillTextActiva]}>
                    {o.etiqueta}
                  </Text>
                  {cantidad !== null && (
                    <Text style={[styles.pillCantidad, seleccionada && styles.pillTextActiva]}>
                      {cantidad}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── COMPONENTE: SELECTOR DE MARCA (lista desplegable) ───────────────────────

function SelectorMarca({
  marcas,
  value,
  onChange,
  hayError,
}: {
  marcas: string[];
  value: string;
  onChange: (marca: string) => void;
  hayError: boolean;
}) {
  const { C, styles } = useResenasTheme();
  const [abierto, setAbierto] = useState(false);
  const [otra, setOtra] = useState(false);

  const elegir = (m: string) => {
    setOtra(false);
    onChange(m);
    setAbierto(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setAbierto(true)}
        style={[styles.campoInput, styles.selectorMarca, hayError && styles.campoInputError]}
        accessibilityLabel="Elegir marca"
      >
        <Text style={{ fontSize: 15, color: value || otra ? C.textPri : C.textMuted }}>
          {otra ? 'Otra marca' : value || 'Elige la marca'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      {otra && (
        <TextInput
          style={[styles.campoInput, { marginTop: 10 }, hayError && styles.campoInputError]}
          placeholder="Escribe la marca"
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChange}
          autoCapitalize="words"
          autoFocus
          maxLength={30}
        />
      )}

      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAbierto(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitulo}>Elige la marca</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {marcas.map((m) => {
                const activa = !otra && normalizar(value.trim()) === normalizar(m);
                return (
                  <TouchableOpacity key={m} style={styles.sheetItem} activeOpacity={0.7} onPress={() => elegir(m)}>
                    <Text style={[styles.sheetItemTexto, activa && { color: C.accent, fontWeight: '800' }]}>{m}</Text>
                    {activa && <Ionicons name="checkmark" size={20} color={C.accent} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.sheetItem}
                activeOpacity={0.7}
                onPress={() => {
                  setOtra(true);
                  onChange('');
                  setAbierto(false);
                }}
              >
                <Text style={[styles.sheetItemTexto, { color: C.textSec }]}>Otra marca…</Text>
                <Ionicons name="create-outline" size={18} color={C.textSec} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── COMPONENTE: SELECTOR DE AÑO (lista desplegable) ─────────────────────────

function SelectorAnio({
  value,
  onChange,
  anioMaximo,
  hayError,
}: {
  value: string;
  onChange: (anio: string) => void;
  anioMaximo: number;
  hayError: boolean;
}) {
  const { C, styles } = useResenasTheme();
  const [abierto, setAbierto] = useState(false);
  const anios = useMemo(
    () => Array.from({ length: anioMaximo - ANIO_MINIMO + 1 }, (_, i) => String(anioMaximo - i)),
    [anioMaximo]
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setAbierto(true)}
        style={[styles.campoInput, styles.selectorMarca, hayError && styles.campoInputError]}
        accessibilityLabel="Elegir año"
      >
        <Text style={{ fontSize: 15, color: value ? C.textPri : C.textMuted }}>{value || 'Elige el año'}</Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      <HojaLista
        visible={abierto}
        titulo="Elige el año del modelo"
        seleccionado={value || null}
        opciones={anios.map((a) => ({ valor: a, etiqueta: a }))}
        onElegir={(v) => {
          onChange(v ?? '');
          setAbierto(false);
        }}
        onCerrar={() => setAbierto(false)}
      />
    </>
  );
}

// ─── PANTALLA DETALLE ─────────────────────────────────────────────────────────

function DetalleResena({
  moto,
  onBack,
  onPublicar,
  onEditar,
  onEliminar,
}: {
  moto: Moto;
  onBack: () => void;
  // Devuelve true si la reseña se guardó (entonces el formulario se cierra)
  onPublicar: (comentario: Comentario) => Promise<boolean>;
  // Solo se pasan cuando la moto es del usuario que la está viendo
  onEditar?: () => void;
  onEliminar?: () => void;
}) {
  const { C, styles } = useResenasTheme();
  const yaResene = moto.comentarios.some((c) => c.esPropia);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [textoResena, setTextoResena] = useState('');
  const [estrellaSeleccionada, setEstrellaSeleccionada] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const limpiarFormulario = () => {
    setMostrarFormulario(false);
    setTextoResena('');
    setEstrellaSeleccionada(0);
  };

  const enviarResena = async () => {
    if (enviando) return;
    if (estrellaSeleccionada === 0) {
      Alert.alert('Falta la calificación', 'Elige de 1 a 5 estrellas para calificar la moto.');
      return;
    }
    if (!textoResena.trim()) {
      Alert.alert('Falta tu comentario', 'Cuéntanos tu experiencia antes de publicar.');
      return;
    }
    setEnviando(true);
    // El nombre que se muestra sale de `perfiles.username`; la pantalla principal lo completa.
    const guardada = await onPublicar({
      usuario: '',
      texto: textoResena.trim(),
      puntuacion: estrellaSeleccionada,
      esPropia: true,
    });
    setEnviando(false);
    if (guardada) limpiarFormulario();
  };

  const specs: { icon: IconName; label: string; valor: string }[] = [
    { icon: 'speedometer-outline', label: 'Cilindraje', valor: `${moto.cilindrada} cc` },
    { icon: 'flash-outline', label: 'Tipo', valor: moto.tipo },
    { icon: 'calendar-outline', label: 'Modelo', valor: String(moto.modelo) },
    { icon: 'pricetag-outline', label: 'Marca', valor: moto.marca },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header detalle con botón de retorno */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.iconBtn}
          accessibilityLabel="Volver a la lista"
        >
          <Ionicons name="arrow-back" size={22} color={C.textPri} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Detalle de la moto</Text>
        <BotonTema />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ImagenMoto imagen={moto.imagen} style={styles.imagenDetalle} />

        <View style={styles.detalleContent}>
          <Text style={styles.detalleMarca}>{moto.marca}</Text>
          <Text style={styles.detalleTitulo}>{moto.nombre}</Text>
          <Text style={styles.detallePrecio}>{formatearPrecio(moto.precio)}</Text>
          {(moto.propietario || moto.esPropia) && (
            <Text style={styles.detallePropietario}>
              Publicada por {moto.propietario ?? 'ti'}
            </Text>
          )}

          {/* Solo el dueño de la publicación ve estos botones */}
          {moto.esPropia && (onEditar || onEliminar) && (
            <View style={styles.accionesPropias}>
              {onEditar && (
                <TouchableOpacity style={styles.btnAccionPropia} onPress={onEditar} activeOpacity={0.85}>
                  <Ionicons name="create-outline" size={18} color={C.textPri} />
                  <Text style={styles.btnAccionPropiaText}>Editar</Text>
                </TouchableOpacity>
              )}
              {onEliminar && (
                <TouchableOpacity
                  style={[styles.btnAccionPropia, styles.btnAccionPeligro]}
                  onPress={onEliminar}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={18} color={C.danger} />
                  <Text style={[styles.btnAccionPropiaText, { color: C.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Calificación */}
          {moto.comentarios.length === 0 ? (
            <Text style={styles.detalleSinResenas}>Aún no tiene reseñas</Text>
          ) : (
            <View style={styles.detalleRating}>
              <Text style={styles.detalleRatingNum}>{moto.puntuacion.toFixed(1)}</Text>
              <View>
                <Estrellas puntuacion={moto.puntuacion} size={20} />
                <Text style={styles.detalleRatingSub}>
                  {moto.comentarios.length} {moto.comentarios.length === 1 ? 'reseña' : 'reseñas'}
                </Text>
              </View>
            </View>
          )}

          {/* Ficha técnica */}
          <View style={styles.specsGrid}>
            {specs.map((s) => (
              <View key={s.label} style={styles.specItem}>
                <Ionicons name={s.icon} size={18} color={C.accent} />
                <Text style={styles.specLabel}>{s.label}</Text>
                <Text style={styles.specValor} numberOfLines={1}>
                  {s.valor}
                </Text>
              </View>
            ))}
          </View>

          {/* Descripción */}
          <Text style={styles.seccionTitulo}>Descripción</Text>
          <Text style={styles.seccionTexto}>{moto.descripcion}</Text>

          {/* Comentarios */}
          <Text style={[styles.seccionTitulo, { marginTop: 24 }]}>Opiniones de usuarios</Text>
          {moto.comentarios.length === 0 && (
            <Text style={styles.comentariosVacio}>Todavía no hay opiniones. ¡Sé la primera persona en escribir una!</Text>
          )}
          {moto.comentarios.map((c, idx) => (
            <View
              key={idx}
              style={[styles.comentarioCard, c.esPropia && styles.comentarioPropio]}
            >
              <View style={styles.comentarioHeader}>
                <View style={[styles.avatarCircle, c.esPropia && styles.avatarPropio]}>
                  <Ionicons name="person" size={18} color={c.esPropia ? C.accent : C.textSec} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.comentarioUsuario}>{c.usuario}</Text>
                  {c.esPropia && <Text style={styles.tuResena}>Tu reseña</Text>}
                </View>
                {c.puntuacion ? <Estrellas puntuacion={c.puntuacion} size={14} /> : null}
              </View>
              <Text style={styles.comentarioTexto}>{c.texto}</Text>
            </View>
          ))}

          {/* Botón / formulario de reseña */}
          {!yaResene && !mostrarFormulario && (
            <TouchableOpacity
              style={styles.btnPrimario}
              onPress={() => setMostrarFormulario(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color={C.onPrimary} />
              <Text style={styles.btnPrimarioText}>Escribir una reseña</Text>
            </TouchableOpacity>
          )}

          {!yaResene && mostrarFormulario && (
            <View style={styles.formularioResena}>
              <Text style={styles.formularioTitulo}>Tu reseña</Text>

              <Text style={styles.formularioLabel}>Calificación</Text>
              <CalificacionInteractiva valor={estrellaSeleccionada} onChange={setEstrellaSeleccionada} />

              <Text style={styles.formularioLabel}>Comentario</Text>
              <TextInput
                style={[styles.formularioInput, styles.formularioTextarea]}
                placeholder="Comparte tu experiencia con esta moto..."
                placeholderTextColor={C.textMuted}
                value={textoResena}
                onChangeText={setTextoResena}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.formularioBotones}>
                <TouchableOpacity style={styles.btnCancelar} onPress={limpiarFormulario}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnEnviar, enviando && { opacity: 0.6 }]}
                  onPress={enviarResena}
                  disabled={enviando}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnEnviarText}>{enviando ? 'Publicando…' : 'Publicar reseña'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {yaResene && (
            <View style={styles.yaReseneBadge}>
              <Ionicons name="checkmark-circle" size={18} color={C.success} />
              <Text style={styles.yaReseneText}>Ya escribiste una reseña para esta moto</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── FORMULARIO: PUBLICAR MI MOTO ────────────────────────────────────────────

type CampoForm = 'nombre' | 'marca' | 'modelo' | 'tipo' | 'cilindrada' | 'precio' | 'descripcion';
type Errores = Partial<Record<CampoForm, string>>;

const ORDEN_CAMPOS: CampoForm[] = ['nombre', 'marca', 'modelo', 'tipo', 'cilindrada', 'precio', 'descripcion'];
const ANIO_MINIMO = 1980;
const MAX_DESCRIPCION = 500;

const soloDigitos = (s: string) => s.replace(/\D/g, '');

/** Un campo del formulario: etiqueta, contenido y mensaje de error o ayuda. */
function Campo({
  label,
  error,
  ayuda,
  onLayout,
  children,
}: {
  label: string;
  error?: string;
  ayuda?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const { C, styles } = useResenasTheme();
  return (
    <View style={styles.campo} onLayout={onLayout}>
      <Text style={styles.campoLabel}>{label}</Text>
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={C.danger} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={styles.campoAyuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

function InputNumerico({
  value,
  onChangeText,
  placeholder,
  prefijo,
  sufijo,
  maxLength,
  error,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  prefijo?: string;
  sufijo?: string;
  maxLength: number;
  error?: string;
}) {
  const { C, styles } = useResenasTheme();
  return (
    <View style={[styles.campoInput, styles.inputFila, !!error && styles.campoInputError]}>
      {prefijo ? <Text style={styles.inputAdorno}>{prefijo}</Text> : null}
      <TextInput
        style={styles.inputNumero}
        value={value}
        onChangeText={(t) => onChangeText(soloDigitos(t))}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType="number-pad"
        maxLength={maxLength}
      />
      {sufijo ? <Text style={styles.inputAdorno}>{sufijo}</Text> : null}
    </View>
  );
}

function FormularioMoto({
  marcas,
  inicial,
  onBack,
  onPublicar,
  sucioRef,
}: {
  marcas: string[];
  inicial?: Moto; // si viene, el formulario edita esa moto en lugar de crear una nueva
  onBack: () => void;
  // Guarda la moto en la BD; el formulario se cierra desde la pantalla principal si todo sale bien
  onPublicar: (datos: DatosMoto) => Promise<void>;
  sucioRef: { current: boolean };
}) {
  const { C, styles } = useResenasTheme();
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<CampoForm, number>>>({});

  const [foto, setFoto] = useState<string | null>(typeof inicial?.imagen === 'string' ? inicial.imagen : null);
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [marca, setMarca] = useState(inicial?.marca ?? '');
  const [modelo, setModelo] = useState(inicial ? String(inicial.modelo) : '');
  const [tipo, setTipo] = useState<string | null>(inicial?.tipo || null);
  const [cilindrada, setCilindrada] = useState(inicial ? String(inicial.cilindrada) : '');
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio) : '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [propietario, setPropietario] = useState(inicial?.propietario ?? '');
  const [errores, setErrores] = useState<Errores>({});
  const [publicando, setPublicando] = useState(false);

  const anioMaximo = new Date().getFullYear() + 1;

  // Avisa a la pantalla principal si hay datos escritos (para confirmar antes de salir)
  // "Sucio" = hay cambios respecto a como se abrió el formulario (vacío al crear, la moto al editar)
  const valoresIniciales = useRef(
    JSON.stringify([foto, nombre, marca, modelo, tipo, cilindrada, precio, descripcion, propietario])
  ).current;
  const sucio =
    JSON.stringify([foto, nombre, marca, modelo, tipo, cilindrada, precio, descripcion, propietario]) !== valoresIniciales;
  useEffect(() => {
    sucioRef.current = sucio;
  }, [sucio, sucioRef]);
  useEffect(() => {
    return () => {
      sucioRef.current = false;
    };
  }, [sucioRef]);

  const limpiarError = (k: CampoForm) => setErrores((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  const alMedir = (k: CampoForm) => (e: LayoutChangeEvent) => {
    posiciones.current[k] = e.nativeEvent.layout.y;
  };

  // ── Foto ──
  // Nota: la galería NO necesita pedir permiso previo (usa el selector del sistema en Android/iOS recientes).
  // Pedirlo antes podía bloquear el selector sin mostrar nada, así que se abre directo.
  const abrirGaleria = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!r.canceled && r.assets?.length) setFoto(r.assets[0].uri);
    } catch (e: any) {
      Alert.alert('No se pudo abrir la galería', e?.message ?? 'Inténtalo de nuevo.');
    }
  };

  const tomarFoto = async () => {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso de cámara', 'Activa el permiso de cámara en los ajustes del teléfono para tomar la foto.');
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!r.canceled && r.assets?.length) setFoto(r.assets[0].uri);
    } catch (e: any) {
      Alert.alert('No se pudo abrir la cámara', e?.message ?? 'Inténtalo de nuevo.');
    }
  };

  const elegirFoto = () => {
    // En web Alert.alert con botones no hace nada, así que se abre la galería directamente
    if (Platform.OS === 'web') {
      abrirGaleria();
      return;
    }
    Alert.alert('Foto de tu moto', '¿De dónde quieres tomarla?', [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de la galería', onPress: abrirGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // ── Publicar ──
  const publicar = async () => {
    if (publicando) return;
    const e: Errores = {};
    const nombreLimpio = nombre.trim();
    const marcaLimpia = marca.trim();
    const anio = Number(modelo);
    const cc = Number(cilindrada);
    const precioNum = Number(precio);

    if (nombreLimpio.length < 3) e.nombre = 'Escribe el nombre de la moto (mínimo 3 letras).';
    if (!marcaLimpia) e.marca = 'Elige la marca de tu moto.';
    if (!modelo || anio < ANIO_MINIMO || anio > anioMaximo) e.modelo = 'Elige el año de tu moto.';
    if (!tipo) e.tipo = 'Elige el tipo de moto.';
    if (!cilindrada || cc < 50 || cc > 3000) e.cilindrada = 'Escribe la cilindrada en cc (entre 50 y 3000).';
    if (!precio || precioNum <= 0) e.precio = 'Escribe el precio en pesos.';
    if (descripcion.trim().length < 20) e.descripcion = 'Cuéntanos un poco más (mínimo 20 caracteres).';

    setErrores(e);
    const primero = ORDEN_CAMPOS.find((k) => e[k]);
    if (primero) {
      scrollRef.current?.scrollTo({ y: Math.max((posiciones.current[primero] ?? 0) - 16, 0), animated: true });
      return;
    }

    // Si la marca ya existe (aunque la escriban en minúsculas) usamos la escritura original
    const marcaExistente = marcas.find((m) => normalizar(m) === normalizar(marcaLimpia));

    setPublicando(true);
    try {
      await onPublicar({
        nombre: nombreLimpio,
        marca: marcaExistente ?? marcaLimpia,
        modelo: anio,
        tipo: tipo as string,
        cilindrada: cc,
        precio: precioNum,
        descripcion: descripcion.trim(),
        // `foto` es una ruta local: la pantalla principal la sube al bucket `motos` y guarda la URL
        imagen: foto ?? undefined,
        propietario: propietario.trim() || undefined,
      });
    } finally {
      setPublicando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityLabel="Volver a la lista">
          <Ionicons name="arrow-back" size={22} color={C.textPri} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>{inicial ? 'Editar mi moto' : 'Publicar mi moto'}</Text>
        <BotonTema />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.formContent}
      >
        <Text style={styles.formIntro}>
          Comparte tu moto con la comunidad. Los campos con * son obligatorios.
        </Text>

        {/* Foto */}
        <View style={styles.fotoBox}>
          {foto ? (
            <>
              <Image source={{ uri: foto }} style={styles.fotoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.fotoQuitar} onPress={() => setFoto(null)} accessibilityLabel="Quitar foto">
                <Ionicons name="close" size={18} color={C.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.fotoCambiar} onPress={elegirFoto} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={16} color={C.textPri} />
                <Text style={styles.fotoCambiarText}>Cambiar foto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.fotoVacia} onPress={elegirFoto} activeOpacity={0.8}>
              <MaterialCommunityIcons name="camera-plus-outline" size={36} color={C.accent} />
              <Text style={styles.fotoVaciaTitulo}>Agregar foto de tu moto</Text>
              <Text style={styles.fotoVaciaSub}>Toma una foto o elige una de tu galería</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nombre */}
        <Campo label="Nombre de la moto *" error={errores.nombre} onLayout={alMedir('nombre')}>
          <TextInput
            style={[styles.campoInput, !!errores.nombre && styles.campoInputError]}
            placeholder="Ej. Honda CB190R Negra"
            placeholderTextColor={C.textMuted}
            value={nombre}
            onChangeText={(t) => {
              setNombre(t);
              limpiarError('nombre');
            }}
            autoCapitalize="words"
            maxLength={60}
          />
        </Campo>

        {/* Marca */}
        <Campo label="Marca *" error={errores.marca} onLayout={alMedir('marca')}>
          <SelectorMarca
            marcas={marcas}
            value={marca}
            onChange={(m) => {
              setMarca(m);
              limpiarError('marca');
            }}
            hayError={!!errores.marca}
          />
        </Campo>

        {/* Modelo (año) */}
        <Campo
          label="Modelo (año) *"
          error={errores.modelo}
          onLayout={alMedir('modelo')}
        >
          <SelectorAnio
            value={modelo}
            onChange={(a) => {
              setModelo(a);
              limpiarError('modelo');
            }}
            anioMaximo={anioMaximo}
            hayError={!!errores.modelo}
          />
        </Campo>

        {/* Tipo */}
        <Campo label="Tipo *" error={errores.tipo} onLayout={alMedir('tipo')}>
          <View style={styles.pillsWrap}>
            {TIPOS_MOTO.map((t) => {
              const activa = tipo === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.8}
                  style={[styles.pill, activa && styles.pillActiva]}
                  onPress={() => {
                    setTipo(t);
                    limpiarError('tipo');
                  }}
                >
                  <Text style={[styles.pillText, activa && styles.pillTextActiva]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Campo>

        {/* Cilindraje */}
        <Campo label="Cilindraje *" error={errores.cilindrada} onLayout={alMedir('cilindrada')}>
          <InputNumerico
            value={cilindrada}
            onChangeText={(t) => {
              setCilindrada(t);
              limpiarError('cilindrada');
            }}
            placeholder="250"
            sufijo="cc"
            maxLength={4}
            error={errores.cilindrada}
          />
        </Campo>

        {/* Precio */}
        <Campo label="Precio *" error={errores.precio} onLayout={alMedir('precio')}>
          <InputNumerico
            value={precio}
            onChangeText={(t) => {
              setPrecio(t);
              limpiarError('precio');
            }}
            placeholder="45000"
            prefijo="$"
            sufijo="MXN"
            maxLength={8}
            error={errores.precio}
          />
        </Campo>

        {/* Descripción */}
        <Campo
          label="Descripción *"
          error={errores.descripcion}
          ayuda={`${descripcion.length}/${MAX_DESCRIPCION}`}
          onLayout={alMedir('descripcion')}
        >
          <TextInput
            style={[styles.campoInput, styles.campoInputMulti, !!errores.descripcion && styles.campoInputError]}
            placeholder="Cuéntanos del estado, kilometraje, mantenimiento y por qué la recomiendas."
            placeholderTextColor={C.textMuted}
            value={descripcion}
            onChangeText={(t) => {
              setDescripcion(t);
              limpiarError('descripcion');
            }}
            multiline
            maxLength={MAX_DESCRIPCION}
            textAlignVertical="top"
          />
        </Campo>

        {/* Propietario */}
        <Campo label="Tu nombre (opcional)" ayuda="Se mostrará como “Publicada por”.">
          <TextInput
            style={styles.campoInput}
            placeholder="Ej. Carlos G."
            placeholderTextColor={C.textMuted}
            value={propietario}
            onChangeText={setPropietario}
            autoCapitalize="words"
            maxLength={30}
          />
        </Campo>

        <TouchableOpacity
          style={[styles.btnPrimario, publicando && { opacity: 0.6 }]}
          onPress={publicar}
          disabled={publicando}
          activeOpacity={0.85}
        >
          <Ionicons name={inicial ? 'save-outline' : 'cloud-upload-outline'} size={18} color={C.onPrimary} />
          <Text style={styles.btnPrimarioText}>
            {publicando ? (inicial ? 'Guardando…' : 'Publicando…') : inicial ? 'Guardar cambios' : 'Publicar moto'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── COMPONENTE: FORMULARIO FLOTANTE "¿TIENES UN PROBLEMA?" ───────────────────

function ModalProblema({
  visible,
  onClose,
  onEnviado,
}: {
  visible: boolean;
  onClose: () => void;
  onEnviado: () => void;
}) {
  const { C, styles } = useResenasTheme();
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cerrar = () => {
    if (enviando) return;
    setError('');
    onClose();
  };

  const enviar = async () => {
    const texto = mensaje.trim();
    const correoLimpio = correo.trim();

    if (texto.length < 10) {
      setError('Cuéntanos un poco más del problema (mínimo 10 caracteres).');
      return;
    }
    if (correoLimpio && !/^\S+@\S+\.\S+$/.test(correoLimpio)) {
      setError('Escribe un correo válido o déjalo vacío.');
      return;
    }
    if (!EMAILJS_CONFIGURADO) {
      setError('El envío de correos aún no está configurado (faltan las llaves de EmailJS).');
      return;
    }

    setError('');
    setEnviando(true);
    try {
      await emailjs.send(
        EMAILJS.serviceId,
        EMAILJS.templateId,
        {
          mensaje: texto,
          correo_usuario: correoLimpio || 'No proporcionó correo',
          pantalla: 'Reseñas de motos',
          plataforma: `${Platform.OS} ${Platform.Version}`,
          fecha: new Date().toLocaleString('es-MX'),
        },
        { publicKey: EMAILJS.publicKey }
      );
      setMensaje('');
      setCorreo('');
      onClose();
      onEnviado(); // el aviso verde aparece en la pantalla de la lista
    } catch (e: any) {
      setError(
        e?.text
          ? `No se pudo enviar el reporte (${e.text}).`
          : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <KeyboardAvoidingView style={styles.problemaOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={cerrar} />
        <ScrollView
          style={styles.problemaScroll}
          contentContainerStyle={styles.problemaScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.problemaCard}>
            <View style={styles.ayudaHeader}>
              <Ionicons name="help-buoy-outline" size={22} color={C.accent} />
              <Text style={styles.ayudaTitulo}>¿Tienes un problema?</Text>
              <TouchableOpacity onPress={cerrar} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={20} color={C.textSec} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formIntro}>
              Cuéntanos qué error o problema tuviste y lo revisaremos lo antes posible.
            </Text>

            <Text style={styles.campoLabel}>Tu correo (opcional)</Text>
            <TextInput
              style={[styles.campoInput, { marginBottom: 16 }]}
              value={correo}
              onChangeText={setCorreo}
              placeholder="para poder responderte"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!enviando}
            />

            <Text style={styles.campoLabel}>Describe el problema</Text>
            <TextInput
              style={[styles.campoInput, styles.campoInputMulti]}
              value={mensaje}
              onChangeText={(t) => {
                setMensaje(t);
                if (error) setError('');
              }}
              placeholder="Ej. Al publicar mi moto la app se cierra..."
              placeholderTextColor={C.textMuted}
              multiline
              maxLength={1000}
              editable={!enviando}
            />

            {!!error && (
              <View style={styles.problemaError}>
                <Ionicons name="close-circle" size={20} color={C.danger} />
                <Text style={styles.problemaErrorTexto}>{error}</Text>
              </View>
            )}

            <View style={[styles.formularioBotones, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.btnCancelar} onPress={cerrar} disabled={enviando}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnEnviar, enviando && { opacity: 0.7 }]}
                onPress={enviar}
                disabled={enviando}
              >
                {enviando ? (
                  <ActivityIndicator color={C.onPrimary} />
                ) : (
                  <Text style={styles.btnEnviarText}>Enviar reporte</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── COMPONENTE: AVISO FLOTANTE (ÉXITO / ERROR) ──────────────────────────────

function AvisoToast({
  aviso,
  onHide,
}: {
  aviso: { tipo: 'ok' | 'error'; texto: string } | null;
  onHide: () => void;
}) {
  const { C, styles } = useResenasTheme();
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!aviso) return;
    opacidad.setValue(0);
    Animated.timing(opacidad, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacidad, { toValue: 0, duration: 220, useNativeDriver: true }).start(onHide);
    }, 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;
  const ok = aviso.tipo === 'ok';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { opacity: opacidad, backgroundColor: ok ? C.successBg : C.dangerSoft, borderColor: ok ? C.success : C.danger },
      ]}
    >
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={22} color={ok ? C.success : C.danger} />
      <Text style={[styles.toastTexto, { color: ok ? C.success : C.danger }]}>{aviso.texto}</Text>
    </Animated.View>
  );
}

// ─── PANTALLA LISTA ──────────────────────────────────────────────────────────

function ListaResenas({
  motos,
  onSelectMoto,
  onBack,
  onPublicar,
}: {
  motos: Moto[];
  onSelectMoto: (moto: Moto) => void;
  onBack: () => void;
  onPublicar: () => void;
}) {
  const { C, styles, isDarkMode } = useResenasTheme();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [busqueda, setBusqueda] = useState('');
  const [buscadorEnfocado, setBuscadorEnfocado] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [mostrarProblema, setMostrarProblema] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Los filtros se recalculan cuando se publica una moto nueva
  const opciones = useMemo(() => generarOpciones(motos), [motos]);
  const limitesPrecio = useMemo(() => calcularLimitesPrecio(motos), [motos]);

  const motosFiltradas = useMemo(() => filtrar(motos, filtros, busqueda), [motos, filtros, busqueda]);

  const hayFiltros = FILTRO_KEYS.some((k) => filtros[k]) || busqueda.trim().length > 0;

  const cambiarFiltro = (key: FiltroKey, valor: string | null) =>
    setFiltros((prev) => ({ ...prev, [key]: valor }));

  const limpiarTodo = () => {
    setFiltros(FILTROS_VACIOS);
    setBusqueda('');
  };

  // Cuántas motos quedarían si el usuario elige esa opción (respetando los demás filtros)
  const contar = (key: FiltroKey, valor: string) =>
    filtrar(motos, { ...filtros, [key]: valor }, busqueda).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* ── MODAL DE AYUDA ── */}
      {mostrarAyuda && (
        <TouchableOpacity
          style={styles.ayudaOverlay}
          activeOpacity={1}
          onPress={() => setMostrarAyuda(false)}
        >
          <View style={styles.ayudaCard} onStartShouldSetResponder={() => true}>
            <View style={styles.ayudaHeader}>
              <Ionicons name="help-circle" size={22} color={C.accent} />
              <Text style={styles.ayudaTitulo}>¿Cómo usar esta pantalla?</Text>
              <TouchableOpacity onPress={() => setMostrarAyuda(false)}>
                <Ionicons name="close" size={20} color={C.textSec} />
              </TouchableOpacity>
            </View>

            {[
              {
                icon: 'search-outline',
                titulo: 'Buscador',
                desc: 'Escribe el nombre, la marca o el tipo de moto y la lista se filtra al instante.',
              },
              {
                icon: 'options-outline',
                titulo: 'Filtros',
                desc: 'Combina Marca, Precio, Cilindraje y Modelo. El número junto a cada opción indica cuántas motos hay.',
              },
              {
                icon: 'hand-left-outline',
                titulo: 'Ver reseña',
                desc: 'Toca cualquier moto para ver su descripción y las opiniones. Usa la flecha para regresar.',
              },
              {
                icon: 'add-circle-outline',
                titulo: 'Publicar mi moto',
                desc: 'Toca el botón "Publicar mi moto" para subir tu moto con foto, precio y descripción.',
              },
            ].map((item) => (
              <View key={item.titulo} style={styles.ayudaItem}>
                <View style={styles.ayudaIconBox}>
                  <Ionicons name={item.icon as IconName} size={18} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ayudaItemTitulo}>{item.titulo}</Text>
                  <Text style={styles.ayudaItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.btnPrimario} onPress={() => setMostrarAyuda(false)}>
              <Text style={styles.btnPrimarioText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Header lista */}
      <View style={styles.header}>
        <View style={styles.headerLado}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack} accessibilityLabel="Regresar">
            <Ionicons name="arrow-back" size={22} color={C.textPri} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitulo}>Reseñas de motos</Text>
        <View style={[styles.headerLado, styles.headerLadoDerecho]}>
          <BotonTema />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMostrarAyuda(true)}
            accessibilityLabel="Ayuda"
          >
            <Ionicons name="help-circle-outline" size={22} color={C.textPri} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador (siempre visible arriba) */}
      <View style={styles.buscadorContainer}>
        <Ionicons name="search-outline" size={18} color={C.textMuted} />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar por nombre, marca o tipo"
          placeholderTextColor={C.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
          onFocus={() => setBuscadorEnfocado(true)}
          onBlur={() => setBuscadorEnfocado(false)}
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <BarraFiltros
        filtros={filtros}
        onChange={cambiarFiltro}
        onLimpiar={() => setFiltros(FILTROS_VACIOS)}
        contar={contar}
        opciones={opciones}
        limitesPrecio={limitesPrecio}
      />

      {/* Lista */}
      <FlatList
        data={motosFiltradas}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listaContent}
        ListHeaderComponent={
          <Text style={styles.resultadosTexto}>
            {motosFiltradas.length} {motosFiltradas.length === 1 ? 'moto encontrada' : 'motos encontradas'}
          </Text>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.problemaBtn}
            onPress={() => setMostrarProblema(true)}
            accessibilityLabel="¿Tienes un problema?"
          >
            <Ionicons name="help-buoy-outline" size={18} color={C.textSec} />
            <Text style={styles.problemaBtnText}>¿Tienes un problema?</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <MaterialCommunityIcons name="motorbike-off" size={56} color={C.textMuted} />
            <Text style={styles.vacioTitulo}>No encontramos motos</Text>
            <Text style={styles.vacioTexto}>Prueba con otra búsqueda o quita algún filtro.</Text>
            {hayFiltros && (
              <TouchableOpacity style={styles.btnSecundario} onPress={limpiarTodo}>
                <Text style={styles.btnSecundarioText}>Limpiar búsqueda y filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.motoCard} onPress={() => onSelectMoto(item)} activeOpacity={0.85}>
            <ImagenMoto imagen={item.imagen} style={styles.motoImagen} />

            <View style={styles.motoInfo}>
              <Text style={styles.motoMarca}>
                {item.marca} {item.modelo}
              </Text>
              <Text style={styles.motoNombre} numberOfLines={2}>
                {item.nombre}
              </Text>

              <View style={styles.ratingRow}>
                {item.comentarios.length === 0 ? (
                  <Text style={styles.reseniasNum}>Sin reseñas</Text>
                ) : (
                  <>
                    <Estrellas puntuacion={item.puntuacion} size={14} />
                    <Text style={styles.puntuacionNum}>{item.puntuacion.toFixed(1)}</Text>
                    <Text style={styles.reseniasNum}>({item.comentarios.length})</Text>
                  </>
                )}
              </View>

              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.cilindrada} cc</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.tipo}</Text>
                </View>
                {item.esPropia && (
                  <View style={[styles.tag, styles.tagPropia]}>
                    <Text style={[styles.tagText, styles.tagPropiaText]}>Tu moto</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.motoPrecio}>{formatearPrecio(item.precio)}</Text>
                <View style={styles.verBtn}>
                  <Text style={styles.verBtnText}>Ver reseña</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.accent} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Botón flotante: publicar mi moto */}
      {!buscadorEnfocado && (
        <TouchableOpacity
          style={styles.fab}
          onPress={onPublicar}
          activeOpacity={0.9}
          accessibilityLabel="Publicar mi moto"
        >
          <Ionicons name="add" size={22} color={C.onPrimary} />
          <Text style={styles.fabText}>Publicar mi moto</Text>
        </TouchableOpacity>
      )}

      {/* Formulario flotante: reportar un problema */}
      <ModalProblema
        visible={mostrarProblema}
        onClose={() => setMostrarProblema(false)}
        onEnviado={() => setAviso({ tipo: 'ok', texto: '¡Correo enviado! Recibimos tu reporte, gracias por avisarnos.' })}
      />

      {/* Aviso de resultado del envío */}
      <AvisoToast aviso={aviso} onHide={() => setAviso(null)} />
    </View>
  );
}

// ─── PANTALLA PRINCIPAL (NAVEGACIÓN ENTRE VISTAS) ────────────────────────────

export default function ResenasScreen({ navigation }: any) {
  const { styles } = useResenasTheme();
  // Catálogo en estado: aquí se agregan las motos que publica la gente
  const [catalogo, setCatalogo] = useState<Moto[]>(MOTOS);
  const [motoId, setMotoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [motoEditandoId, setMotoEditandoId] = useState<string | null>(null); // moto que se está editando
  const [aviso, setAviso] = useState<AvisoData | null>(null); // notificación flotante
  const formularioSucio = useRef(false); // el formulario avisa aquí si tiene datos sin publicar

  // Las reseñas viven aquí para que no se pierdan al ir y venir entre vistas
  const [comentarios, setComentarios] = useState<Record<string, Comentario[]>>(() =>
    MOTOS.reduce<Record<string, Comentario[]>>((acc, m) => {
      acc[m.id] = m.comentarios;
      return acc;
    }, {})
  );

  // Reseñas guardadas en la tabla `resenas` (de todos los usuarios), agrupadas por moto
  const [resenasBD, setResenasBD] = useState<Record<string, Comentario[]>>({});
  const [usuarioActual, setUsuarioActual] = useState<{ id: string; username: string } | null>(null);

  // Carga el usuario logueado y todas las reseñas de motos al abrir la pantalla
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid: string | null = auth?.user?.id ?? null;

        if (uid) {
          const { data: perfil } = await supabase.from(TABLA_PERFILES).select('username').eq('id', uid).maybeSingle();
          if (activo) setUsuarioActual({ id: uid, username: perfil?.username ?? 'Tú' });
        }

        // Catálogo: motos publicadas por usuarios (tabla `motos_catalogo`), más nuevas primero
        const { data: filasMotos, error: errorMotos } = await supabase
          .from('motos_catalogo')
          .select('*')
          .order('created_at', { ascending: false });
        // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
        console.log('[Catálogo] motos leídas:', filasMotos?.length, '| error:', errorMotos?.message ?? null);
        if (!errorMotos && filasMotos && activo) {
          setCatalogo([...filasMotos.map((f: any) => filaAMoto(f, uid)), ...MOTOS]);
        }

        // Tabla `resenas`: una fila por reseña. La moto se identifica con entidad_evaluada (id de la moto).
        const { data: filas, error } = await supabase
          .from('resenas')
          .select('perfil_id, entidad_evaluada, calificacion, comentario, created_at')
          .eq('tipo_entidad', TIPO_ENTIDAD_MOTO)
          .order('created_at', { ascending: true });
        // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
        console.log('[Reseñas] usuario logueado:', uid);
        console.log('[Reseñas] filas leídas:', filas?.length, '| error:', error);

        if (error || !filas) {
          console.warn('No se pudieron cargar las reseñas:', error?.message);
          return;
        }

        // Nombres de quienes reseñaron (tabla `perfiles`)
        const ids: string[] = Array.from(new Set(filas.map((f: any) => f.perfil_id).filter(Boolean)));
        const nombres: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: perfiles } = await supabase.from(TABLA_PERFILES).select('id, username').in('id', ids);
          (perfiles ?? []).forEach((p: any) => {
            nombres[p.id] = p.username;
          });
        }

        const agrupadas: Record<string, Comentario[]> = {};
        filas.forEach((f: any) => {
          const lista = agrupadas[f.entidad_evaluada] ?? (agrupadas[f.entidad_evaluada] = []);
          lista.push({
            usuario: nombres[f.perfil_id] ?? 'Usuario',
            texto: f.comentario ?? '',
            puntuacion: f.calificacion ?? undefined,
            esPropia: !!uid && f.perfil_id === uid,
            deBD: true,
          });
        });
        if (activo) setResenasBD(agrupadas);
      } catch (e: any) {
        console.warn('Error al conectar con la base de datos:', e?.message);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const motos = useMemo(
    () =>
      catalogo.map((m) => {
        // reseñas de ejemplo (locales) + reseñas reales guardadas en la BD
        const coms = [...(comentarios[m.id] ?? m.comentarios), ...(resenasBD[m.id] ?? [])];
        return { ...m, comentarios: coms, puntuacion: calcularPuntuacion(m, coms) };
      }),
    [catalogo, comentarios, resenasBD]
  );

  const marcasExistentes = useMemo(() => {
    const todas = [...MARCAS_MOTO];
    motos.forEach((m) => {
      if (!todas.some((x) => normalizar(x) === normalizar(m.marca))) todas.push(m.marca);
    });
    return todas.sort((a, b) => a.localeCompare(b));
  }, [motos]);

  const motoActual = motos.find((m) => m.id === motoId) ?? null;

  const salirDePantalla = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  // Cierra el formulario; si ya escribieron algo, pregunta antes de descartarlo
  // Notificación flotante pasajera (se cierra sola)
  const avisar = (titulo: string, mensaje: string, tono: AvisoData['tono'] = 'error') =>
    setAviso({
      titulo,
      mensaje,
      tono,
      icono: tono === 'exito' ? 'checkmark-circle' : tono === 'error' ? 'close-circle' : tono === 'alerta' ? 'alert-circle' : 'information-circle',
    });

  // Notificación flotante con botones: devuelve el valor del botón que elija la persona
  function preguntar<T>(cfg: {
    icono: AvisoData['icono'];
    tono: AvisoData['tono'];
    titulo: string;
    mensaje: string;
    moto?: Moto;
    opciones: { texto: string; valor: T; tipo?: AccionAviso['tipo'] }[];
    valorAlCerrar: T;
  }): Promise<T> {
    return new Promise<T>((resolve) => {
      const responder = (v: T) => {
        setAviso(null);
        resolve(v);
      };
      setAviso({
        icono: cfg.icono,
        tono: cfg.tono,
        titulo: cfg.titulo,
        mensaje: cfg.mensaje,
        moto: cfg.moto,
        acciones: cfg.opciones.map((o) => ({ texto: o.texto, tipo: o.tipo, onPress: () => responder(o.valor) })),
        alCerrar: () => responder(cfg.valorAlCerrar),
      });
    });
  }

  const cerrarFormulario = () => {
    if (!formularioSucio.current) {
      setMostrarFormulario(false);
      setMotoEditandoId(null);
      return;
    }
    Alert.alert('¿Descartar tu publicación?', 'Si sales ahora, se perderán los datos que ya escribiste.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          formularioSucio.current = false;
          setMostrarFormulario(false);
          setMotoEditandoId(null);
        },
      },
    ]);
  };

  // Botón "atrás" físico de Android: cierra el formulario o regresa del detalle a la lista
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mostrarFormulario) {
        cerrarFormulario();
        return true;
      }
      if (motoId) {
        setMotoId(null);
        return true;
      }
      return false; // en la lista deja que la navegación haga su trabajo
    });
    return () => sub.remove();
  }, [motoId, mostrarFormulario]);

  // Guarda la reseña en la tabla `resenas`. Devuelve true si se guardó bien.
  const publicarResena = async (id: string, nueva: Comentario): Promise<boolean> => {
    if (!usuarioActual) {
      avisar('Inicia sesión', 'Necesitas una sesión iniciada para publicar una reseña.', 'alerta');
      return false;
    }
    const { data, error } = await supabase
      .from('resenas')
      .insert({
        perfil_id: usuarioActual.id,
        entidad_evaluada: id, // id de la moto (texto)
        tipo_entidad: TIPO_ENTIDAD_MOTO,
        calificacion: nueva.puntuacion, // 1 a 5
        comentario: nueva.texto,
      })
      .select(); // devuelve la fila guardada: si trae `id` y `created_at`, se escribió en la BD

    // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
    console.log('[Reseñas] insert → data:', JSON.stringify(data));
    if (error) {
      console.log(
        '[Reseñas] ERROR → code:', error.code,
        '| message:', error.message,
        '| details:', error.details,
        '| hint:', error.hint
      );
    }

    if (error) {
      avisar('No se pudo publicar tu reseña', error.message);
      return false;
    }
    setResenasBD((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] ?? []),
        { usuario: usuarioActual.username, texto: nueva.texto, puntuacion: nueva.puntuacion, esPropia: true, deBD: true },
      ],
    }));
    return true;
  };

  // Crea o edita una moto en `motos_catalogo` (con su foto en Storage)
  const guardarMoto = async (datos: DatosMoto): Promise<void> => {
    if (!usuarioActual) {
      avisar('Inicia sesión', 'Necesitas una sesión iniciada para publicar tu moto.', 'alerta');
      return;
    }
    const editando = motoEditandoId ? catalogo.find((m) => m.id === motoEditandoId) ?? null : null;

    // 0) ¿Ya existe esta moto? Se revisa el catálogo cargado (incluye las de ejemplo) y la BD,
    //    por si otra persona la publicó después de que abriste la pantalla.
    const { data: filasMismoAnio } = await supabase.from('motos_catalogo').select('*').eq('modelo', datos.modelo);
    const candidatas = [...catalogo, ...(filasMismoAnio ?? []).map((f: any) => filaAMoto(f, usuarioActual.id))];
    const repetida = candidatas.find((m) => m.id !== editando?.id && esMismaMoto(m, datos));
    if (repetida) {
      const decision = await preguntar<'ver' | 'seguir' | 'cancelar'>({
        icono: 'copy-outline',
        tono: 'alerta',
        titulo: 'Esta moto ya existe',
        mensaje:
          'Ya está publicada en el catálogo. Si la tuya es otra versión (por ejemplo carburada o inyección), agrégalo al nombre y continúa.',
        moto: repetida,
        opciones: [
          { texto: 'Ver la moto', valor: 'ver', tipo: 'primario' },
          { texto: editando ? 'Guardar de todos modos' : 'Publicar de todos modos', valor: 'seguir', tipo: 'secundario' },
          { texto: 'Seguir editando', valor: 'cancelar', tipo: 'neutro' },
        ],
        valorAlCerrar: 'cancelar',
      });
      if (decision === 'cancelar') return; // se queda en el formulario para cambiar el nombre u otros datos
      if (decision === 'ver') {
        // Si la publicó alguien más y aún no estaba en la lista, la agregamos para poder abrirla
        setCatalogo((prev) => (prev.some((m) => m.id === repetida.id) ? prev : [repetida, ...prev]));
        formularioSucio.current = false;
        setMostrarFormulario(false);
        setMotoEditandoId(null);
        setMotoId(repetida.id); // te lleva a la publicación que ya existe
        return;
      }
      // decision === 'seguir': continúa normalmente
    }

    // 1) Foto: una URL http(s) ya está subida (edición sin cambiar la foto); una ruta local se sube al bucket.
    //    Si la subida falla, la moto se guarda igual (conservando la foto anterior si la había).
    let imagenUrl: string | null = null;
    let fotoFallo = false;
    if (typeof datos.imagen === 'string' && datos.imagen) {
      if (/^https?:\/\//i.test(datos.imagen)) {
        imagenUrl = datos.imagen;
      } else {
        imagenUrl = await subirFotoMoto(datos.imagen, usuarioActual.id);
        fotoFallo = imagenUrl === null;
        if (fotoFallo && editando && typeof editando.imagen === 'string') imagenUrl = editando.imagen;
      }
    }

    const campos = {
      nombre: datos.nombre,
      marca: datos.marca,
      modelo: datos.modelo,
      tipo: datos.tipo,
      cilindrada: datos.cilindrada,
      precio: datos.precio,
      descripcion: datos.descripcion,
      imagen_url: imagenUrl,
      propietario: datos.propietario ?? usuarioActual.username,
    };

    // ── EDITAR ──
    if (editando) {
      const { data, error } = await supabase
        .from('motos_catalogo')
        .update(campos)
        .eq('id', editando.id)
        .select()
        .maybeSingle();
      // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
      console.log('[Moto] update → data:', JSON.stringify(data), '| error:', error?.message ?? null);
      if (error) {
        avisar('No se pudieron guardar los cambios', error.message);
        return;
      }
      if (!data) {
        // Sin error y sin fila: la política de seguridad (RLS) no permite actualizar esta moto
        avisar('No se pudieron guardar los cambios', 'No tienes permiso para editar esta moto o ya no existe.');
        return;
      }
      // Si cambió la foto y la anterior estaba en nuestro bucket, se borra para no acumular archivos
      if (typeof editando.imagen === 'string' && editando.imagen !== imagenUrl) await borrarFotoMoto(editando.imagen);
      const actualizada = filaAMoto(data, usuarioActual.id);
      setCatalogo((prev) => prev.map((m) => (m.id === actualizada.id ? actualizada : m)));
      formularioSucio.current = false;
      setMostrarFormulario(false);
      setMotoEditandoId(null);
      avisar(
        'Cambios guardados',
        fotoFallo ? 'Se actualizó tu moto, pero la foto nueva no se pudo subir.' : 'Tu publicación se actualizó.',
        fotoFallo ? 'alerta' : 'exito'
      );
      return;
    }

    // ── CREAR ──
    const { data, error } = await supabase
      .from('motos_catalogo')
      .insert({ perfil_id: usuarioActual.id, ...campos })
      .select()
      .single();

    // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
    console.log('[Moto] insert → data:', JSON.stringify(data));
    if (error) {
      console.log(
        '[Moto] ERROR → code:', error.code,
        '| message:', error.message,
        '| details:', error.details,
        '| hint:', error.hint
      );
    }

    if (error || !data) {
      avisar('No se pudo publicar tu moto', error?.message ?? 'Inténtalo de nuevo.');
      return; // el formulario se queda abierto con lo que escribiste
    }

    const nueva = filaAMoto(data, usuarioActual.id);
    setCatalogo((prev) => [nueva, ...prev]);
    setComentarios((prev) => ({ ...prev, [nueva.id]: [] }));
    formularioSucio.current = false;
    setMostrarFormulario(false);
    setMotoId(nueva.id); // te lleva directo al detalle de tu moto
    avisar(
      '¡Moto publicada!',
      fotoFallo
        ? 'Ya aparece en la lista, pero la foto no se pudo subir. Puedes agregarla después con "Editar".'
        : 'Ya aparece en la lista de motos.',
      fotoFallo ? 'alerta' : 'exito'
    );
  };

  // Elimina una moto del usuario (y su foto), previa confirmación
  const eliminarMoto = async (moto: Moto) => {
    const confirmado = await preguntar<boolean>({
      icono: 'trash-outline',
      tono: 'error',
      titulo: '¿Eliminar tu moto?',
      mensaje: 'Se borrará tu publicación y su foto. Las reseñas dejarán de mostrarse. No se puede deshacer.',
      moto,
      opciones: [
        { texto: 'Sí, eliminar', valor: true, tipo: 'peligro' },
        { texto: 'Cancelar', valor: false, tipo: 'neutro' },
      ],
      valorAlCerrar: false,
    });
    if (!confirmado) return;

    const { data, error } = await supabase.from('motos_catalogo').delete().eq('id', moto.id).select();
    // 🔎 DEBUG TEMPORAL: borrar cuando confirmes que funciona
    console.log('[Moto] delete → filas:', data?.length, '| error:', error?.message ?? null);
    if (error) {
      avisar('No se pudo eliminar', error.message);
      return;
    }
    if (!data || data.length === 0) {
      // Sin error y sin filas borradas: la política de seguridad (RLS) no lo permite
      avisar('No se pudo eliminar', 'No tienes permiso para borrar esta moto o ya no existe.');
      return;
    }
    if (typeof moto.imagen === 'string') await borrarFotoMoto(moto.imagen);
    setCatalogo((prev) => prev.filter((m) => m.id !== moto.id));
    setMotoId(null); // regresa a la lista
    avisar('Moto eliminada', 'Tu publicación ya no aparece en el catálogo.', 'exito');
  };

  const iniciarEdicion = (moto: Moto) => {
    setMotoEditandoId(moto.id);
    setMostrarFormulario(true);
  };

  return (
    <View style={styles.container}>
      {/* La lista siempre queda montada (oculta) para conservar filtros, búsqueda y scroll */}
      <View style={[styles.container, motoActual !== null && styles.oculto]}>
        <ListaResenas
          motos={motos}
          onSelectMoto={(m) => setMotoId(m.id)}
          onBack={salirDePantalla}
          onPublicar={() => setMostrarFormulario(true)}
        />
      </View>

      {motoActual && (
        <View style={StyleSheet.absoluteFill}>
          <DetalleResena
            key={motoActual.id}
            moto={motoActual}
            onBack={() => setMotoId(null)}
            onPublicar={(c) => publicarResena(motoActual.id, c)}
            onEditar={motoActual.esPropia ? () => iniciarEdicion(motoActual) : undefined}
            onEliminar={motoActual.esPropia ? () => eliminarMoto(motoActual) : undefined}
          />
        </View>
      )}

      {mostrarFormulario && (
        <View style={StyleSheet.absoluteFill}>
          <FormularioMoto
            key={motoEditandoId ?? 'nueva'}
            marcas={marcasExistentes}
            inicial={catalogo.find((m) => m.id === motoEditandoId)}
            onBack={cerrarFormulario}
            onPublicar={guardarMoto}
            sucioRef={formularioSucio}
          />
        </View>
      )}

      {/* Notificación flotante: avisos y confirmaciones dentro de la app */}
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />
    </View>
  );
}

// ─── COMPONENTE: AVISO FLOTANTE ──────────────────────────────────────────────

function AvisoFlotante({ aviso, onCerrar }: { aviso: AvisoData | null; onCerrar: () => void }) {
  const { C, styles } = useResenasTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const conBotones = !!aviso?.acciones?.length;

  useEffect(() => {
    if (!aviso) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
    if (conBotones) return; // los avisos con botones esperan a que la persona decida
    const t = setTimeout(onCerrar, aviso.tono === 'error' ? 5000 : 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aviso]);

  if (!aviso) return null;

  const colores =
    aviso.tono === 'exito'
      ? { bg: C.successBg, fg: C.success }
      : aviso.tono === 'error'
      ? { bg: C.dangerSoft, fg: C.danger }
      : aviso.tono === 'alerta'
      ? { bg: C.accentSoft, fg: C.accent }
      : { bg: C.surfaceAlt, fg: C.textSec };

  const estiloBoton = (tipo: AccionAviso['tipo']) =>
    tipo === 'primario'
      ? { fondo: { backgroundColor: C.accent }, texto: { color: C.onPrimary } }
      : tipo === 'peligro'
      ? { fondo: { backgroundColor: C.danger }, texto: { color: C.onPrimary } }
      : tipo === 'secundario'
      ? { fondo: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border }, texto: { color: C.textPri } }
      : { fondo: { backgroundColor: 'transparent' }, texto: { color: C.textSec } };

  const tarjeta = (
    <Animated.View
      style={[
        styles.avisoCard,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.avisoCabecera}>
        <View style={[styles.avisoIconoWrap, { backgroundColor: colores.bg }]}>
          <Ionicons name={aviso.icono} size={22} color={colores.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
          <Text style={styles.avisoMensaje}>{aviso.mensaje}</Text>
        </View>
      </View>

      {aviso.moto && (
        <View style={styles.avisoMoto}>
          <ImagenMoto imagen={aviso.moto.imagen} style={styles.avisoMotoImg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.avisoMotoNombre} numberOfLines={2}>
              {aviso.moto.nombre}
            </Text>
            <Text style={styles.avisoMotoSub}>
              {aviso.moto.marca} · {aviso.moto.modelo} · {aviso.moto.cilindrada} cc
            </Text>
          </View>
        </View>
      )}

      {conBotones && (
        <View style={styles.avisoAcciones}>
          {aviso.acciones!.map((a) => {
            const e = estiloBoton(a.tipo);
            return (
              <TouchableOpacity key={a.texto} style={[styles.avisoBtn, e.fondo]} onPress={a.onPress} activeOpacity={0.85}>
                <Text style={[styles.avisoBtnText, e.texto]}>{a.texto}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Animated.View>
  );

  // Con botones: tapa la pantalla y espera una decisión. Sin botones: aviso pasajero que no estorba.
  if (conBotones) {
    return (
      <Modal transparent animationType="fade" visible onRequestClose={aviso.alCerrar ?? onCerrar} statusBarTranslucent>
        <View style={styles.avisoBackdrop}>{tarjeta}</View>
      </Modal>
    );
  }
  return (
    <View style={styles.avisoToast} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={0.95} onPress={onCerrar}>
        {tarjeta}
      </TouchableOpacity>
    </View>
  );
}

// ─── PALETA Y ESTILOS ─────────────────────────────────────────────────────────

// Both color modes use semantic tokens from theme.ts.
function crearPaleta(theme: Theme) {
  return {
    bg: theme.background,
    surface: theme.card,
    surfaceAlt: theme.cardHeader,
    border: theme.border,
    textPri: theme.textPrimary,
    textSec: theme.textSecondary,
    textMuted: theme.iconSecondary,
    accent: theme.accent,
    accentSoft: theme.accentBg,
    star: theme.star,
    onPrimary: theme.onPrimary,
    overlay: theme.overlay,
    shadow: theme.shadow,
    success: theme.successText,
    danger: theme.dangerText,
    dangerSoft: theme.dangerBg,
    successBg: theme.successBg,
    ink: theme.textPrimary,
  };
}

type Paleta = ReturnType<typeof crearPaleta>;

/** Devuelve la paleta y los estilos del tema actual (se recalculan solo al cambiar de tema). */
function useResenasTheme() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  return useMemo(() => {
    const C = crearPaleta(theme);
    return { C, styles: crearEstilos(C), isDarkMode, toggleTheme };
  }, [theme, isDarkMode]);
}

/** Botón de luna/sol para cambiar entre modo claro y oscuro. */
function BotonTema() {
  const { C, styles, isDarkMode, toggleTheme } = useResenasTheme();
  return (
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={toggleTheme}
      accessibilityLabel={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <Ionicons name={isDarkMode ? 'sunny-outline' : 'moon-outline'} size={22} color={C.textPri} />
    </TouchableOpacity>
  );
}

const TOP_PADDING = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 56;

const crearEstilos = (C: Paleta) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  oculto: { display: 'none' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: TOP_PADDING,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: C.textPri,
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnSpacer: { width: 40, height: 40 },
  headerLado: { width: 88, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLadoDerecho: { justifyContent: 'flex-end' },

  // Buscador
  buscadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceAlt,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  buscadorInput: { flex: 1, fontSize: 15, color: C.textPri, paddingVertical: 0 },

  // Filtros
  filtrosWrap: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 },
  chipsScroll: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipAbierto: { borderColor: C.textPri },
  chipActivo: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textPri },
  chipTextActivo: { color: C.onPrimary },
  chipLimpiar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 38 },
  chipLimpiarText: { fontSize: 13, fontWeight: '700', color: C.accent },
  panel: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.surfaceAlt,
  },
  panelTitulo: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 10 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActiva: { backgroundColor: C.accent, borderColor: C.accent },
  pillDeshabilitada: { opacity: 0.35 },
  pillText: { fontSize: 13, fontWeight: '600', color: C.textPri },
  pillTextActiva: { color: C.onPrimary },
  pillCantidad: { fontSize: 12, fontWeight: '600', color: C.textMuted },

  // Lista
  listaContent: { paddingHorizontal: 16, paddingBottom: 110, flexGrow: 1 },
  resultadosTexto: { fontSize: 13, color: C.textSec, marginTop: 14, marginBottom: 4, fontWeight: '500' },
  motoCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: C.surface,
    padding: 12,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  motoImagen: { width: 108, height: 132, borderRadius: 12 },
  imagenVacia: { backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  motoInfo: { flex: 1, justifyContent: 'space-between' },
  motoMarca: { fontSize: 12, fontWeight: '600', color: C.accent },
  motoNombre: { fontSize: 16, fontWeight: '800', color: C.textPri, lineHeight: 21, marginTop: 2, letterSpacing: -0.2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  estrellasRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  puntuacionNum: { fontSize: 13, fontWeight: '800', color: C.textPri },
  reseniasNum: { fontSize: 12, color: C.textMuted },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: C.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '600', color: C.textSec },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  motoPrecio: { fontSize: 17, fontWeight: '800', color: C.textPri, letterSpacing: -0.3 },
  verBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verBtnText: { fontSize: 12, fontWeight: '700', color: C.accent },

  // Estado vacío
  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  vacioTitulo: { fontSize: 17, fontWeight: '800', color: C.textPri, marginTop: 12 },
  vacioTexto: { fontSize: 14, color: C.textSec, textAlign: 'center', marginTop: 4, lineHeight: 20 },

  // Detalle
  imagenDetalle: { width: '100%', height: 250 },
  detalleContent: { padding: 20 },
  detalleMarca: { fontSize: 13, fontWeight: '700', color: C.accent },
  detalleTitulo: { fontSize: 24, fontWeight: '800', color: C.textPri, lineHeight: 30, marginTop: 2, letterSpacing: -0.5 },
  detallePrecio: { fontSize: 20, fontWeight: '800', color: C.textPri, marginTop: 6 },
  detalleRating: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  detalleRatingNum: { fontSize: 34, fontWeight: '800', color: C.textPri, letterSpacing: -1 },
  detalleRatingSub: { fontSize: 12, color: C.textSec, marginTop: 2 },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20, marginBottom: 24 },
  specItem: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  specLabel: { fontSize: 12, color: C.textSec, marginTop: 4 },
  specValor: { fontSize: 15, fontWeight: '800', color: C.textPri },
  seccionTitulo: { fontSize: 17, fontWeight: '800', color: C.textPri, marginBottom: 8, letterSpacing: -0.2 },
  seccionTexto: { fontSize: 14, color: C.textSec, lineHeight: 22 },

  // Comentarios
  comentarioCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
  },
  comentarioPropio: { backgroundColor: C.accentSoft },
  comentarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPropio: { backgroundColor: C.bg },
  comentarioUsuario: { fontSize: 14, fontWeight: '700', color: C.textPri },
  tuResena: { fontSize: 11, color: C.accent, fontWeight: '700' },
  comentarioTexto: { fontSize: 14, color: C.textSec, lineHeight: 21 },

  // Formulario
  formularioResena: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    backgroundColor: C.bg,
  },
  formularioTitulo: { fontSize: 17, fontWeight: '800', color: C.textPri, marginBottom: 14 },
  formularioLabel: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 6 },
  formularioInput: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPri,
    marginBottom: 14,
  },
  formularioTextarea: { height: 100, textAlignVertical: 'top' },
  formularioBotones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  calificacionWrap: { marginBottom: 14, gap: 6 },
  calificacionTexto: { fontSize: 13, color: C.textSec, fontWeight: '600' },

  // Botones
  // Aviso flotante
  avisoBackdrop: {
    flex: 1,
    backgroundColor: C.overlay,
    paddingTop: TOP_PADDING,
    paddingHorizontal: 16,
  },
  avisoToast: {
    position: 'absolute',
    top: TOP_PADDING,
    left: 16,
    right: 16,
    zIndex: 999,
    elevation: 20,
  },
  avisoCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 10,
    shadowColor: C.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  avisoCabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avisoIconoWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avisoTitulo: { fontSize: 16, fontWeight: '800', color: C.textPri },
  avisoMensaje: { fontSize: 13.5, color: C.textSec, marginTop: 3, lineHeight: 19 },
  avisoMoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
  },
  avisoMotoImg: { width: 56, height: 56, borderRadius: 10 },
  avisoMotoNombre: { fontSize: 14, fontWeight: '800', color: C.textPri },
  avisoMotoSub: { fontSize: 12.5, color: C.textSec, marginTop: 2 },
  avisoAcciones: { marginTop: 14, gap: 8 },
  avisoBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avisoBtnText: { fontSize: 14.5, fontWeight: '800' },

  // Acciones del dueño de la moto (editar / eliminar)
  accionesPropias: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnAccionPropia: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  btnAccionPeligro: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  btnAccionPropiaText: { fontSize: 14, fontWeight: '800', color: C.textPri },

  btnPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
  },
  btnPrimarioText: { color: C.onPrimary, fontWeight: '800', fontSize: 15 },
  btnSecundario: {
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnSecundarioText: { fontSize: 14, fontWeight: '700', color: C.textPri },
  btnCancelar: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  btnCancelarText: { fontSize: 14, fontWeight: '700', color: C.textSec },
  btnEnviar: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center' },
  btnEnviarText: { fontSize: 14, fontWeight: '800', color: C.onPrimary },
  yaReseneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: C.successBg,
    borderRadius: 12,
    padding: 14,
  },
  yaReseneText: { fontSize: 13, color: C.success, fontWeight: '700', flex: 1 },

  // Formulario: publicar mi moto
  formContent: { padding: 20, paddingTop: 8 },
  formIntro: { fontSize: 14, color: C.textSec, lineHeight: 20, marginBottom: 16 },
  fotoBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: C.surfaceAlt,
    marginBottom: 22,
  },
  fotoVacia: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.accent,
    borderRadius: 18,
    backgroundColor: C.accentSoft,
  },
  fotoVaciaTitulo: { fontSize: 15, fontWeight: '800', color: C.textPri, marginTop: 6 },
  fotoVaciaSub: { fontSize: 13, color: C.textSec },
  fotoPreview: { width: '100%', height: '100%' },
  fotoQuitar: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoCambiar: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  fotoCambiarText: { fontSize: 13, fontWeight: '700', color: C.textPri },
  campo: { marginBottom: 20 },
  campoLabel: { fontSize: 14, fontWeight: '700', color: C.textPri, marginBottom: 8 },
  campoAyuda: { fontSize: 12, color: C.textMuted, marginTop: 6 },
  campoInput: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: C.textPri,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  campoInputMulti: { height: 120, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  campoInputError: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  inputFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputNumero: { flex: 1, fontSize: 15, color: C.textPri, paddingVertical: 0 },
  inputAdorno: { fontSize: 15, fontWeight: '700', color: C.textSec },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorTexto: { fontSize: 12, fontWeight: '600', color: C.danger, flex: 1 },

  // Botón flotante y detalles de motos publicadas por el usuario
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 32 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingLeft: 14,
    paddingRight: 20,
    borderRadius: 26,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  fabText: { fontSize: 15, fontWeight: '800', color: C.onPrimary },
  tagPropia: { backgroundColor: C.accentSoft },
  tagPropiaText: { color: C.accent },
  detallePropietario: { fontSize: 13, color: C.textSec, marginTop: 4 },
  detalleSinResenas: { fontSize: 14, color: C.textSec, marginTop: 14 },
  comentariosVacio: { fontSize: 14, color: C.textSec, lineHeight: 20, marginTop: 4 },

  // Ayuda
  ayudaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 24,
  },
  ayudaCard: {
    backgroundColor: C.bg,
    borderRadius: 22,
    padding: 20,
    width: '100%',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  ayudaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  ayudaTitulo: { flex: 1, fontSize: 16, fontWeight: '800', color: C.textPri },
  ayudaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  ayudaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayudaItemTitulo: { fontSize: 14, fontWeight: '700', color: C.textPri, marginBottom: 2 },
  ayudaItemDesc: { fontSize: 13, color: C.textSec, lineHeight: 18 },

  selectorMarca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
  sheetTitulo: { fontSize: 17, fontWeight: '800', color: C.textPri, marginBottom: 6 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetItemTexto: { fontSize: 16, color: C.textPri, fontWeight: '600' },

  // ¿Tienes un problema?
  problemaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  problemaBtnText: { fontSize: 14, fontWeight: '700', color: C.textSec, textDecorationLine: 'underline' },
  problemaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger,
    backgroundColor: C.dangerSoft,
  },
  problemaErrorTexto: { flex: 1, fontSize: 13, fontWeight: '700', color: C.danger, lineHeight: 18 },
  toast: {
    position: 'absolute',
    top: TOP_PADDING,
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastTexto: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  problemaOverlay: { flex: 1, backgroundColor: C.overlay },
  problemaScroll: { flex: 1 },
  problemaScrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  problemaCard: {
    backgroundColor: C.bg,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
});