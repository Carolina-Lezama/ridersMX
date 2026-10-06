import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../assets/theme/ThemeContext'; // Ajusta la ruta a tu ThemeContext

export interface PreguntaQuiz {
  id: string;
  categoria: string;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
}

interface QuizModalProps {
  visible: boolean;
  preguntaData?: PreguntaQuiz;
  onClose: () => void;
  onCompletarCheckIn: (esCorrecta: boolean) => void;
}

// Pregunta por defecto de respaldo (Fallback)
const PREGUNTA_DEFAULT: PreguntaQuiz = {
  id: 'q_001',
  categoria: 'Mantenimiento',
  pregunta: '¿Qué indica un color blanquecino o lechoso en el aceite de motor?',
  opciones: [
    'Desgaste normal por kilometraje acumulado',
    'Presencia de agua o anticongelante en el motor',
    'Exceso de aditivo de viscosidad',
    'Falta de uso del vehículo',
  ],
  respuestaCorrecta: 1,
  explicacion:
    'El aspecto lechoso se produce por la emulsión del aceite al mezclarse con líquido refrigerante o condensación excesiva de agua.',
};

export const QuizModal: React.FC<QuizModalProps> = ({
  visible,
  preguntaData = PREGUNTA_DEFAULT,
  onClose,
  onCompletarCheckIn,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [opcionSeleccionada, setOpcionSeleccionada] = useState<number | null>(null);
  const [respondido, setRespondido] = useState<boolean>(false);

  // Reiniciar estado cada vez que se abre el modal
  useEffect(() => {
    if (visible) {
      setOpcionSeleccionada(null);
      setRespondido(false);
    }
  }, [visible]);

  const seleccionarOpcion = (index: number) => {
    if (respondido) return; // Evitar múltiples selecciones

    setOpcionSeleccionada(index);
    setRespondido(true);

    const esCorrecto = index === preguntaData.respuestaCorrecta;

    // Feedback táctil con Expo Haptics
    if (esCorrecto) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleReclamarRacha = () => {
    const esCorrecto = opcionSeleccionada === preguntaData.respuestaCorrecta;
    onCompletarCheckIn(esCorrecto);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* 1. ENCABEZADO */}
          <View style={styles.header}>
            <View style={styles.chipCategoria}>
              <Ionicons name="flash" size={14} color={theme.primary} />
              <Text style={styles.chipTexto}>{preguntaData.categoria}</Text>
            </View>
            <TouchableOpacity style={styles.btnClose} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 2. TARJETA DE PREGUNTA */}
            <Text style={styles.preguntaTexto}>{preguntaData.pregunta}</Text>

            {/* 3. OPCIONES DE RESPUESTA */}
            <View style={styles.opcionesContainer}>
              {preguntaData.opciones.map((opcionText, index) => {
                const esLaCorrecta = index === preguntaData.respuestaCorrecta;
                const fueSeleccionada = opcionSeleccionada === index;

                // Estilos dinámicos según estado de respuesta
                let buttonStyle = styles.opcionBtnReposo;
                let textStyle = styles.opcionTextoReposo;
                let iconName: keyof typeof Ionicons.glyphMap | null = null;
                let iconColor = '';

                if (respondido) {
                  if (esLaCorrecta) {
                    buttonStyle = styles.opcionBtnCorrecta;
                    textStyle = styles.opcionTextoCorrecta;
                    iconName = 'checkmark-circle';
                    iconColor = '#10b981';
                  } else if (fueSeleccionada) {
                    buttonStyle = styles.opcionBtnIncorrecta;
                    textStyle = styles.opcionTextoIncorrecta;
                    iconName = 'close-circle';
                    iconColor = '#ef4444';
                  } else {
                    buttonStyle = styles.opcionBtnAtenuada;
                  }
                }

                return (
                  <Pressable
                    key={index}
                    disabled={respondido}
                    onPress={() => seleccionarOpcion(index)}
                    style={({ pressed }) => [
                      styles.opcionBtnBase,
                      buttonStyle,
                      pressed && !respondido && styles.opcionBtnPressed,
                    ]}
                  >
                    <Text style={[styles.opcionTextoBase, textStyle]}>
                      {opcionText}
                    </Text>
                    {iconName && (
                      <Ionicons name={iconName} size={22} color={iconColor} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* 4. CAJA DE EXPLICACIÓN (Aparece tras responder) */}
            {respondido && (
              <View style={styles.explicacionCard}>
                <View style={styles.explicacionHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
                  <Text style={styles.explicacionTitulo}>Explicación Técnica</Text>
                </View>
                <Text style={styles.explicacionTexto}>
                  {preguntaData.explicacion}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 5. BOTÓN DE CIERRE / RECOMPENSA */}
          {respondido && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.btnReclamar}
              onPress={handleReclamarRacha}
            >
              <Text style={styles.btnReclamarTexto}>Reclamar mi día de racha 🔥</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      maxHeight: '85%',
      elevation: 10,
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    chipCategoria: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.primary + '18',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    chipTexto: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
    },
    btnClose: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: theme.background,
    },

    // Pregunta
    preguntaTexto: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.textPrimary,
      lineHeight: 28,
      marginBottom: 20,
    },

    // Opciones
    opcionesContainer: {
      gap: 12,
      marginBottom: 20,
    },
    opcionBtnBase: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    opcionBtnPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.99 }],
    },

    // Estado 1: Reposo
    opcionBtnReposo: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    opcionTextoReposo: {
      color: theme.textPrimary,
    },

    // Estado 2: Seleccionada Correcta
    opcionBtnCorrecta: {
      backgroundColor: '#10b98115',
      borderColor: '#10b981',
    },
    opcionTextoCorrecta: {
      color: '#10b981',
      fontWeight: '700',
    },

    // Estado 3: Seleccionada Incorrecta
    opcionBtnIncorrecta: {
      backgroundColor: '#ef444415',
      borderColor: '#ef4444',
    },
    opcionTextoIncorrecta: {
      color: '#ef4444',
      fontWeight: '700',
    },

    // Estado 4: Atenuada / Deshabilitada
    opcionBtnAtenuada: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      opacity: 0.4,
    },

    opcionTextoBase: {
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
      marginRight: 10,
    },

    // Caja de Explicación
    explicacionCard: {
      backgroundColor: theme.background,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    explicacionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    explicacionTitulo: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    explicacionTexto: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },

    // Botón Reclamar
    btnReclamar: {
      backgroundColor: '#ff5722',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: '#ff5722',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    btnReclamarTexto: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
    },
  });