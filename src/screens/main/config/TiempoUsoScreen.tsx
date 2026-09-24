import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../assets/theme/ThemeContext';
import { BarChart } from 'react-native-gifted-charts';

export default function TiempoUsoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // ESTADOS DEL DASHBOARD (Paso 2.3) - Pronto los conectaremos a Supabase
  const [tiempoHoy, setTiempoHoy] = useState(20);
  const [promedioSemanal, setPromedioSemanal] = useState(45);
  
  // ESTADOS DE LÍMITES (Paso 3.1)
  const [limiteNotificacion, setLimiteNotificacion] = useState(60);
  const [limiteBloqueo, setLimiteBloqueo] = useState(120);

  const [barData, setBarData] = useState([
    { value: 45, label: 'Lun', frontColor: theme.primary },
    { value: 60, label: 'Mar', frontColor: theme.primary },
    { value: 30, label: 'Mié', frontColor: theme.primary },
    { value: 90, label: 'Jue', frontColor: theme.primary },
    { value: 140, label: 'Vie', frontColor: theme.dangerText }, 
    { value: 50, label: 'Sáb', frontColor: theme.primary },
    { value: 20, label: 'Dom', frontColor: theme.primary },
  ]);

  // Funciones para manejar los límites
  const ajustarLimite = (tipo: 'notificacion' | 'bloqueo', cantidad: number) => {
    if (tipo === 'notificacion') {
      setLimiteNotificacion(prev => Math.max(0, prev + cantidad)); // Evita números negativos
    } else {
      setLimiteBloqueo(prev => Math.max(0, prev + cantidad));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Tiempo de Uso</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* DASHBOARD: RESUMEN DE HOY Y PROMEDIO (Paso 2.3) */}
        <View style={styles.resumenCard}>
          <Text style={styles.resumenTitulo}>Tiempo de hoy</Text>
          <View style={styles.rowCenter}>
            <Text style={styles.resumenValor}>{tiempoHoy}</Text>
            <Text style={styles.resumenMinutos}> min</Text>
          </View>
          <View style={styles.badgePromedio}>
            <Ionicons name="trending-up-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.textoPromedio}>Promedio semanal: {promedioSemanal} min</Text>
          </View>
        </View>

        {/* DASHBOARD: GRÁFICA SEMANAL */}
        <Text style={styles.sectionTitle}>Uso de los últimos 7 días</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={barData}
            barWidth={22}
            spacing={20}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: theme.textSecondary }}
            noOfSections={4}
            maxValue={150}
            isAnimated
          />
        </View>

        {/* CONTROLES DE LÍMITES (Paso 3.1) */}
        <Text style={styles.sectionTitle}>Ajustes de Restricción</Text>
        <View style={styles.card}>
          
          {/* Límite de Notificación */}
          <View style={styles.limitRow}>
            <View style={styles.limitInfo}>
              <View style={styles.rowCenterLeft}>
                <Ionicons name="notifications-outline" size={20} color={theme.primary} />
                <Text style={styles.limitTitulo}>Notificarme al llegar a</Text>
              </View>
              <Text style={styles.limitSub}>Recibirás una alerta visual</Text>
            </View>
            
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => ajustarLimite('notificacion', -5)} style={styles.stepperBtn}>
                <Ionicons name="remove" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{limiteNotificacion}m</Text>
              <TouchableOpacity onPress={() => ajustarLimite('notificacion', 5)} style={styles.stepperBtn}>
                <Ionicons name="add" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Límite de Bloqueo */}
          <View style={styles.limitRow}>
            <View style={styles.limitInfo}>
              <View style={styles.rowCenterLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.dangerText} />
                <Text style={styles.limitTitulo}>Bloquear app al llegar a</Text>
              </View>
              <Text style={styles.limitSub}>No podrás navegar más por hoy</Text>
            </View>
            
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => ajustarLimite('bloqueo', -5)} style={styles.stepperBtn}>
                <Ionicons name="remove" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{limiteBloqueo}m</Text>
              <TouchableOpacity onPress={() => ajustarLimite('bloqueo', 5)} style={styles.stepperBtn}>
                <Ionicons name="add" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Botón Guardar (Preparación para BD/AsyncStorage) */}
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Guardar Límites</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  
  resumenCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: theme.border,
  },
  resumenTitulo: { fontSize: 16, color: theme.textSecondary, fontWeight: '600' },
  rowCenter: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 8 },
  resumenValor: { fontSize: 52, fontWeight: 'bold', color: theme.textPrimary },
  resumenMinutos: { fontSize: 22, fontWeight: '500', color: theme.textSecondary, marginLeft: 4 },
  badgePromedio: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8
  },
  textoPromedio: { fontSize: 13, color: theme.textSecondary, marginLeft: 6, fontWeight: '500' },
  
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  
  chartCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: theme.border, alignItems: 'center',
  },
  
  card: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 4 },
  divider: { height: 1, backgroundColor: theme.divider, marginHorizontal: 16 },
  
  limitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  limitInfo: { flex: 1, paddingRight: 10 },
  rowCenterLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  limitTitulo: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginLeft: 8 },
  limitSub: { fontSize: 13, color: theme.textSecondary, marginLeft: 28 },
  
  stepper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background,
    borderRadius: 8, borderWidth: 1, borderColor: theme.border, overflow: 'hidden'
  },
  stepperBtn: { padding: 10, backgroundColor: theme.background },
  stepperValue: { width: 45, textAlign: 'center', fontSize: 16, fontWeight: '600', color: theme.textPrimary },

  saveButton: {
    backgroundColor: theme.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 20
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});