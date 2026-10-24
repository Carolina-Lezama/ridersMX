import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext'; // Ajusta la ruta según tu proyecto
import Skeleton from './Skeleton';

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
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <>
          <View style={styles.contentLeft}>
            <Skeleton width={46} height={46} borderRadius={14} />
            <View style={styles.infoContainer}>
              <Skeleton width={150} height={16} />
              <Skeleton width={190} height={12} />
            </View>
          </View>
          <Skeleton width={22} height={22} borderRadius={11} />
        </>
      ) : (
        <>
          <View style={styles.contentLeft}>
            <View style={[styles.iconContainer, completadoHoy && styles.iconCompletado]}>
              <Text style={styles.llamaIcon}>{completadoHoy ? '🔥' : '⚡'}</Text>
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.rachaHeader}>
                <Text style={styles.diasTexto}>{diasRacha} días en racha</Text>
                <View style={styles.badgeComodines}>
                  <Text style={styles.comodinesTexto}>❄️ {comodines}/2</Text>
                </View>
              </View>

              {rachaSalvada ? (
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
            name={completadoHoy ? 'calendar-outline' : 'chevron-forward'}
            size={22}
            color={completadoHoy ? theme.successText : theme.textSecondary}
          />
        </>
      )}
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
    cardCompletado: {
      borderColor: `${theme.successText}40`,
      backgroundColor: `${theme.successText}0a`,
    },
    cardSalvado: {
      borderColor: `${theme.primary}60`,
      backgroundColor: `${theme.primary}0d`,
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
      backgroundColor: `${theme.accent}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCompletado: {
      backgroundColor: `${theme.successText}18`,
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
      backgroundColor: `${theme.primary}18`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.primary}30`,
    },
    comodinesTexto: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    subtextoPendiente: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    subtextoCompletado: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.successText,
    },
    subtextoSalvado: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
  });