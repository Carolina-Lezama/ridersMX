import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Asegúrate de tener expo/vector-icons instalado

export const NotificacionesScreen = () => {
  // --- Estados Locales (Aquí luego conectarás tus Hooks/Servicios) ---
  const [checkInEnabled, setCheckInEnabled] = useState(true);
  const [limiteEnabled, setLimiteEnabled] = useState(true);
  
  // Para la hora, podrías usar @react-native-community/datetimepicker en el futuro
  const [checkInTime, setCheckInTime] = useState('19:00'); 

  // --- Componentes Reutilizables de la UI ---
  
  // 1. Contenedor de Sección
  const Section = ({ title, icon, children, isComingSoon = false }: any) => (
    <View style={[styles.sectionContainer, isComingSoon && styles.sectionDisabled]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={22} color={isComingSoon ? "#888" : "#FF6347"} />
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
        trackColor={{ false: '#767577', true: '#FF6347' }}
        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (value ? '#FFFFFF' : '#f4f3f4')}
        ios_backgroundColor="#3e3e3e"
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
        <Ionicons name="chevron-forward" size={18} color={disabled ? "#666" : "#aaa"} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <Text style={styles.mainHeader}>PREFERENCIAS DE NOTIFICACIONES</Text>

      {/* SECCIÓN 1: RACHA Y HÁBITOS */}
      <Section title="RACHA Y HÁBITOS" icon="flame-outline">
        <SwitchRow 
          label="Recordatorio de Check-in Diario" 
          value={checkInEnabled} 
          onValueChange={setCheckInEnabled} 
        />
        {checkInEnabled && (
          <ActionRow 
            label="Hora del Recordatorio" 
            value={checkInTime} 
            onPress={() => console.log('Abrir selector de hora')} 
          />
        )}
      </Section>

      {/* SECCIÓN 2: BIENESTAR Y TIEMPO DE USO */}
      <Section title="BIENESTAR Y TIEMPO DE USO" icon="timer-outline">
        <SwitchRow 
          label="Alerta de Límite Diario Alcanzado" 
          value={limiteEnabled} 
          onValueChange={setLimiteEnabled} 
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

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Fondo oscuro (adaptado a tu app de motos)
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  mainHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  sectionContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionDisabled: {
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#242424',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  badgeSoon: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#888',
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
    borderBottomColor: '#2A2A2A',
  },
  rowLabel: {
    fontSize: 16,
    color: '#E0E0E0',
    flex: 1,
    paddingRight: 10,
  },
  textDisabled: {
    color: '#666666',
  },
  actionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionValue: {
    fontSize: 16,
    color: '#FF6347', // Un tono naranja/rojo vibrante, puedes cambiarlo al primary color de tu app
    marginRight: 6,
    fontWeight: '600',
  },
});