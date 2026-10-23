import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext';
import { obtenerFechaISO } from '../services/streakService';
import { supabase } from '../services/supabase';

interface RachaCalendarModalProps {
  visible: boolean;
  userId?: string;
  onClose: () => void;
}

interface DiaHistorial {
  fecha: string;
  tipo: string | null;
}

const esDiaComodin = (tipo: string | null) => {
  const tipoNormalizado = tipo?.toLowerCase() ?? '';
  return ['comodin', 'congel', 'salvad', 'hielo'].some((indicador) =>
    tipoNormalizado.includes(indicador),
  );
};

export const RachaCalendarModal: React.FC<RachaCalendarModalProps> = ({
  visible,
  userId,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [historial, setHistorial] = useState<DiaHistorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    let activo = true;

    const cargarHistorial = async () => {
      setLoading(true);
      setErrorCarga(null);
      setHistorial([]);

      if (!userId) {
        setErrorCarga('No se pudo identificar tu usuario para cargar el historial.');
        setLoading(false);
        return;
      }

      try {
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);

        const { data, error } = await supabase
          .from('historial_checkins')
          .select('fecha, tipo')
          .eq('perfil_id', userId)
          .gte('fecha', obtenerFechaISO(fechaInicio));

        if (error) throw error;
        if (activo) setHistorial(data ?? []);
      } catch (error) {
        console.error('Error cargando historial de rachas:', error);
        if (activo) {
          setErrorCarga(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar tu historial de rachas.',
          );
        }
      } finally {
        if (activo) setLoading(false);
      }
    };

    void cargarHistorial();
    return () => {
      activo = false;
    };
  }, [visible, userId]);

  const renderDias = () => {
    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaString = obtenerFechaISO(fecha);
      const registrosDelDia = historial.filter((item) => item.fecha === fechaString);
      const diaComodin = registrosDelDia.some((item) => esDiaComodin(item.tipo));
      const completado = registrosDelDia.length > 0;
      const esHoy = i === 0;

      dias.push(
        <View key={fechaString} style={styles.diaContainer}>
          <Text style={[styles.diaTexto, esHoy && styles.diaHoyTexto]}>
            {fecha.getDate()}
          </Text>
          <View
            style={[
              styles.circuloDia,
              completado && (diaComodin ? styles.circuloComodin : styles.circuloCompletado),
            ]}
          >
            <Text style={styles.iconoRacha}>
              {diaComodin ? '❄️' : completado ? '🔥' : ''}
            </Text>
          </View>
        </View>,
      );
    }
    return dias;
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.titulo}>Tu Historial de Rachas</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons color={theme.textPrimary} name="close" size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitulo}>Últimos 14 días</Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
          ) : errorCarga ? (
            <Text style={styles.errorCarga}>{errorCarga}</Text>
          ) : (
            <>
              <View style={styles.calendarioGrid}>{renderDias()}</View>
              <View style={styles.leyenda}>
                <Text style={styles.leyendaTexto}>🔥 Check-in</Text>
                <Text style={styles.leyendaTexto}>❄️ Comodín</Text>
              </View>
            </>
          )}

          <TouchableOpacity onPress={onClose} style={styles.btnCerrar}>
            <Text style={styles.btnTexto}>¡A seguir rodando!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  subtitulo: { fontSize: 14, color: theme.textSecondary, marginTop: 5, marginBottom: 20 },
  loader: { marginVertical: 30 },
  errorCarga: { color: '#ef4444', marginVertical: 20, textAlign: 'center' },
  calendarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  diaContainer: { alignItems: 'center', width: 40 },
  diaTexto: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
  diaHoyTexto: { color: theme.primary, fontWeight: 'bold' },
  circuloDia: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circuloCompletado: { backgroundColor: '#ff572215', borderColor: '#ff572240' },
  circuloComodin: { backgroundColor: '#3b82f618', borderColor: '#3b82f660' },
  iconoRacha: { fontSize: 18 },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 20 },
  leyendaTexto: { color: theme.textSecondary, fontSize: 12 },
  btnCerrar: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
