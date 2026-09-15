import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function EventoFormScreen({ navigation, route }: any) {
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

  const [tipo, setTipo] = useState('rodada'); // 'rodada' o 'mantenimiento'
  const [descripcion, setDescripcion] = useState('');
  const [motoAsociada, setMotoAsociada] = useState('');
  
  // Estado de la actividad
  const [estado, setEstado] = useState('Planeada');
  const estadosValidos = ['Planeada', 'Completada', 'Reprogramada', 'Cancelada'];

  // 3. Si estamos en modo edición, descargamos los datos
  useEffect(() => {
    if (esEdicion) {
      cargarDatosEvento();
    }
  }, [eventoId]);

  const cargarDatosEvento = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single();

      if (error) throw error;

      if (data) {
        setTitulo(data.titulo || '');
        if (data.fecha) setFechaObj(new Date(data.fecha + 'T00:00:00'));
        
        // Parsear hora si existe (ej. "08:00 AM" o "14:30")
        if (data.hora) {
          const [time, modifier] = data.hora.split(' ');
          let [hours, minutes] = time.split(':');
          let h = parseInt(hours, 10);
          if (modifier === 'PM' && h < 12) h += 12;
          if (modifier === 'AM' && h === 12) h = 0;
          const d = new Date();
          d.setHours(h, parseInt(minutes || '0', 10));
          setHoraObj(d);
        }

        setTipo(data.tipo || 'rodada');
        setDescripcion(data.descripcion || '');
        setMotoAsociada(data.moto_asociada || '');
        setEstado(data.estado || 'Planeada');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert('Error al cargar evento: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      const eventoPayload = {
        perfil_id: session.user.id,
        titulo: titulo.trim(),
        fecha: fechaStr,
        hora: horaStr,
        tipo: tipo,
        descripcion: descripcion.trim(),
        moto_asociada: motoAsociada.trim(),
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Cargando actividad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
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
                  style={[styles.estadoChip, estado === est && styles.estadoChipActive]}
                  onPress={() => setEstado(est)}
                >
                  <Text style={[styles.estadoText, estado === est && styles.estadoTextActive]}>{est}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* TIPO DE EVENTO */}
        <View style={styles.seccion}>
          <Text style={styles.label}>¿Qué tipo de evento es?</Text>
          <View style={styles.chipsContainer}>
            <TouchableOpacity style={[styles.chip, tipo === 'rodada' && styles.chipActiveAzul]} onPress={() => setTipo('rodada')}>
              <Ionicons name="map-outline" size={16} color={tipo === 'rodada' ? '#fff' : '#64748b'} />
              <Text style={[styles.chipText, tipo === 'rodada' && styles.chipTextActive]}> Rodada</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.chip, tipo === 'mantenimiento' && styles.chipActiveRojo]} onPress={() => setTipo('mantenimiento')}>
              <Ionicons name="build-outline" size={16} color={tipo === 'mantenimiento' ? '#fff' : '#64748b'} />
              <Text style={[styles.chipText, tipo === 'mantenimiento' && styles.chipTextActive]}> Taller / Mantenimiento</Text>
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
                <Ionicons name="calendar-outline" size={20} color="#007bff" />
                <Text style={styles.pickerButtonText}>{formatearFechaLegible(fechaObj)}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
                <Ionicons name="time-outline" size={20} color="#007bff" />
                <Text style={styles.pickerButtonText}>{formatearHora12h(horaObj)}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
        <CustomInput label="Moto Asociada (Opcional)" placeholder="Ej. Yamaha MT-07" value={motoAsociada} onChangeText={setMotoAsociada} />

        <View style={{ marginTop: 20 }}>
          {saving ? (
            <ActivityIndicator size="large" color="#007bff" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    marginTop: Platform.OS === 'web' ? 20 : 60, 
    paddingBottom: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0' 
  },

  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  seccion: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
  
  // Botones Interactivos para Fecha/Hora
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    marginLeft: 10,
    fontWeight: '500',
  },
  webInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  chipActiveAzul: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipActiveRojo: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#64748b', fontWeight: '500', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },

  estadoChip: { backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  estadoChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  estadoText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  estadoTextActive: { color: '#fff', fontWeight: 'bold' },

  btnEliminar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#fecaca' },
  textEliminar: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }
});