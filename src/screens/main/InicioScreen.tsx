import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { RachaWidget } from '../../components/RachaWidget'; 
import { QuizModal, type PreguntaQuiz } from '../../components/QuizModal';
import { getPreguntaDelDia } from '../../services/quizService';
import { supabase } from '../../services/supabase';
import { useStreak } from '../../utils/hooks/useStreak';


export default function InicioScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [userId, setUserId] = useState<string>();

  const {
    loading: cargandoRacha,
    diasRacha,
    comodines,
    completadoHoy,
    rachaSalvadaRecientemente,
    realizarCheckIn,
  } = useStreak(userId);

  const [quizVisible, setQuizVisible] = useState(false);
  const [preguntaDiaria, setPreguntaDiaria] = useState<PreguntaQuiz | undefined>();

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUserId(session?.user.id);
      } catch (error) {
        Alert.alert(
          'Error al cargar sesión',
          error instanceof Error ? error.message : 'No se pudo obtener la sesión del usuario.',
        );
      }
    };

    void cargarUsuario();
  }, []);
  
  useEffect(() => {
    const pregunta = getPreguntaDelDia();
    setPreguntaDiaria(pregunta);
  }, []);

  const handleOpenQuiz = () => {
    setQuizVisible(true);
  };

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* 1. ENCABEZADO */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>Hola, Carolina 👋</Text>
          <Text style={styles.info}>Tu garaje digital está activo</Text>
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
        <TouchableOpacity>
          <Text style={styles.sectionLink}>Ver Garaje</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardCardLarge}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.bikeInfo}>
            <View style={[styles.iconContainer, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="bicycle-outline" size={26} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Mi Honda CB500F</Text>
              <Text style={styles.cardSubtitle}>Telemetría en tiempo real</Text>
            </View>
          </View>
          <View style={styles.chipStatus}>
            <Text style={styles.chipText}>En orden</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Ionicons name="speedometer-outline" size={18} color={theme.textSecondary} />
            <Text style={styles.metricValue}>12,450 km</Text>
            <Text style={styles.metricLabel}>Kilometraje</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.metricItem}>
            <Ionicons name="build-outline" size={18} color={theme.textSecondary} />
            <Text style={styles.metricValue}>En 550 km</Text>
            <Text style={styles.metricLabel}>Próx. Servicio</Text>
          </View>
        </View>
      </View>

      {/* 4. SECCIÓN: INSIGNIAS Y LOGROS (Fila horizontal de preview) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tus Logros</Text>
        <TouchableOpacity>
          <Text style={styles.sectionLink}>Ver Todas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <View style={styles.badgeCard}>
          <View style={[styles.badgeIcon, { backgroundColor: '#f59e0b15' }]}>
            <Ionicons name="flame" size={28} color="#f59e0b" />
          </View>
          <Text style={styles.badgeName}>Piloto Novato</Text>
          <Text style={styles.badgeDetail}>3 Días Seguidos</Text>
        </View>

        <View style={styles.badgeCard}>
          <View style={[styles.badgeIcon, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="shield-checkmark" size={28} color="#10b981" />
          </View>
          <Text style={styles.badgeName}>Check-in Pro</Text>
          <Text style={styles.badgeDetail}>7 Días Seguidos</Text>
        </View>

        <View style={[styles.badgeCard, styles.badgeCardLocked]}>
          <View style={[styles.badgeIcon, { backgroundColor: '#6b728015' }]}>
            <Ionicons name="lock-closed-outline" size={24} color="#6b7280" />
          </View>
          <Text style={[styles.badgeName, { color: theme.textSecondary }]}>Leyenda</Text>
          <Text style={styles.badgeDetail}>30 Días Seguidos</Text>
        </View>
      </ScrollView>

      {/* 5. SECCIÓN: MANTENIMIENTO PREVENTIVO Y ALERTAS */}
      <Text style={styles.sectionTitle}>Mantenimiento Preventivo</Text>
      <View style={styles.mantenimientoCard}>
        <View style={styles.mantenimientoRow}>
          <View style={styles.mantenimientoLeft}>
            <View style={[styles.smallIcon, { backgroundColor: '#ef444415' }]}>
              <Ionicons name="color-fill-outline" size={20} color="#ef4444" />
            </View>
            <View>
              <Text style={styles.mantenimientoTitle}>Cambio de Aceite</Text>
              <Text style={styles.mantenimientoSub}>Recomendación por tiempo</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnActionSmall}>
            <Text style={styles.btnActionText}>Agendar</Text>
          </TouchableOpacity>
        </View>
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
          realizarCheckIn();
        }
      }}
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
  chipStatus: {
    backgroundColor: '#10b98115',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  chipText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700'
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

  // Logros / Insignias Scroll Horizontal
  horizontalScroll: {
    marginLeft: -20,
    paddingLeft: 20,
    marginBottom: 10
  },
  badgeCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
    width: 130,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border
  },
  badgeCardLocked: {
    opacity: 0.6
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'center'
  },
  badgeDetail: {
    fontSize: 11,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 2
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
  btnActionSmall: {
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  btnActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  }
});