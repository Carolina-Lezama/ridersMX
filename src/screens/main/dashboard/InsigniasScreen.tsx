import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../assets/theme/ThemeContext'; 

export interface Insignia {
  id: string;
  nombre: string;
  descripcion: string;
  requisito: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  desbloqueada: boolean;
  fechaDesbloqueo?: string;
  progresoActual: number;
  progresoTotal: number;
}

// Datos de prueba (Luego se sincronizarán con Supabase)
const INSIGNIAS_MOCK: Insignia[] = [
  {
    id: 'badge_1',
    nombre: 'Primer Paso',
    descripcion: 'Completaste tu primer Check-in diario.',
    requisito: 'Alcanza una racha de 1 día',
    icono: 'footsteps-outline',
    color: '#3b82f6',
    desbloqueada: true,
    fechaDesbloqueo: '10 Sep',
    progresoActual: 1,
    progresoTotal: 1,
  },
  {
    id: 'badge_2',
    nombre: 'Piloto Novato',
    descripcion: 'Demostraste constancia durante una semana entera.',
    requisito: 'Alcanza una racha de 7 días continuos',
    icono: 'flame-outline',
    color: '#f59e0b',
    desbloqueada: true,
    fechaDesbloqueo: '17 Sep',
    progresoActual: 7,
    progresoTotal: 7,
  },
  {
    id: 'badge_3',
    nombre: 'Mecánico Afilado',
    descripcion: 'Responde correctamente 15 preguntas de mantenimiento.',
    requisito: 'Acierta 15 preguntas en el Quiz Express',
    icono: 'build-outline',
    color: '#10b981',
    desbloqueada: false,
    progresoActual: 9,
    progresoTotal: 15,
  },
  {
    id: 'badge_4',
    nombre: 'Rider Enfocado',
    descripcion: 'Mantén el hábito activo durante medio mes.',
    requisito: 'Alcanza una racha de 15 días continuos',
    icono: 'speedometer-outline',
    color: '#8b5cf6',
    desbloqueada: false,
    progresoActual: 7,
    progresoTotal: 15,
  },
  {
    id: 'badge_5',
    nombre: 'Escudo Helado',
    descripcion: 'Salvaste tu racha utilizando un comodín.',
    requisito: 'Utiliza tu primer Comodín de Racha',
    icono: 'snow-outline',
    color: '#06b6d4',
    desbloqueada: true,
    fechaDesbloqueo: '22 Sep',
    progresoActual: 1,
    progresoTotal: 1,
  },
  {
    id: 'badge_6',
    nombre: 'Leyenda del Asfalto',
    descripcion: 'Un mes completo de disciplina diaria en tu garaje.',
    requisito: 'Alcanza una racha de 30 días continuos',
    icono: 'trophy-outline',
    color: '#ec4899',
    desbloqueada: false,
    progresoActual: 7,
    progresoTotal: 30,
  },
];

export default function InsigniasScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [insigniaSeleccionada, setInsigniaSeleccionada] = useState<Insignia | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const abrirDetalle = (insignia: Insignia) => {
    setInsigniaSeleccionada(insignia);
    setModalVisible(true);
  };

  const cerrarDetalle = () => {
    setModalVisible(false);
    setInsigniaSeleccionada(null);
  };

  const renderInsigniaCard = ({ item }: { item: Insignia }) => {
    const porcentajeProgreso = Math.min(
      (item.progresoActual / item.progresoTotal) * 100,
      100
    );

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => abrirDetalle(item)}
        style={[
          styles.card,
          item.desbloqueada ? styles.cardUnlocked : styles.cardLocked,
        ]}
      >
        {/* Ícono de Candado para Bloqueadas */}
        {!item.desbloqueada && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}

        {/* Ícono Principal */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: item.desbloqueada
                ? item.color + '20'
                : theme.border + '40',
            },
          ]}
        >
          <Ionicons
            name={item.icono}
            size={32}
            color={item.desbloqueada ? item.color : '#9ca3af'}
          />
        </View>

        {/* Nombre */}
        <Text
          style={[
            styles.badgeTitle,
            !item.desbloqueada && { color: theme.textSecondary },
          ]}
          numberOfLines={1}
        >
          {item.nombre}
        </Text>

        {/* Estado / Progreso */}
        {item.desbloqueada ? (
          <Text style={styles.unlockedText}>
            Desbloqueada el {item.fechaDesbloqueo}
          </Text>
        ) : (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${porcentajeProgreso}%`, backgroundColor: item.color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {item.progresoActual}/{item.progresoTotal}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Galería de Logros 🏆</Text>
        <Text style={styles.headerSubtitle}>
          Demuestra tu constancia y desbloquea insignias exclusivas.
        </Text>
      </View>

      {/* Grilla de Insignias (2 Columnas) */}
      <FlatList
        data={INSIGNIAS_MOCK}
        keyExtractor={(item) => item.id}
        renderItem={renderInsigniaCard}
        numColumns={2}
        columnWrapperStyle={styles.rowWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Modal de Detalle */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={cerrarDetalle}
      >
        <Pressable style={styles.modalOverlay} onPress={cerrarDetalle}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {insigniaSeleccionada && (
              <>
                {/* Botón de Cierre */}
                <TouchableOpacity style={styles.btnClose} onPress={cerrarDetalle}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Ícono Grande en Modal */}
                <View
                  style={[
                    styles.modalIconContainer,
                    {
                      backgroundColor: insigniaSeleccionada.desbloqueada
                        ? insigniaSeleccionada.color + '25'
                        : theme.border + '50',
                    },
                  ]}
                >
                  <Ionicons
                    name={insigniaSeleccionada.icono}
                    size={52}
                    color={
                      insigniaSeleccionada.desbloqueada
                        ? insigniaSeleccionada.color
                        : '#9ca3af'
                    }
                  />
                </View>

                {/* Título y Estado */}
                <Text style={styles.modalTitle}>{insigniaSeleccionada.nombre}</Text>

                <View style={styles.modalStatusChip}>
                  <Ionicons
                    name={
                      insigniaSeleccionada.desbloqueada
                        ? 'checkmark-circle'
                        : 'time-outline'
                    }
                    size={14}
                    color={
                      insigniaSeleccionada.desbloqueada ? '#10b981' : '#f59e0b'
                    }
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      {
                        color: insigniaSeleccionada.desbloqueada
                          ? '#10b981'
                          : '#f59e0b',
                      },
                    ]}
                  >
                    {insigniaSeleccionada.desbloqueada
                      ? `Obtenida el ${insigniaSeleccionada.fechaDesbloqueo}`
                      : 'En Progreso'}
                  </Text>
                </View>

                {/* Descripción y Requisito */}
                <Text style={styles.modalDescription}>
                  {insigniaSeleccionada.descripcion}
                </Text>

                <View style={styles.requisitoBox}>
                  <Text style={styles.requisitoLabel}>Requisito:</Text>
                  <Text style={styles.requisitoText}>
                    {insigniaSeleccionada.requisito}
                  </Text>
                </View>

                {/* Botones de Acción */}
                {insigniaSeleccionada.desbloqueada ? (
                  <TouchableOpacity
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={() => console.log('Compartir logro')}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Compartir Logro</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.btnDisabled}
                    onPress={cerrarDetalle}
                  >
                    <Text style={styles.btnDisabledText}>Seguir Avanzando</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 20,
      paddingTop: 60,
    },

    // Header
    header: {
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },

    // List & Cards
    listContent: {
      paddingBottom: 40,
    },
    rowWrapper: {
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    card: {
      width: '48%',
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
      position: 'relative',
      borderWidth: 1.5,
    },
    cardUnlocked: {
      borderColor: '#f59e0b', // Borde destacado dorado
      shadowColor: '#f59e0b',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    cardLocked: {
      borderColor: theme.border,
      opacity: 0.7, // Apariencia atenuada/gris
    },

    lockBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: '#6b7280',
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },

    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    badgeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    unlockedText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#f59e0b',
      textAlign: 'center',
    },

    // Barra de Progreso (Bloqueadas)
    progressContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 2,
    },
    progressBarBg: {
      width: '100%',
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textSecondary,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      position: 'relative',
      elevation: 10,
    },
    btnClose: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 6,
      borderRadius: 12,
      backgroundColor: theme.background,
    },
    modalIconContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.textPrimary,
      textAlign: 'center',
    },
    modalStatusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      marginBottom: 14,
    },
    modalStatusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    modalDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    requisitoBox: {
      backgroundColor: theme.background,
      width: '100%',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    requisitoLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    requisitoText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textPrimary,
    },

    // Botones del Modal
    btnPrimary: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    btnPrimaryText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    btnDisabled: {
      width: '100%',
      backgroundColor: theme.border,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    btnDisabledText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
  });