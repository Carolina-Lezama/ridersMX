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

// Tema global (el mismo que usa Configuración)
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Theme } from '../../../assets/theme/theme';

// ─── CONFIGURACIÓN DEL CORREO DE SOPORTE (EmailJS) ───────────────────────────
// Crea una cuenta en https://www.emailjs.com y pega aquí tus 3 datos (ver instrucciones).
// El destinatario (riders.mx67@gmail.com) se define en la plantilla de EmailJS.
const EMAILJS = {
  serviceId: 'TU_SERVICE_ID',
  templateId: 'TU_TEMPLATE_ID',
  publicKey: 'TU_PUBLIC_KEY',
};
const EMAILJS_CONFIGURADO = !Object.values(EMAILJS).some((v) => v.startsWith('TU_'));

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Comentario {
  usuario: string;
  texto: string;
  puntuacion?: number;
  esPropia?: boolean;
}

interface Moto {
  id: string;
  nombre: string;
  marca: string;
  modelo: number; // año del modelo (2024, 2025...)
  tipo: string;
  cilindrada: number; // en cc
  precio: number; // en MXN
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

// ─── DATOS DE EJEMPLO ────────────────────────────────────────────────────────
// Precios y textos son de ejemplo: cámbialos por los reales de tu proyecto.

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
    imagen: 'https://images.unsplash.com/photo-1609630875176-b90c7a87265c?w=500',
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
    imagen: undefined, // ← pon aquí tu imagen
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
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Aguanta bien la carga y no me ha dado problemas en el trabajo diario. Es algo tosca a velocidades altas.',
        puntuacion: 3,
      },
    ],
  },
  {
    id: '6',
    nombre: 'Italika 250Z Naranja',
    marca: 'Italika',
    modelo: 2025,
    tipo: 'Naked',
    cilindrada: 250,
    precio: 36999,
    puntuacion: 4.0,
    descripcion:
      'Naked de 250 cc con posición de manejo erguida, faro LED y buena respuesta en aceleración. Cómoda tanto en ciudad como en salidas cortas a carretera.',
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Se siente firme y tiene buen empuje. La posición de manejo es muy cómoda.',
        puntuacion: 4,
      },
    ],
  },
  {
    id: '7',
    nombre: 'Honda CB190R',
    marca: 'Honda',
    modelo: 2025,
    tipo: 'Naked',
    cilindrada: 190,
    precio: 49900,
    puntuacion: 4.5,
    descripcion:
      'Naked ligera de estilo agresivo, con manejo ágil y un motor suave que rinde bien en ciudad. Destaca por el respaldo y la confiabilidad de la marca.',
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Suave, confiable y muy bonita. Se nota la calidad de Honda en los acabados.',
        puntuacion: 5,
      },
    ],
  },
  {
    id: '8',
    nombre: 'Honda CRF250L',
    marca: 'Honda',
    modelo: 2025,
    tipo: 'Doble propósito',
    cilindrada: 250,
    precio: 99900,
    puntuacion: 4.5,
    descripcion:
      'Doble propósito con suspensión de largo recorrido y buena altura al suelo. Lista para brecha, terracería y también para el asfalto diario.',
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Va igual de bien en brecha que en ciudad. La suspensión hace toda la diferencia.',
        puntuacion: 5,
      },
    ],
  },
  {
    id: '9',
    nombre: 'Yamaha FZ 25',
    marca: 'Yamaha',
    modelo: 2025,
    tipo: 'Naked',
    cilindrada: 250,
    precio: 69900,
    puntuacion: 4.5,
    descripcion:
      'Naked de 250 cc con motor eficiente y diseño musculoso. Combina buen consumo con potencia suficiente para carretera.',
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Rinde mucho por litro y en carretera se comporta muy estable.',
        puntuacion: 5,
      },
    ],
  },
  {
    id: '10',
    nombre: 'Yamaha MT-03',
    marca: 'Yamaha',
    modelo: 2026,
    tipo: 'Naked',
    cilindrada: 300,
    precio: 109900,
    puntuacion: 5.0,
    descripcion:
      'Naked de media cilindrada con motor bicilíndrico, aceleración inmediata y chasis muy preciso. Una de las favoritas para dar el salto a más potencia.',
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Divertidísima. El motor jala desde abajo y el chasis te da mucha confianza.',
        puntuacion: 5,
      },
    ],
  },
  {
    id: '11',
    nombre: 'Bajaj Pulsar NS200',
    marca: 'Bajaj',
    modelo: 2024,
    tipo: 'Naked',
    cilindrada: 200,
    precio: 56900,
    puntuacion: 4.0,
    descripcion:
      'Naked deportiva de 200 cc con buen aceleración y frenos de disco. Ofrece mucho desempeño por su precio.',
    imagen: undefined, // ← pon aquí tu imagen
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto: 'Muy buena relación precio-desempeño. Acelera bien y frena mejor.',
        puntuacion: 4,
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
    imagen: undefined, // ← pon aquí tu imagen
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
    imagen: undefined, // ← pon aquí tu imagen
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
    imagen: undefined, // ← pon aquí tu imagen
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
    imagen: undefined, // ← pon aquí tu imagen
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
  const propias = comentarios.filter((c) => c.esPropia && c.puntuacion);
  if (propias.length === 0) return moto.puntuacion;
  const base = moto.comentarios.length; // reseñas originales (0 en motos nuevas)
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
          shadowColor: '#000',
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
              <Ionicons name={f.icon} size={15} color={activo ? '#FFFFFF' : C.textSec} />
              <Text style={[styles.chipText, activo && styles.chipTextActivo]}>{etiqueta}</Text>
              <Ionicons
                name={estaAbierto ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={activo ? '#FFFFFF' : C.textMuted}
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
}: {
  moto: Moto;
  onBack: () => void;
  onPublicar: (comentario: Comentario) => void;
}) {
  const { C, styles } = useResenasTheme();
  const yaResene = moto.comentarios.some((c) => c.esPropia);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [textoResena, setTextoResena] = useState('');
  const [estrellaSeleccionada, setEstrellaSeleccionada] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState('');

  const limpiarFormulario = () => {
    setMostrarFormulario(false);
    setTextoResena('');
    setNombreUsuario('');
    setEstrellaSeleccionada(0);
  };

  const enviarResena = () => {
    if (!nombreUsuario.trim()) {
      Alert.alert('Falta tu nombre', 'Escribe tu nombre o usuario para publicar la reseña.');
      return;
    }
    if (estrellaSeleccionada === 0) {
      Alert.alert('Falta la calificación', 'Elige de 1 a 5 estrellas para calificar la moto.');
      return;
    }
    if (!textoResena.trim()) {
      Alert.alert('Falta tu comentario', 'Cuéntanos tu experiencia antes de publicar.');
      return;
    }
    onPublicar({
      usuario: nombreUsuario.trim(),
      texto: textoResena.trim(),
      puntuacion: estrellaSeleccionada,
      esPropia: true,
    });
    limpiarFormulario();
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
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnPrimarioText}>Escribir una reseña</Text>
            </TouchableOpacity>
          )}

          {!yaResene && mostrarFormulario && (
            <View style={styles.formularioResena}>
              <Text style={styles.formularioTitulo}>Tu reseña</Text>

              <Text style={styles.formularioLabel}>Tu nombre o usuario</Text>
              <TextInput
                style={styles.formularioInput}
                placeholder="Ej. Carlos G."
                placeholderTextColor={C.textMuted}
                value={nombreUsuario}
                onChangeText={setNombreUsuario}
              />

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
                <TouchableOpacity style={styles.btnEnviar} onPress={enviarResena} activeOpacity={0.85}>
                  <Text style={styles.btnEnviarText}>Publicar reseña</Text>
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
  onBack,
  onPublicar,
  sucioRef,
}: {
  marcas: string[];
  onBack: () => void;
  onPublicar: (datos: DatosMoto) => void;
  sucioRef: { current: boolean };
}) {
  const { C, styles } = useResenasTheme();
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<CampoForm, number>>>({});

  const [foto, setFoto] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipo, setTipo] = useState<string | null>(null);
  const [cilindrada, setCilindrada] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [propietario, setPropietario] = useState('');
  const [errores, setErrores] = useState<Errores>({});

  const anioMaximo = new Date().getFullYear() + 1;

  // Avisa a la pantalla principal si hay datos escritos (para confirmar antes de salir)
  const sucio = !!(foto || nombre || marca || modelo || tipo || cilindrada || precio || descripcion || propietario);
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
  const publicar = () => {
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

    onPublicar({
      nombre: nombreLimpio,
      marca: marcaExistente ?? marcaLimpia,
      modelo: anio,
      tipo: tipo as string,
      cilindrada: cc,
      precio: precioNum,
      descripcion: descripcion.trim(),
      imagen: foto ?? undefined,
      propietario: propietario.trim() || undefined,
    });
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
        <Text style={styles.headerTitulo}>Publicar mi moto</Text>
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
                <Ionicons name="close" size={18} color="#FFFFFF" />
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

        <TouchableOpacity style={styles.btnPrimario} onPress={publicar} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          <Text style={styles.btnPrimarioText}>Publicar moto</Text>
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
                  <ActivityIndicator color="#FFFFFF" />
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
          <Ionicons name="add" size={22} color="#FFFFFF" />
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
  const formularioSucio = useRef(false); // el formulario avisa aquí si tiene datos sin publicar

  // Las reseñas viven aquí para que no se pierdan al ir y venir entre vistas
  const [comentarios, setComentarios] = useState<Record<string, Comentario[]>>(() =>
    MOTOS.reduce<Record<string, Comentario[]>>((acc, m) => {
      acc[m.id] = m.comentarios;
      return acc;
    }, {})
  );

  const motos = useMemo(
    () =>
      catalogo.map((m) => {
        const coms = comentarios[m.id] ?? m.comentarios;
        return { ...m, comentarios: coms, puntuacion: calcularPuntuacion(m, coms) };
      }),
    [catalogo, comentarios]
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
  const cerrarFormulario = () => {
    if (!formularioSucio.current) {
      setMostrarFormulario(false);
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

  const publicarResena = (id: string, nueva: Comentario) =>
    setComentarios((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), nueva] }));

  const publicarMoto = (datos: DatosMoto) => {
    const nueva: Moto = {
      ...datos,
      id: `u${Date.now()}`,
      puntuacion: 0,
      comentarios: [],
      esPropia: true,
    };
    setCatalogo((prev) => [nueva, ...prev]);
    setComentarios((prev) => ({ ...prev, [nueva.id]: [] }));
    formularioSucio.current = false;
    setMostrarFormulario(false);
    setMotoId(nueva.id); // te lleva directo al detalle de tu moto
    Alert.alert('¡Moto publicada!', 'Ya aparece en la lista de motos.');
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
          />
        </View>
      )}

      {mostrarFormulario && (
        <View style={StyleSheet.absoluteFill}>
          <FormularioMoto
            marcas={marcasExistentes}
            onBack={cerrarFormulario}
            onPublicar={publicarMoto}
            sucioRef={formularioSucio}
          />
        </View>
      )}
    </View>
  );
}

// ─── PALETA Y ESTILOS ─────────────────────────────────────────────────────────

// Modo claro: conserva exactamente los colores originales de la pantalla.
// Modo oscuro: toma los colores base de theme.ts y ajusta los propios de Reseñas.
function crearPaleta(theme: Theme, isDarkMode: boolean) {
  if (!isDarkMode) {
    return {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#F4F5F7',
      border: '#E5E7EB',
      textPri: '#1F2430',
      textSec: '#5B6472',
      textMuted: '#9AA1AD',
      accent: '#E4472B',
      accentSoft: '#FDEEEA',
      star: '#F5A524',
      success: '#16A34A',
      danger: '#DC2626',
      dangerSoft: '#FEF2F2',
      successBg: '#ECFDF3',
      ink: '#1F2430',
    };
  }
  return {
    bg: theme.background,
    surface: theme.card,
    surfaceAlt: '#273449',
    border: theme.border,
    textPri: theme.textPrimary,
    textSec: theme.textSecondary,
    textMuted: theme.iconSecondary,
    accent: '#F0583C',
    accentSoft: '#3B1D17',
    star: '#F5A524',
    success: '#4ADE80',
    danger: theme.dangerText,
    dangerSoft: theme.dangerBg,
    successBg: '#052E16',
    ink: '#475569',
  };
}

type Paleta = ReturnType<typeof crearPaleta>;

/** Devuelve la paleta y los estilos del tema actual (se recalculan solo al cambiar de tema). */
function useResenasTheme() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  return useMemo(() => {
    const C = crearPaleta(theme, isDarkMode);
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
  chipTextActivo: { color: '#FFFFFF' },
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
  pillTextActiva: { color: '#FFFFFF' },
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
    shadowColor: '#1F2430',
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
  btnPrimarioText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
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
  btnEnviarText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
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
    backgroundColor: 'rgba(31,36,48,0.7)',
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
  fabText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
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
    backgroundColor: 'rgba(17,24,39,0.45)',
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
    shadowColor: '#000',
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
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.55)' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastTexto: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  problemaOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)' },
  problemaScroll: { flex: 1 },
  problemaScrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  problemaCard: {
    backgroundColor: C.bg,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
});