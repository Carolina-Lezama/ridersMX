import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function EventoFormScreen({ navigation, route }: any) {
  // Recibimos la fecha que el usuario tenía seleccionada en el calendario
  const fechaSeleccionada = route.params?.fechaBase || '';
  
  const [saving, setSaving] = useState(false);
  
  // Estados
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(fechaSeleccionada);
  const [hora, setHora] = useState('');
  const [tipo, setTipo] = useState('rodada'); // 'rodada' o 'mantenimiento'
  const [descripcion, setDescripcion] = useState('');
  const [motoAsociada, setMotoAsociada] = useState('');

  const handleGuardar = async () => {
    if (!titulo || !fecha) {
      Alert.alert('Faltan datos', 'El título y la fecha son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { error } = await supabase
          .from('eventos')
          .insert([{
            perfil_id: session.user.id,
            titulo: titulo,
            fecha: fecha,
            hora: hora,
            tipo: tipo,
            descripcion: descripcion,
            moto_asociada: motoAsociada
          }]);

        if (error) throw error;
        Alert.alert('¡Evento agendado!', 'Se ha guardado en tu calendario.');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Nuevo Evento</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>¿Qué tipo de evento es?</Text>
        <View style={styles.chipsContainer}>
          <TouchableOpacity 
            style={[styles.chip, tipo === 'rodada' && styles.chipActiveAzul]}
            onPress={() => setTipo('rodada')}
          >
            <Ionicons name="map-outline" size={16} color={tipo === 'rodada' ? '#fff' : '#64748b'} />
            <Text style={[styles.chipText, tipo === 'rodada' && styles.chipTextActive]}> Rodada</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.chip, tipo === 'mantenimiento' && styles.chipActiveRojo]}
            onPress={() => setTipo('mantenimiento')}
          >
            <Ionicons name="build-outline" size={16} color={tipo === 'mantenimiento' ? '#fff' : '#64748b'} />
            <Text style={[styles.chipText, tipo === 'mantenimiento' && styles.chipTextActive]}> Taller / Mantenimiento</Text>
          </TouchableOpacity>
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
            <CustomButton title="Guardar en Agenda" onPress={handleGuardar} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
  chipsContainer: { flexDirection: 'row', marginBottom: 20 },
  chip: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  chipActiveAzul: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipActiveRojo: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#64748b', fontWeight: '500', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' }
});