import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext'; // Ajusta la ruta según tu proyecto

interface RachaWidgetProps {
  diasRacha: number;
  comodines: number;
  completadoHoy: boolean;
  rachaSalvada: boolean;
  onPress: () => void;
  loading?: boolean;
}

export const RachaWidget: React.FC<RachaWidgetProps> = ({
  diasRacha,
  comodines,
  completadoHoy,
  rachaSalvada,
  onPress,
  loading = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.card,
        completadoHoy && styles.cardCompletado,
        rachaSalvada && styles.cardSalvado,
        loading && styles.cardLoading,
      ]}
      onPress={onPress}
      disabled={completadoHoy || loading}
    >
      <View style={styles.contentLeft}>
        <View style={[styles.iconContainer, completadoHoy && styles.iconCompletado]}>
          <Text style={styles.llamaIcon}>{loading ? '…' : completadoHoy ? '🔥' : '⚡'}</Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.rachaHeader}>
            <Text style={styles.diasTexto}>{diasRacha} días en racha</Text>
            <View style={styles.badgeComodines}>
              <Text style={styles.comodinesTexto}>❄️ {comodines}/2</Text>
            </View>
          </View>

          {loading ? (
            <Text style={styles.subtextoPendiente}>Cargando tu racha...</Text>
          ) : rachaSalvada ? (
            <Text style={styles.subtextoSalvado}>
              ¡Ayer faltaste! Tu racha fue salvada con ❄️
            </Text>
          ) : completadoHoy ? (
            <Text style={styles.subtextoCompletado}>Check-in de hoy completado</Text>
          ) : (
            <Text style={styles.subtextoPendiente}>
              Responde el Quiz Diario para mantener tu racha
            </Text>
          )}
        </View>
      </View>

      <Ionicons
        name={completadoHoy ? 'checkmark-circle' : 'chevron-forward'}
        size={22}
        color={completadoHoy ? '#10b981' : theme.textSecondary}
      />
    </TouchableOpacity>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      marginHorizontal: 16,
      marginVertical: 10,
    },
    cardLoading: {
      opacity: 0.65,
    },
    cardCompletado: {
      borderColor: '#10b98140',
      backgroundColor: '#10b9810a',
    },
    cardSalvado: {
      borderColor: '#3b82f660',
      backgroundColor: '#3b82f60d',
    },
    contentLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    iconContainer: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: '#ff572218',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCompletado: {
      backgroundColor: '#10b98118',
    },
    llamaIcon: {
      fontSize: 24,
    },
    infoContainer: {
      flex: 1,
      gap: 4,
    },
    rachaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    diasTexto: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    badgeComodines: {
      backgroundColor: '#3b82f618',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#3b82f630',
    },
    comodinesTexto: {
      fontSize: 11,
      fontWeight: '700',
      color: '#2563eb',
    },
    subtextoPendiente: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    subtextoCompletado: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10b981',
    },
    subtextoSalvado: {
      fontSize: 12,
      fontWeight: '600',
      color: '#2563eb',
    },
  });