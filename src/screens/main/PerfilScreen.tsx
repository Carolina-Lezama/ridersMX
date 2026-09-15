import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { supabase } from '../../services/supabase';

export default function PerfilScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [bio, setBio] = useState('');
  
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoSangre, setTipoSangre] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [nivelExperiencia, setNivelExperiencia] = useState('');
  const [numeroLicencia, setNumeroLicencia] = useState('');

  // Opciones válidas para la base de datos
  const nivelesValidos = ['Novato', 'Intermedio', 'Experto', 'Profesional'];

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setUsername(data.username || '');
          setNombreCompleto(data.nombre_completo || '');
          setTelefono(data.telefono || '');
          setCiudad(data.ciudad || '');
          setBio(data.bio || '');
          setFechaNacimiento(data.fecha_nacimiento || '');
          setTipoSangre(data.tipo_sangre || '');
          setContactoEmergencia(data.contacto_emergencia || '');
          setNivelExperiencia(data.nivel_experiencia || '');
          setNumeroLicencia(data.numero_licencia || '');
        }
      }
    } catch (error: any) {
      Alert.alert('Error al cargar perfil', error.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarPerfil = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      
      // Validación rápida de fecha (para evitar que rompa la BD si escriben algo raro)
      let fechaValidada = fechaNacimiento.trim();
      if (fechaValidada !== '' && !fechaValidada.match(/^\d{4}-\d{2}-\d{2}$/)) {
        Alert.alert('Formato incorrecto', 'La fecha debe tener el formato YYYY-MM-DD (Ej. 1998-08-15)');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('perfiles')
        .update({
          username: username.trim(), 
          nombre_completo: nombreCompleto.trim(), 
          telefono: telefono.trim(), 
          ciudad: ciudad.trim(), 
          bio: bio.trim(),
          fecha_nacimiento: fechaValidada || null, // null si está vacío para evitar errores
          tipo_sangre: tipoSangre.trim(),
          contacto_emergencia: contactoEmergencia.trim(),
          nivel_experiencia: nivelExperiencia || null,
          numero_licencia: numeroLicencia.trim()
        })
        .eq('id', userId);

      if (error) throw error;
      Alert.alert('¡Éxito!', 'Tus datos personales han sido actualizados.');
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
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

      {/* SECCIÓN 1: Datos Generales */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Datos Generales</Text>
        </View>

        <CustomInput label="Nombre Completo" placeholder="Tu nombre real" value={nombreCompleto} onChangeText={setNombreCompleto} />
        <CustomInput label="Nombre de usuario" placeholder="caro_rider" value={username} onChangeText={setUsername} autoCapitalize="none" />
        
        {/* Input de Fecha Corregido temporalmente con formato estricto */}
        <CustomInput label="Fecha de Nacimiento (YYYY-MM-DD)" placeholder="Ej. 1998-08-15" value={fechaNacimiento} onChangeText={setFechaNacimiento} />
        
        <CustomInput label="Teléfono" placeholder="+52 000 000 0000" keyboardType="numeric" value={telefono} onChangeText={setTelefono} />
        <CustomInput label="Ciudad" placeholder="Ej. Puebla, México" value={ciudad} onChangeText={setCiudad} />
        <CustomInput label="Bio" placeholder="¿Qué te motiva a rodar?" value={bio} onChangeText={setBio} />
      </View>

      {/* SECCIÓN 2: Información Médica y Legal */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medkit-outline" size={20} color="#ef4444" />
          <Text style={styles.cardTitle}>Seguridad y Legal</Text>
        </View>
        
        <CustomInput label="Tipo de Sangre" placeholder="Ej. O+, A-" value={tipoSangre} onChangeText={setTipoSangre} autoCapitalize="characters" />
        <CustomInput label="Contacto de Emergencia" placeholder="Teléfono de familiar/amigo" keyboardType="numeric" value={contactoEmergencia} onChangeText={setContactoEmergencia} />
        <CustomInput label="Número de Licencia" placeholder="Opcional" value={numeroLicencia} onChangeText={setNumeroLicencia} />
      </View>

      {/* SECCIÓN 3: Nivel de Experiencia (ARREGLADO CON CHIPS) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="star-outline" size={20} color="#f59e0b" />
          <Text style={styles.cardTitle}>Experiencia Rider</Text>
        </View>
        
        <Text style={styles.label}>Selecciona tu nivel:</Text>
        <View style={styles.chipsContainer}>
          {nivelesValidos.map((nivel) => (
            <TouchableOpacity 
              key={nivel} 
              style={[styles.chip, nivelExperiencia === nivel && styles.chipActive]}
              onPress={() => setNivelExperiencia(nivel)}
            >
              <Text style={[styles.chipText, nivelExperiencia === nivel && styles.chipTextActive]}>
                {nivel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {saving ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <CustomButton title="Guardar Perfil" onPress={guardarPerfil} />
        )}
      </View>

      {/* SECCIÓN 4: EL PUENTE HACIA LA TABLA MOTOCICLETAS */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>MI GARAJE</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.btnGaraje} onPress={() => navigation.navigate('MisMotos')}>
        <View style={styles.btnGarajeContent}>
          <View style={styles.btnGarajeIcon}>
            <Ionicons name="bicycle" size={28} color="#007bff" />
          </View>
          <View style={styles.btnGarajeText}>
            <Text style={styles.btnGarajeTitle}>Gestionar Motocicletas</Text>
            <Text style={styles.btnGarajeSub}>Agrega, edita o elimina tus motos</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
        </View>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flexGrow: 1, paddingBottom: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, color: '#64748b' },
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
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
  footer: { paddingHorizontal: 20, marginTop: 30 },
  
  // NUEVOS ESTILOS PARA LOS CHIPS DE EXPERIENCIA
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipText: { color: '#64748b', fontWeight: '500', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 40, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#cbd5e1' },
  dividerText: { marginHorizontal: 15, fontSize: 14, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 1 },
  
  btnGaraje: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#e0e7ff' },
  btnGarajeContent: { flexDirection: 'row', alignItems: 'center' },
  btnGarajeIcon: { backgroundColor: '#eff6ff', width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  btnGarajeText: { flex: 1 },
  btnGarajeTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  btnGarajeSub: { fontSize: 13, color: '#64748b' }
});