import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';

export default function AyudaScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      
      {/* HEADER CON BOTÓN DE REGRESO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Ayuda</Text>
        <View style={{ width: 28 }} /> {/* Espaciador invisible para centrar el título */}
      </View>

      {/* CONTENIDO CENTRAL (ESTADO VACÍO TEMPORAL) */}
      <View style={styles.content}>
        {/* Cambia el nombre del icono según la pantalla (ej. pulse-outline, chatbubbles-outline) */}
        <Ionicons name="build-outline" size={80} color={theme.iconSecondary} />
        <Text style={styles.mensaje}>Sección en construcción</Text>
        <Text style={styles.subMensaje}>Pronto podrás gestionar esto aquí.</Text>
      </View>

    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 60, // Margen para la barra de estado del celular
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  mensaje: { fontSize: 22, fontWeight: 'bold', color: theme.textSecondary, marginTop: 20 },
  subMensaje: { fontSize: 16, color: theme.iconSecondary, marginTop: 10, textAlign: 'center' }
});