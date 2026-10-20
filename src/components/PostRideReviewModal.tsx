import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../assets/theme/ThemeContext';
import {
  guardarResenaRodada,
  ignorarEventoPendiente,
  parseEventoDateTime,
  posponerEventoPendiente,
} from '../services/reviewService';
import { supabase } from '../services/supabase';

export interface ReviewEventLike {
  id: string;
  titulo?: string;
  fecha?: string;
  hora?: string;
  descripcion?: string;
  moto_asociada?: string;
  tipo?: string;
}

interface Moto {
  id: string;
  alias: string | null;
  marca: string;
  modelo: string;
}

interface PostRideReviewModalProps {
  visible: boolean;
  evento: ReviewEventLike | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PostRideReviewModal({
  visible,
  evento,
  onClose,
  onSuccess,
}: PostRideReviewModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Estados del formulario
  const [rating, setRating] = useState(0);
  const [distancia, setDistancia] = useState('');
  const [duracion, setDuracion] = useState('');
  const [notas, setNotas] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  
  // Nuevos estados para las motos
  const [motos, setMotos] = useState<Moto[]>([]);
  const [motocicletaSeleccionada, setMotocicletaSeleccionada] = useState<string | null>(null);
  const [cargandoMotos, setCargandoMotos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const fechaEvento = parseEventoDateTime(evento?.fecha, evento?.hora);
  const fechaFormateada = fechaEvento?.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const horaFormateada = evento?.hora ? formatearHora(evento.hora, fechaEvento) : null;

  useEffect(() => {
    if (visible) {
      fetchMotosUsuario();
    } else {
      // Limpiar estados al cerrar
      setRating(0);
      setDistancia('');
      setDuracion('');
      setNotas('');
      setFotoUri(null);
      setMotocicletaSeleccionada(null);
      setGuardando(false);
    }
  }, [visible]);

  const fetchMotosUsuario = async () => {
    try {
      setCargandoMotos(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('motocicletas')
        .select('id, alias, marca, modelo')
        .eq('perfil_id', session.user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setMotos(data);
        // Si solo tiene una moto, la seleccionamos automáticamente por comodidad
        if (data.length === 1) {
          setMotocicletaSeleccionada(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error obteniendo motos:', error);
    } finally {
      setCargandoMotos(false);
    }
  };

  const seleccionarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir la foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setFotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleGuardar = async () => {
    if (!evento?.id) return;
    
    // Validación de moto
    if (!motocicletaSeleccionada && motos.length > 0) {
      Alert.alert('Falta información', 'Por favor selecciona la motocicleta que usaste en esta rodada.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Falta tu calificación', 'Califica la ruta con 1 a 5 estrellas para continuar.');
      return;
    }

    try {
      setGuardando(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const distanciaKm = distancia ? Number(distancia.replace(',', '.')) : 0;
      const duracionMinutos = duracion ? Number(duracion.replace(',', '.')) : 0;

      // ATENCIÓN: Asegúrate de actualizar tu función `guardarResenaRodada`
      // en `reviewService.ts` para que acepte el parámetro `motocicletaId`
      await guardarResenaRodada({
        userId: session.user.id,
        eventoId: evento.id,
        motocicletaId: motocicletaSeleccionada, // <-- Nuevo parámetro enviado
        calificacion: rating,
        distanciaKm: Number.isFinite(distanciaKm) ? distanciaKm : 0,
        duracionMinutos: Number.isFinite(duracionMinutos) ? duracionMinutos : 0,
        comentarios: notas.trim(),
        fotoUri,
      });

      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('Error al guardar', error instanceof Error ? error.message : 'No se pudo guardar la reseña.');
    } finally {
      setGuardando(false);
    }
  };

  const handleRecordarManana = async () => {
     // ... (tu lógica existente se mantiene igual)
     if (!evento?.id) return;
     try {
       setGuardando(true);
       const { data: { session } } = await supabase.auth.getSession();
       if (!session?.user) return;
       await posponerEventoPendiente(session.user.id, evento.id);
       onClose();
     } catch (error) {
       Alert.alert('Error al posponer', 'No se pudo posponer el recordatorio.');
     } finally {
       setGuardando(false);
     }
  };

  const handleIgnorar = async () => {
     // ... (tu lógica existente se mantiene igual)
     if (!evento?.id) return;
     try {
       setGuardando(true);
       const { data: { session } } = await supabase.auth.getSession();
       if (!session?.user) return;
       await ignorarEventoPendiente(session.user.id, evento.id);
       onClose();
     } catch (error) {
       Alert.alert('Error', 'No se pudo ignorar esta rodada.');
     } finally {
       setGuardando(false);
     }
  };

  if (!evento) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>¡Parece que ya pasó una rodada!</Text>
          
          <View style={styles.eventoInfoContainer}>
            <Text style={styles.eventoTitulo}>{evento.titulo || 'Rodada sin título'}</Text>
            {(fechaFormateada || horaFormateada) ? (
              <View style={styles.eventoFechaContainer}>
                <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.eventoFecha}>
                  {[fechaFormateada, horaFormateada].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* SECCIÓN NUEVA: Selección de Motocicleta */}
          {motos.length > 0 && (
            <View style={styles.motoSection}>
              <Text style={styles.motoLabel}>¿Qué moto usaste?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.motoList}>
                {motos.map((moto) => {
                  const isSelected = motocicletaSeleccionada === moto.id;
                  return (
                    <TouchableOpacity
                      key={moto.id}
                      style={[styles.motoChip, isSelected && styles.motoChipSelected]}
                      onPress={() => setMotocicletaSeleccionada(moto.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name="bicycle-outline" 
                        size={16} 
                        color={isSelected ? '#fff' : theme.textPrimary} 
                      />
                      <Text style={[styles.motoChipText, isSelected && styles.motoChipTextSelected]}>
                        {moto.alias || `${moto.marca} ${moto.modelo}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {cargandoMotos && <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 10 }} />}

          <Text style={styles.subtitulo}>¿Qué tal estuvo el viaje?</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={38}
                  color={star <= rating ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.inputWrapper}>
              <Ionicons name="speedometer-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="Km aprox."
                placeholderTextColor={theme.textSecondary}
                value={distancia}
                onChangeText={setDistancia}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="time-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Min."
                placeholderTextColor={theme.textSecondary}
                value={duracion}
                onChangeText={setDuracion}
              />
            </View>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="¿Qué tal fue la ruta? Comparte una nota o anécdota"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            value={notas}
            onChangeText={setNotas}
          />

          <TouchableOpacity style={styles.photoButton} onPress={seleccionarFoto} activeOpacity={0.85}>
            <Ionicons name={fotoUri ? 'image' : 'camera-outline'} size={22} color={theme.primary} />
            <Text style={styles.photoButtonText}>{fotoUri ? 'Cambiar foto' : 'Añadir foto del día (opcional)'}</Text>
          </TouchableOpacity>

          {fotoUri ? <Image source={{ uri: fotoUri }} style={styles.previewImage} /> : null}

          <TouchableOpacity
            style={[styles.saveBtn, guardando && { opacity: 0.7 }]}
            onPress={handleGuardar}
            disabled={guardando}
            activeOpacity={0.9}
          >
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar en mi bitácora</Text>}
          </TouchableOpacity>

          {guardando ? (
            <ActivityIndicator color={theme.primary} style={styles.actionLoader} />
          ) : (
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRecordarManana} activeOpacity={0.8}>
                <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                <Text style={styles.secondaryBtnText}>Recordarme mañana</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleIgnorar} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={18} color={theme.dangerText || '#ef4444'} />
                <Text style={[styles.secondaryBtnText, { color: theme.dangerText || '#ef4444' }]}>
                  No me interesa
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ... (La función formatearHora permanece igual)
const formatearHora = (hora: string, fecha: Date | null) => {
  const match = hora.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match || !fecha) return hora;
  const horaOriginal = Number(match[1]);
  const minutos = Number(match[2]);
  const periodo = match[3]?.toUpperCase();
  if (minutos > 59 || (periodo && (horaOriginal < 1 || horaOriginal > 12)) || (!periodo && horaOriginal > 23)) {
    return hora;
  }
  const hora24 = periodo === 'PM' ? (horaOriginal % 12) + 12 : periodo === 'AM' ? horaOriginal % 12 : horaOriginal;
  const hora12 = hora24 % 12 || 12;
  const periodoFormateado = hora24 >= 12 ? 'PM' : 'AM';
  return `${String(hora12).padStart(2, '0')}:${String(minutos).padStart(2, '0')} ${periodoFormateado}`;
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    // ... (Mantén todos tus estilos anteriores iguales, y añade estos nuevos al final:)
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.55)' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 28, borderWidth: 1, borderColor: theme.border },
    titulo: { color: theme.textPrimary, fontSize: 23, fontWeight: '800', textAlign: 'center' },
    eventoInfoContainer: { backgroundColor: theme.background, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, borderWidth: 1, borderColor: theme.border },
    eventoTitulo: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    eventoFechaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, gap: 6 },
    eventoFecha: { color: theme.textSecondary, fontSize: 13 },
    
    // ESTILOS NUEVOS PARA LAS MOTOS
    motoSection: { marginTop: 16, alignItems: 'center' },
    motoLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    motoList: { gap: 10, paddingHorizontal: 5 },
    motoChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
    motoChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
    motoChipText: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
    motoChipTextSelected: { color: '#fff' },
    
    subtitulo: { color: theme.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 16 },
    starsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, gap: 6 },
    rowInputs: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, minHeight: 52 },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, color: theme.textPrimary, fontSize: 15, paddingVertical: 12 },
    textArea: { minHeight: 96, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, color: theme.textPrimary, fontSize: 15, textAlignVertical: 'top', marginBottom: 14 },
    photoButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}18`, borderRadius: 12, paddingVertical: 13, marginBottom: 12 },
    photoButtonText: { color: theme.primary, fontSize: 15, fontWeight: '700', marginLeft: 8 },
    previewImage: { width: '100%', height: 170, borderRadius: 14, marginBottom: 14, resizeMode: 'cover' },
    saveBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 42, paddingHorizontal: 8, backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    secondaryBtnText: { color: theme.textSecondary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
    actionLoader: { marginVertical: 12 }
  });