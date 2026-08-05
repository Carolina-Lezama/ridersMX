import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Animated, TouchableOpacity, Image } from 'react-native';
import { ONBOARDING_DATA } from '../../constants/onboardingData';
import Paginator from '../../components/Paginator'; // Asegúrate de importar tu nuevo componente

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // NUEVO: Estado para saber en qué página estamos (empezamos en la 0)
  const [currentIndex, setCurrentIndex] = useState(0);

  // ACTUALIZADO: Detectamos qué página está visible en la pantalla
  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // NUEVO: Función para avanzar a la siguiente pantalla
  const scrollTo = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      // Si estamos en la última pantalla, aquí terminamos el onboarding
      console.log('¡Ir al Login!');
    }
  };

  // NUEVO: Función para saltar todo e ir a la última pantalla
  const skipToLast = () => {
    slidesRef.current?.scrollToIndex({ index: ONBOARDING_DATA.length - 1 });
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={styles.imagePlaceholder}>
          <Image 
            source={item.image} 
            style={styles.image} 
          />
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
      
      {/* Contenedor del Carrusel (ocupa el 75% de la pantalla) */}
      <View style={{ flex: 3 }}>
        <FlatList
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={32}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      {/* NUEVO: Controles Inferiores (ocupa el 25% inferior) */}
      <View style={styles.footerContainer}>
        
        <Paginator data={ONBOARDING_DATA} scrollX={scrollX} />

        <View style={styles.buttonRow}>
          {/* Si estamos en la última pantalla, escondemos el botón "Saltar" */}
          {currentIndex !== ONBOARDING_DATA.length - 1 ? (
            <TouchableOpacity style={styles.skipButton} onPress={skipToLast}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipButtonPlaceholder} /> // Mantiene el espacio centrado
          )}

          {/* Botón Principal (Siguiente / Empezar) */}
          <TouchableOpacity style={styles.nextButton} onPress={scrollTo}>
            <Text style={styles.nextButtonText}>
              {currentIndex === ONBOARDING_DATA.length - 1 ? 'Empezar' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imagePlaceholder: {
    width: '100%',
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 0.4,
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
  // --- NUEVOS ESTILOS DEL FOOTER ---
  footerContainer: {
    flex: 1, // Toma el tercio inferior
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40, // Espacio para el home indicator de iOS/Android
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  skipButton: {
    padding: 15,
  },
  skipButtonPlaceholder: {
    width: 70, // Aproximadamente el ancho del botón saltar
  },
  skipText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});