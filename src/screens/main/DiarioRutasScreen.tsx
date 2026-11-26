import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { supabase } from '../../services/supabase';
import {
  cargarDiarioRutas,
  eliminarEntradaDiario,
  guardarEntradaDiario,
  type JournalEntry,
  type JournalEntryDraft,
  type JournalEntryType,
  type RideJournalReview,
  type RoadType,
} from '../../services/routeJournalService';

interface DiarioRutasScreenProps {
  navigation: { goBack: () => void };
}

const filtros: Array<{ value: RoadType | 'todas'; label: string }> = [
  { value: 'todas', label: 'Todos' },
  { value: 'curvas', label: 'Curvas' },
  { value: 'terraceria', label: 'Terracería' },
  { value: 'autopista', label: 'Autopista' },
  { value: 'mixto', label: 'Mixto' },
  { value: 'otro', label: 'Otro' },
];

const filtrosCamino = [
  ...filtros,
  { value: 'sin-clasificar' as const, label: 'Sin clasificar' },
];

const tiposPunto: Array<{ value: Exclude<JournalEntryType, 'ruta'>; label: string }> = [
  { value: 'gasolinera', label: 'Gasolinera' },
  { value: 'mirador', label: 'Mirador' },
  { value: 'taller', label: 'Taller' },
  { value: 'otro', label: 'Otro' },
];

const filtrosTipoPunto = [
  { value: 'todos' as const, label: 'Todos' },
  ...tiposPunto,
];

type FiltroCamino = RoadType | 'todas' | 'sin-clasificar';
type FiltroTipoPunto = Exclude<JournalEntryType, 'ruta'> | 'todos';

const nombresTipo: Record<JournalEntryType, string> = {
  ruta: 'Ruta favorita',
  gasolinera: 'Gasolinera',
  mirador: 'Mirador',
  taller: 'Taller',
  otro: 'Otro punto',
};

const esEnlaceGoogleMapsValido = (valor: string): boolean => {
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:') return false;

    const host = url.hostname.toLowerCase();
    const dominioGoogle = /^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
    const subdominioMaps = /^maps\.google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
    return host === 'maps.app.goo.gl'
      || (host === 'goo.gl' && url.pathname.startsWith('/maps'))
      || (dominioGoogle && url.pathname.startsWith('/maps'))
      || subdominioMaps;
  } catch {
    return false;
  }
};

const getMapUrl = (entry: JournalEntry): string | null => {
  if (entry.ubicacion_url && esEnlaceGoogleMapsValido(entry.ubicacion_url)) {
    return entry.ubicacion_url;
  }
  if (entry.latitud !== null && entry.longitud !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${entry.latitud},${entry.longitud}`;
  }
  return null;
};

const formatearFecha = (fecha: string | null) => fecha?.slice(0, 10) ?? 'Fecha no disponible';

export default function DiarioRutasScreen({ navigation }: DiarioRutasScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [rutasRevisadas, setRutasRevisadas] = useState<RideJournalReview[]>([]);
  const [entradas, setEntradas] = useState<JournalEntry[]>([]);
  const [filtroCamino, setFiltroCamino] = useState<FiltroCamino>('todas');
  const [filtroTipoPunto, setFiltroTipoPunto] = useState<FiltroTipoPunto>('todos');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [bitacoraId, setBitacoraId] = useState<string | null>(null);
  const [tipoRegistro, setTipoRegistro] = useState<JournalEntryType>('gasolinera');
  const [nombre, setNombre] = useState('');
  const [tipoCamino, setTipoCamino] = useState<RoadType | null>(null);
  const [ubicacionUrl, setUbicacionUrl] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [notasAsfalto, setNotasAsfalto] = useState('');
  const [notasClima, setNotasClima] = useState('');
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  const cargarDiario = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.user) throw new Error('Inicia sesión para consultar tu diario de rutas.');

      const diario = await cargarDiarioRutas(session.user.id);
      setPerfilId(session.user.id);
      setRutasRevisadas(diario.rutasRevisadas);
      setEntradas(diario.entradas);
    } catch (error) {
      console.error('No se pudo cargar el diario de rutas:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el diario de rutas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarDiario();
  }, [cargarDiario]);

  const rutasFavoritasPorBitacora = useMemo(() => {
    const favoritas = new Map<string, JournalEntry>();
    entradas.forEach(entry => {
      if (entry.tipo_registro === 'ruta' && entry.bitacora_id) {
        favoritas.set(entry.bitacora_id, entry);
      }
    });
    return favoritas;
  }, [entradas]);

  const rutasFiltradas = useMemo(() => rutasRevisadas.filter(route => {
    if (filtroCamino === 'todas') return true;
    const favorita = rutasFavoritasPorBitacora.get(route.id);
    if (!favorita) return false;
    if (filtroCamino === 'sin-clasificar') return favorita.tipo_camino === null;
    return favorita.tipo_camino === filtroCamino;
  }), [filtroCamino, rutasFavoritasPorBitacora, rutasRevisadas]);

  const puntosFiltrados = useMemo(() => entradas.filter(entry => (
    entry.tipo_registro !== 'ruta'
    && (filtroTipoPunto === 'todos' || entry.tipo_registro === filtroTipoPunto)
    && (
      filtroCamino === 'todas'
      || (filtroCamino === 'sin-clasificar'
        ? entry.tipo_camino === null
        : entry.tipo_camino === filtroCamino)
    )
  )), [entradas, filtroCamino, filtroTipoPunto]);

  const abrirFormulario = (entry?: JournalEntry, route?: RideJournalReview) => {
    const currentEntry = entry;
    setEditandoId(currentEntry?.id ?? null);
    setBitacoraId(currentEntry?.bitacora_id ?? route?.id ?? null);
    setTipoRegistro(currentEntry?.tipo_registro ?? (route ? 'ruta' : 'gasolinera'));
    setNombre(currentEntry?.nombre ?? route?.destino ?? route?.titulo ?? '');
    setTipoCamino(currentEntry?.tipo_camino ?? null);
    setUbicacionUrl(currentEntry?.ubicacion_url ?? '');
    setLatitud(currentEntry?.latitud === null || currentEntry?.latitud === undefined ? '' : String(currentEntry.latitud));
    setLongitud(currentEntry?.longitud === null || currentEntry?.longitud === undefined ? '' : String(currentEntry.longitud));
    setNotasAsfalto(currentEntry?.notas_asfalto ?? '');
    setNotasClima(currentEntry?.notas_clima ?? '');
    setErrorFormulario(null);
    setModalVisible(true);
  };

  const cerrarFormulario = () => {
    if (saving) return;
    setModalVisible(false);
    setErrorFormulario(null);
  };

  const alternarFavorita = async (route: RideJournalReview) => {
    if (!perfilId || saving) return;
    const existing = rutasFavoritasPorBitacora.get(route.id);
    setSaving(true);
    setErrorMessage(null);
    try {
      if (existing) {
        await eliminarEntradaDiario(perfilId, existing.id);
        setEntradas(current => current.filter(entry => entry.id !== existing.id));
      } else {
        const saved = await guardarEntradaDiario(perfilId, {
          bitacora_id: route.id,
          tipo_registro: 'ruta',
          nombre: route.destino || route.titulo,
          tipo_camino: null,
          ubicacion_url: null,
          latitud: null,
          longitud: null,
          notas_asfalto: null,
          notas_clima: null,
        });
        setEntradas(current => [saved, ...current]);
        abrirFormulario(saved, route);
      }
    } catch (error) {
      console.error('No se pudo actualizar la ruta favorita:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar la ruta favorita.');
    } finally {
      setSaving(false);
    }
  };

  const guardarFormulario = async () => {
    if (!perfilId || saving) return;
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorFormulario('Escribe un nombre para guardar esta entrada.');
      return;
    }

    const urlLimpia = ubicacionUrl.trim();
    if (urlLimpia && !esEnlaceGoogleMapsValido(urlLimpia)) {
      setErrorFormulario('Usa un enlace HTTPS de Google Maps.');
      return;
    }

    const latitudLimpia = latitud.trim();
    const longitudLimpia = longitud.trim();
    if (Boolean(latitudLimpia) !== Boolean(longitudLimpia)) {
      setErrorFormulario('Ingresa latitud y longitud juntas, o deja ambas vacías.');
      return;
    }

    let latitudNumero: number | null = null;
    let longitudNumero: number | null = null;
    if (latitudLimpia && longitudLimpia) {
      latitudNumero = Number(latitudLimpia);
      longitudNumero = Number(longitudLimpia);
      if (
        !Number.isFinite(latitudNumero)
        || !Number.isFinite(longitudNumero)
        || latitudNumero < -90
        || latitudNumero > 90
        || longitudNumero < -180
        || longitudNumero > 180
      ) {
        setErrorFormulario('Las coordenadas deben estar dentro de los rangos válidos de latitud y longitud.');
        return;
      }
    }

    if (tipoRegistro === 'ruta' && !bitacoraId) {
      setErrorFormulario('No se encontró la reseña asociada a esta ruta.');
      return;
    }

    const draft: JournalEntryDraft = {
      ...(editandoId ? { id: editandoId } : {}),
      bitacora_id: tipoRegistro === 'ruta' ? bitacoraId : null,
      tipo_registro: tipoRegistro,
      nombre: nombreLimpio,
      tipo_camino: tipoCamino,
      ubicacion_url: urlLimpia || null,
      latitud: latitudNumero,
      longitud: longitudNumero,
      notas_asfalto: notasAsfalto.trim() || null,
      notas_clima: notasClima.trim() || null,
    };

    setSaving(true);
    setErrorFormulario(null);
    setErrorMessage(null);
    try {
      const saved = await guardarEntradaDiario(perfilId, draft);
      setEntradas(current => {
        const withoutPrevious = current.filter(entry => entry.id !== saved.id);
        return [saved, ...withoutPrevious];
      });
      setModalVisible(false);
    } catch (error) {
      console.error('No se pudo guardar la entrada del diario:', error);
      setErrorFormulario(error instanceof Error ? error.message : 'No se pudo guardar esta entrada.');
    } finally {
      setSaving(false);
    }
  };

  const eliminarPunto = (entry: JournalEntry) => {
    if (!perfilId || saving) return;
    const eliminar = async () => {
      setSaving(true);
      setErrorMessage(null);
      try {
        await eliminarEntradaDiario(perfilId, entry.id);
        setEntradas(current => current.filter(item => item.id !== entry.id));
      } catch (error) {
        console.error('No se pudo eliminar el punto de interés:', error);
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar el punto de interés.');
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${entry.nombre}" de tu diario?`)) void eliminar();
      return;
    }

    Alert.alert('Eliminar punto', `¿Eliminar "${entry.nombre}" de tu diario?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void eliminar() },
    ]);
  };

  const abrirMapa = async (entry: JournalEntry) => {
    const url = getMapUrl(entry);
    if (!url) {
      setErrorMessage('Esta entrada todavía no tiene un enlace o coordenadas para abrir en el mapa.');
      return;
    }
    setErrorMessage(null);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('No se pudo abrir la ubicación del diario:', error);
      setErrorMessage('No se pudo abrir Google Maps. Revisa el enlace e inténtalo de nuevo.');
    }
  };

  const renderFiltrosTipoPunto = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {filtrosTipoPunto.map(filter => (
        <TouchableOpacity
          key={filter.value}
          style={[styles.filterChip, filtroTipoPunto === filter.value && styles.filterChipActive]}
          onPress={() => setFiltroTipoPunto(filter.value)}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar puntos por ${filter.label}`}
          accessibilityState={{ selected: filtroTipoPunto === filter.value }}
        >
          <Text style={[styles.filterText, filtroTipoPunto === filter.value && styles.filterTextActive]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderFiltrosCamino = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {filtrosCamino.map(filter => (
        <TouchableOpacity
          key={filter.value}
          style={[styles.filterChip, filtroCamino === filter.value && styles.filterChipActive]}
          onPress={() => setFiltroCamino(filter.value)}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por ${filter.label}`}
          accessibilityState={{ selected: filtroCamino === filter.value }}
        >
          <Text style={[styles.filterText, filtroCamino === filter.value && styles.filterTextActive]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backButton} accessibilityLabel="Regresar">
          <Ionicons name="arrow-back" size={26} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diario de rutas</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Ionicons name="map-outline" size={26} color={theme.primary} />
          <Text style={styles.introText}>Guarda tus rutas favoritas y lugares confiables para volver a encontrarlos.</Text>
        </View>

        {errorMessage && <Text style={styles.errorText} accessibilityRole="alert">{errorMessage}</Text>}

        <View style={styles.filterHeading}>
          <Text style={styles.sectionTitle}>Filtrar puntos por tipo</Text>
        </View>
        {renderFiltrosTipoPunto()}
        <View>
          <Text style={styles.sectionTitle}>Filtrar por camino</Text>
        </View>
        {renderFiltrosCamino()}

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color={theme.primary} />
        ) : errorMessage && !perfilId ? (
          <TouchableOpacity onPress={() => void cargarDiario()} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="star-outline" size={20} color={theme.warningText} />
                <Text style={styles.sectionTitle}>Rutas de mis reseñas</Text>
              </View>
              <Text style={styles.sectionHint}>Toca la estrella para guardar una ruta como favorita.</Text>
            </View>

            {rutasFiltradas.length === 0 ? (
              <Text style={styles.emptyText}>
                {filtroCamino === 'todas'
                  ? 'Cuando completes una reseña de rodada, aparecerá aquí.'
                  : 'No hay rutas favoritas clasificadas con este tipo de camino.'}
              </Text>
            ) : rutasFiltradas.map(route => {
              const favorite = rutasFavoritasPorBitacora.get(route.id);
              const roadLabel = filtros.find(filter => filter.value === favorite?.tipo_camino)?.label;
              const routeTitle = favorite?.nombre || route.titulo;
              const routeHasMap = favorite && getMapUrl(favorite) !== null;
              return (
                <View key={route.id} style={styles.routeCard}>
                  <View style={styles.routeInfo}>
                    <Text style={styles.cardTitle}>{routeTitle}</Text>
                    <Text style={styles.cardSubtitle}>
                      {route.destino && route.destino !== routeTitle ? `${route.destino} · ` : ''}
                      {formatearFecha(route.fecha)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {route.distanciaKm > 0 ? `${route.distanciaKm} km` : 'Distancia sin registrar'}
                      {route.calificacion ? ` · ${route.calificacion}/5` : ''}
                      {roadLabel ? ` · ${roadLabel}` : ''}
                    </Text>
                  </View>
                  {favorite && (
                    <TouchableOpacity
                      onPress={() => abrirFormulario(favorite, route)}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar notas de ${favorite.nombre}`}
                    >
                      <Ionicons name="create-outline" size={21} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                  {routeHasMap && favorite && (
                    <TouchableOpacity
                      onPress={() => void abrirMapa(favorite)}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir ubicación de ${favorite.nombre} en Google Maps`}
                    >
                      <Ionicons name="map-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => void alternarFavorita(route)}
                    style={styles.iconButton}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={favorite ? `Quitar ${route.titulo} de favoritas` : `Marcar ${route.titulo} como favorita`}
                  >
                    <Ionicons
                      name={favorite ? 'star' : 'star-outline'}
                      size={23}
                      color={favorite ? theme.star : theme.iconSecondary}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={[styles.sectionHeading, styles.pointsHeading]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="location-outline" size={20} color={theme.primary} />
                <Text style={styles.sectionTitle}>Puntos de interés</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => abrirFormulario()}
                accessibilityRole="button"
                accessibilityLabel="Agregar punto de interés"
              >
                <Ionicons name="add" size={18} color={theme.onPrimary} />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {puntosFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>
                {filtroTipoPunto !== 'todos' || filtroCamino !== 'todas'
                  ? 'No hay puntos de interés que coincidan con los filtros seleccionados.'
                  : 'Guarda gasolineras, miradores o talleres recomendados desde aquí.'}
              </Text>
            ) : puntosFiltrados.map(point => {
              const mapUrl = getMapUrl(point);
              const roadLabel = filtros.find(filter => filter.value === point.tipo_camino)?.label;
              return (
                <View key={point.id} style={styles.pointCard}>
                  <View style={styles.pointIcon}>
                    <Ionicons
                      name={point.tipo_registro === 'gasolinera' ? 'water-outline' : point.tipo_registro === 'mirador' ? 'eye-outline' : point.tipo_registro === 'taller' ? 'build-outline' : 'location-outline'}
                      size={22}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.pointInfo}>
                    <Text style={styles.cardTitle}>{point.nombre}</Text>
                    <Text style={styles.cardSubtitle}>
                      {nombresTipo[point.tipo_registro]}{roadLabel ? ` · ${roadLabel}` : ''}
                    </Text>
                    {point.notas_asfalto && <Text style={styles.pointNote}>Asfalto: {point.notas_asfalto}</Text>}
                    {point.notas_clima && <Text style={styles.pointNote}>Clima: {point.notas_clima}</Text>}
                    {mapUrl && (
                      <TouchableOpacity
                        onPress={() => void abrirMapa(point)}
                        style={styles.mapButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ubicación de ${point.nombre} en Google Maps`}
                      >
                        <Ionicons name="map-outline" size={15} color={theme.primary} />
                        <Text style={styles.mapButtonText}>Abrir en Google Maps</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.pointActions}>
                    <TouchableOpacity
                      onPress={() => abrirFormulario(point)}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${point.nombre}`}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => eliminarPunto(point)}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${point.nombre}`}
                    >
                      <Ionicons name="trash-outline" size={19} color={theme.dangerText} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={cerrarFormulario}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tipoRegistro === 'ruta' ? 'Editar ruta favorita' : editandoId ? 'Editar punto' : 'Agregar punto de interés'}
              </Text>
              <TouchableOpacity onPress={cerrarFormulario} accessibilityRole="button" accessibilityLabel="Cerrar formulario">
                <Ionicons name="close" size={25} color={theme.iconPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {tipoRegistro !== 'ruta' && (
                <>
                  <Text style={styles.fieldLabel}>Tipo de punto</Text>
                  <View style={styles.optionRow}>
                    {tiposPunto.map(type => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => setTipoRegistro(type.value)}
                        style={[styles.optionChip, tipoRegistro === type.value && styles.optionChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: tipoRegistro === type.value }}
                      >
                        <Text style={[styles.optionText, tipoRegistro === type.value && styles.optionTextActive]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre de ruta o punto"
                placeholderTextColor={theme.iconSecondary}
                maxLength={120}
              />

              <Text style={styles.fieldLabel}>Tipo de camino</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  onPress={() => setTipoCamino(null)}
                  style={[styles.optionChip, tipoCamino === null && styles.optionChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tipoCamino === null }}
                >
                  <Text style={[styles.optionText, tipoCamino === null && styles.optionTextActive]}>Sin clasificar</Text>
                </TouchableOpacity>
                {filtros.filter(filter => filter.value !== 'todas').map(filter => (
                  <TouchableOpacity
                    key={filter.value}
                    onPress={() => setTipoCamino(filter.value as RoadType)}
                    style={[styles.optionChip, tipoCamino === filter.value && styles.optionChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Camino ${filter.label}`}
                    accessibilityState={{ selected: tipoCamino === filter.value }}
                  >
                    <Text style={[styles.optionText, tipoCamino === filter.value && styles.optionTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Enlace de Google Maps (opcional)</Text>
              <TextInput
                style={styles.input}
                value={ubicacionUrl}
                onChangeText={setUbicacionUrl}
                placeholder="https://www.google.com/maps/..."
                placeholderTextColor={theme.iconSecondary}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.fieldLabel}>Coordenadas (opcional)</Text>
              <View style={styles.coordinateRow}>
                <TextInput
                  style={[styles.input, styles.coordinateInput]}
                  value={latitud}
                  onChangeText={setLatitud}
                  placeholder="Latitud"
                  placeholderTextColor={theme.iconSecondary}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.coordinateInput]}
                  value={longitud}
                  onChangeText={setLongitud}
                  placeholder="Longitud"
                  placeholderTextColor={theme.iconSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={styles.fieldLabel}>Notas sobre el asfalto</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={notasAsfalto}
                onChangeText={setNotasAsfalto}
                placeholder="Baches, curvas, tramos en reparación..."
                placeholderTextColor={theme.iconSecondary}
                multiline
                maxLength={500}
              />

              <Text style={styles.fieldLabel}>Clima habitual</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={notasClima}
                onChangeText={setNotasClima}
                placeholder="Lluvia, niebla, viento..."
                placeholderTextColor={theme.iconSecondary}
                multiline
                maxLength={500}
              />

              {errorFormulario && <Text style={styles.errorText} accessibilityRole="alert">{errorFormulario}</Text>}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabled]}
                onPress={() => void guardarFormulario()}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Guardar en diario"
              >
                {saving
                  ? <ActivityIndicator color={theme.onPrimary} />
                  : <Text style={styles.saveButtonText}>Guardar en diario</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 50, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card },
  backButton: { width: 38, paddingVertical: 5 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: theme.textPrimary },
  headerSpacer: { width: 38 },
  content: { padding: 18, paddingBottom: 40 },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: theme.card, borderRadius: 15, borderWidth: 1, borderColor: theme.border },
  introText: { flex: 1, color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  errorText: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 10, padding: 12, marginTop: 12, fontSize: 13, lineHeight: 19 },
  filterHeading: { marginTop: 18 },
  sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  filters: { gap: 8, paddingVertical: 10 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: theme.onPrimary },
  loader: { marginTop: 35 },
  retryButton: { alignSelf: 'center', padding: 14 },
  retryText: { color: theme.primary, fontWeight: '700' },
  sectionHeading: { marginTop: 14, marginBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionHint: { color: theme.textSecondary, fontSize: 12, marginTop: 5 },
  routeCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 13, marginBottom: 9 },
  routeInfo: { flex: 1 },
  cardTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  cardSubtitle: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  cardMeta: { color: theme.primary, fontSize: 11, fontWeight: '600', marginTop: 5 },
  iconButton: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  pointsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: theme.primary, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  addButtonText: { color: theme.onPrimary, fontSize: 12, fontWeight: '700' },
  emptyText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14, marginTop: 5 },
  pointCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 12, marginTop: 9 },
  pointIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.infoBg, borderRadius: 12 },
  pointInfo: { flex: 1 },
  pointNote: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 5 },
  pointActions: { alignItems: 'center' },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingTop: 8 },
  mapButtonText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay },
  modalCard: { maxHeight: '90%', backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  fieldLabel: { color: theme.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 11, marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.background, paddingHorizontal: 12, paddingVertical: 10, color: theme.textPrimary, fontSize: 14 },
  multilineInput: { minHeight: 72, textAlignVertical: 'top' },
  coordinateRow: { flexDirection: 'row', gap: 10 },
  coordinateInput: { flex: 1 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  optionChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 },
  optionChipActive: { borderColor: theme.primary, backgroundColor: theme.infoBg },
  optionText: { color: theme.textSecondary, fontSize: 12 },
  optionTextActive: { color: theme.primary, fontWeight: '700' },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 11, marginTop: 18, marginBottom: 4 },
  saveButtonText: { color: theme.onPrimary, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
