// TiempoUsoScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../assets/theme/ThemeContext';
import { BarChart } from 'react-native-gifted-charts';

export default function TiempoUsoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // DATOS DE PRUEBA: Luego los traeremos de Supabase
  const [barData, setBarData] = useState([
    { value: 45, label: 'Lun', frontColor: theme.primary },
    { value: 60, label: 'Mar', frontColor: theme.primary },
    { value: 30, label: 'Mié', frontColor: theme.primary },
    { value: 90, label: 'Jue', frontColor: theme.primary },
    { value: 140, label: 'Vie', frontColor: theme.dangerText }, // Ejemplo de límite superado (rojo)
    { value: 50, label: 'Sáb', frontColor: theme.primary },
    { value: 20, label: 'Dom', frontColor: theme.primary },
  ]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Tiempo de Uso</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* RESUMEN DE HOY */}
        <View style={styles.resumenCard}>
          <Text style={styles.resumenTitulo}>Tiempo de hoy</Text>
          <Text style={styles.resumenValor}>20 <Text style={styles.resumenMinutos}>min</Text></Text>
          <Text style={styles.resumenSubtitulo}>Límite diario: 120 min</Text>
        </View>

        {/* GRÁFICA SEMANAL */}
        <Text style={styles.sectionTitle}>Uso Semanal</Text>
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
            maxValue={150} // Valor máximo del eje Y
            isAnimated
          />
        </View>

        {/* ZONA DE LÍMITES (FASE 3 - SKELETON) */}
        <Text style={styles.sectionTitle}>Ajustes de Límite</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Avisarme a los 60 min</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Bloquear app a los 120 min</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  
  resumenCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resumenTitulo: { fontSize: 16, color: theme.textSecondary, fontWeight: '600' },
  resumenValor: { fontSize: 48, fontWeight: 'bold', color: theme.textPrimary, marginVertical: 8 },
  resumenMinutos: { fontSize: 20, fontWeight: '500', color: theme.textSecondary },
  resumenSubtitulo: { fontSize: 14, color: theme.iconSecondary },
  
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  
  chartCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center', // Centrar gráfica
  },
  
  card: { backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: theme.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 15, fontWeight: '500', color: theme.textPrimary, marginLeft: 12 },
  divider: { height: 1, backgroundColor: theme.divider },
});