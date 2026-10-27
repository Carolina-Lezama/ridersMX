import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../../../assets/theme/ThemeContext'; 
import { supabase } from '../../../services/supabase';
import {
  obtenerKilometrosPorMes,
  obtenerDesgloseGastos,
  obtenerTerrenosFrecuentes,
  KmPorMesData,
  GastosDesgloseData,
  TerrenoDistribucionData,
} from '../../../services/estadisticasService';

export default function EstadisticasScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [motos, setMotos] = useState<any[]>([]);
  const [motoSeleccionadaId, setMotoSeleccionadaId] = useState<string | null>(null);

  const [kmMesData, setKmMesData] = useState<KmPorMesData[]>([]);
  const [gastosData, setGastosData] = useState<GastosDesgloseData>({ rutas: 0, mantenimiento: 0 });
  const [terrenosData, setTerrenosData] = useState<TerrenoDistribucionData[]>([]);

  useEffect(() => {
    cargarMotos();
  }, []);

  useEffect(() => {
    cargarEstadisticas();
  }, [motoSeleccionadaId]);

  const cargarMotos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('motocicletas')
        .select('id, alias, marca, modelo')
        .eq('perfil_id', session.user.id);

      if (data) setMotos(data);
    } catch (error) {
      console.error('Error al cargar motos:', error);
    }
  };

  const cargarEstadisticas = async () => {
    setLoading(true);
    setErrorCarga(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.user) return;

      const uid = session.user.id;

      const [kmRes, gastosRes, terrenosRes] = await Promise.all([
        obtenerKilometrosPorMes(uid, motoSeleccionadaId),
        obtenerDesgloseGastos(uid, motoSeleccionadaId),
        obtenerTerrenosFrecuentes(uid, motoSeleccionadaId),
      ]);

      setKmMesData(kmRes);
      setGastosData(gastosRes);
      setTerrenosData(terrenosRes);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setErrorCarga(error instanceof Error ? error.message : 'No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  };

  // Formato de datos para react-native-gifted-charts (BarChart)
  const barData = kmMesData.map((item) => ({
    value: item.kilometros,
    label: item.mes,
    frontColor: theme.primary,
    topLabelComponent: () => (
      item.kilometros > 0 ? (
        <Text style={{ color: theme.textSecondary, fontSize: 10, marginBottom: 4 }}>
          {item.kilometros}
        </Text>
      ) : null
    ),
  }));
  const hayKilometros = barData.some((item) => item.value > 0);

  // Formato de datos para PieChart (Gastos)
  const pieData = [
    { value: gastosData.rutas, color: '#3b82f6', text: 'Rutas' },
    { value: gastosData.mantenimiento, color: '#ef4444', text: 'Mantenimiento' },
  ].filter(item => item.value > 0);

  const totalGastos = gastosData.rutas + gastosData.mantenimiento;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnBack}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analítica de Garaje</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* FILTRO DE MOTOS */}
        <View style={styles.filtroSection}>
          <Text style={styles.filtroLabel}>Filtrar por vehículo:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtroScroll}>
            <TouchableOpacity
              style={[styles.chip, motoSeleccionadaId === null && styles.chipActive]}
              onPress={() => setMotoSeleccionadaId(null)}
            >
              <Text style={[styles.chipText, motoSeleccionadaId === null && styles.chipTextActive]}>Todas</Text>
            </TouchableOpacity>
            {motos.map((moto) => {
              const nombre = moto.alias || `${moto.marca} ${moto.modelo}`;
              const isSelected = motoSeleccionadaId === moto.id;
              return (
                <TouchableOpacity
                  key={moto.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setMotoSeleccionadaId(moto.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
        ) : errorCarga ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorCarga}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={cargarEstadisticas}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* GRÁFICA 1: KILÓMETROS POR MES */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="speedometer-outline" size={20} color={theme.primary} />
                <Text style={styles.cardTitle}>Distancia Recorrida (Km/Mes)</Text>
              </View>
              <View style={styles.chartContainer}>
                {hayKilometros ? (
                  <BarChart
                    data={barData}
                    barWidth={28}
                    initialSpacing={10}
                    spacing={14}
                    barBorderRadius={6}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor={theme.border}
                    yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
                    noOfSections={4}
                    isAnimated
                  />
                ) : (
                  <Text style={styles.emptyText}>
                    Aún no tienes kilómetros registrados. Registra una rodada para ver tu progreso.
                  </Text>
                )}
              </View>
            </View>

            {/* GRÁFICA 2: GASTOS DE OPERACIÓN */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="wallet-outline" size={20} color="#10b981" />
                <Text style={styles.cardTitle}>Inversión & Gastos ($ MXN)</Text>
              </View>

              {totalGastos === 0 ? (
                <Text style={styles.emptyText}>No hay gastos registrados para los filtros seleccionados.</Text>
              ) : (
                <View style={styles.pieRow}>
                  <PieChart
                    data={pieData}
                    donut
                    sectionAutoFocus
                    radius={65}
                    innerRadius={45}
                    innerCircleColor={theme.card}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.textPrimary }}>
                          ${totalGastos.toLocaleString('es-MX')}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.textSecondary }}>Total</Text>
                      </View>
                    )}
                  />
                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                      <Text style={styles.legendText}>Rutas: ${gastosData.rutas.toLocaleString('es-MX')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                      <Text style={styles.legendText}>Taller: ${gastosData.mantenimiento.toLocaleString('es-MX')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* GRÁFICA 3: TERRENOS RECORRIDOS */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="map-outline" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Terrenos más Frecuentados</Text>
              </View>

              {terrenosData.length === 0 ? (
                <Text style={styles.emptyText}>Registra rodadas para ver analítica de ruta.</Text>
              ) : (
                <View style={styles.terrenosList}>
                  {terrenosData.map((item, idx) => (
                    <View key={idx} style={styles.terrenoItem}>
                      <Text style={styles.terrenoNombre}>{item.terreno}</Text>
                      <View style={styles.badgeCount}>
                        <Text style={styles.badgeCountText}>{item.total} rodada(s)</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    btnBack: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
    content: { padding: 20, paddingBottom: 40 },
    filtroSection: { marginBottom: 16 },
    filtroLabel: { fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '600' },
    filtroScroll: { gap: 8 },
    chip: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 13, color: theme.textPrimary, fontWeight: '600' },
    chipTextActive: { color: '#ffffff' },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
    chartContainer: { alignItems: 'center', paddingVertical: 10 },
    emptyText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 12 },
    errorText: { color: theme.dangerText, fontSize: 13, textAlign: 'center', marginVertical: 12 },
    errorContainer: { alignItems: 'center', marginTop: 24 },
    retryButton: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 9,
    },
    retryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
    pieRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8 },
    legendContainer: { gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, color: theme.textPrimary, fontWeight: '600' },
    terrenosList: { gap: 8 },
    terrenoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    terrenoNombre: { fontSize: 14, color: theme.textPrimary, fontWeight: '600' },
    badgeCount: { backgroundColor: `${theme.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeCountText: { fontSize: 12, color: theme.primary, fontWeight: '700' },
  });