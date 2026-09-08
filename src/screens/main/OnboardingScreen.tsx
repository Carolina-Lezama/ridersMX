import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Animated, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DATA } from '../../constants/onboardingData';
import Paginator from '../../components/Paginator'; 

export default function OnboardingScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);

  // Detecta el cambio cuando el usuario desliza arrastrando manualmente
  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const newIdx = viewableItems[0].index;
      console.log(`[Scroll Manual Detectado] Índice actual: ${newIdx}`);
      setCurrentIndex(newIdx);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // CORREGIDO: Forzamos la actualización de estado en el botón Siguiente/Empezar
  const scrollTo = async () => {
    console.log(`[Clic Siguiente] Índice actual: ${currentIndex}`);

    if (currentIndex < ONBOARDING_DATA.length - 1) {
      const nextIndex = currentIndex + 1;
      console.log(`[Acción] Moviendo a índice: ${nextIndex}`);
      
      // 1. Actualizamos el estado directamente
      setCurrentIndex(nextIndex);

      // 2. Desplazamos la vista
      slidesRef.current?.scrollToOffset({ 
        offset: nextIndex * width, 
        animated: true 
      });
    } else {
      console.log('[Acción] ¡Empezar presionado! Guardando sesión...');
      try {
        await AsyncStorage.setItem('@ya_vio_onboarding', 'true');
        navigation.replace('Login'); 
      } catch (error) {
        console.error('[Error AsyncStorage]:', error);
      }
    }
  };

  // CORREGIDO: Forzamos la actualización de estado al presionar Saltar
  const skipToLast = () => {
    const lastIndex = ONBOARDING_DATA.length - 1;
    console.log(`[Clic Saltar] Llevando directamente al último índice (${lastIndex})`);
    
    // 1. Actualizamos el estado para cambiar la interfaz y botones al instante
    setCurrentIndex(lastIndex);

    // 2. Desplazamos la vista hasta el final
    slidesRef.current?.scrollToOffset({ 
      offset: lastIndex * width, 
      animated: true 
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={styles.imagePlaceholder}>
          <Image 
            source={item.image} 
            style={{ width: '80%', height: '80%', resizeMode: 'contain' }}
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
      
      <View style={{ flex: 3 }}>
        <FlatList
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          // Clave para optimizar el calculo de posiciones exactas en Web/Móvil
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
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

      <View style={styles.footerContainer}>
        
        <Paginator data={ONBOARDING_DATA} scrollX={scrollX} />

        <View style={styles.buttonRow}>
          {currentIndex !== ONBOARDING_DATA.length - 1 ? (
            <TouchableOpacity style={styles.skipButton} onPress={skipToLast}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipButtonPlaceholder} />
          )}

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
  footerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    width: 70,
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