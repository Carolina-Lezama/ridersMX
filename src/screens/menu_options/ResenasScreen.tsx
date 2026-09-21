import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Comentario {
  usuario: string;
  texto: string;
  esPropia?: boolean;
}

interface Moto {
  id: string;
  nombre: string;
  marca: string;
  tipo: string;
  cilindrada: string;
  puntuacion: number;
  descripcion: string;
  descripcionCorta: string;
  imagen: string; // URL de placeholder o local
  comentarios: Comentario[];
}

// ─── DATOS DE EJEMPLO ────────────────────────────────────────────────────────

const MOTOS: Moto[] = [
  {
    id: '1',
    nombre: 'Italika RT 250 con GPS Roja',
    marca: 'Italika',
    tipo: 'Deportiva',
    cilindrada: '250 cc',
    puntuacion: 4.5,
    descripcion:
      'La motocicleta deportiva RT250 con GPS tiene un motor de 4 tiempos monocilíndrico con una potencia máxima de 19.64 HP.',
    descripcionCorta:
      'La moto deportiva RT250 con GPS tiene un motor de 4 tiempos monocilíndrico con una potencia máxima de 19.64 HP. Cilindrada de 250 CC y un torque máximo de 20.9 N-m @ 8000 RPM.',
    imagen: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500',
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto:
          'Excelente moto para ciudad y carretera. El GPS integrado es muy útil y la potencia es más que suficiente para uso diario.',
      },
      {
        usuario: 'Usuario 2',
        texto:
          'Buen rendimiento de combustible. El diseño deportivo llama mucho la atención. Recomendada para quienes buscan estilo y practicidad.',
      },
    ],
  },
  {
    id: '2',
    nombre: 'Italika-Morbidelli F200',
    marca: 'Italika',
    tipo: 'Urbana',
    cilindrada: '200 cc',
    puntuacion: 3.5,
    descripcion:
      'Motocicleta urbana de estilo naked y diseño deportivo, resultado de la reciente colaboración entre la marca mexicana Italika y la firma italiana Morbidelli.',
    descripcionCorta:
      'Motocicleta urbana de estilo naked y diseño deportivo, resultado de la reciente colaboración entre la marca mexicana Italika y la firma italiana Morbidelli. Tiene un motor de 200 centímetros cúbicos.',
    imagen: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500',
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto:
          'Me encanta el diseño naked que tiene. Es una moto muy ágil para moverse entre el tráfico de la ciudad y el consumo de gasolina es bastante moderado para ser un motor 200. Muy conforme con la compra.',
      },
      {
        usuario: 'Usuario 2',
        texto:
          'La potencia es adecuada y responde bien en avenidas rápidas. Sin embargo, el asiento se siente un poco rígido en viajes de más de una hora y las vibraciones se notan al pasar los 90 km/h.',
      },
    ],
  },
  {
    id: '3',
    nombre: 'Chopper Italika RC200 Gris',
    marca: 'Italika',
    tipo: 'Chopper',
    cilindrada: '200 cc',
    puntuacion: 4.0,
    descripcion:
      'La Italika RC200 Gris es una motocicleta de estilo chopper cruiser, con bastidor de baja cilindrada, diseñada principalmente para quienes buscan uno.',
    descripcionCorta:
      'La Italika RC200 Gris es una motocicleta de estilo chopper cruiser, con bastidor de baja cilindrada, diseñada principalmente para quienes buscan uno. Cuenta con un motor de 200 cc.',
    imagen: 'https://images.unsplash.com/photo-1609630875176-b90c7a87265c?w=500',
    comentarios: [
      {
        usuario: 'Usuario 1',
        texto:
          'Una chopper accesible que cumple bien para paseos cortos y ciudad. El estilo es llamativo y varios me han preguntado por la moto.',
      },
      {
        usuario: 'Usuario 2',
        texto:
          'Buena relación precio-calidad. El motor de 200 cc es suficiente para uso urbano, aunque en carretera hay que tener paciencia para acelerar.',
      },
    ],
  },
];

// ─── COMPONENTE: ESTRELLAS ────────────────────────────────────────────────────

function Estrellas({ puntuacion, size = 16 }: { puntuacion: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.floor(puntuacion) ? 'star' : i - 0.5 <= puntuacion ? 'star-half' : 'star-outline'}
          size={size}
          color="#f59e0b"
        />
      ))}
    </View>
  );
}

// ─── PANTALLA DETALLE ─────────────────────────────────────────────────────────

function DetalleResena({ moto, onBack }: { moto: Moto; onBack: () => void }) {
  const [comentarios, setComentarios] = useState<Comentario[]>(moto.comentarios);
  const [yaResene, setYaResene] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [textoResena, setTextoResena] = useState('');
  const [estrellaSeleccionada, setEstrellaSeleccionada] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState('');

  const enviarResena = () => {
    if (!textoResena.trim()) {
      Alert.alert('Campo vacío', 'Por favor escribe tu reseña antes de enviar.');
      return;
    }
    if (!nombreUsuario.trim()) {
      Alert.alert('Campo vacío', 'Por favor escribe tu nombre o usuario.');
      return;
    }
    const nueva: Comentario = {
      usuario: nombreUsuario.trim(),
      texto: textoResena.trim(),
      esPropia: true,
    };
    setComentarios((prev) => [...prev, nueva]);
    setYaResene(true);
    setMostrarFormulario(false);
    setTextoResena('');
    setNombreUsuario('');
    setEstrellaSeleccionada(0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header detalle */}
      <View style={styles.headerDetalle}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#e8f0f7" />
        </TouchableOpacity>
        <View style={{ width: 32 }} />
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={26} color="#e8f0f7" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Imagen grande */}
        <View style={styles.imagenDetalleWrapper}>
          <Image
            source={{ uri: moto.imagen }}
            style={styles.imagenDetalle}
            resizeMode="contain"
          />
        </View>

        <View style={styles.detalleContent}>
          {/* Info principal */}
          <Text style={styles.detalleLabelResena}>Reseña de:</Text>
          <Text style={styles.detalleTitulo}>{moto.nombre}</Text>
          <Text style={styles.detalleTipo}>{moto.tipo}</Text>

          <View style={styles.detallePuntuacionRow}>
            <Estrellas puntuacion={moto.puntuacion} size={20} />
            <Text style={styles.detallePuntuacionNum}>{moto.puntuacion} Puntuación</Text>
          </View>

          {/* Descripción */}
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Descripción</Text>
            <Text style={styles.seccionTexto}>{moto.descripcion}</Text>
          </View>

          <View style={styles.divider} />

          {/* Comentarios */}
          {comentarios.map((c, idx) => (
            <View key={idx} style={styles.comentarioCard}>
              <View style={styles.comentarioHeader}>
                <View style={[styles.avatarCircle, c.esPropia && { backgroundColor: '#1a3a4a' }]}>
                  <Ionicons name="person" size={18} color={c.esPropia ? '#00bcd4' : '#7a9bb5'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.comentarioUsuario}>{c.usuario}</Text>
                  {c.esPropia && (
                    <Text style={{ fontSize: 10, color: '#00bcd4', fontWeight: '600' }}>Tu reseña</Text>
                  )}
                </View>
              </View>
              <Text style={styles.comentarioTexto}>{c.texto}</Text>
              {idx < comentarios.length - 1 && <View style={styles.divider} />}
            </View>
          ))}

          {/* BOTÓN / FORMULARIO DE RESEÑA */}
          {!yaResene && !mostrarFormulario && (
            <TouchableOpacity
              style={styles.btnEscribirResena}
              onPress={() => setMostrarFormulario(true)}
            >
              <Ionicons name="create-outline" size={18} color="#0f1923" />
              <Text style={styles.btnEscribirResenaText}>Escribir una reseña</Text>
            </TouchableOpacity>
          )}

          {!yaResene && mostrarFormulario && (
            <View style={styles.formularioResena}>
              <Text style={styles.formularioTitulo}>Tu reseña</Text>

              {/* Nombre */}
              <Text style={styles.formularioLabel}>Tu nombre o usuario</Text>
              <TextInput
                style={styles.formularioInput}
                placeholder="Ej. Carlos G."
                placeholderTextColor="#4a6a82"
                value={nombreUsuario}
                onChangeText={setNombreUsuario}
              />

              {/* Estrellas interactivas */}
              <Text style={styles.formularioLabel}>Calificación</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity key={i} onPress={() => setEstrellaSeleccionada(i)}>
                    <Ionicons
                      name={i <= estrellaSeleccionada ? 'star' : 'star-outline'}
                      size={28}
                      color="#f59e0b"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Texto de reseña */}
              <Text style={styles.formularioLabel}>Comentario</Text>
              <TextInput
                style={[styles.formularioInput, styles.formularioTextarea]}
                placeholder="Comparte tu experiencia con esta moto..."
                placeholderTextColor="#4a6a82"
                value={textoResena}
                onChangeText={setTextoResena}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Botones */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={() => {
                    setMostrarFormulario(false);
                    setTextoResena('');
                    setNombreUsuario('');
                    setEstrellaSeleccionada(0);
                  }}
                >
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnEnviar} onPress={enviarResena}>
                  <Text style={styles.btnEnviarText}>Publicar reseña</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {yaResene && (
            <View style={styles.yaReseneBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.yaReseneText}>Ya escribiste una reseña para esta moto</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── PANTALLA LISTA ──────────────────────────────────────────────────────────

function ListaResenas({ onSelectMoto }: { onSelectMoto: (moto: Moto) => void }) {
  const [filtroMarca, setFiltroMarca] = useState<string | null>(null);
  const [filtroCilindrada, setFiltroCilindrada] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  const motosFiltradas = MOTOS.filter((moto) => {
    const cumpleMarca = filtroMarca ? moto.marca === filtroMarca : true;
    const cumpleCilindrada = filtroCilindrada ? moto.cilindrada === filtroCilindrada : true;
    const cumpleTipo = filtroTipo ? moto.tipo === filtroTipo : true;
    const cumpleBusqueda = busqueda.trim()
      ? moto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        moto.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        moto.tipo.toLowerCase().includes(busqueda.toLowerCase())
      : true;
    return cumpleMarca && cumpleCilindrada && cumpleTipo && cumpleBusqueda;
  });

  const [chipAbierto, setChipAbierto] = useState<'marca' | 'cilindrada' | 'tipo' | null>(null);

  const toggleChip = (chip: 'marca' | 'cilindrada' | 'tipo') => {
    setChipAbierto(chipAbierto === chip ? null : chip);
  };

  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  const limpiarFiltros = () => {
    setFiltroMarca(null);
    setFiltroCilindrada(null);
    setFiltroTipo(null);
    setChipAbierto(null);
  };

  return (
    <View style={styles.container}>
      {/* ── MODAL DE AYUDA ── */}
      {mostrarAyuda && (
        <TouchableOpacity
          style={styles.ayudaOverlay}
          activeOpacity={1}
          onPress={() => setMostrarAyuda(false)}
        >
          <View style={styles.ayudaCard} onStartShouldSetResponder={() => true}>
            <View style={styles.ayudaHeader}>
              <Ionicons name="help-circle" size={22} color="#00bcd4" />
              <Text style={styles.ayudaTitulo}>¿Cómo usar esta pantalla?</Text>
              <TouchableOpacity onPress={() => setMostrarAyuda(false)}>
                <Ionicons name="close" size={20} color="#7a9bb5" />
              </TouchableOpacity>
            </View>

            <View style={styles.ayudaDivider} />

            {[
              {
                icon: 'search-outline',
                titulo: 'Buscador',
                desc: 'Toca la lupa para buscar motos por nombre, marca o tipo en tiempo real.',
              },
              {
                icon: 'options-outline',
                titulo: 'Filtros',
                desc: 'Usa los chips de Marca, Cilindrada y Tipo para filtrar la lista.',
              },
              {
                icon: 'hand-left-outline',
                titulo: 'Ver reseña',
                desc: 'Toca cualquier moto para ver su descripción y comentarios.',
              },
            ].map((item, i) => (
              <View key={i} style={styles.ayudaItem}>
                <View style={styles.ayudaIconBox}>
                  <Ionicons name={item.icon as any} size={18} color="#00bcd4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ayudaItemTitulo}>{item.titulo}</Text>
                  <Text style={styles.ayudaItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.ayudaBtn} onPress={() => setMostrarAyuda(false)}>
              <Text style={styles.ayudaBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Header lista */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#e8f0f7" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Reseñas de Motos</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setMostrarBuscador(!mostrarBuscador);
              if (mostrarBuscador) setBusqueda('');
            }}
          >
            <Ionicons name={mostrarBuscador ? 'close-outline' : 'search-outline'} size={22} color="#e8f0f7" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setMostrarAyuda(true)}>
            <Ionicons name="help-circle-outline" size={22} color="#e8f0f7" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de búsqueda */}
      {mostrarBuscador && (
        <View style={styles.buscadorContainer}>
          <Ionicons name="search-outline" size={18} color="#4a6a82" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.buscadorInput}
            placeholder="Buscar por nombre, marca o tipo..."
            placeholderTextColor="#4a6a82"
            value={busqueda}
            onChangeText={setBusqueda}
            autoFocus
          />
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.filtrosTitulo}>Filtros</Text>
          {(filtroMarca || filtroCilindrada || filtroTipo) && (
            <TouchableOpacity onPress={limpiarFiltros}>
              <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600' }}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtrosRow}>
          <TouchableOpacity
            onPress={() => toggleChip('marca')}
            style={[styles.filtroChip, filtroMarca ? { backgroundColor: '#1a3a4a', borderColor: '#00bcd4' } : {}]}
          >
            <Text style={[styles.filtroChipText, filtroMarca ? { color: '#fff' } : {}]}>
              Marca: {filtroMarca || 'Todas'} {chipAbierto === 'marca' ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleChip('cilindrada')}
            style={[styles.filtroChip, filtroCilindrada ? { backgroundColor: '#1a3a4a', borderColor: '#00bcd4' } : {}]}
          >
            <Text style={[styles.filtroChipText, filtroCilindrada ? { color: '#fff' } : {}]}>
              Cilindrada: {filtroCilindrada || 'Todas'} {chipAbierto === 'cilindrada' ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleChip('tipo')}
            style={[styles.filtroChip, filtroTipo ? { backgroundColor: '#1a3a4a', borderColor: '#00bcd4' } : {}]}
          >
            <Text style={[styles.filtroChipText, filtroTipo ? { color: '#fff' } : {}]}>
              Tipo: {filtroTipo || 'Todos'} {chipAbierto === 'tipo' ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>
        </View>

        {chipAbierto === 'marca' && (
          <View style={styles.dropdownPanel}>
            <Text style={styles.dropdownTitulo}>Selecciona marca</Text>
            {[null, 'Italika', 'Morbidelli'].map((m) => (
              <TouchableOpacity
                key={m ?? 'todas'}
                style={[styles.dropdownOpcion, filtroMarca === m && styles.dropdownOpcionActiva]}
                onPress={() => {
                  setFiltroMarca(m);
                  setChipAbierto(null);
                }}
              >
                <Text style={[styles.dropdownOpcionText, filtroMarca === m && styles.dropdownOpcionTextActiva]}>
                  {m ?? 'Todas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Lista */}
      <FlatList
        data={motosFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.motoCard} onPress={() => onSelectMoto(item)} activeOpacity={0.75}>
            <View style={styles.motoCardInner}>
              <Image source={{ uri: item.imagen }} style={styles.motoImagen} resizeMode="contain" />
              <View style={styles.motoInfo}>
                <View style={styles.motoInfoTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.motoNombre} numberOfLines={2}>{item.nombre}</Text>
                    <View style={styles.estrellaRow}>
                      <Estrellas puntuacion={item.puntuacion} size={14} />
                      <Text style={styles.puntuacionNum}>{item.puntuacion}</Text>
                    </View>
                  </View>
                  <View style={styles.marcaTag}>
                    <Text style={styles.marcaLabel}>Marca</Text>
                    <Text style={styles.marcaValor}>{item.marca}</Text>
                  </View>
                </View>

                <Text style={styles.descripcionLabel}>Descripción</Text>
                <Text style={styles.descripcionTexto} numberOfLines={3}>{item.descripcionCorta}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─── PANTALLA PRINCIPAL (ROUTER) ──────────────────────────────────────────────

export default function ResenasScreen({ navigation }: any) {
  const [motoSeleccionada, setMotoSeleccionada] = useState<Moto | null>(null);

  if (motoSeleccionada) {
    return (
      <DetalleResena
        moto={motoSeleccionada}
        onBack={() => setMotoSeleccionada(null)}
      />
    );
  }

  return <ListaResenas onSelectMoto={setMotoSeleccionada} />;
}

// ─── PALETA Y ESTILOS ─────────────────────────────────────────────────────────
const C = {
  bg: '#0f1923',
  surface: '#1a2535',
  surfaceAlt: '#162030',
  header: '#0d2137',
  accent: '#00bcd4',
  accentDim: '#1a3a4a',
  border: '#1e3347',
  textPri: '#e8f0f7',
  textSec: '#7a9bb5',
  textMuted: '#4a6a82',
  success: '#22c55e',
  successBg: '#0d2a1a',
  chipBg: '#1a2e40',
  chipBorder: '#2a4a62',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: C.header,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: C.textPri, flex: 1, textAlign: 'center' },
  backButton: { padding: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  filtrosContainer: {
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filtrosTitulo: { fontSize: 13, fontWeight: '600', color: C.textSec },
  filtrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filtroChip: {
    backgroundColor: C.chipBg,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.chipBorder,
  },
  filtroChipText: { fontSize: 12, color: C.textPri, fontWeight: '500' },
  motoCard: {
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  motoCardInner: { flexDirection: 'row', gap: 12 },
  motoImagen: { width: 110, height: 90, borderRadius: 8, backgroundColor: C.surfaceAlt },
  motoInfo: { flex: 1 },
  motoInfoTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  motoNombre: { fontSize: 13, fontWeight: '700', color: C.textPri, flex: 1, lineHeight: 18 },
  estrellaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  puntuacionNum: { fontSize: 13, fontWeight: '700', color: C.textPri },
  marcaTag: { alignItems: 'flex-end', marginLeft: 8 },
  marcaLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  marcaValor: { fontSize: 13, fontWeight: '700', color: C.accent },
  descripcionLabel: { fontSize: 11, fontWeight: '600', color: C.textSec, marginTop: 6 },
  descripcionTexto: { fontSize: 11, color: C.textMuted, lineHeight: 15, marginTop: 2 },
  headerDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: C.header,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  helpButton: { padding: 4 },
  imagenDetalleWrapper: {
    backgroundColor: C.surfaceAlt,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenDetalle: { width: '100%', height: 220 },
  detalleContent: { padding: 18 },
  detalleLabelResena: { fontSize: 13, color: C.textSec, marginBottom: 2 },
  detalleTitulo: { fontSize: 20, fontWeight: '800', color: C.textPri, lineHeight: 26, marginBottom: 2 },
  detalleTipo: { fontSize: 14, color: C.textSec, marginBottom: 8 },
  detallePuntuacionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  detallePuntuacionNum: { fontSize: 14, fontWeight: '700', color: C.textPri },
  seccion: { marginBottom: 12 },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: C.textPri, marginBottom: 6 },
  seccionTexto: { fontSize: 14, color: C.textSec, lineHeight: 22 },
  comentarioCard: { paddingVertical: 12 },
  comentarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.chipBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comentarioUsuario: { fontSize: 14, fontWeight: '700', color: C.textPri },
  comentarioTexto: { fontSize: 14, color: C.textSec, lineHeight: 22 },
  dropdownPanel: {
    marginTop: 8,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  dropdownTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownOpcion: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownOpcionActiva: { backgroundColor: C.accentDim },
  dropdownOpcionText: { fontSize: 14, color: C.textSec },
  dropdownOpcionTextActiva: { color: C.accent, fontWeight: '700' },
  ayudaOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 24,
  },
  ayudaCard: {
    backgroundColor: '#1a2535',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1e3347',
  },
  ayudaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  ayudaTitulo: { flex: 1, fontSize: 15, fontWeight: '700', color: '#e8f0f7' },
  ayudaDivider: { height: 1, backgroundColor: '#1e3347', marginBottom: 14 },
  ayudaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  ayudaIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1a3a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayudaItemTitulo: { fontSize: 13, fontWeight: '700', color: '#e8f0f7', marginBottom: 2 },
  ayudaItemDesc: { fontSize: 12, color: '#7a9bb5', lineHeight: 17 },
  ayudaBtn: {
    marginTop: 4,
    backgroundColor: '#00bcd4',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ayudaBtnText: { fontSize: 14, fontWeight: '700', color: '#0f1923' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  buscadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  buscadorInput: { flex: 1, fontSize: 14, color: C.textPri, paddingVertical: 0 },
  btnEscribirResena: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 16,
  },
  btnEscribirResenaText: { color: C.bg, fontWeight: '700', fontSize: 15 },
  formularioResena: {
    marginTop: 18,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  formularioTitulo: { fontSize: 16, fontWeight: '700', color: C.textPri, marginBottom: 14 },
  formularioLabel: { fontSize: 12, fontWeight: '600', color: C.textSec, marginBottom: 6, textTransform: 'uppercase' },
  formularioInput: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textPri,
    marginBottom: 14,
  },
  formularioTextarea: { height: 100, textAlignVertical: 'top' },
  btnCancelar: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.chipBorder,
    alignItems: 'center',
  },
  btnCancelarText: { fontSize: 14, fontWeight: '600', color: C.textSec },
  btnEnviar: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: C.accent,
    alignItems: 'center',
  },
  btnEnviarText: { fontSize: 14, fontWeight: '700', color: C.bg },
  yaReseneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: C.successBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.success,
  },
  yaReseneText: { fontSize: 13, color: C.success, fontWeight: '600', flex: 1 },
});