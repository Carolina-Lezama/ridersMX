import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function EventoFormScreen({ navigation, route }: any) {
  // 1. Detectamos si venimos a Crear o a Editar
  const eventoId = route.params?.eventoId || null;
  const fechaBase = route.params?.fechaBase || '';
  const esEdicion = !!eventoId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 2. Estados del Formulario
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(fechaBase);
  const [hora, setHora] = useState('');
  const [tipo, setTipo] = useState('rodada'); // 'rodada' o 'mantenimiento'
  const [descripcion, setDescripcion] = useState('');
  const [motoAsociada, setMotoAsociada] = useState('');
  
  // NUEVO: Estado de la actividad
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
        setFecha(data.fecha || '');
        setHora(data.hora || '');
        setTipo(data.tipo || 'rodada');
        setDescripcion(data.descripcion || '');
        setMotoAsociada(data.moto_asociada || '');
        setEstado(data.estado || 'Planeada'); // Cargamos el estado real
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

  // 4. FUNCIÓN PARA GUARDAR (CREAR O ACTUALIZAR)
  const handleGuardar = async () => {
    if (!titulo.trim() || !fecha.trim()) {
      Platform.OS === 'web' 
        ? window.alert('El título y la fecha son obligatorios.')
        : Alert.alert('Faltan datos', 'El título y la fecha son obligatorios.');
      return;
    }

    // Validación de seguridad para que la base de datos no explote
    if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Platform.OS === 'web'
        ? window.alert('La fecha debe tener el formato YYYY-MM-DD')
        : Alert.alert('Formato incorrecto', 'La fecha debe tener el formato YYYY-MM-DD');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      const eventoPayload = {
        perfil_id: session.user.id,
        titulo: titulo.trim(),
        fecha: fecha.trim(),
        hora: hora.trim(),
        tipo: tipo,
        descripcion: descripcion.trim(),
        moto_asociada: motoAsociada.trim(),
        estado: estado // Guardamos el nuevo estado
      };

      if (esEdicion) {
        // ACTUALIZAR (UPDATE)
        const { error } = await supabase.from('eventos').update(eventoPayload).eq('id', eventoId);
        if (error) throw error;
        Platform.OS === 'web' ? window.alert('Evento actualizado') : Alert.alert('Éxito', 'Evento actualizado');
      } else {
        // CREAR (INSERT)
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

  // 5. FUNCIÓN PARA ELIMINAR (Con protección Inteligente Web/Mobile)
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

  // Pantalla de carga mientras trae el evento a editar
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
        
        {/* SECTOR ESTADO (NUEVO) */}
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
        <CustomInput label="Fecha (YYYY-MM-DD)" placeholder="Ej. 2026-10-25" value={fecha} onChangeText={setFecha} />
        <CustomInput label="Hora" placeholder="Ej. 08:00 AM" value={hora} onChangeText={setHora} />
        <CustomInput label="Descripción" placeholder="Detalles, punto de reunión..." value={descripcion} onChangeText={setDescripcion} />
        <CustomInput label="Moto Asociada (Opcional)" placeholder="Ej. Yamaha MT-07" value={motoAsociada} onChangeText={setMotoAsociada} />

        <View style={{ marginTop: 20 }}>
          {saving ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <CustomButton title={esEdicion ? "Guardar Cambios" : "Guardar en Agenda"} onPress={handleGuardar} />
          )}
        </View>

        {/* BOTÓN DE ELIMINAR (Solo visible en edición) */}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  seccion: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
  
  // Estilos de los Chips de Tipo (Rodada/Mantenimiento)
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  chipActiveAzul: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipActiveRojo: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#64748b', fontWeight: '500', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },

  // Estilos de los Chips de Estado (NUEVO)
  estadoChip: { backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  estadoChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  estadoText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  estadoTextActive: { color: '#fff', fontWeight: 'bold' },

  // Estilos Botón Eliminar
  btnEliminar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#fecaca' },
  textEliminar: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }
});