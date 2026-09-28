import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../assets/theme/ThemeContext';
import { BarChart } from 'react-native-gifted-charts';
import { obtenerMetricasSemanales, type BarDataPoint } from '../../../services/timeMetricsService';
import { obtenerLimites, guardarLimites } from '../../../services/limitsService';
import { supabase } from '../../../services/supabase';

export default function TiempoUsoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Estados del dashboard y la gráfica semanal
  const [tiempoHoy, setTiempoHoy] = useState(0);
  const [promedioSemanal, setPromedioSemanal] = useState(0);
  const [barData, setBarData] = useState<BarDataPoint[]>([]);
  const [cargandoMetricas, setCargandoMetricas] = useState(true);
  
  // ESTADOS DE LÍMITES (Paso 3.1)
  const [limiteNotificacion, setLimiteNotificacion] = useState(0);
  const [limiteBloqueo, setLimiteBloqueo] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [cargandoLimites, setCargandoLimites] = useState(true);
  const [guardandoLimites, setGuardandoLimites] = useState(false);

  useEffect(() => {
    let mounted = true;

    const cargarMetricas = async () => {
      setCargandoMetricas(true);

      const metricas = await obtenerMetricasSemanales(
        limiteBloqueo,
        theme.primary,
        theme.dangerText,
      );

      if (mounted) {
        setTiempoHoy(metricas.tiempoHoy);
        setPromedioSemanal(metricas.promedioSemanal);
        setBarData(metricas.barData);
        setCargandoMetricas(false);
      }
    };

    void cargarMetricas();
    return () => {
      mounted = false;
    };
  }, [limiteBloqueo, theme.primary, theme.dangerText]);

  useEffect(() => {
    let mounted = true;

    const cargarConfiguracion = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session?.user) {
          Alert.alert('Sesión no disponible', 'Inicia sesión para cargar tus límites de uso.');
          return;
        }

        const currentUserId = session.user.id;
        if (mounted) setUserId(currentUserId);

        const limites = await obtenerLimites(currentUserId);
        if (mounted && limites) {
          setLimiteNotificacion(limites.limite_notificacion || 0);
          setLimiteBloqueo(limites.limite_bloqueo || 0);
        }
      } catch (error: any) {
        if (mounted) {
          Alert.alert('Error al cargar límites', error?.message || 'No se pudo cargar la configuración.');
        }
      } finally {
        if (mounted) setCargandoLimites(false);
      }
    };

    void cargarConfiguracion();
    return () => {
      mounted = false;
    };
  }, []);

  // Funciones para manejar los límites
  const ajustarLimite = (tipo: 'notificacion' | 'bloqueo', cantidad: number) => {
    if (tipo === 'notificacion') {
      setLimiteNotificacion(prev => Math.max(0, prev + cantidad)); // Evita números negativos
    } else {
      setLimiteBloqueo(prev => Math.max(0, prev + cantidad));
    }
  };

  const handleGuardarLimites = async () => {
    if (!userId) {
      Alert.alert('Sesión no disponible', 'Inicia sesión para guardar tus límites de uso.');
      return;
    }

    setGuardandoLimites(true);
    const exito = await guardarLimites(userId, {
      limite_notificacion: limiteNotificacion,
      limite_bloqueo: limiteBloqueo,
    });
    setGuardandoLimites(false);

    Alert.alert(
      exito ? 'Límites guardados' : 'Error',
      exito
        ? 'Tus límites de uso se han guardado correctamente.'
        : 'No se pudieron guardar los límites. Inténtalo de nuevo.',
    );
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
            {cargandoMetricas ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <Text style={styles.resumenValor}>{tiempoHoy}</Text>
                <Text style={styles.resumenMinutos}> min</Text>
              </>
            )}
          </View>
          <View style={styles.badgePromedio}>
            <Ionicons name="trending-up-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.textoPromedio}>
              Promedio semanal: {cargandoMetricas ? '...' : `${promedioSemanal} min`}
            </Text>
          </View>
        </View>

        {/* DASHBOARD: GRÁFICA SEMANAL CON DATOS REALES */}
        <Text style={styles.sectionTitle}>Uso de los últimos 7 días</Text>
        <View style={styles.chartCard}>
          {cargandoMetricas ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ height: 180 }} />
          ) : barData.length > 0 ? (
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
              maxValue={Math.max(...barData.map(point => point.value), 60) + 20}
              isAnimated
            />
          ) : (
            <Text style={{ color: theme.textSecondary, padding: 20 }}>No hay registros disponibles</Text>
          )}
        </View>

        {/* CONTROLES DE LÍMITES (Paso 3.1) */}
        <Text style={styles.sectionTitle}>Ajustes de Restricción</Text>
        {cargandoLimites && <ActivityIndicator color={theme.primary} style={{ marginBottom: 10 }} />}
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
              <TouchableOpacity disabled={cargandoLimites || guardandoLimites} onPress={() => ajustarLimite('notificacion', -5)} style={styles.stepperBtn}>
                <Ionicons name="remove" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{limiteNotificacion}m</Text>
              <TouchableOpacity disabled={cargandoLimites || guardandoLimites} onPress={() => ajustarLimite('notificacion', 5)} style={styles.stepperBtn}>
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
              <TouchableOpacity disabled={cargandoLimites || guardandoLimites} onPress={() => ajustarLimite('bloqueo', -5)} style={styles.stepperBtn}>
                <Ionicons name="remove" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{limiteBloqueo}m</Text>
              <TouchableOpacity disabled={cargandoLimites || guardandoLimites} onPress={() => ajustarLimite('bloqueo', 5)} style={styles.stepperBtn}>
                <Ionicons name="add" size={18} color={theme.iconPrimary} />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Guardar límites en Supabase */}
        <TouchableOpacity
          style={[styles.saveButton, (cargandoLimites || guardandoLimites || !userId) && { opacity: 0.6 }]}
          onPress={handleGuardarLimites}
          disabled={cargandoLimites || guardandoLimites || !userId}
        >
          {guardandoLimites ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Límites</Text>
          )}
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