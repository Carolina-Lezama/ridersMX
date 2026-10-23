import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import Skeleton from '../../components/Skeleton';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';

interface MotoAsociable {
  id: string;
  alias: string | null;
  marca: string;
  modelo: string;
}

const OTRO_ACOMPANANTE = 'Otro / Acompañante';

export default function EventoFormScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // 1. Detectamos si venimos a Crear o a Editar
  const eventoId = route.params?.eventoId || null;
  const fechaBase = route.params?.fechaBase || new Date().toISOString().split('T')[0];
  const esEdicion = !!eventoId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 2. Estados del Formulario
  const [titulo, setTitulo] = useState('');
  
  // Manejo de fecha y hora con objetos Date para evitar errores manuales
  const [fechaObj, setFechaObj] = useState(fechaBase ? new Date(fechaBase + 'T00:00:00') : new Date());
  const [horaObj, setHoraObj] = useState(new Date());
  
  // Visibilidad de los pickers nativos
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [tipo, setTipo] = useState(route.params?.tipo === 'mantenimiento' ? 'mantenimiento' : 'rodada');
  const [descripcion, setDescripcion] = useState('');
  const [motos, setMotos] = useState<MotoAsociable[]>([]);
  const [motoAsociada, setMotoAsociada] = useState('');
  
  // Estado de la actividad
  const [estado, setEstado] = useState('Planeada');
  const estadosValidos = ['Planeada', 'Completada', 'Reprogramada', 'Cancelada'];

  useEffect(() => {
    let activo = true;

    const inicializarPantalla = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) throw new Error('Inicia sesión para crear o editar un evento.');

        const { data: motosData, error: motosError } = await supabase
          .from('motocicletas')
          .select('id, alias, marca, modelo')
          .eq('perfil_id', session.user.id)
          .order('created_at', { ascending: true });

        if (motosError) throw motosError;
        if (activo) setMotos(motosData ?? []);

        if (!esEdicion) return;

        const { data, error } = await supabase
          .from('eventos')
          .select('*')
          .eq('id', eventoId)
          .single();

        if (error) throw error;

        if (data && activo) {
          setTitulo(data.titulo || '');
          if (data.fecha) setFechaObj(new Date(data.fecha + 'T00:00:00'));

          if (data.hora) {
            const [time, modifier] = data.hora.split(' ');
            const [hours, minutes] = time.split(':');
            let hour = parseInt(hours, 10);
            if (modifier === 'PM' && hour < 12) hour += 12;
            if (modifier === 'AM' && hour === 12) hour = 0;
            const date = new Date();
            date.setHours(hour, parseInt(minutes || '0', 10));
            setHoraObj(date);
          }

          setTipo(data.tipo || 'rodada');
          setDescripcion(data.descripcion || '');
          setMotoAsociada(data.moto_asociada || '');
          setEstado(data.estado || 'Planeada');
        }
      } catch (error: unknown) {
        if (!activo) return;
        const mensaje = error instanceof Error ? error.message : 'No se pudo cargar el evento.';
        Platform.OS === 'web'
          ? window.alert(`Error al cargar evento: ${mensaje}`)
          : Alert.alert('Error al cargar evento', mensaje);
        navigation.goBack();
      } finally {
        if (activo) setLoading(false);
      }
    };

    void inicializarPantalla();
    return () => {
      activo = false;
    };
  }, [eventoId, esEdicion, navigation]);

  // Formateadores auxiliares
  const formatearFechaYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatearFechaLegible = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatearHora12h = (date: Date) => {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // 4. FUNCIÓN PARA GUARDAR (CREAR O ACTUALIZAR)
  const handleGuardar = async () => {
    if (!titulo.trim()) {
      Platform.OS === 'web' 
        ? window.alert('El título es obligatorio.')
        : Alert.alert('Faltan datos', 'El título es obligatorio.');
      return;
    }

    const fechaStr = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
    const horaStr = formatearHora12h(horaObj);

    try {
      setSaving(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Inicia sesión para guardar este evento.');

      const eventoPayload = {
        perfil_id: session.user.id,
        titulo: titulo.trim(),
        fecha: fechaStr,
        hora: horaStr,
        tipo: tipo,
        descripcion: descripcion.trim(),
        moto_asociada: motoAsociada.trim() || null,
        estado: estado
      };

      if (esEdicion) {
        const { error } = await supabase.from('eventos').update(eventoPayload).eq('id', eventoId);
        if (error) throw error;
        Platform.OS === 'web' ? window.alert('Evento actualizado') : Alert.alert('Éxito', 'Evento actualizado');
      } else {
        const { error } = await supabase.from('eventos').insert([eventoPayload]);
        if (error) throw error;
        Platform.OS === 'web' ? window.alert('Evento agendado') : Alert.alert('Éxito', 'Evento agendado');
      }

      navigation.goBack();
    } catch (error: any) {
      Platform.OS === 'web' ? window.alert('Error: ' + error.message) : Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // 5. FUNCIÓN PARA ELIMINAR
  const ejecutarBorrado = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('eventos').delete().eq('id', eventoId);
      if (error) throw error;
      
      Platform.OS === 'web' ? window.alert('Actividad eliminada.') : Alert.alert('Eliminada', 'La actividad fue borrada.');
      navigation.goBack();
    } catch (error: any) {
      Platform.OS === 'web' ? window.alert('Error al eliminar: ' + error.message) : Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas eliminar este evento de tu agenda?')) ejecutarBorrado();
    } else {
      Alert.alert('Eliminar Evento', '¿Deseas eliminar este evento de tu agenda?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, Eliminar', style: 'destructive', onPress: ejecutarBorrado }
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={28} height={28} borderRadius={14} />
          <Skeleton width={145} height={21} />
          <View style={{ width: 28 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {[0, 1, 2].map((section) => (
            <View key={section} style={styles.seccion}>
              <Skeleton width={130} height={15} style={{ marginBottom: 10 }} />
              {section === 0 && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {[0, 1, 2].map((chip) => (
                    <Skeleton key={chip} width={78} height={36} borderRadius={18} />
                  ))}
                </View>
              )}
              {Array.from({ length: section === 1 ? 2 : 1 }, (_, field) => (
                <View key={field} style={{ marginBottom: 16 }}>
                  <Skeleton height={44} borderRadius={10} />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>{esEdicion ? 'Editar Evento' : 'Nuevo Evento'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* SECTOR ESTADO */}
        {esEdicion && (
          <View style={styles.seccion}>
            <Text style={styles.label}>Estado de la Actividad</Text>
            <View style={styles.chipsContainer}>
              {estadosValidos.map((est) => (
                <TouchableOpacity 
                  key={est} 
                  style={[styles.chipBase, estado === est && styles.estadoChipActive]}
                  onPress={() => setEstado(est)}
                >
                  <Text style={[styles.chipTextBase, estado === est && styles.chipTextActive]}>{est}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* TIPO DE EVENTO */}
        <View style={styles.seccion}>
          <Text style={styles.label}>¿Qué tipo de evento es?</Text>
          <View style={styles.chipsContainer}>
            <TouchableOpacity style={[styles.chipBase, tipo === 'rodada' && styles.chipActive]} onPress={() => setTipo('rodada')}>
              <Ionicons name="map-outline" size={16} color={tipo === 'rodada' ? '#fff' : theme.textSecondary} />
              <Text style={[styles.chipTextBase, tipo === 'rodada' && styles.chipTextActive]}> Rodada</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.chipBase, tipo === 'mantenimiento' && styles.chipMantenimientoActivo]} onPress={() => setTipo('mantenimiento')}>
              <Ionicons name="build-outline" size={16} color={tipo === 'mantenimiento' ? '#fff' : theme.textSecondary} />
              <Text style={[styles.chipTextBase, tipo === 'mantenimiento' && styles.chipTextActive]}> Taller / Mantenimiento</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CustomInput label="Título del Evento" placeholder="Ej. Ruta a Tepoztlán" value={titulo} onChangeText={setTitulo} />

{/* SELECTOR DE FECHA INTERACTIVO */}
        <View style={styles.seccion}>
          <Text style={styles.label}>Fecha del Evento</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={formatearFechaYMD(fechaObj)}
              onChange={(e) => {
                if (e.target.value) setFechaObj(new Date(e.target.value + 'T00:00:00'));
              }}
              style={styles.webInput}
            />
          ) : (
            <>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                <Text style={styles.pickerButtonText}>{formatearFechaLegible(fechaObj)}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={fechaObj}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setFechaObj(selectedDate);
                  }}
                />
              )}
            </>
          )}
        </View>

{/* SELECTOR DE HORA INTERACTIVO */}
        <View style={styles.seccion}>
          <Text style={styles.label}>Hora</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={`${String(horaObj.getHours()).padStart(2, '0')}:${String(horaObj.getMinutes()).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [h, m] = e.target.value.split(':');
                  const d = new Date(horaObj);
                  d.setHours(parseInt(h, 10), parseInt(m, 10));
                  setHoraObj(d);
                }
              }}
              style={styles.webInput}
            />
          ) : (
            <>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <Text style={styles.pickerButtonText}>{formatearHora12h(horaObj)}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={horaObj}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedTime) setHoraObj(selectedTime);
                  }}
                />
              )}
            </>
          )}
        </View>

        <CustomInput label="Descripción" placeholder="Detalles, punto de reunión..." value={descripcion} onChangeText={setDescripcion} />

        <View style={styles.seccion}>
          <Text style={styles.label}>¿Con qué moto asistirás? (Opcional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.motosScrollContainer}
          >
            {motos.map((moto) => {
              const nombreMoto = moto.alias || `${moto.marca} ${moto.modelo}`;
              const seleccionada = motoAsociada === nombreMoto;
              return (
                <TouchableOpacity
                  key={moto.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: seleccionada }}
                  style={[styles.chipBase, seleccionada && styles.chipActive]}
                  onPress={() => setMotoAsociada(seleccionada ? '' : nombreMoto)}
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={16}
                    color={seleccionada ? '#fff' : theme.textSecondary}
                  />
                  <Text style={[styles.chipTextBase, seleccionada && styles.chipTextActive]}>
                    {' '}{nombreMoto}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {motoAsociada &&
              motoAsociada !== OTRO_ACOMPANANTE &&
              !motos.some((moto) => (moto.alias || `${moto.marca} ${moto.modelo}`) === motoAsociada) && (
                <TouchableOpacity style={[styles.chipBase, styles.chipActive]} onPress={() => setMotoAsociada('')}>
                  <Ionicons name="bicycle-outline" size={16} color="#fff" />
                  <Text style={[styles.chipTextBase, styles.chipTextActive]}> {motoAsociada}</Text>
                </TouchableOpacity>
              )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: motoAsociada === OTRO_ACOMPANANTE }}
              style={[styles.chipBase, motoAsociada === OTRO_ACOMPANANTE && styles.chipActive]}
              onPress={() =>
                setMotoAsociada(motoAsociada === OTRO_ACOMPANANTE ? '' : OTRO_ACOMPANANTE)
              }
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={motoAsociada === OTRO_ACOMPANANTE ? '#fff' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.chipTextBase,
                  motoAsociada === OTRO_ACOMPANANTE && styles.chipTextActive,
                ]}
              >
                {' '}Otro / Acompañante
              </Text>
            </TouchableOpacity>

            {motoAsociada !== '' && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Quitar moto asociada"
                style={styles.chipClear}
                onPress={() => setMotoAsociada('')}
              >
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </ScrollView>
          {motos.length === 0 && (
            <Text style={styles.motosVacias}>
              No tienes motos registradas. Puedes continuar sin asociar una.
            </Text>
          )}
          {motoAsociada === OTRO_ACOMPANANTE && (
            <Text style={styles.motosVacias}>
              Se guardará “Otro / Acompañante” como texto, sin asociar una moto de tu garaje.
            </Text>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          {saving ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <CustomButton title={esEdicion ? "Guardar Cambios" : "Guardar en Agenda"} onPress={handleGuardar} />
          )}
        </View>

        {esEdicion && !saving && (
          <TouchableOpacity style={styles.btnEliminar} onPress={handleEliminar}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.textEliminar}>Borrar de la Agenda</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    marginTop: Platform.OS === 'web' ? 20 : 60, 
    paddingBottom: 20, 
    backgroundColor: theme.card, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.border 
  },

  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  seccion: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 10 },
  
  // Botones Interactivos para Fecha/Hora
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
    color: theme.textPrimary,
    marginLeft: 10,
    fontWeight: '500',
  },
  webInput: {
    width: '100%',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.textPrimary,
  },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  motosScrollContainer: { gap: 10, paddingVertical: 4, paddingRight: 20, alignItems: 'center' },
  chipBase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipMantenimientoActivo: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipTextBase: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  estadoChipActive: { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary },
  chipClear: { justifyContent: 'center', paddingHorizontal: 6 },
  motosVacias: { color: theme.textSecondary, fontSize: 13, marginTop: 8 },

  btnEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dangerBg,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
  },
  textEliminar: { color: theme.dangerText, fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
});