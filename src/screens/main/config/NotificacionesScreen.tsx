import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationConfig } from '../../../utils/hooks/useNotificationConfig';
import { useStreak } from '../../../utils/hooks/useStreak';
import { supabase } from '../../../services/supabase';
import { useTheme } from '../../../../assets/theme/ThemeContext';
import type { Theme } from '../../../../assets/theme/theme';

export const NotificacionesScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [userId, setUserId] = useState<string>();
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [selectorHoraVisible, setSelectorHoraVisible] = useState(false);
  const [horaTemporal, setHoraTemporal] = useState(new Date());

  useEffect(() => {
    let mounted = true;

    const cargarUsuario = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) setUserId(session?.user.id);
      } catch (error) {
        console.error('Error al cargar la sesión para las notificaciones:', error);
        const mensaje = 'No se pudo cargar la sesión. Inténtalo de nuevo.';
        if (Platform.OS === 'web') {
          window.alert(mensaje);
        } else {
          Alert.alert('Error de sesión', mensaje);
        }
      } finally {
        if (mounted) setCargandoUsuario(false);
      }
    };

    void cargarUsuario();
    return () => {
      mounted = false;
    };
  }, []);

  const { completadoHoy, loading: cargandoRacha } = useStreak(userId);
  const {
    config,
    loading,
    toggleCheckIn,
    toggleLimite,
    actualizarHoraCheckIn,
  } = useNotificationConfig(userId, completadoHoy);

  const mostrarError = (mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(mensaje);
    } else {
      Alert.alert('No se pudo actualizar', mensaje);
    }
  };

  const guardarHoraSeleccionada = async (hora: Date) => {
    const valor = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
    try {
      await actualizarHoraCheckIn(valor);
      setSelectorHoraVisible(false);
    } catch (error) {
      console.error('Error guardando la hora del recordatorio:', error);
      mostrarError(error instanceof Error ? error.message : 'No se pudo guardar la hora del recordatorio.');
    }
  };

  const abrirSelectorHora = () => {
    const [hora, minuto] = config.checkInTime.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(hora, minuto, 0, 0);
    setHoraTemporal(fecha);

    if (Platform.OS === 'web') {
      const nuevaHora = window.prompt('Hora del recordatorio (HH:MM)', config.checkInTime);
      if (nuevaHora === null) return;
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(nuevaHora)) {
        mostrarError('Ingresa la hora en formato de 24 horas, por ejemplo 19:00.');
        return;
      }
      void actualizarHoraCheckIn(nuevaHora).catch((error) => {
        console.error('Error guardando la hora del recordatorio:', error);
        mostrarError(error instanceof Error ? error.message : 'No se pudo guardar la hora del recordatorio.');
      });
      return;
    }

    setSelectorHoraVisible(true);
  };

  const manejarCambioHora = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setSelectorHoraVisible(false);
      return;
    }
    if (!selectedTime) return;

    setHoraTemporal(selectedTime);
    if (Platform.OS === 'android') {
      setSelectorHoraVisible(false);
      void guardarHoraSeleccionada(selectedTime);
    }
  };

  const ScreenHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Regresar"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={theme.iconPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Notificaciones</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  // --- Componentes Reutilizables de la UI ---
  
  // 1. Contenedor de Sección
  const Section = ({ title, icon, children, isComingSoon = false }: any) => (
    <View style={[styles.sectionContainer, isComingSoon && styles.sectionDisabled]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={22} color={isComingSoon ? theme.textSecondary : theme.accent} />
        <Text style={[styles.sectionTitle, isComingSoon && styles.textDisabled]}>
          {title} {isComingSoon && <Text style={styles.badgeSoon}>(Próximamente)</Text>}
        </Text>
      </View>
      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );

  // 2. Fila con Switch
  const SwitchRow = ({ label, value, onValueChange, disabled = false }: any) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{label}</Text>
      <Switch
        trackColor={{ false: theme.switchTrackFalse, true: theme.accent }}
        thumbColor={theme.card}
        ios_backgroundColor={theme.switchTrackFalse}
        onValueChange={onValueChange}
        value={value}
        disabled={disabled}
      />
    </View>
  );

  // 3. Fila Accionable (Ej: Para abrir el selector de hora)
  const ActionRow = ({ label, value, onPress, disabled = false }: any) => (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onPress} 
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{label}</Text>
      <View style={styles.actionValueContainer}>
        <Text style={[styles.actionValue, disabled && styles.textDisabled]}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color={disabled ? theme.textSecondary : theme.iconSecondary} />
      </View>
    </TouchableOpacity>
  );

  if (cargandoUsuario || (userId && (loading || cargandoRacha))) {
    return (
      <View style={styles.container}>
        <ScreenHeader />
        <View style={[styles.loadingContainer, styles.fill]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.container}>
        <ScreenHeader />
        <View style={[styles.loadingContainer, styles.fill]}>
          <Text style={styles.rowLabel}>Inicia sesión para configurar tus notificaciones.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.mainHeader}>PREFERENCIAS DE NOTIFICACIONES</Text>

        {/* SECCIÓN 1: RACHA Y HÁBITOS */}
        <Section title="RACHA Y HÁBITOS" icon="flame-outline">
          <SwitchRow 
            label="Recordatorio de Check-in Diario" 
            value={config.checkInEnabled}
            onValueChange={(enabled: boolean) => {
              void toggleCheckIn(enabled).catch((error) => {
                console.error('Error actualizando recordatorios de racha:', error);
                mostrarError(error instanceof Error ? error.message : 'No se pudo actualizar el recordatorio de check-in.');
              });
            }}
          />
          {config.checkInEnabled && (
            <ActionRow 
              label="Hora del Recordatorio" 
              value={config.checkInTime}
              onPress={abrirSelectorHora}
            />
          )}
        </Section>

      {/* SECCIÓN 2: BIENESTAR Y TIEMPO DE USO */}
      <Section title="BIENESTAR Y TIEMPO DE USO" icon="timer-outline">
        <SwitchRow 
          label="Alerta de Límite Diario Alcanzado" 
          value={config.limiteEnabled}
          onValueChange={(enabled: boolean) => {
            void toggleLimite(enabled).catch((error) => {
              console.error('Error actualizando alertas de límite:', error);
              mostrarError(error instanceof Error ? error.message : 'No se pudo actualizar la alerta de límite diario.');
            });
          }}
        />
      </Section>

      {/* SECCIÓN 3: VEHÍCULO Y MANTENIMIENTO */}
      <Section title="VEHÍCULO Y MANTENIMIENTO" icon="build-outline" isComingSoon>
        <SwitchRow 
          label="Recordatorios de Cambio de Aceite / Frenos" 
          value={false} 
          onValueChange={() => {}} 
          disabled={true} 
        />
      </Section>

      {/* SECCIÓN 4: COMUNIDAD */}
      <Section title="COMUNIDAD" icon="chatbubbles-outline" isComingSoon>
        <SwitchRow 
          label="Respuestas a tus publicaciones" 
          value={false} 
          onValueChange={() => {}} 
          disabled={true} 
        />
      </Section>

      {Platform.OS === 'ios' && (
        <Modal
          transparent
          visible={selectorHoraVisible}
          animationType="fade"
          onRequestClose={() => setSelectorHoraVisible(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Hora del recordatorio</Text>
              <DateTimePicker
                value={horaTemporal}
                mode="time"
                display="spinner"
                onChange={manejarCambioHora}
              />
              <View style={styles.pickerActions}>
                <TouchableOpacity onPress={() => setSelectorHoraVisible(false)}>
                  <Text style={styles.pickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void guardarHoraSeleccionada(horaTemporal)}>
                  <Text style={styles.pickerSave}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && selectorHoraVisible && (
        <DateTimePicker
          value={horaTemporal}
          mode="time"
          display="default"
          onChange={manejarCambioHora}
        />
      )}

      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  fill: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  pickerCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.card,
  },
  pickerTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  pickerCancel: {
    color: theme.textSecondary,
    fontSize: 16,
  },
  pickerSave: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  mainHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.textSecondary,
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  sectionContainer: {
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionDisabled: {
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.cardHeader,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  badgeSoon: {
    fontSize: 11,
    fontWeight: 'normal',
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  sectionBody: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  rowLabel: {
    fontSize: 16,
    color: theme.textPrimary,
    flex: 1,
    paddingRight: 10,
  },
  textDisabled: {
    color: theme.textSecondary,
  },
  actionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionValue: {
    fontSize: 16,
    color: theme.accent,
    marginRight: 6,
    fontWeight: '600',
  },
});