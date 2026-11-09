import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';
import type { Theme } from '../../../assets/theme/theme';

export default function ForoCrearPublicacion({ navigation }: any) {
  const { isDarkMode, theme } = useTheme();
  const styles = createStyles(theme);
  const [titulo, setTitulo] = useState('');
  const [marca, setMarca] = useState('Italika');
  const [modeloMoto, setModeloMoto] = useState('');
  const [categoria, setCategoria] = useState('Rutas');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fechaRodada, setFechaRodada] = useState('');
  const [horaRodada, setHoraRodada] = useState('');
  const [cupoMaximo, setCupoMaximo] = useState('');
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [mostrarSelectorHora, setMostrarSelectorHora] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  // Estado para la imagen seleccionada de la galería
  const [imagen, setImagen] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Ubicación LocationIQ
  const [ubicacionQuery, setUbicacionQuery] = useState('');
  const [resultadosUbicacion, setResultadosUbicacion] = useState<any[]>([]);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);

  // Modales Marca/Modelo
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState<'marca' | 'modelo' | null>(null);

  const LOCATIONIQ_KEY = 'pk.55df4ad365d5d977461ab6f7adfadfa8';

  const motosPorMarca: Record<string, string[]> = {
    Italika: ['FT150', 'FT125', 'FT250', 'DM150', 'DM200', 'Vort-X 300'],
    Bajaj: ['Pulsar NS160', 'Pulsar NS200', 'Pulsar NS250', 'Dominar 250', 'Dominar 400'],
    Yamaha: ['FZ16', 'FZ25', 'MT03', 'R15'],
    Honda: ['CB190R', 'CB300R', 'CBR250R'],
    Suzuki: ['Gixxer 150', 'Gixxer 250', 'GSX-R150'],
    KTM: ['RC200', 'RC390', 'Duke 200', 'Duke 390'],
  };

  const categorias = ['Rutas', 'Mecánica', 'Compra/Venta', 'Off-Topic'];

  const mostrarMensaje = (tituloMsg: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${tituloMsg}: ${mensaje}`);
    } else {
      Alert.alert(tituloMsg, mensaje);
    }
  };

  // Función para seleccionar imagen de la galería del dispositivo
  const seleccionarImagen = async () => {
    try {
      const permisoRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permisoRes.granted) {
        mostrarMensaje('Permiso requerido', 'Se requieren permisos para acceder a la galería.');
        return;
      }

      let resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        setImagen(resultado.assets[0]);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      mostrarMensaje('Error', 'No se pudo abrir la galería.');
    }
  };

  const buscarUbicacion = async (texto: string) => {
    setUbicacionQuery(texto);

    if (!texto || texto.trim().length < 3) {
      setResultadosUbicacion([]);
      return;
    }

    setCargandoUbicacion(true);
    try {
      const response = await fetch(
        `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
          texto
        )}&countrycodes=mx&limit=5&format=json&lang=es`
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        setResultadosUbicacion(data);
      } else {
        setResultadosUbicacion([]);
      }
    } catch (error) {
      console.error('Error buscando ubicación:', error);
      setResultadosUbicacion([]);
    } finally {
      setCargandoUbicacion(false);
    }
  };

  const seleccionarUbicacion = (item: any) => {
    const texto = typeof item === 'string' ? item : item?.display_name || '';
    setUbicacionQuery(texto);
    setResultadosUbicacion([]);
  };

  const abrirModal = (tipo: 'marca' | 'modelo') => {
    setModalTipo(tipo);
    setModalVisible(true);
  };

  const seleccionarOpcion = (item: string) => {
    if (modalTipo === 'marca') {
      setMarca(item);
      setModeloMoto('');
    } else if (modalTipo === 'modelo') {
      setModeloMoto(item);
    }
    setModalVisible(false);
  };

  const fechaDesdeTexto = (valor: string) => {
    const [year, month, day] = valor.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  };
  const fechaYMD = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const crearPublicacion = async () => {
    if (!titulo.trim() || !descripcion.trim()) {
      mostrarMensaje('Campos requeridos', 'Por favor ingresa un título y una descripción.');
      return;
    }
    if (cupoMaximo && Number(cupoMaximo) < 1) {
      mostrarMensaje('Cupo inválido', 'El cupo máximo debe ser de al menos una persona.');
      return;
    }

    try {
      setGuardando(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        mostrarMensaje('Error de Sesión', 'No se pudo verificar la sesión. Intenta reiniciar la sesión.');
        setGuardando(false);
        return;
      }

      let contenidoCompleto = descripcion.trim();
      const detallesExtras = [];

      if (marca) detallesExtras.push(`Moto: ${marca}${modeloMoto ? ' ' + modeloMoto : ''}`);
      if (ubicacionQuery) detallesExtras.push(`Punto: ${ubicacionQuery}`);
      if (fechaRodada) detallesExtras.push(`Fecha: ${fechaRodada}`);
      if (horaRodada) detallesExtras.push(`Hora: ${horaRodada}`);
      if (cupoMaximo) detallesExtras.push(`Cupo: ${cupoMaximo}`);
      if (detallesExtras.length > 0) {
        contenidoCompleto += `\n\n📍 ${detallesExtras.join(' | ')}`;
      }

      let imagenUrl: string | null = null;
      if (imagen) {
        const extension = imagen.fileName?.split('.').pop()?.toLowerCase()
          || imagen.uri.split('.').pop()?.split('?')[0]?.toLowerCase()
          || 'jpg';
        const mimeType = imagen.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg');
        const ruta = `${session.user.id}/${Date.now()}.${extension}`;
        const respuesta = await fetch(imagen.uri);
        const archivo = await respuesta.arrayBuffer();

        const { error: errorSubida } = await supabase.storage
          .from('foro-imagenes')
          .upload(ruta, archivo, { contentType: mimeType, upsert: false });

        if (errorSubida) {
          mostrarMensaje('Error al subir la foto', errorSubida.message);
          return;
        }

        imagenUrl = supabase.storage.from('foro-imagenes').getPublicUrl(ruta).data.publicUrl;
      }

      const { error } = await supabase.from('foro_publicaciones').insert([
        {
          perfil_id: session.user.id,
          titulo: titulo.trim(),
          contenido: contenidoCompleto,
          categoria: categoria,
          imagen_url: imagenUrl,
        },
      ]);

      if (error) {
        console.error('Error devuelto por Supabase:', error);
        mostrarMensaje('Error al guardar', error.message);
        return;
      }

      mostrarMensaje('¡Éxito!', 'Tu publicación ha sido creada.');
      navigation.goBack();
    } catch (err: any) {
      console.error('Error inesperado:', err);
      mostrarMensaje('Error inesperado', err.message || 'Ocurrió un error al publicar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* ENCABEZADO */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Publicación</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formWrapper}>
          {/* TÍTULO */}
          <CustomInput
            label="Título de la publicación"
            placeholder="Ej. Rodada al Volcán este domingo"
            value={titulo}
            onChangeText={setTitulo}
          />

          {/* CATEGORÍAS */}
          <Text style={styles.sectionLabel}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {categorias.map((cat) => {
              const isSelected = categoria === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setCategoria(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* MARCA Y MODELO */}
          <Text style={styles.sectionLabel}>Detalles de la Moto</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.selectCard} onPress={() => abrirModal('marca')}>
              <Text style={styles.selectCardSub}>Marca</Text>
              <View style={styles.selectCardRow}>
                <Text style={styles.selectCardValue}>{marca}</Text>
                <Ionicons name="chevron-down" size={18} color={theme.primary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectCard} onPress={() => abrirModal('modelo')}>
              <Text style={styles.selectCardSub}>Modelo</Text>
              <View style={styles.selectCardRow}>
                <Text style={[styles.selectCardValue, !modeloMoto && { color: theme.textSecondary }]}>
                  {modeloMoto || 'Seleccionar'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* DESCRIPCIÓN */}
          <CustomInput
            label="Descripción"
            placeholder="Escribe el itinerario, recomendaciones, punto de encuentro..."
            value={descripcion}
            onChangeText={setDescripcion}
          />

          {/* SUBIDA Y PREVISUALIZACIÓN DE FOTOS */}
          <Text style={styles.sectionLabel}>Multimedia / Fotografía</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={seleccionarImagen} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={22} color={theme.primary} style={{ marginRight: 10 }} />
            <Text style={styles.imagePickerButtonText}>
              {imagen ? 'Cambiar foto de la galería' : 'Subir foto desde la galería'}
            </Text>
          </TouchableOpacity>

          {imagen && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imagen.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImagen(null)}>
                <Ionicons name="close-circle" size={24} color="#ff4d4d" />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionLabel}>Cupo máximo (opcional)</Text>
          <View style={styles.inputCard}>
            <Ionicons name="people-outline" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              value={cupoMaximo}
              onChangeText={(value) => setCupoMaximo(value.replace(/[^0-9]/g, ''))}
              placeholder="Ej. 12 participantes"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {/* BUSCADOR DE UBICACIÓN */}
          <Text style={styles.sectionLabel}>Punto de salida / Ubicación</Text>
          <View style={styles.locationContainer}>
            <View style={styles.inputCard}>
              <Ionicons name="location-outline" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Ej. Gasolinera Zavaleta, Puebla"
                placeholderTextColor={theme.textSecondary}
                value={ubicacionQuery}
                onChangeText={buscarUbicacion}
              />
              {cargandoUbicacion && <ActivityIndicator size="small" color={theme.primary} />}
            </View>

            {/* LISTA RESULTADOS UBICACIÓN */}
            {Array.isArray(resultadosUbicacion) && resultadosUbicacion.length > 0 && (
              <View style={styles.resultadosCard}>
                {resultadosUbicacion.map((item, index) => {
                  if (!item) return null;
                  const textoMostrar = typeof item === 'string' ? item : (item.display_name || item.name || 'Ubicación');

                  return (
                    <TouchableOpacity
                      key={item.place_id ? `ub-${item.place_id}` : `ub-idx-${index}`}
                      style={styles.resultadoItem}
                      onPress={() => seleccionarUbicacion(item)}
                    >
                      <Ionicons name="pin-outline" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.resultadoTexto} numberOfLines={2}>
                        {textoMostrar}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Fecha y hora de la rodada (opcional)</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleInputWrap}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <input
                  type="date"
                  value={fechaRodada}
                  min={fechaYMD(new Date())}
                  aria-label="Elegir fecha de la rodada"
                  onChange={(event) => setFechaRodada(event.target.value)}
                  style={{
                    flex: 1, minWidth: 0, color: theme.textPrimary, backgroundColor: 'transparent',
                    border: 'none', outline: 'none', fontSize: 14, padding: 8,
                    colorScheme: isDarkMode ? 'dark' : 'light',
                  } as any}
                />
              </View>
              <View style={styles.scheduleInputWrap}>
                <Ionicons name="time-outline" size={18} color={theme.primary} />
                <input
                  type="time"
                  value={horaRodada}
                  aria-label="Elegir hora de la rodada"
                  onChange={(event) => setHoraRodada(event.target.value)}
                  style={{
                    flex: 1, minWidth: 0, color: theme.textPrimary, backgroundColor: 'transparent',
                    border: 'none', outline: 'none', fontSize: 14, padding: 8,
                    colorScheme: isDarkMode ? 'dark' : 'light',
                  } as any}
                />
              </View>
            </View>
          ) : (
            <View style={styles.scheduleRow}>
              <TouchableOpacity style={styles.scheduleButton} onPress={() => setMostrarSelectorFecha(true)}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                <Text style={styles.scheduleButtonText}>{fechaRodada || 'Elegir fecha'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scheduleButton} onPress={() => setMostrarSelectorHora(true)}>
                <Ionicons name="time-outline" size={18} color={theme.primary} />
                <Text style={styles.scheduleButtonText}>{horaRodada || 'Elegir hora'}</Text>
              </TouchableOpacity>
              {mostrarSelectorFecha && <DateTimePicker value={fechaRodada ? fechaDesdeTexto(fechaRodada) : new Date()} mode="date" minimumDate={new Date()} onChange={(event: DateTimePickerEvent, date?: Date) => {
                setMostrarSelectorFecha(Platform.OS === 'ios'); if (date) setFechaRodada(fechaYMD(date));
              }} />}
              {mostrarSelectorHora && <DateTimePicker value={new Date(`2000-01-01T${horaRodada || '12:00'}:00`)} mode="time" onChange={(event: DateTimePickerEvent, date?: Date) => {
                setMostrarSelectorHora(Platform.OS === 'ios'); if (date) setHoraRodada(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
              }} />}
            </View>
          )}

          {/* BOTÓN PUBLICAR */}
          <View style={styles.footerButton}>
            <TouchableOpacity style={styles.previewButton} onPress={() => setMostrarVistaPrevia(true)}>
              <Ionicons name="eye-outline" size={18} color={theme.primary} />
              <Text style={styles.previewButtonText}>Vista previa</Text>
            </TouchableOpacity>
            {guardando ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : (
              <CustomButton title="Publicar en la comunidad" onPress={crearPublicacion} />
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL MARCA Y MODELO */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalBar} />
            <Text style={styles.modalTitle}>
              {modalTipo === 'marca' ? 'Selecciona una Marca' : 'Selecciona un Modelo'}
            </Text>

            <FlatList
              data={modalTipo === 'marca' ? Object.keys(motosPorMarca) : (motosPorMarca[marca] || [])}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => seleccionarOpcion(item)}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mostrarVistaPrevia} transparent animationType="slide" onRequestClose={() => setMostrarVistaPrevia(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewModalTitle}>Vista previa</Text>
              <TouchableOpacity onPress={() => setMostrarVistaPrevia(false)} accessibilityLabel="Cerrar vista previa">
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.previewCard}>
                <Text style={styles.previewCategory}>{categoria}</Text>
                <Text style={styles.previewTitle}>{titulo.trim() || 'Título de la publicación'}</Text>
                <Text style={styles.previewDescription}>{descripcion.trim() || 'La descripción aparecerá aquí.'}</Text>
                {!!(marca || ubicacionQuery || fechaRodada || horaRodada || cupoMaximo) && (
                  <View style={styles.previewDetails}>
                    {!!marca && <Text style={styles.previewDetail}>🏍️ {marca}{modeloMoto ? ` ${modeloMoto}` : ''}</Text>}
                    {!!ubicacionQuery && <Text style={styles.previewDetail}>📍 {ubicacionQuery}</Text>}
                    {!!fechaRodada && <Text style={styles.previewDetail}>📅 {fechaRodada}</Text>}
                    {!!horaRodada && <Text style={styles.previewDetail}>🕒 {horaRodada}</Text>}
                    {!!cupoMaximo && <Text style={styles.previewDetail}>👥 Cupo máximo: {cupoMaximo}</Text>}
                  </View>
                )}
                {!!imagen && <Image source={{ uri: imagen.uri }} style={styles.previewPhoto} resizeMode="cover" />}
              </View>
            </ScrollView>
            <CustomButton title="Volver a editar" onPress={() => setMostrarVistaPrevia(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: 15,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },
    formWrapper: { width: '100%', maxWidth: 800 },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 10,
      marginLeft: 2,
    },

    inputCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 15,
    },
    input: { flex: 1, fontSize: 15, color: theme.textPrimary },

    imagePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 15,
    },
    imagePickerButtonText: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
    previewContainer: { position: 'relative', marginBottom: 15, alignItems: 'center' },
    previewImage: { width: '100%', height: 280, borderRadius: 14, resizeMode: 'contain', backgroundColor: '#111318' },
    removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },

    locationContainer: {
      marginBottom: 20,
    },
    resultadosCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: -8,
      marginBottom: 15,
      elevation: 5,
    },
    resultadoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    resultadoTexto: { fontSize: 13, color: theme.textPrimary, flex: 1 },

    chipsScroll: { flexDirection: 'row', marginBottom: 15 },
    chip: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 10,
    },
    chipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
    chipTextSelected: { color: '#ffffff' },

    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    selectCard: {
      width: '48%',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectCardSub: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' },
    selectCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    selectCardValue: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },

    footerButton: {
      marginTop: 20,
    },
    scheduleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    scheduleInputWrap: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.card },
    webScheduleInput: {
      flex: 1, minWidth: 0, color: theme.textPrimary, paddingVertical: 9, fontSize: 14,
    },
    scheduleButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.card },
    scheduleButtonText: { color: theme.textPrimary, fontSize: 13 },
    previewButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 12, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.primary },
    previewButtonText: { color: theme.primary, fontWeight: '700' },
    previewOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 16 },
    previewModal: { width: '100%', maxWidth: 700, maxHeight: '90%', alignSelf: 'center', padding: 18, borderRadius: 18, backgroundColor: theme.card },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    previewModalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
    previewCard: { padding: 16, marginBottom: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background },
    previewCategory: { color: theme.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 7 },
    previewTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 7 },
    previewDescription: { color: theme.textSecondary, fontSize: 14, lineHeight: 21 },
    previewDetails: { gap: 7, marginTop: 12, padding: 11, borderRadius: 10, backgroundColor: theme.card },
    previewDetail: { color: theme.textSecondary, fontSize: 13 },
    previewPhoto: { width: '100%', height: 220, marginTop: 12, borderRadius: 10, backgroundColor: theme.card },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '50%',
    },
    modalBar: { width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 15, textAlign: 'center' },
    modalOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    modalOptionText: { fontSize: 15, color: theme.textPrimary, fontWeight: '600' },
  });
