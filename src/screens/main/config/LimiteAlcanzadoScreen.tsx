
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../assets/theme/ThemeContext';

export default function LimiteAlcanzadoScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Recibimos la función para ignorar el límite temporalmente si la envían por params
  const onIgnorar = route.params?.onIgnorar;

  useEffect(() => {
    // Bloquear el botón "Atrás" en Android
    const backAction = () => true; // Devuelve true para prevenir la acción por defecto
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const handleIgnorar = () => {
    if (onIgnorar) onIgnorar();
    // Redirige al inicio o a la vista principal
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }], // Cambia 'Home' por el nombre de tu pantalla principal
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* ICONO Y SÍMBOLO */}
        <View style={styles.iconCircle}>
          <Ionicons name="bicycle-outline" size={64} color={theme.primary} />
        </View>

        <Text style={styles.titulo}>¡Límite Diario Alcanzado!</Text>
        <Text style={styles.subtitulo}>
          Tiempo de rodar 🏍️{"\n"}Has cumplido la cuota de tiempo que te propusiste para hoy.
        </Text>

        <View style={styles.badgeTiempo}>
          <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
          <Text style={styles.badgeText}>Meta de uso completada</Text>
        </View>

        {/* BOTÓN DE EMERGENCIA / DESCANSO */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleIgnorar}>
          <Text style={styles.primaryBtnText}>Ignorar límite por hoy</Text>
        </TouchableOpacity>

        <Text style={styles.notaEmergencia}>
          Usa esta opción solo en caso de emergencia o diagnóstico de tu moto.
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0px 10px 25px rgba(0,0,0,0.1)' }
    }),
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primary + '15', // Color primario con opacidad
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  badgeTiempo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notaEmergencia: {
    fontSize: 12,
    color: theme.iconSecondary,
    textAlign: 'center',
    marginTop: 14,
  },
});