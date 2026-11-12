import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import Skeleton from '../../components/Skeleton';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../../assets/theme/ThemeContext';
import {
  convertirNumeroOpcional,
  normalizarNumeroDecimal,
  obtenerFechaEvento,
} from '../../utils/eventoNotifications';
import { obtenerConfigNotificaciones } from '../../services/notificationConfigService';
import { programarNotificacionesEventos } from '../../services/notificationService';

interface MotoAsociable {
  id: string;
  alias: string | null;
  marca: string;
  modelo: string;
}

const OTRO_ACOMPANANTE = 'Otro / Acompañante';
type Recurrencia = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

const sincronizarRecordatoriosAgenda = async (userId: string): Promise<boolean> => {
  const config = await obtenerConfigNotificaciones(userId);
  if (!config.eventosEnabled) return true;
  return programarNotificacionesEventos(userId);
};

const generarIdSerie = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
  const aleatorio = Math.floor(Math.random() * 16);
  return (caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8).toString(16);
});

const obtenerFechaLocalISO = (fecha: Date): string => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const agregarMeses = (fecha: Date, meses: number, diaPreferido = fecha.getDate()) => {
  const siguiente = new Date(fecha);
  siguiente.setDate(1);
  siguiente.setMonth(siguiente.getMonth() + meses);
  const ultimoDiaDelMes = new Date(siguiente.getFullYear(), siguiente.getMonth() + 1, 0).getDate();
  siguiente.setDate(Math.min(diaPreferido, ultimoDiaDelMes));
  return siguiente;
};

const obtenerFechasRecurrentes = (
  inicio: Date,
  fin: Date,
  recurrencia: Recurrencia,
  intervaloDias: number,
) => {
  const fechas: Date[] = [];
  let actual = new Date(inicio);
  actual.setHours(0, 0, 0, 0);
  const finNormalizado = new Date(fin);
  finNormalizado.setHours(0, 0, 0, 0);
  const diaPreferido = actual.getDate();

  while (actual <= finNormalizado) {
    fechas.push(new Date(actual));
    if (fechas.length > 100) {
      throw new Error('Elige un periodo menor: puedes programar hasta 100 citas por serie.');
    }

    if (recurrencia === 'weekly') {
      actual.setDate(actual.getDate() + 7);
    } else if (recurrencia === 'biweekly') {
      actual.setDate(actual.getDate() + 14);
    } else if (recurrencia === 'monthly') {
      actual = agregarMeses(actual, 1, diaPreferido);
    } else if (recurrencia === 'custom') {
      actual.setDate(actual.getDate() + intervaloDias);
    } else {
      break;
    }
  }

  return fechas;
};

export default function EventoFormScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // 1. Detectamos si venimos a Crear o a Editar
  const eventoId = route.params?.eventoId || null;
  const fechaBase = route.params?.fechaBase || obtenerFechaLocalISO(new Date());
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
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);

  const [tipo, setTipo] = useState(route.params?.tipo === 'mantenimiento' ? 'mantenimiento' : 'rodada');
  const [descripcion, setDescripcion] = useState('');
  const [motos, setMotos] = useState<MotoAsociable[]>([]);
  const [motoAsociada, setMotoAsociada] = useState('');
  const [puntoReunion, setPuntoReunion] = useState('');
  const [destinoRodada, setDestinoRodada] = useState('');
  const [distanciaRodada, setDistanciaRodada] = useState('');
  const [dificultadRodada, setDificultadRodada] = useState('');
  const [servicioMantenimiento, setServicioMantenimiento] = useState('');
  const [tallerMantenimiento, setTallerMantenimiento] = useState('');
  const [kilometrajeMantenimiento, setKilometrajeMantenimiento] = useState('');
  const [costoMantenimiento, setCostoMantenimiento] = useState('');
  
  // Estado de la actividad
  const [estado, setEstado] = useState('Planeada');
  const estadosValidos = ['Planeada', 'Completada', 'Reprogramada', 'Cancelada'];
  const [recurrencia, setRecurrencia] = useState<Recurrencia>('none');
  const [intervaloDias, setIntervaloDias] = useState('7');
  const [fechaFinRecurrencia, setFechaFinRecurrencia] = useState(() => {
    const fecha = new Date(fechaBase + 'T00:00:00');
    return agregarMeses(fecha, 3);
  });

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
          .eq('perfil_id', session.user.id)
          .single();

        if (error) throw error;

        if (data && activo) {
          setTitulo(data.titulo || '');
          if (data.fecha) setFechaObj(new Date(data.fecha + 'T00:00:00'));

          if (data.fecha && data.hora) {
            const fechaHora = obtenerFechaEvento(data.fecha, data.hora);
            if (fechaHora) setHoraObj(fechaHora);
          }

          setTipo(data.tipo || 'rodada');
          setDescripcion(data.descripcion || '');
          setMotoAsociada(data.moto_asociada || '');
          setPuntoReunion(data.rodada_punto_reunion || '');
          setDestinoRodada(data.rodada_destino || '');
          setDistanciaRodada(data.rodada_distancia_km?.toString() || '');
          setDificultadRodada(data.rodada_dificultad || '');
          setServicioMantenimiento(data.mantenimiento_servicio || '');
          setTallerMantenimiento(data.mantenimiento_taller || '');
          setKilometrajeMantenimiento(data.mantenimiento_kilometraje?.toString() || '');
          setCostoMantenimiento(data.mantenimiento_costo_estimado?.toString() || '');
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

    if (tipo === 'rodada' && !destinoRodada.trim()) {
      const mensaje = 'Indica el destino o la ruta de la rodada.';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Falta el destino', mensaje);
      return;
    }

    if (tipo === 'mantenimiento' && !servicioMantenimiento.trim()) {
      const mensaje = 'Describe el servicio que necesita tu motocicleta.';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Falta el servicio', mensaje);
      return;
    }

    const fechaStr = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
    const horaStr = formatearHora12h(horaObj);

    try {
      setSaving(true);
      const distanciaNumerica = convertirNumeroOpcional(distanciaRodada, 'La distancia');
      const kilometrajeNumerico = convertirNumeroOpcional(kilometrajeMantenimiento, 'El kilometraje');
      const costoNumerico = convertirNumeroOpcional(costoMantenimiento, 'El costo estimado');
      if (kilometrajeNumerico !== null && !Number.isInteger(kilometrajeNumerico)) {
        throw new Error('El kilometraje debe ser un número entero.');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Inicia sesión para guardar este evento.');

      const intervaloNumerico = Number(intervaloDias);
      if (recurrencia === 'custom' && (!Number.isInteger(intervaloNumerico) || intervaloNumerico < 1 || intervaloNumerico > 365)) {
        throw new Error('El intervalo personalizado debe ser de 1 a 365 días.');
      }

      const fechaFinStr = recurrencia === 'none' ? null : formatearFechaYMD(fechaFinRecurrencia);
      if (fechaFinStr !== null && fechaFinStr < fechaStr) {
        throw new Error('La fecha final debe ser igual o posterior a la primera cita.');
      }

      const eventoPayload = {
        perfil_id: session.user.id,
        titulo: titulo.trim(),
        fecha: fechaStr,
        hora: horaStr,
        tipo: tipo,
        descripcion: descripcion.trim(),
        moto_asociada: motoAsociada.trim() || null,
        estado,
        completado: estado === 'Completada',
        rodada_punto_reunion: tipo === 'rodada' ? puntoReunion.trim() || null : null,
        rodada_destino: tipo === 'rodada' ? destinoRodada.trim() || null : null,
        rodada_distancia_km: tipo === 'rodada' ? distanciaNumerica : null,
        rodada_dificultad: tipo === 'rodada' ? dificultadRodada || null : null,
        mantenimiento_servicio: tipo === 'mantenimiento' ? servicioMantenimiento.trim() || null : null,
        mantenimiento_taller: tipo === 'mantenimiento' ? tallerMantenimiento.trim() || null : null,
        mantenimiento_kilometraje: tipo === 'mantenimiento' ? kilometrajeNumerico : null,
        mantenimiento_costo_estimado: tipo === 'mantenimiento' ? costoNumerico : null,
      };

      let recordatoriosActualizados = true;
      if (esEdicion) {
        const { error } = await supabase
          .from('eventos')
          .update(eventoPayload)
          .eq('id', eventoId)
          .eq('perfil_id', session.user.id);
        if (error) throw error;
        try {
          recordatoriosActualizados = await sincronizarRecordatoriosAgenda(session.user.id);
        } catch (error) {
          console.error('El evento se guardó, pero no se pudieron actualizar sus recordatorios:', error);
          recordatoriosActualizados = false;
        }
        Platform.OS === 'web' ? window.alert('Evento actualizado') : Alert.alert('Éxito', 'Evento actualizado');
      } else {
        const fechas = recurrencia === 'none'
          ? [fechaObj]
          : obtenerFechasRecurrentes(fechaObj, fechaFinRecurrencia, recurrencia, intervaloNumerico);
        const serieId = recurrencia === 'none' ? null : generarIdSerie();
        const eventos = fechas.map((fecha) => ({
          ...eventoPayload,
          fecha: formatearFechaYMD(fecha),
          serie_id: serieId,
          recurrencia,
          intervalo_recurrencia: recurrencia === 'custom' ? intervaloNumerico : null,
          recurrencia_hasta: fechaFinStr,
        }));
        const { error } = await supabase.from('eventos').insert(eventos);
        if (error) throw error;
        try {
          recordatoriosActualizados = await sincronizarRecordatoriosAgenda(session.user.id);
        } catch (error) {
          console.error('Los eventos se guardaron, pero no se pudieron programar sus recordatorios:', error);
          recordatoriosActualizados = false;
        }
        const mensaje = eventos.length > 1
          ? `Se agendaron ${eventos.length} citas.`
          : 'Evento agendado.';
        const mensajeFinal = recordatoriosActualizados
          ? mensaje
          : `${mensaje}\n\nNo se pudieron programar los recordatorios. Revisa los permisos en Configuración > Notificaciones.`;
        Platform.OS === 'web' ? window.alert(mensajeFinal) : Alert.alert('Éxito', mensajeFinal);
      }

      if (esEdicion && !recordatoriosActualizados) {
        const mensaje = 'El evento se actualizó, pero no se pudieron actualizar sus recordatorios. Revisa los permisos en Configuración > Notificaciones.';
        Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Recordatorio no actualizado', mensaje);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Inicia sesión para eliminar este evento.');

      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoId)
        .eq('perfil_id', session.user.id);
      if (error) throw error;

      let recordatoriosActualizados = true;
      try {
        recordatoriosActualizados = await sincronizarRecordatoriosAgenda(session.user.id);
      } catch (error) {
        console.error('La actividad se eliminó, pero no se pudieron actualizar los recordatorios:', error);
        recordatoriosActualizados = false;
      }

      const mensaje = recordatoriosActualizados
        ? 'La actividad fue borrada.'
        : 'La actividad fue borrada, pero no se pudieron actualizar sus recordatorios.';
      Platform.OS === 'web' ? window.alert(mensaje) : Alert.alert('Eliminada', mensaje);
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
              <Ionicons name="map-outline" size={16} color={tipo === 'rodada' ? theme.onPrimary : theme.textSecondary} />
              <Text style={[styles.chipTextBase, tipo === 'rodada' && styles.chipTextActive]}> Rodada</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.chipBase, tipo === 'mantenimiento' && styles.chipMantenimientoActivo]} onPress={() => setTipo('mantenimiento')}>
              <Ionicons name="build-outline" size={16} color={tipo === 'mantenimiento' ? theme.onPrimary : theme.textSecondary} />
              <Text style={[styles.chipTextBase, tipo === 'mantenimiento' && styles.chipTextActive]}> Taller / Mantenimiento</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CustomInput
          label={tipo === 'rodada' ? 'Nombre de la rodada' : 'Nombre de la cita'}
          placeholder={tipo === 'rodada' ? 'Ej. Amanecer en la Marquesa' : 'Ej. Servicio de los 10,000 km'}
          value={titulo}
          onChangeText={setTitulo}
        />

        {tipo === 'rodada' ? (
          <View style={styles.seccion}>
            <Text style={styles.label}>Detalles de la rodada</Text>
            <CustomInput
              label="Punto de reunión"
              placeholder="Ej. Gasolinera de la salida norte"
              value={puntoReunion}
              onChangeText={setPuntoReunion}
            />
            <CustomInput
              label="Destino o ruta *"
              placeholder="Ej. Tepoztlán por la carretera libre"
              value={destinoRodada}
              onChangeText={setDestinoRodada}
            />
            <CustomInput
              label="Distancia aproximada (km)"
              placeholder="Ej. 85"
              keyboardType="numeric"
              value={distanciaRodada}
              onChangeText={(valor) => setDistanciaRodada(normalizarNumeroDecimal(valor))}
            />
            <Text style={styles.label}>Nivel de dificultad</Text>
            <View style={styles.chipsContainer}>
              {['Tranquila', 'Intermedia', 'Exigente'].map((nivel) => (
                <TouchableOpacity
                  key={nivel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dificultadRodada === nivel }}
                  style={[styles.chipBase, dificultadRodada === nivel && styles.chipActive]}
                  onPress={() => setDificultadRodada(dificultadRodada === nivel ? '' : nivel)}
                >
                  <Text style={[styles.chipTextBase, dificultadRodada === nivel && styles.chipTextActive]}>
                    {nivel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.seccion}>
            <Text style={styles.label}>Detalles del mantenimiento</Text>
            <CustomInput
              label="Servicio requerido *"
              placeholder="Ej. Cambio de aceite y filtro"
              value={servicioMantenimiento}
              onChangeText={setServicioMantenimiento}
            />
            <CustomInput
              label="Taller o mecánico"
              placeholder="Nombre del taller o persona de contacto"
              value={tallerMantenimiento}
              onChangeText={setTallerMantenimiento}
            />
            <CustomInput
              label="Kilometraje al ingresar"
              placeholder="Ej. 12500"
              keyboardType="numeric"
              value={kilometrajeMantenimiento}
              onChangeText={(valor) => setKilometrajeMantenimiento(valor.replace(/\D/g, ''))}
            />
            <CustomInput
              label="Costo estimado"
              placeholder="Ej. 1500"
              keyboardType="numeric"
              value={costoMantenimiento}
              onChangeText={(valor) => setCostoMantenimiento(normalizarNumeroDecimal(valor))}
            />
          </View>
        )}

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

        {!esEdicion && (
          <View style={styles.seccion}>
            <Text style={styles.label}>Repetir cita</Text>
            <View style={styles.chipsContainer}>
              {([
                ['none', 'No repetir'],
                ['weekly', 'Semanal'],
                ['biweekly', 'Quincenal'],
                ['monthly', 'Mensual'],
                ['custom', 'Personalizado'],
              ] as const).map(([valor, etiqueta]) => {
                const seleccionada = recurrencia === valor;
                return (
                  <TouchableOpacity
                    key={valor}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionada }}
                    style={[styles.chipBase, seleccionada && styles.chipActive]}
                    onPress={() => setRecurrencia(valor)}
                  >
                    <Text style={[styles.chipTextBase, seleccionada && styles.chipTextActive]}>
                      {etiqueta}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {recurrencia !== 'none' && (
              <>
                {recurrencia === 'custom' && (
                  <CustomInput
                    label="Repetir cada cuántos días"
                    placeholder="Ej. 10"
                    keyboardType="numeric"
                    value={intervaloDias}
                    onChangeText={(value) => setIntervaloDias(value.replace(/\D/g, ''))}
                  />
                )}
                <Text style={styles.label}>Última fecha de la serie</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    min={formatearFechaYMD(fechaObj)}
                    value={formatearFechaYMD(fechaFinRecurrencia)}
                    onChange={(event) => {
                      if (event.target.value) {
                        setFechaFinRecurrencia(new Date(`${event.target.value}T00:00:00`));
                      }
                    }}
                    style={styles.webInput}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowRecurrenceEndPicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                      <Text style={styles.pickerButtonText}>
                        {formatearFechaLegible(fechaFinRecurrencia)}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    {showRecurrenceEndPicker && (
                      <DateTimePicker
                        value={fechaFinRecurrencia}
                        mode="date"
                        minimumDate={fechaObj}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                          setShowRecurrenceEndPicker(Platform.OS === 'ios');
                          if (selectedDate) setFechaFinRecurrencia(selectedDate);
                        }}
                      />
                    )}
                  </>
                )}
                <Text style={styles.motosVacias}>
                  Se crearán citas para {tipo === 'mantenimiento' ? 'taller' : 'rodadas'} hasta esta fecha.
                </Text>
              </>
            )}
          </View>
        )}

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

        <CustomInput
          label={tipo === 'rodada' ? 'Indicaciones para el grupo' : 'Notas adicionales'}
          placeholder={tipo === 'rodada' ? 'Paradas, equipo recomendado y otros detalles' : 'Piezas, síntomas o indicaciones para el taller'}
          value={descripcion}
          onChangeText={setDescripcion}
        />

        <View style={styles.seccion}>
          <Text style={styles.label}>
            {tipo === 'rodada' ? '¿Con qué moto asistirás? (Opcional)' : 'Motocicleta para el servicio (Opcional)'}
          </Text>
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
                    color={seleccionada ? theme.onPrimary : theme.textSecondary}
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
                  <Ionicons name="bicycle-outline" size={16} color={theme.onPrimary} />
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
                color={motoAsociada === OTRO_ACOMPANANTE ? theme.onPrimary : theme.textSecondary}
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
            <Ionicons name="trash-outline" size={20} color={theme.dangerText} />
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
  chipMantenimientoActivo: { backgroundColor: theme.dangerText, borderColor: theme.dangerText },
  chipTextBase: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: theme.onPrimary, fontWeight: 'bold' },
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