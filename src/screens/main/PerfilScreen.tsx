import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import Skeleton from '../../components/Skeleton';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';

const CODIGOS_PAIS = [
  { nombre: 'México', codigo: '+52', digitos: '52' },
  { nombre: 'Estados Unidos / Canadá', codigo: '+1', digitos: '1' },
  { nombre: 'España', codigo: '+34', digitos: '34' },
  { nombre: 'Argentina', codigo: '+54', digitos: '54' },
  { nombre: 'Brasil', codigo: '+55', digitos: '55' },
  { nombre: 'Chile', codigo: '+56', digitos: '56' },
  { nombre: 'Colombia', codigo: '+57', digitos: '57' },
  { nombre: 'Venezuela', codigo: '+58', digitos: '58' },
  { nombre: 'Perú', codigo: '+51', digitos: '51' },
  { nombre: 'Ecuador', codigo: '+593', digitos: '593' },
  { nombre: 'Bolivia', codigo: '+591', digitos: '591' },
  { nombre: 'Paraguay', codigo: '+595', digitos: '595' },
  { nombre: 'Uruguay', codigo: '+598', digitos: '598' },
  { nombre: 'Guatemala', codigo: '+502', digitos: '502' },
  { nombre: 'El Salvador', codigo: '+503', digitos: '503' },
  { nombre: 'Honduras', codigo: '+504', digitos: '504' },
  { nombre: 'Nicaragua', codigo: '+505', digitos: '505' },
  { nombre: 'Costa Rica', codigo: '+506', digitos: '506' },
  { nombre: 'Panamá', codigo: '+507', digitos: '507' },
  { nombre: 'Cuba', codigo: '+53', digitos: '53' },
  { nombre: 'Reino Unido', codigo: '+44', digitos: '44' },
] as const;

interface MotocicletaSeguroPerfil {
  id: string;
  alias: string | null;
  marca: string;
  modelo: string;
}

interface DatosSeguroMotocicleta {
  aseguradora: string | null;
  numero_poliza: string | null;
}

const esDatosSeguroMotocicleta = (valor: unknown): valor is DatosSeguroMotocicleta =>
  typeof valor === 'object'
  && valor !== null
  && 'aseguradora' in valor
  && (typeof valor.aseguradora === 'string' || valor.aseguradora === null)
  && 'numero_poliza' in valor
  && (typeof valor.numero_poliza === 'string' || valor.numero_poliza === null);

const separarTelefono = (telefonoGuardado: string) => {
  const digitos = telefonoGuardado.replace(/\D/g, '');
  if (digitos.length === 10) return { codigo: '+52', numero: digitos };

  const pais = [...CODIGOS_PAIS]
    .sort((a, b) => b.digitos.length - a.digitos.length)
    .find(({ digitos: codigo }) => digitos.startsWith(codigo) && digitos.length > codigo.length);

  return pais
    ? { codigo: pais.codigo, numero: digitos.slice(pais.digitos.length) }
    : { codigo: '+52', numero: digitos };
};

export default function PerfilScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigoPais, setCodigoPais] = useState<string>('+52');
  const [mostrarCodigosPais, setMostrarCodigosPais] = useState(false);
  const [telefonoInvalido, setTelefonoInvalido] = useState(false);
  const [ciudad, setCiudad] = useState('');
  const [bio, setBio] = useState(':?');
  
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [nivelExperiencia, setNivelExperiencia] = useState('');
  const [motocicletas, setMotocicletas] = useState<MotocicletaSeguroPerfil[]>([]);
  const [motocicletaSeleccionada, setMotocicletaSeleccionada] = useState<string | null>(null);
  const [mostrarSelectorMoto, setMostrarSelectorMoto] = useState(false);
  const [aseguradora, setAseguradora] = useState('');
  const [numeroPoliza, setNumeroPoliza] = useState('');
  const [loadingSeguro, setLoadingSeguro] = useState(false);
  const [savingSeguro, setSavingSeguro] = useState(false);
  const motoSeguroSeleccionada = motocicletas.find(({ id }) => id === motocicletaSeleccionada);

  // Opciones válidas para la base de datos
  const nivelesValidos = ['Novato', 'Intermedio', 'Experto', 'Profesional'];

  const formatearFechaISO = (fecha: Date) => {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  };

  const fechaNacimientoLegible = () => {
    if (!fechaNacimiento) return 'Selecciona tu fecha de nacimiento';
    const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    if (Number.isNaN(fecha.getTime())) return 'Selecciona tu fecha de nacimiento';
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fechaNacimientoSeleccionada = () => {
    if (!fechaNacimiento) return new Date(2000, 0, 1);
    const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return Number.isNaN(fecha.getTime()) ? new Date(2000, 0, 1) : fecha;
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarMotocicletasSeguro = async (idUsuario: string) => {
    const { data: motos, error } = await supabase
      .from('motocicletas')
      .select('id, alias, marca, modelo')
      .eq('perfil_id', idUsuario)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const motosPerfil = (motos || []) as MotocicletaSeguroPerfil[];
    setMotocicletas(motosPerfil);
    setMotocicletaSeleccionada((actual) =>
      motosPerfil.some(({ id }) => id === actual) ? actual : motosPerfil[0]?.id || null,
    );
  };

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = navigation.addListener('focus', () => {
      void cargarMotocicletasSeguro(userId).catch((error: unknown) => {
        console.error('Error al actualizar motocicletas del perfil:', error);
        Alert.alert(
          'Error al cargar motocicletas',
          error instanceof Error ? error.message : 'Inténtalo de nuevo más tarde.',
        );
      });
    });
    return unsubscribe;
  }, [navigation, userId]);

  useEffect(() => {
    let cancelada = false;

    const cargarSeguro = async () => {
      if (!motocicletaSeleccionada) {
        setAseguradora('');
        setNumeroPoliza('');
        setLoadingSeguro(false);
        return;
      }

      try {
        setLoadingSeguro(true);
        setAseguradora('');
        setNumeroPoliza('');
        const { data, error } = await supabase
          .rpc('obtener_seguro_motocicleta', { p_motocicleta_id: motocicletaSeleccionada })
          .single();
        if (error) throw error;
        if (!esDatosSeguroMotocicleta(data)) {
          throw new Error('No se pudieron cargar los datos del seguro.');
        }
        if (!cancelada) {
          setAseguradora(data.aseguradora || '');
          setNumeroPoliza(data.numero_poliza || '');
        }
      } catch (error: any) {
        if (!cancelada) {
          Alert.alert('Error al cargar seguro', error.message);
        }
      } finally {
        if (!cancelada) setLoadingSeguro(false);
      }
    };

    void cargarSeguro();
    return () => {
      cancelada = true;
    };
  }, [motocicletaSeleccionada]);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);

        await cargarMotocicletasSeguro(session.user.id);

        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setUsername(data.username || '');
          setNombreCompleto(data.nombre_completo || '');
          setAvatarUrl(data.avatar_url || null);
          const telefonoSeparado = separarTelefono(data.telefono || '');
          setCodigoPais(telefonoSeparado.codigo);
          setTelefono(telefonoSeparado.numero);
          setCiudad(data.ciudad || '');
          setBio(data.bio || '');
          setFechaNacimiento(data.fecha_nacimiento || '');
          setNivelExperiencia(data.nivel_experiencia || '');
        }
      }
    } catch (error: any) {
      Alert.alert('Error al cargar perfil', error.message);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarFotoPerfil = async () => {
    try {
      if (!userId) throw new Error('Inicia sesión para actualizar tu foto de perfil.');

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Permite el acceso a tus fotos para elegir una imagen de perfil.');
        return;
      }

      const seleccion = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (seleccion.canceled || !seleccion.assets[0]) return;

      const foto = seleccion.assets[0];
      if (foto.fileSize && foto.fileSize > 8 * 1024 * 1024) {
        throw new Error('La foto debe pesar menos de 8 MB.');
      }

      setSubiendoAvatar(true);
      const respuesta = await fetch(foto.uri);
      if (!respuesta.ok) throw new Error('No se pudo leer la foto seleccionada.');
      const contenido = await respuesta.arrayBuffer();
      const contentType = foto.mimeType?.startsWith('image/')
        ? foto.mimeType
        : 'image/jpeg';
      const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
      const ruta = `${userId}/${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from('avatars')
        .upload(ruta, contenido, { contentType, upsert: false });
      if (errorSubida) throw errorSubida;

      const urlPublica = supabase.storage.from('avatars').getPublicUrl(ruta).data.publicUrl;
      const nuevaUrl = `${urlPublica}?v=${Date.now()}`;
      const { data: perfilActualizado, error: errorPerfil } = await supabase
        .from('perfiles')
        .update({ avatar_url: nuevaUrl })
        .eq('id', userId)
        .select('id')
        .maybeSingle();

      if (errorPerfil || !perfilActualizado) {
        const { error: errorLimpieza } = await supabase.storage.from('avatars').remove([ruta]);
        if (errorLimpieza) console.error('No se pudo limpiar la foto no guardada:', errorLimpieza);
        if (errorPerfil) throw errorPerfil;
        throw new Error('No se encontró el perfil para guardar la foto.');
      }

      const fotoAnterior = avatarUrl?.split('/storage/v1/object/public/avatars/')[1]?.split('?')[0];
      if (fotoAnterior?.startsWith(`${userId}/`)) {
        const { error: errorBorrado } = await supabase.storage
          .from('avatars')
          .remove([decodeURIComponent(fotoAnterior)]);
        if (errorBorrado) console.warn('No se pudo borrar la foto de perfil anterior:', errorBorrado);
      }

      setAvatarUrl(nuevaUrl);
    } catch (error) {
      console.error('Error al actualizar la foto de perfil:', error);
      Alert.alert(
        'No se pudo actualizar la foto',
        error instanceof Error ? error.message : 'Inténtalo de nuevo más tarde.',
      );
    } finally {
      setSubiendoAvatar(false);
    }
  };

const guardarPerfil = async () => {
    // 1. Prevenir el fallo silencioso
    if (!userId) {
      const msg = 'No se pudo obtener la sesión del usuario. Intenta reiniciar la app.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    if (telefono.length > 0 && telefono.length !== 10) {
      setTelefonoInvalido(true);
      const msg = 'Ingresa exactamente 10 dígitos en el número de teléfono.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Teléfono incompleto', msg);
      return;
    }

    try {
      setSaving(true);
      console.log("Iniciando guardado para el usuario:", userId); // Útil para depurar en PC

      let fechaValidada = fechaNacimiento.trim();
      if (fechaValidada !== '') {
        const [anio, mes, dia] = fechaValidada.split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia);
        const fechaExiste = Number.isInteger(anio)
          && Number.isInteger(mes)
          && Number.isInteger(dia)
          && formatearFechaISO(fecha) === fechaValidada;
        if (!fechaExiste || fecha > new Date()) {
          const msg = 'Selecciona una fecha de nacimiento válida que no sea futura.';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Formato incorrecto', msg);
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('perfiles')
        .update({
          username: username.trim(), 
          nombre_completo: nombreCompleto.trim(), 
          telefono: telefono ? `${codigoPais}${telefono}` : '',
          ciudad: ciudad.trim(), 
          bio: bio.trim(),
          fecha_nacimiento: fechaValidada || null,
          nivel_experiencia: nivelExperiencia || null,
        })
        .eq('id', userId);

      if (error) throw error;

      console.log("¡Datos guardados correctamente en Supabase!");
      const exitoMsg = 'Tus datos personales han sido actualizados.';
      Platform.OS === 'web' ? window.alert(exitoMsg) : Alert.alert('¡Éxito!', exitoMsg);

    } catch (error: any) {
      // 2. Mostrar el error real en la consola del navegador
      console.error("Error devuelto por Supabase:", error);
      
      const errorMsg = error.message || 'Ocurrió un error al guardar.';
      Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert('Error al guardar', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const guardarSeguro = async () => {
    if (!motocicletaSeleccionada) {
      Alert.alert('Selecciona una motocicleta', 'Agrega o selecciona una motocicleta para guardar su seguro.');
      return;
    }

    try {
      setSavingSeguro(true);
      const { error } = await supabase.rpc('guardar_seguro_motocicleta', {
        p_motocicleta_id: motocicletaSeleccionada,
        p_aseguradora: aseguradora.trim(),
        p_numero_poliza: numeroPoliza.trim(),
      });
      if (error) throw error;

      const mensaje = 'Los datos del seguro se guardaron de forma segura.';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('¡Éxito!', mensaje);
    } catch (error: any) {
      console.error('Error al guardar seguro de motocicleta:', error);
      const mensaje = error.message || 'Ocurrió un error al guardar los datos del seguro.';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Error al guardar seguro', mensaje);
    } finally {
      setSavingSeguro(false);
    }
  };

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBackground} />
        <View style={styles.avatarContainer}>
          <Skeleton width={110} height={110} borderRadius={55} />
          <Skeleton width={150} height={23} style={{ marginTop: 14 }} />
          <Skeleton width={105} height={15} style={{ marginTop: 8 }} />
        </View>
        {[4, 3, 1].map((fieldCount, sectionIndex) => (
          <View key={sectionIndex} style={styles.card}>
            <View style={styles.cardHeader}>
              <Skeleton width={20} height={20} borderRadius={6} />
              <Skeleton width={145} height={19} style={{ marginLeft: 10 }} />
            </View>
            {Array.from({ length: fieldCount }, (_, fieldIndex) => (
              <View key={fieldIndex} style={{ marginBottom: 16 }}>
                <Skeleton width={105} height={13} style={{ marginBottom: 9 }} />
                <Skeleton height={44} borderRadius={10} />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerBackground} />

      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              accessibilityLabel={`Foto de perfil de ${nombreCompleto || 'Rider'}`}
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <Text style={styles.avatarText}>{nombreCompleto ? nombreCompleto.substring(0, 2).toUpperCase() : 'UI'}</Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
            style={styles.editBadge}
            onPress={() => void seleccionarFotoPerfil()}
            disabled={subiendoAvatar}
          >
            {subiendoAvatar
              ? <ActivityIndicator size="small" color={theme.card} />
              : <Ionicons name="camera" size={16} color={theme.card} />}
          </TouchableOpacity>
        </View>
        <Text style={styles.nombreUsuario}>{nombreCompleto || 'Rider'}</Text>
        <Text style={styles.rolUsuario}>@{username}</Text>
      </View>

      {/* SECCIÓN 1: Datos Generales */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color={theme.primary} />
          <Text style={styles.cardTitle}>Datos Generales</Text>
        </View>

        <CustomInput label="Nombre Completo" placeholder="Tu nombre real" value={nombreCompleto} onChangeText={setNombreCompleto} />
        <CustomInput label="Nombre de usuario" placeholder="caro_rider" value={username} onChangeText={setUsername} autoCapitalize="none" />
        
        <Text style={styles.label}>Fecha de nacimiento</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            max={formatearFechaISO(new Date())}
            value={fechaNacimiento}
            onChange={(event) => setFechaNacimiento(event.target.value)}
            style={styles.webDateInput}
          />
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Fecha de nacimiento: ${fechaNacimientoLegible()}`}
              style={styles.datePickerButton}
              onPress={() => setMostrarSelectorFecha(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={styles.datePickerText}>{fechaNacimientoLegible()}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
            </TouchableOpacity>
            {mostrarSelectorFecha && (
              <DateTimePicker
                value={fechaNacimientoSeleccionada()}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setMostrarSelectorFecha(Platform.OS === 'ios');
                  if (selectedDate) setFechaNacimiento(formatearFechaISO(selectedDate));
                }}
              />
            )}
          </>
        )}
        
        <View style={styles.telefonoRow}>
          <View style={styles.codigoPaisContainer}>
            <Text style={styles.label}>Código</Text>
            <TouchableOpacity
              style={styles.codigoPaisButton}
              onPress={() => setMostrarCodigosPais(true)}
              accessibilityRole="button"
              accessibilityLabel={`Código de país ${codigoPais}. Seleccionar otro código`}
            >
              <Text style={styles.codigoPaisText}>{codigoPais}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.iconSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.telefonoInput}>
            <CustomInput
              label="Teléfono"
              placeholder="10 dígitos"
              keyboardType="numeric"
              value={telefono}
              maxLength={10}
              error={telefonoInvalido ? 'Ingresa exactamente 10 dígitos.' : undefined}
              onChangeText={(valor) => {
                setTelefono(valor.replace(/\D/g, '').slice(0, 10));
                setTelefonoInvalido(false);
              }}
            />
          </View>
        </View>
        <Modal
          visible={mostrarCodigosPais}
          transparent
          animationType="fade"
          onRequestClose={() => setMostrarCodigosPais(false)}
        >
          <View style={styles.codigoPaisOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setMostrarCodigosPais(false)}
              accessibilityLabel="Cerrar selección de código de país"
            />
            <View style={styles.codigoPaisModal}>
              <Text style={styles.codigoPaisTitulo}>Selecciona tu país</Text>
              <ScrollView>
                {CODIGOS_PAIS.map((pais) => (
                  <TouchableOpacity
                    key={pais.nombre}
                    style={styles.codigoPaisOpcion}
                    onPress={() => {
                      setCodigoPais(pais.codigo);
                      setTelefonoInvalido(false);
                      setMostrarCodigosPais(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.codigoPaisOpcionTexto}>{pais.nombre}</Text>
                    <Text style={styles.codigoPaisOpcionCodigo}>{pais.codigo}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <CustomInput label="Ciudad" placeholder="Ej. Puebla, México" value={ciudad} onChangeText={setCiudad} />
        <CustomInput label="Bio" placeholder="¿Qué te motiva a rodar?" value={bio} onChangeText={setBio} />
      </View>

      {/* SECCIÓN 2: Nivel de Experiencia */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="star-outline" size={20} color={theme.star} />
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
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <CustomButton title="Guardar Perfil" onPress={guardarPerfil} />
        )}
      </View>

      {/* SECCIÓN 3: EL PUENTE HACIA LA TABLA MOTOCICLETAS */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>MI GARAJE</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.btnGaraje} onPress={() => navigation.navigate('MisMotos')}>
        <View style={styles.btnGarajeContent}>
          <View style={styles.btnGarajeIcon}>
            <Ionicons name="bicycle" size={28} color={theme.primary} />
          </View>
          <View style={styles.btnGarajeText}>
            <Text style={styles.btnGarajeTitle}>Gestionar Motocicletas</Text>
            <Text style={styles.btnGarajeSub}>Agrega, edita o elimina tus motos</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.iconSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.warningText} />
          <Text style={styles.cardTitle}>Seguro de motocicleta</Text>
        </View>
        <Text style={styles.helpText}>
          Estos datos son opcionales, se cifran y solo puedes consultarlos tú.
        </Text>

        {motocicletas.length === 0 ? (
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => navigation.navigate('MisMotos')}
            accessibilityRole="button"
          >
            <Text style={styles.datePickerText}>Agrega una motocicleta para registrar su seguro</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.label}>Motocicleta</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setMostrarSelectorMoto(true)}
              accessibilityRole="button"
              accessibilityLabel={`Motocicleta seleccionada: ${motoSeguroSeleccionada?.alias || `${motoSeguroSeleccionada?.marca} ${motoSeguroSeleccionada?.modelo}`}`}
            >
              <Text style={styles.datePickerText}>
                {motoSeguroSeleccionada?.alias || `${motoSeguroSeleccionada?.marca} ${motoSeguroSeleccionada?.modelo}`}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.iconSecondary} />
            </TouchableOpacity>

            {loadingSeguro ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <CustomInput
                  label="Compañía aseguradora (opcional)"
                  placeholder="Ej. Quálitas, Mapfre"
                  value={aseguradora}
                  onChangeText={setAseguradora}
                />
                <CustomInput
                  label="Número de póliza (opcional)"
                  placeholder="Número de contrato"
                  value={numeroPoliza}
                  onChangeText={setNumeroPoliza}
                />
                {savingSeguro ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <CustomButton title="Guardar seguro" onPress={guardarSeguro} />
                )}
              </>
            )}

            <Modal
              visible={mostrarSelectorMoto}
              transparent
              animationType="fade"
              onRequestClose={() => setMostrarSelectorMoto(false)}
            >
              <View style={styles.motoSelectorOverlay}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  onPress={() => setMostrarSelectorMoto(false)}
                  accessibilityLabel="Cerrar selección de motocicleta"
                />
                <View style={styles.motoSelectorModal}>
                  <Text style={styles.codigoPaisTitulo}>Selecciona una motocicleta</Text>
                  <ScrollView>
                    {motocicletas.map((moto) => (
                      <TouchableOpacity
                        key={moto.id}
                        style={styles.codigoPaisOpcion}
                        onPress={() => {
                          setMotocicletaSeleccionada(moto.id);
                          setMostrarSelectorMoto(false);
                        }}
                        accessibilityRole="button"
                      >
                        <Text style={styles.codigoPaisOpcionTexto}>
                          {moto.alias || `${moto.marca} ${moto.modelo}`}
                        </Text>
                        {moto.id === motocicletaSeleccionada && (
                          <Ionicons name="checkmark" size={18} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { backgroundColor: theme.background, flexGrow: 1, paddingBottom: 20 },
  headerBackground: { backgroundColor: theme.primary, height: 120, width: '100%', position: 'absolute', top: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { alignItems: 'center', marginTop: 60, marginBottom: 20 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 3, borderColor: theme.background, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: theme.iconSecondary },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: theme.card },
  nombreUsuario: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, marginTop: 10 },
  rolUsuario: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
  card: { backgroundColor: theme.card, marginHorizontal: 20, marginTop: 15, padding: 20, borderRadius: 16, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginLeft: 10 },
  label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 10 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 15 },
  datePickerText: { flex: 1, marginLeft: 10, color: theme.textPrimary, fontSize: 16 },
  webDateInput: { width: '100%', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, fontSize: 16, color: theme.textPrimary, marginBottom: 15 },
  telefonoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  codigoPaisContainer: { width: 108 },
  codigoPaisButton: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10 },
  codigoPaisText: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  telefonoInput: { flex: 1 },
  codigoPaisOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: theme.overlay },
  codigoPaisModal: { maxHeight: '75%', backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, borderWidth: 1, borderColor: theme.border },
  motoSelectorOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: theme.overlay },
  motoSelectorModal: { maxHeight: '75%', backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, borderWidth: 1, borderColor: theme.border },
  codigoPaisTitulo: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 8 },
  codigoPaisOpcion: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.divider },
  codigoPaisOpcionTexto: { color: theme.textPrimary, fontSize: 15 },
  codigoPaisOpcionCodigo: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 20, marginTop: 30 },
  helpText: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  
  // NUEVOS ESTILOS PARA LOS CHIPS DE EXPERIENCIA
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: theme.background, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textSecondary, fontWeight: '500', fontSize: 14 },
  chipTextActive: { color: theme.onPrimary, fontWeight: 'bold' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 40, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { marginHorizontal: 15, fontSize: 14, fontWeight: 'bold', color: theme.iconSecondary, letterSpacing: 1 },
  
  btnGaraje: { backgroundColor: theme.card, marginHorizontal: 20, borderRadius: 16, padding: 15, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: theme.border },
  btnGarajeContent: { flexDirection: 'row', alignItems: 'center' },
  btnGarajeIcon: { backgroundColor: theme.background, width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  btnGarajeText: { flex: 1 },
  btnGarajeTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 4 },
  btnGarajeSub: { fontSize: 13, color: theme.textSecondary }
});