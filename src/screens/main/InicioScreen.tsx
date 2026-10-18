import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { RachaWidget } from '../../components/RachaWidget'; 
import { QuizModal, type PreguntaQuiz } from '../../components/QuizModal';
import PostRideReviewModal from '../../components/PostRideReviewModal';
import DashboardEmptyState from '../../components/DashboardEmptyState';
import { getPreguntaDelDia } from '../../services/quizService';
import { supabase } from '../../services/supabase';
import { obtenerEventoPendiente, obtenerTotalKilometros } from '../../services/reviewService';
import { useStreak } from '../../utils/hooks/useStreak';
import Skeleton from '../../components/Skeleton';

interface DashboardMoto {
  marca: string;
  modelo: string;
  anio: number | null;
  placas: string | null;
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
              .select('marca, modelo, anio, placas')
              .eq('perfil_id', uid)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle(),
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
          setMotoPrincipal(motoResult.data);
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

  const handleOpenQuiz = () => {
    setQuizVisible(true);
  };

  const handleReviewSuccess = async () => {
    if (userId) {
      await cargarEventoPendiente(userId);
    }
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
        onPress={handleOpenQuiz} 
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
        <View style={styles.cardCardLarge}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.bikeInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#3b82f615' }]}>
                <Ionicons name="bicycle-outline" size={26} color="#3b82f6" />
              </View>
              <View style={styles.bikeText}>
                <Text style={styles.cardTitle}>{motoPrincipal.marca} {motoPrincipal.modelo}</Text>
                <Text style={styles.cardSubtitle}>
                  {motoPrincipal.anio ? `${motoPrincipal.anio} · ` : ''}
                  {motoPrincipal.placas || 'Tu moto registrada'}
                </Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#10b981" />
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Ionicons name="speedometer-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.metricValue}>{kilometrosTotales.toLocaleString('es-MX')} km</Text>
              <Text style={styles.metricLabel}>Kilometraje registrado</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.metricItem}>
              <Ionicons name="build-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.metricValue}>{kilometrosTotales >= 1000 ? '¡Logro!' : `${Math.max(0, 1000 - kilometrosTotales)} km`}</Text>
              <Text style={styles.metricLabel}>{kilometrosTotales >= 1000 ? 'Meta de 1,000 km' : 'Para los 1,000 km'}</Text>
            </View>
          </View>
        </View>
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
          accentColor="#f59e0b"
        />
      ) : (
        <View style={styles.progressCard}>
          <View style={[styles.badgeIcon, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="map-outline" size={26} color="#10b981" />
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
              <View style={[styles.smallIcon, { backgroundColor: '#ef444415' }]}>
                <Ionicons name="build-outline" size={20} color="#ef4444" />
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
          accentColor="#ef4444"
        />
      )}

      {/* Espaciado inferior para la barra de navegación */}
      <View style={{ height: 40 }} />
    </ScrollView>
    <QuizModal
      visible={quizVisible}
      preguntaData={preguntaDiaria}
      onClose={() => setQuizVisible(false)}
      onCompletarCheckIn={(esCorrecta) => {
        if (esCorrecta) {
          realizarCheckIn();
        }
      }}
    />

    <PostRideReviewModal
      visible={reviewVisible}
      evento={eventoPendiente}
      onClose={() => setReviewVisible(false)}
      onSuccess={handleReviewSuccess}
    />
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
    backgroundColor: '#ef4444'
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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