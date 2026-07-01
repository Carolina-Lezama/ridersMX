import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function MotoFormScreen({ navigation, route }: any) {
  // Detectamos si pasamos un 'motoId' por los parámetros de navegación
  const motoId = route.params?.motoId || null;
  const esEdicion = !!motoId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ESTADOS DEL FORMULARIO (Mapeados exactamente a las columnas de la BD)
  const [alias, setAlias] = useState('');
  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cilindrada, setCilindrada] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [placas, setPlacas] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [combustible, setCombustible] = useState('');
  const [aseguradora, setAseguradora] = useState('');
  const [poliza, setPoliza] = useState('');

  useEffect(() => {
    if (esEdicion) {
      cargarDatosMoto();
    }
  }, [motoId]);

  // FUNCIÓN PARA LEER (READ) LOS DATOS SI ESTAMOS EDITANDO
  const cargarDatosMoto = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('motocicletas')
        .select('*')
        .eq('id', motoId)
        .single();

      if (error) throw error;

      if (data) {
        setAlias(data.alias || '');
        setTipo(data.tipo || '');
        setMarca(data.marca || '');
        setModelo(data.modelo || '');
        setCilindrada(data.cilindrada ? data.cilindrada.toString() : '');
        setAnio(data.anio ? data.anio.toString() : '');
        setColor(data.color || '');
        setPlacas(data.placas || '');
        setKilometraje(data.kilometraje_actual ? data.kilometraje_actual.toString() : '0');
        setCombustible(data.tipo_combustible || '');
        setAseguradora(data.aseguradora || '');
        setPoliza(data.numero_poliza || '');
      }
    } catch (error: any) {
      Alert.alert('Error al cargar vehículo', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN PARA GUARDAR (CREAR O ACTUALIZAR)
  const handleGuardar = async () => {
    if (!marca.trim() || !modelo.trim()) {
      Alert.alert('Campos obligatorios', 'Por favor introduce al menos la Marca y el Modelo.');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        Alert.alert('Error de sesión', 'No se encontró un usuario activo.');
        return;
      }

      // Estructuramos el objeto convirtiendo los números correctamente a enteros
      const motoPayload = {
        perfil_id: session.user.id,
        alias: alias.trim(),
        tipo: tipo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        cilindrada: cilindrada ? parseInt(cilindrada) : null,
        anio: anio ? parseInt(anio) : null,
        color: color.trim(),
        placas: placas.trim().toUpperCase(),
        kilometraje_actual: kilometraje ? parseInt(kilometraje) : 0,
        tipo_combustible: combustible.trim(),
        aseguradora: aseguradora.trim(),
        numero_poliza: poliza.trim(),
      };

      if (esEdicion) {
        // MODO ACTUALIZAR (UPDATE)
        const { error } = await supabase
          .from('motocicletas')
          .update(motoPayload)
          .eq('id', motoId);

        if (error) throw error;
        Alert.alert('¡Actualizado!', 'Los datos del vehículo se guardaron correctamente.');
      } else {
        // MODO CREAR (INSERT)
        const { error } = await supabase
          .from('motocicletas')
          .insert([motoPayload]);

        if (error) throw error;
        Alert.alert('¡Añadida!', 'Tu nueva motocicleta está lista en el garaje.');
      }

      navigation.goBack(); // Regresamos a la lista de motos automáticamente
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setSaving(false);
    }
  };

  // FUNCIÓN PARA ELIMINAR (DELETE)
// FUNCIÓN PARA EJECUTAR EL BORRADO REAL EN LA BASE DE DATOS
  const ejecutarBorrado = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('motocicletas')
        .delete()
        .eq('id', motoId);

      if (error) throw error;
      
      // Mensaje de éxito adaptado
      if (Platform.OS === 'web') {
        window.alert('El vehículo ha sido removido.');
      } else {
        Alert.alert('Eliminado', 'El vehículo ha sido removido.');
      }
      
      navigation.goBack();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert('Error al eliminar: ' + error.message);
      } else {
        Alert.alert('Error al eliminar', error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // FUNCIÓN QUE DISPARA LA PREGUNTA (INTELIGENTE: WEB VS CELULAR)
  const handleEliminar = () => {
    if (Platform.OS === 'web') {
      // En la web usamos el confirm nativo del navegador
      const confirmar = window.confirm('¿Estás completamente segura de que deseas quitar esta moto de tu garaje? Esta acción no se puede deshacer.');
      if (confirmar) {
        ejecutarBorrado();
      }
    } else {
      // En el celular usamos la alerta nativa de iOS/Android
      Alert.alert(
        'Eliminar Vehículo',
        '¿Estás completamente segura de que deseas quitar esta moto de tu garaje? Esta acción no se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sí, Eliminar', 
            style: 'destructive',
            onPress: ejecutarBorrado
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando especificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER DINÁMICO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>
          {esEdicion ? 'Editar Motocicleta' : 'Nueva Motocicleta'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SECCIÓN 1: Identidad visual de la moto */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bicycle-outline" size={20} color="#007bff" />
            <Text style={styles.cardTitle}>Datos del Vehículo</Text>
          </View>

          <CustomInput label="Apodo / Alias de la moto" placeholder="Ej. La consentida, La negra" value={alias} onChangeText={setAlias} />
          <CustomInput label="Marca *" placeholder="Ej. Yamaha, Honda, BMW" value={marca} onChangeText={setMarca} />
          <CustomInput label="Modelo *" placeholder="Ej. MT-07, CB190R, R1250" value={modelo} onChangeText={setModelo} />
          <CustomInput label="Cilindrada (cc)" placeholder="Ej. 300, 600, 1000" keyboardType="numeric" value={cilindrada} onChangeText={setCilindrada} />
          <CustomInput label="Año" placeholder="Ej. 2024" keyboardType="numeric" value={anio} onChangeText={setAnio} />
          <CustomInput label="Color" placeholder="Ej. Negro Mate, Rojo" value={color} onChangeText={setColor} />
          <CustomInput label="Placas" placeholder="Ej. 12ABC3" value={placas} onChangeText={setPlacas} autoCapitalize="characters" />
        </View>

        {/* SECCIÓN 2: Estado operativo */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="speedometer-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Estado y Combustible</Text>
          </View>

          <CustomInput label="Kilometraje Actual" placeholder="Ej. 12500" keyboardType="numeric" value={kilometraje} onChangeText={setKilometraje} />
          <CustomInput label="Tipo de Combustible" placeholder="Ej. Premium, Magna" value={combustible} onChangeText={setCombustible} />
          <CustomInput label="Estilo / Tipo de Moto" placeholder="Ej. Deportiva, Chopper, Touring" value={tipo} onChangeText={setTipo} />
        </View>

        {/* SECCIÓN 3: Papeles / Seguro */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Seguro de Moto (Opcional)</Text>
          </View>

          <CustomInput label="Compañía Aseguradora" placeholder="Ej. Quálitas, Mapfre" value={aseguradora} onChangeText={setAseguradora} />
          <CustomInput label="Número de Póliza" placeholder="Número de contrato" value={poliza} onChangeText={setPoliza} />
        </View>

        {/* BOTÓN DE ACCIÓN PRINCIPAL */}
        <View style={styles.actionContainer}>
          {saving ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <CustomButton title={esEdicion ? 'Guardar Cambios' : 'Registrar Moto'} onPress={handleGuardar} />
          )}
        </View>

        {/* BOTÓN DE ELIMINAR (Solo visible si estamos editando) */}
        {esEdicion && !saving && (
          <TouchableOpacity style={styles.btnEliminar} onPress={handleEliminar}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.textEliminar}>Eliminar del Garaje</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 60, paddingBottom: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0'
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, color: '#64748b' },
  
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 10 },
  
  actionContainer: { marginTop: 10 },
  
  btnEliminar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', paddingVertical: 15, borderRadius: 12,
    marginTop: 20, borderWidth: 1, borderColor: '#fecaca'
  },
  textEliminar: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }
});