import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function PerfilScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // --- ESTADOS: TABLA PERFILES ---
  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [bio, setBio] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('15 / 08 / 1998');
  const [licencia, setLicencia] = useState('');

  // --- ESTADOS: TABLA MOTOCICLETAS ---
  const [motoId, setMotoId] = useState<string | null>(null); // Para saber si actualizamos o creamos una nueva
  const [tipoMoto, setTipoMoto] = useState('');
  const [marca, setMarca] = useState('');
  const [modeloCilindrada, setModeloCilindrada] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [placas, setPlacas] = useState('');
  const [aseguradora, setAseguradora] = useState('');
  const [poliza, setPoliza] = useState('');

  useEffect(() => {
    cargarDatosCompletos();
  }, []);

  const cargarDatosCompletos = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);

        // 1. CARGAMOS EL PERFIL
        const { data: perfilData, error: perfilError } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (perfilError) throw perfilError;

        if (perfilData) {
          setUsername(perfilData.username || '');
          setNombreCompleto(perfilData.nombre_completo || '');
          setTelefono(perfilData.telefono || '');
          setCiudad(perfilData.ciudad || '');
          setBio(perfilData.bio || '');
          setLicencia(perfilData.numero_licencia || '');
        }

        // 2. CARGAMOS LA MOTOCICLETA PRINCIPAL (Si tiene una)
        const { data: motoData, error: motoError } = await supabase
          .from('motocicletas')
          .select('*')
          .eq('perfil_id', session.user.id)
          .limit(1)
          .single();

        // No lanzamos error si no tiene moto (código PGRST116 significa "0 rows returned"), es normal
        if (motoData) {
          setMotoId(motoData.id);
          setTipoMoto(motoData.tipo || '');
          setMarca(motoData.marca || '');
          setModeloCilindrada(motoData.modelo || ''); // Guardamos modelo y cilindrada juntos aquí por simplicidad
          setAnio(motoData.anio ? motoData.anio.toString() : '');
          setColor(motoData.color || '');
          setPlacas(motoData.placas || '');
          setAseguradora(motoData.aseguradora || '');
          setPoliza(motoData.numero_poliza || '');
        }
      }
    } catch (error: any) {
      if (error.code !== 'PGRST116') { // Ignoramos el error si simplemente no tiene motos aún
        Alert.alert('Error al cargar', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const guardarTodo = async () => {
    if (!userId) return;

    try {
      setSaving(true);

      // 1. GUARDAMOS EL PERFIL
      const { error: perfilError } = await supabase
        .from('perfiles')
        .update({
          username, nombre_completo: nombreCompleto, telefono, ciudad, bio, numero_licencia: licencia
        })
        .eq('id', userId);

      if (perfilError) throw perfilError;

      // 2. GUARDAMOS LA MOTOCICLETA (Decidimos si Insertar o Actualizar)
      const motoPayload = {
        perfil_id: userId,
        tipo: tipoMoto,
        marca: marca,
        modelo: modeloCilindrada, // En una app real los separaríamos, pero usamos tu campo
        anio: anio ? parseInt(anio) : null,
        color: color,
        placas: placas,
        aseguradora: aseguradora,
        numero_poliza: poliza
      };

      if (motoId) {
        // Ya existe una moto, la actualizamos
        const { error: updateMotoError } = await supabase
          .from('motocicletas')
          .update(motoPayload)
          .eq('id', motoId);
        if (updateMotoError) throw updateMotoError;
      } else {
        // No tiene moto, creamos una nueva
        // Solo la creamos si llenó al menos la marca
        if (marca.trim() !== '') {
          const { data: newMoto, error: insertMotoError } = await supabase
            .from('motocicletas')
            .insert([motoPayload])
            .select()
            .single();
            
          if (insertMotoError) throw insertMotoError;
          if (newMoto) setMotoId(newMoto.id); // Guardamos el ID nuevo
        }
      }

      Alert.alert('¡Garaje Actualizado!', 'Toda tu información ha sido guardada correctamente.');
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Cargando garaje...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerBackground} />

      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{nombreCompleto ? nombreCompleto.substring(0, 2).toUpperCase() : 'UI'}</Text>
          <TouchableOpacity style={styles.editBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.nombreUsuario}>{nombreCompleto || 'Rider'}</Text>
        <Text style={styles.rolUsuario}>@{username}</Text>
      </View>

      {/* SECCIÓN 1: Información Personal */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Datos Personales</Text>
        </View>

        <CustomInput label="Nombre Completo" placeholder="Tu nombre real" value={nombreCompleto} onChangeText={setNombreCompleto} />
        <CustomInput label="Nombre de usuario" placeholder="caro_rider" value={username} onChangeText={setUsername} />
        <CustomInput label="Teléfono" placeholder="+52 000 000 0000" keyboardType="numeric" value={telefono} onChangeText={setTelefono} />
        <CustomInput label="Ciudad" placeholder="Ej. CDMX, Monterrey" value={ciudad} onChangeText={setCiudad} />
        <CustomInput label="Bio" placeholder="¿Qué te motiva a rodar?" value={bio} onChangeText={setBio} />
      </View>

      {/* SECCIÓN 2: Información de la Motocicleta */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bicycle-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Mi Vehículo</Text>
        </View>

        <CustomInput label="Tipo de Motocicleta" placeholder="Ej. Deportiva, Scooter..." value={tipoMoto} onChangeText={setTipoMoto} />
        <CustomInput label="Marca" placeholder="Ej. Yamaha, Honda..." value={marca} onChangeText={setMarca} />
        <CustomInput label="Modelo y Cilindrada" placeholder="Ej. MT-07, 689cc" value={modeloCilindrada} onChangeText={setModeloCilindrada} />
        <CustomInput label="Año" placeholder="Ej. 2023" keyboardType="numeric" value={anio} onChangeText={setAnio} />
        <CustomInput label="Color" placeholder="Ej. Negro Mate" value={color} onChangeText={setColor} />
        <CustomInput label="Placas" placeholder="Ej. ABC-123" value={placas} onChangeText={setPlacas} autoCapitalize="characters" />
      </View>

      {/* SECCIÓN 3: Documentación Extra */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Documentos</Text>
        </View>

        <CustomInput label="Número de Licencia" placeholder="Opcional" value={licencia} onChangeText={setLicencia} />
        <CustomInput label="Aseguradora" placeholder="Opcional" value={aseguradora} onChangeText={setAseguradora} />
        <CustomInput label="Número de Póliza" placeholder="Opcional" value={poliza} onChangeText={setPoliza} />
      </View>

      <View style={styles.footer}>
        {saving ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <CustomButton title="Guardar Cambios" onPress={guardarTodo} />
        )}
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Tus estilos se mantienen intactos
  container: { backgroundColor: '#f8fafc', flexGrow: 1, paddingBottom: 40 },
  headerBackground: { backgroundColor: '#007bff', height: 120, width: '100%', position: 'absolute', top: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { alignItems: 'center', marginTop: 60, marginBottom: 20 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 3, borderColor: '#f8fafc' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#cbd5e1' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007bff', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  nombreUsuario: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginTop: 10 },
  rolUsuario: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 15, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 10 },
  inputContainer: { marginBottom: 15, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 5 },
  datePickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 10 },
  dateText: { fontSize: 16, color: '#0f172a' },
  footer: { paddingHorizontal: 20, marginTop: 30 }
});