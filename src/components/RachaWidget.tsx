import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../assets/theme/ThemeContext'; // Ajusta la ruta según tu proyecto

// Definimos el componente animado de Ionicons
const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

export type RachaEstado = 'pendiente' | 'completado' | 'en_riesgo';

interface RachaWidgetProps {
  rachaDias: number;
  estado: RachaEstado;
  onPress: () => void;
}

export const RachaWidget: React.FC<RachaWidgetProps> = ({ rachaDias, estado, onPress }) => {
  const { theme } = useTheme();
  
  // Valor compartido para la animación de escala (pulso)
  const scale = useSharedValue(1);

  useEffect(() => {
    if (estado === 'en_riesgo' || estado === 'completado') {
      // Animación infinita de latido/pulso
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // -1 significa repetición infinita
        true // reverse
      );
    } else {
      // Detener animación si está pendiente
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [estado]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Configuración visual dinámica según el estado
  const getConfig = () => {
    switch (estado) {
      case 'completado':
        return {
          iconColor: '#FF5722', // Naranja fuego
          borderColor: '#FF5722',
          borderStyle: 'solid' as const,
          bgColor: 'rgba(255, 87, 34, 0.1)',
          title: '¡Racha al día! 🔥',
          subtitle: `${rachaDias} días seguidos`,
          icon: 'flame' as const,
        };
      case 'en_riesgo':
        return {
          iconColor: '#FFC107', // Amarillo alerta
          borderColor: '#FFC107',
          borderStyle: 'solid' as const,
          bgColor: 'rgba(255, 193, 7, 0.1)',
          title: '¡Tu racha está en riesgo!',
          subtitle: `Salva tus ${rachaDias} días ahora`,
          icon: 'flame' as const,
        };
      case 'pendiente':
      default:
        return {
          iconColor: theme.iconPrimary || '#888',
          borderColor: theme.border || '#ccc',
          borderStyle: 'dashed' as const,
          bgColor: theme.card || '#fff',
          title: '¡Haz tu Check-in hoy!',
          subtitle: `Racha actual: ${rachaDias} días`,
          icon: 'flame-outline' as const,
        };
    }
  };

  const config = getConfig();

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          borderStyle: config.borderStyle,
        }
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {config.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {config.subtitle}
          </Text>
        </View>

        <AnimatedIcon 
          name={config.icon} 
          size={36} 
          color={config.iconColor} 
          style={animatedIconStyle} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginVertical: 10,
    elevation: 2, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
});