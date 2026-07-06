import React, { useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Animated } from 'react-native';
import { ONBOARDING_DATA } from '../../constants/onboardingData'; // Ajusta la ruta según tu proyecto

export default function OnboardingScreen() {
  // useWindowDimensions nos da el ancho exacto de la pantalla del dispositivo
  const { width } = useWindowDimensions(); 
  
  // useRef para rastrear la posición del scroll y usarla en animaciones futuras
  const scrollX = useRef(new Animated.Value(0)).current;

  // Referencia al FlatList para poder controlarlo mediante botones después
  const slidesRef = useRef(null);

  // Este evento se dispara cada vez que el usuario hace scroll
  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    // Aquí podríamos guardar el índice de la pantalla actual más adelante
    // console.log("Pantalla actual:", viewableItems[0]?.index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Este componente define cómo se ve CADA página del carrusel por separado
  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        {/* Usamos el color de fondo definido en los datos temporales para distinguir las pantallas */}
        <View style={[styles.imagePlaceholder, { backgroundColor: item.backgroundColor }]}>
          <Text style={styles.placeholderText}>Aquí irá la imagen o Lottie de: {item.image}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* FlatList es el motor principal de nuestro carrusel */}
      <FlatList
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled // Esto es la magia: hace que se detenga exactamente en cada pantalla
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false } // Lo ponemos en false porque luego animaremos el ancho o color de los puntitos
        )}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imagePlaceholder: {
    width: '100%',
    flex: 0.6, // Ocupa el 60% de la pantalla para darle protagonismo a la imagen
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 30,
  },
  placeholderText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  textContainer: {
    flex: 0.4, // El texto ocupa el 40% restante
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 10,
    color: '#0f172a',
    textAlign: 'center',
  },
  description: {
    fontWeight: '400',
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
});