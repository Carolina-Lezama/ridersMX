import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';

export default function Paginator({ data, scrollX }: any) {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      {data.map((_: any, i: number) => {
        // Calculamos el rango de entrada basándonos en el ancho de la pantalla
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        // Animamos el ancho: el punto activo medirá 20, los inactivos 10
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

        return (
          <Animated.View
            style={[styles.dot, { width: dotWidth, opacity }]}
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
    backgroundColor: '#007bff', // Azul principal
    marginHorizontal: 8,
  },
});