import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../../assets/theme/ThemeContext';
import {
  guardarInsigniaFavorita,
  obtenerResumenInsignias,
  type Insignia,
} from '../../../services/badgeService';
import { supabase } from '../../../services/supabase';

export default function InsigniasScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const mostrarAviso = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') window.alert(`${titulo}: ${mensaje}`);
    else Alert.alert(titulo, mensaje);
  };

  const [insignias, setInsignias] = useState<Insignia[]>([]);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [insigniaFavoritaId, setInsigniaFavoritaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [insigniaSeleccionada, setInsigniaSeleccionada] = useState<Insignia | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const cargarInsignias = useCallback(async (sigueActiva: () => boolean = () => true) => {
    setLoading(true);
    setErrorCarga(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.user) throw new Error('Inicia sesión para consultar tus insignias.');

      const resumen = await obtenerResumenInsignias(session.user.id);
      if (sigueActiva()) {
        setPerfilId(session.user.id);
        setInsignias(resumen.insignias);
        setInsigniaFavoritaId(resumen.favoritaId);
      }
    } catch (error) {
      console.error('Error al cargar insignias:', error);
      if (sigueActiva()) {
        setErrorCarga(error instanceof Error ? error.message : 'No se pudieron cargar las insignias.');
      }
    } finally {
      if (sigueActiva()) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activa = true;
      void cargarInsignias(() => activa);
      return () => {
        activa = false;
      };
    }, [cargarInsignias]),
  );

  const abrirDetalle = (insignia: Insignia) => {
    setInsigniaSeleccionada(insignia);
    setModalVisible(true);
  };

  const regresar = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainApp');
    }
  };

  const cerrarDetalle = () => {
    setModalVisible(false);
    setInsigniaSeleccionada(null);
  };

  const compartirInsignia = async (insignia: Insignia) => {
    try {
      await Share.share({
        message: `¡Desbloqueé la insignia "${insignia.nombre}" en RidersMX! ${insignia.descripcion}`,
      });
    } catch (error) {
      mostrarAviso(
        'No se pudo compartir',
        error instanceof Error ? error.message : 'Inténtalo de nuevo más tarde.',
      );
    }
  };

  const elegirFavorita = async (insignia: Insignia) => {
    if (!perfilId || !insignia.desbloqueada) return;

    try {
      await guardarInsigniaFavorita(perfilId, insignia.id);
      setInsigniaFavoritaId(insignia.id);
      cerrarDetalle();
    } catch (error) {
      console.error('Error al guardar la insignia favorita:', error);
      mostrarAviso(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo más tarde.',
      );
    }
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
            <Ionicons name="lock-closed" size={12} color={theme.onPrimary} />
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
            color={item.desbloqueada ? item.color : theme.iconSecondary}
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
            {item.id === insigniaFavoritaId ? 'Tu insignia favorita' : 'Desbloqueada'}
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
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Regresar"
            onPress={regresar}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.iconPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Galería de Logros</Text>
            <Text style={styles.headerSubtitle}>
              Demuestra tu constancia y desbloquea insignias exclusivas.
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loading} />
      ) : errorCarga ? (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{errorCarga}</Text>
          <TouchableOpacity onPress={() => void cargarInsignias()} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={insignias}
          keyExtractor={(item) => item.id}
          renderItem={renderInsigniaCard}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.errorText}>Aún no hay insignias disponibles.</Text>}
        />
      )}

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
                        : theme.iconSecondary
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
                      insigniaSeleccionada.desbloqueada ? theme.successText : theme.warningText
                    }
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      {
                        color: insigniaSeleccionada.desbloqueada
                          ? theme.successText
                          : theme.warningText,
                      },
                    ]                    }
                  >
                    {insigniaSeleccionada.desbloqueada ? 'Insignia obtenida' : 'En progreso'}
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
                  <>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
                      onPress={() => void compartirInsignia(insigniaSeleccionada)}
                    >
                      <Ionicons name="share-social-outline" size={18} color={theme.onPrimary} />
                      <Text style={styles.btnPrimaryText}>Compartir logro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnSecondary}
                      disabled={insigniaFavoritaId === insigniaSeleccionada.id}
                      onPress={() => void elegirFavorita(insigniaSeleccionada)}
                    >
                      <Ionicons
                        name={insigniaFavoritaId === insigniaSeleccionada.id ? 'star' : 'star-outline'}
                        size={18}
                        color={theme.primary}
                      />
                      <Text style={styles.btnSecondaryText}>
                        {insigniaFavoritaId === insigniaSeleccionada.id
                          ? 'Tu insignia favorita'
                          : 'Elegir como favorita'}
                      </Text>
                    </TouchableOpacity>
                  </>
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      borderRadius: 14,
      backgroundColor: theme.card,
    },
    headerText: { flex: 1 },
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
    loading: { marginTop: 48 },
    errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    errorText: { color: theme.textSecondary, textAlign: 'center' },
    retryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      marginTop: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: { color: theme.onPrimary, fontWeight: '700' },

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
      borderColor: theme.warningText,
      shadowColor: theme.warningText,
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
      backgroundColor: theme.textSecondary,
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
      color: theme.warningText,
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
      backgroundColor: theme.overlay,
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
      color: theme.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    btnSecondary: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      marginTop: 10,
      borderRadius: 14,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnSecondaryText: { color: theme.primary, fontSize: 15, fontWeight: '700' },
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