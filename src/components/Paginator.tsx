import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useTheme } from '../../assets/theme/ThemeContext';

interface Props {
  data: unknown[];
  scrollX: Animated.Value;
}

export default function Paginator({ data, scrollX }: Props) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {data.map((_, i) => {
        // Calculamos el rango de entrada basándonos en el ancho de la pantalla
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        // Interpolamos tamaño, opacidad y color según el desplazamiento actual.
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [10, 20, 10],
          extrapolate: 'clamp',
        });

        // Animamos la opacidad: el punto activo es 100% visible, los demás al 30%
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        const backgroundColor = scrollX.interpolate({
          inputRange,
          outputRange: [theme.border, theme.primary, theme.border],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            style={[styles.dot, { width: dotWidth, opacity, backgroundColor }]}
            key={i.toString()}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 8,
  },
});