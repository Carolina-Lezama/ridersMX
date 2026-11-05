import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { RachaWidget } from '../../components/RachaWidget'; 
import { RachaCalendarModal } from '../../components/RachaCalendarModal';
import { QuizModal, type PreguntaQuiz } from '../../components/QuizModal';
import PostRideReviewModal from '../../components/PostRideReviewModal';
import DashboardEmptyState from '../../components/DashboardEmptyState';
import { getPreguntaDelDia } from '../../services/quizService';
import { supabase } from '../../services/supabase';
import { obtenerEventoPendiente, obtenerTotalKilometros } from '../../services/reviewService';
import { clearSelectedMotorcycleId, getSelectedMotorcycleId, setSelectedMotorcycleId } from '../../services/motorcycleSelectionService';
import { useStreak } from '../../utils/hooks/useStreak';
import Skeleton from '../../components/Skeleton';

interface DashboardMoto {
  id: string;
  alias: string | null;
  marca: string;
  modelo: string;
  anio: number | null;
  placas: string | null;
  kilometraje_actual: number | null;
}

interface DashboardMaintenance {
  titulo: string;
  fecha: string;
}

export default function InicioScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [userId, setUserId] = useState<string>();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [motoPrincipal, setMotoPrincipal] = useState<DashboardMoto | null>(null);
  const [proximoMantenimiento, setProximoMantenimiento] = useState<DashboardMaintenance | null>(null);

  const {
    loading: cargandoRacha,
    diasRacha,
    comodines,
    completadoHoy,
    rachaSalvadaRecientemente,
    realizarCheckIn,
  } = useStreak(userId);

  const [quizVisible, setQuizVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [eventoPendiente, setEventoPendiente] = useState<any>(null);
  const [kilometrosTotales, setKilometrosTotales] = useState(0);
  const [preguntaDiaria, setPreguntaDiaria] = useState<PreguntaQuiz | undefined>();
  const [calendarioRachaVisible, setCalendarioRachaVisible] = useState(false);

  const [motos, setMotos] = useState<DashboardMoto[]>([]);
  const [selectorMotosVisible, setSelectorMotosVisible] = useState(false);

  const cargarEventoPendiente = useCallback(async (uid?: string) => {
    if (!uid) {
      setEventoPendiente(null);
      return;
    }

    try {
      const evento = await obtenerEventoPendiente(uid);
      setEventoPendiente(evento);
      setReviewVisible(Boolean(evento));

      const totalKm = await obtenerTotalKilometros(uid);
      setKilometrosTotales(totalKm);
    } catch (error) {
      console.error('Error cargando evento pendiente:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const cargarUsuario = async () => {
        setLoadingDashboard(true);
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (!activo) return;
          const uid = session?.user.id;
          setUserId(uid);
          if (!uid) return;

          const { data, error: perfilError } = await supabase
            .from('perfiles')
            .select('nombre_completo, username')
            .eq('id', uid)
            .single();

          if (perfilError) throw perfilError;
          if (activo) {
            setNombreUsuario(data.nombre_completo?.trim() || data.username?.trim() || '');
          }

          const hoy = new Date();
          const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
          const [motoResult, mantenimientoResult] = await Promise.all([
            supabase
              .from('motocicletas')
              .select('id, alias, marca, modelo, anio, placas, kilometraje_actual')
              .eq('perfil_id', uid)
              .order('created_at', { ascending: true }),
            supabase
              .from('eventos')
              .select('titulo, fecha')
              .eq('perfil_id', uid)
              .eq('tipo', 'mantenimiento')
              .gte('fecha', fechaHoy)
              .order('fecha', { ascending: true })
              .limit(1)
              .maybeSingle(),
          ]);

          if (motoResult.error) throw motoResult.error;
          if (mantenimientoResult.error) throw mantenimientoResult.error;
          if (!activo) return;
          const motosData = motoResult.data ?? [];
          setMotos(motosData);
          const selectedMotorcycleId = await getSelectedMotorcycleId(uid);
          const motoSeleccionada = motosData.find((moto) => moto.id === selectedMotorcycleId) ?? motosData[0] ?? null;
          setMotoPrincipal(motoSeleccionada);
          if (motoSeleccionada && motoSeleccionada.id !== selectedMotorcycleId) {
            await setSelectedMotorcycleId(uid, motoSeleccionada.id);
          } else if (!motoSeleccionada && selectedMotorcycleId) {
            await clearSelectedMotorcycleId(uid);
          }
          setProximoMantenimiento(mantenimientoResult.data);

          await cargarEventoPendiente(uid);
        } catch (error) {
          if (activo) {
            Alert.alert(
              'Error al cargar el Dashboard',
              error instanceof Error ? error.message : 'No se pudo obtener el perfil del usuario.',
            );
          }
        } finally {
          if (activo) setLoadingDashboard(false);
        }
      };

      void cargarUsuario();
      return () => {
        activo = false;
      };
    }, []),
  );
  
  useEffect(() => {
    const pregunta = getPreguntaDelDia();
    setPreguntaDiaria(pregunta);
  }, []);

  const handleRachaPress = () => {
    if (completadoHoy) {
      setCalendarioRachaVisible(true);
    } else {
      setQuizVisible(true);
    }
  };

  const handleReviewSuccess = async () => {
    if (userId) {
      await cargarEventoPendiente(userId);
    }
  };

  const seleccionarMotoPrincipal = async (moto: DashboardMoto) => {
    if (!userId) {
      throw new Error('No se pudo identificar tu cuenta para guardar la moto principal.');
    }

    await setSelectedMotorcycleId(userId, moto.id);
    setMotoPrincipal(moto);
    setSelectorMotosVisible(false);
  };

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* 1. ENCABEZADO */}
      <View style={styles.header}>
        <View>
          {loadingDashboard ? (
            <>
              <Skeleton width={190} height={31} />
              <Skeleton width={170} height={15} style={{ marginTop: 7 }} />
            </>
          ) : (
            <>
              <Text style={styles.saludo}>Hola{nombreUsuario ? `, ${nombreUsuario}` : ''} 👋</Text>
              <Text style={styles.info}>Tu garaje digital está activo</Text>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.btnNotificacion}>
          <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
          <View style={styles.badgeNotificacion} />
        </TouchableOpacity>
      </View>

      {/* 2. SECCIÓN: RACHA DIARIA (Widget Interactivo) */}
      <RachaWidget 
        loading={cargandoRacha}
        diasRacha={diasRacha}
        comodines={comodines}
        completadoHoy={completadoHoy}
        rachaSalvada={rachaSalvadaRecientemente}
        onPress={handleRachaPress}
      />

      {/* 3. SECCIÓN: RESUMEN DE TU MOTO / GARAJE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Estado de tu Moto</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MisMotos')}>
          <Text style={styles.sectionLink}>Ver Garaje</Text>
        </TouchableOpacity>
      </View>

      {loadingDashboard ? (
        <View style={styles.loadingCard} accessible={false}>
          <Skeleton width={190} height={20} />
          <Skeleton width="80%" height={14} style={{ marginTop: 10 }} />
          <Skeleton width="55%" height={14} style={{ marginTop: 8 }} />
        </View>
      ) : motoPrincipal ? (
        <TouchableOpacity
          style={styles.cardCardLarge}
          activeOpacity={0.8}
          onPress={() => motos.length > 1 ? setSelectorMotosVisible(true) : navigation.navigate('MisMotos')}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.bikeInfo}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="bicycle-outline" size={26} color={theme.primary} />
              </View>
              <View style={styles.bikeText}>
                <Text style={styles.cardTitle}>
                  {motoPrincipal.alias || `${motoPrincipal.marca} ${motoPrincipal.modelo}`}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {motoPrincipal.anio ? `${motoPrincipal.anio} · ` : ''}
                  {motoPrincipal.placas || 'Tu moto registrada'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={motos.length > 1 ? 'swap-vertical' : 'checkmark-circle'}
              size={22}
              color={motos.length > 1 ? theme.primary : theme.successText}
            />
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Ionicons name="speedometer-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.metricValue}>
                {(motoPrincipal.kilometraje_actual ?? 0).toLocaleString('es-MX')} km
              </Text>
              <Text style={styles.metricLabel}>Kilometraje actual</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.metricItem}>
              <Ionicons name="build-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.metricValue}>
                {(motoPrincipal.kilometraje_actual ?? 0) >= 1000
                  ? '¡Logro!'
                  : `${Math.max(0, 1000 - (motoPrincipal.kilometraje_actual ?? 0))} km`}
              </Text>
              <Text style={styles.metricLabel}>
                {(motoPrincipal.kilometraje_actual ?? 0) >= 1000
                  ? 'Meta de 1,000 km'
                  : 'Para los 1,000 km'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <DashboardEmptyState
          icon="bicycle-outline"
          title="Tu próxima aventura empieza aquí"
          description="Registra tu moto para tener a la mano sus datos, recorridos y próximos servicios."
          actionLabel="Agregar mi primera moto"
          onAction={() => navigation.navigate('MotoForm')}
        />
      )}

      {/* 4. SECCIÓN: INSIGNIAS Y LOGROS (Fila horizontal de preview) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tus Logros</Text>
      </View>

      {loadingDashboard ? (
        <View style={styles.loadingCard} accessible={false}>
          <Skeleton width={150} height={18} />
          <Skeleton width="70%" height={14} style={{ marginTop: 10 }} />
        </View>
      ) : kilometrosTotales === 0 ? (
        <DashboardEmptyState
          icon="flag-outline"
          title="Tu primer logro está a una rodada"
          description="Agenda una salida y registra tus kilómetros para empezar a construir tu historial."
          actionLabel="Agendar mi primera rodada"
          onAction={() => navigation.navigate('EventoForm', { tipo: 'rodada' })}
          accentColor={theme.warningText}
        />
      ) : (
        <View style={styles.progressCard}>
          <View style={[styles.badgeIcon, { backgroundColor: `${theme.successText}15` }]}>
            <Ionicons name="map-outline" size={26} color={theme.successText} />
          </View>
          <View style={styles.progressText}>
            <Text style={styles.cardTitle}>{kilometrosTotales.toLocaleString('es-MX')} km en ruta</Text>
            <Text style={styles.cardSubtitle}>Cada rodada suma a tu historial y a tus próximos logros.</Text>
          </View>
        </View>
      )}

      {/* 5. SECCIÓN: MANTENIMIENTO PREVENTIVO Y ALERTAS */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mantenimiento Preventivo</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Calendario')}>
          <Text style={styles.sectionLink}>Ver agenda</Text>
        </TouchableOpacity>
      </View>
      {loadingDashboard ? (
        <View style={styles.loadingCard} accessible={false}>
          <Skeleton width={190} height={18} />
          <Skeleton width="75%" height={14} style={{ marginTop: 10 }} />
        </View>
      ) : proximoMantenimiento ? (
        <View style={styles.mantenimientoCard}>
          <View style={styles.mantenimientoRow}>
            <View style={styles.mantenimientoLeft}>
              <View style={[styles.smallIcon, { backgroundColor: `${theme.dangerText}15` }]}>
                <Ionicons name="build-outline" size={20} color={theme.dangerText} />
              </View>
              <View style={styles.maintenanceText}>
                <Text style={styles.mantenimientoTitle}>{proximoMantenimiento.titulo}</Text>
                <Text style={styles.mantenimientoSub}>
                  {new Date(`${proximoMantenimiento.fecha}T00:00:00`).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>
            </View>
            <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
          </View>
        </View>
      ) : (
        <DashboardEmptyState
          icon="build-outline"
          title="Tu moto también merece cuidados"
          description="Agenda un servicio preventivo para tenerlo presente y mantener tu moto lista para rodar."
          actionLabel="Agendar mantenimiento"
          onAction={() => navigation.navigate('EventoForm', { tipo: 'mantenimiento' })}
          accentColor={theme.dangerText}
        />
      )}

{/* En InicioScreen.tsx */}
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Estado de tu Moto</Text>
  <View style={{ flexDirection: 'row', gap: 12 }}>
    <TouchableOpacity onPress={() => navigation.navigate('Estadisticas')}>
      <Text style={[styles.sectionLink, { color: theme.primary }]}>Ver Gráficas</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => navigation.navigate('MisMotos')}>
      <Text style={styles.sectionLink}>Ver Garaje</Text>
    </TouchableOpacity>
  </View>
</View>

<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Insignias</Text>
  <TouchableOpacity onPress={() => navigation.navigate('Insignias')}>
    <Text style={[styles.sectionLink, { color: theme.primary }]}>Ver insignias</Text>
  </TouchableOpacity>
</View>

      {/* Espaciado inferior para la barra de navegación */}
      <View style={{ height: 40 }} />
    </ScrollView>
    <QuizModal
      visible={quizVisible}
      preguntaData={preguntaDiaria}
      onClose={() => setQuizVisible(false)}
      onCompletarCheckIn={(esCorrecta) => {
        if (esCorrecta) {
          void realizarCheckIn().catch((error) => {
            Alert.alert(
              'No se pudo sincronizar tu racha',
              error instanceof Error
                ? error.message
                : 'Inténtalo de nuevo para guardar el check-in.',
            );
          });
        }
      }}
    />

    <RachaCalendarModal
      visible={calendarioRachaVisible}
      userId={userId}
      onClose={() => setCalendarioRachaVisible(false)}
    />

    <PostRideReviewModal
      visible={reviewVisible}
      evento={eventoPendiente}
      onClose={() => setReviewVisible(false)}
      onSuccess={handleReviewSuccess}
    />
    <Modal
      visible={selectorMotosVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setSelectorMotosVisible(false)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            maxHeight: '60%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.textPrimary }}>
              Elige tu moto principal
            </Text>
            <TouchableOpacity
              onPress={() => setSelectorMotosVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector de motos"
            >
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {motos.map((item) => {
              const isSelected = item.id === motoPrincipal?.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.border,
                      marginBottom: 12,
                    },
                    isSelected && {
                      borderColor: theme.primary,
                      backgroundColor: `${theme.primary}10`,
                    },
                  ]}
                  onPress={() => {
                    void seleccionarMotoPrincipal(item).catch((error) => {
                      Alert.alert(
                        'No se pudo guardar la moto principal',
                        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
                      );
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={{
                      backgroundColor: isSelected ? theme.primary : theme.background,
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="bicycle" size={22} color={isSelected ? theme.onPrimary : theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: isSelected ? theme.primary : theme.textPrimary }}>
                      {item.alias || `${item.marca} ${item.modelo}`}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      {(item.kilometraje_actual ?? 0).toLocaleString('es-MX')} km registrados
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background, 
    paddingHorizontal: 20 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 60, 
    marginBottom: 15 
  },
  saludo: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: theme.textPrimary 
  },
  info: { 
    fontSize: 14, 
    color: theme.textSecondary, 
    marginTop: 2 
  },
  btnNotificacion: {
    backgroundColor: theme.card, 
    padding: 10, 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    position: 'relative'
  },
  badgeNotificacion: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.dangerText
  },

  // Titles & Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: theme.textPrimary,
    marginTop: 15,
    marginBottom: 12
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
    marginTop: 15
  },

  // Card Estado de Moto (Large)
  cardCardLarge: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      web: { boxShadow: `0px 4px 8px ${theme.shadow}08` },
      default: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  bikeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  bikeText: { flex: 1 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.textSecondary
  },
  loadingCard: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center'
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 2
  },
  metricLabel: {
    fontSize: 11,
    color: theme.textSecondary
  },
  dividerVertical: {
    width: 1,
    height: '70%',
    backgroundColor: theme.border
  },

  progressCard: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  progressText: { flex: 1 },
  maintenanceText: { flex: 1 },
  // Logros / Insignias
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Mantenimiento Card
  mantenimientoCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border
  },
  mantenimientoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mantenimientoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  smallIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mantenimientoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary
  },
  mantenimientoSub: {
    fontSize: 12,
    color: theme.textSecondary
  },
});