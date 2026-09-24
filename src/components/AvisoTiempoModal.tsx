// AvisoTiempoModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext'; // Ajusta la ruta

interface Props {
  visible: boolean;
  minutos: number;
  onClose: () => void;
}

export const AvisoTiempoModal = ({ visible, minutos, onClose }: Props) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="time" size={24} color={theme.primary} />
            </View>
            <Text style={styles.titulo}>Aviso de Tiempo</Text>
          </View>

          <Text style={styles.mensaje}>
            Llevas <Text style={styles.boldText}>{minutos} minutos</Text> continuos en la aplicación. Considera tomar un descanso.
          </Text>

          <TouchableOpacity style={styles.btnEntendido} onPress={onClose}>
            <Text style={styles.btnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    backgroundColor: theme.primary + '20',
    padding: 8,
    borderRadius: 10,
    marginRight: 10,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  mensaje: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  btnEntendido: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});