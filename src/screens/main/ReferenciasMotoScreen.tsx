import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import CustomInput from '../../components/CustomInput';
import { supabase } from '../../services/supabase';

interface ReferenciasMoto {
  referencia_aceite: string;
  referencia_filtro_aceite: string;
  referencia_llantas: string;
  referencia_bujia: string;
  referencia_paso_cadena: string;
  referencia_bateria: string;
}

interface ReferenciasMotoScreenProps {
  navigation: { goBack: () => void };
  route: { params?: { motoId?: string } };
}

const referenciasVacias: ReferenciasMoto = {
  referencia_aceite: '',
  referencia_filtro_aceite: '',
  referencia_llantas: '',
  referencia_bujia: '',
  referencia_paso_cadena: '',
  referencia_bateria: '',
};

const cargarReferencias = (moto: Record<string, unknown>): ReferenciasMoto => ({
  referencia_aceite: typeof moto.referencia_aceite === 'string' ? moto.referencia_aceite : '',
  referencia_filtro_aceite: typeof moto.referencia_filtro_aceite === 'string' ? moto.referencia_filtro_aceite : '',
  referencia_llantas: typeof moto.referencia_llantas === 'string' ? moto.referencia_llantas : '',
  referencia_bujia: typeof moto.referencia_bujia === 'string' ? moto.referencia_bujia : '',
  referencia_paso_cadena: typeof moto.referencia_paso_cadena === 'string' ? moto.referencia_paso_cadena : '',
  referencia_bateria: typeof moto.referencia_bateria === 'string' ? moto.referencia_bateria : '',
});

export default function ReferenciasMotoScreen({ navigation, route }: ReferenciasMotoScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const motoId = route.params?.motoId;
  const [referencias, setReferencias] = useState<ReferenciasMoto>(referenciasVacias);
  const [motoNombre, setMotoNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cargarFicha = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!motoId) throw new Error('No se indicó qué motocicleta cargar.');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Inicia sesión para consultar esta ficha técnica.');

      const { data, error } = await supabase
        .from('motocicletas')
        .select('id, alias, marca, modelo, referencia_aceite, referencia_filtro_aceite, referencia_llantas, referencia_bujia, referencia_paso_cadena, referencia_bateria')
        .eq('id', motoId)
        .eq('perfil_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No se encontró la motocicleta o no tienes permiso para consultarla.');

      setMotoNombre(data.alias || `${data.marca} ${data.modelo}`);
      setReferencias(cargarReferencias(data));
    } catch (error) {
      console.error('No se pudo cargar la ficha técnica de la motocicleta:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar la ficha técnica.');
    } finally {
      setLoading(false);
    }
  }, [motoId]);

  useEffect(() => {
    void cargarFicha();
  }, [cargarFicha]);

  const actualizarReferencia = (campo: keyof ReferenciasMoto, valor: string) => {
    setReferencias(actuales => ({ ...actuales, [campo]: valor }));
    setSuccessMessage(null);
  };

  const guardarFicha = async () => {
    if (!motoId || saving) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Inicia sesión para guardar esta ficha técnica.');

      const { data, error } = await supabase
        .from('motocicletas')
        .update({
          referencia_aceite: referencias.referencia_aceite.trim() || null,
          referencia_filtro_aceite: referencias.referencia_filtro_aceite.trim() || null,
          referencia_llantas: referencias.referencia_llantas.trim() || null,
          referencia_bujia: referencias.referencia_bujia.trim() || null,
          referencia_paso_cadena: referencias.referencia_paso_cadena.trim() || null,
          referencia_bateria: referencias.referencia_bateria.trim() || null,
        })
        .eq('id', motoId)
        .eq('perfil_id', session.user.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No se encontró la motocicleta o no tienes permiso para actualizarla.');
      setSuccessMessage('Ficha técnica guardada correctamente.');
    } catch (error) {
      console.error('No se pudo guardar la ficha técnica de la motocicleta:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la ficha técnica.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={navigation.goBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons name="arrow-back" size={26} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ficha técnica</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.primary} />
      ) : errorMessage && !motoNombre ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => void cargarFicha()} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="build-outline" size={25} color={theme.primary} />
            </View>
            <View style={styles.introText}>
              <Text style={styles.title}>{motoNombre}</Text>
              <Text style={styles.subtitle}>Guarda medidas y códigos para tenerlos a la mano en el taller o la refaccionaria.</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <CustomInput
              label="Aceite del motor"
              placeholder="Ej. 10W-40 sintético"
              value={referencias.referencia_aceite}
              onChangeText={value => actualizarReferencia('referencia_aceite', value)}
              maxLength={120}
            />
            <CustomInput
              label="Filtro de aceite"
              placeholder="Código o modelo del filtro"
              value={referencias.referencia_filtro_aceite}
              onChangeText={value => actualizarReferencia('referencia_filtro_aceite', value)}
              maxLength={120}
            />
            <CustomInput
              label="Medida de llantas"
              placeholder="Delantera y trasera"
              value={referencias.referencia_llantas}
              onChangeText={value => actualizarReferencia('referencia_llantas', value)}
              maxLength={120}
            />
            <CustomInput
              label="Bujía"
              placeholder="Código o modelo de bujía"
              value={referencias.referencia_bujia}
              onChangeText={value => actualizarReferencia('referencia_bujia', value)}
              maxLength={120}
            />
            <CustomInput
              label="Paso de cadena"
              placeholder="Ej. 520"
              value={referencias.referencia_paso_cadena}
              onChangeText={value => actualizarReferencia('referencia_paso_cadena', value)}
              maxLength={120}
            />
            <CustomInput
              label="Batería"
              placeholder="Medida o modelo de batería"
              value={referencias.referencia_bateria}
              onChangeText={value => actualizarReferencia('referencia_bateria', value)}
              maxLength={120}
            />
          </View>

          {errorMessage && <Text style={styles.errorText} accessibilityRole="alert">{errorMessage}</Text>}
          {successMessage && <Text style={styles.successText} accessibilityRole="alert">{successMessage}</Text>}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={() => void guardarFicha()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar ficha"
          >
            {saving ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <>
                <Ionicons name="save-outline" size={19} color={theme.onPrimary} />
                <Text style={styles.saveButtonText}>Guardar ficha</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 50, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card },
  backButton: { width: 38, paddingVertical: 5 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: theme.textPrimary },
  headerSpacer: { width: 38 },
  content: { padding: 18, paddingBottom: 36 },
  loader: { marginTop: 36 },
  introCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  introIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.infoBg, marginRight: 12 },
  introText: { flex: 1 },
  title: { color: theme.textPrimary, fontSize: 17, fontWeight: '700' },
  subtitle: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  formCard: { backgroundColor: theme.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: theme.border },
  saveButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 12, marginTop: 16 },
  saveButtonText: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19, marginTop: 8 },
  successText: { color: theme.successText, backgroundColor: theme.successBg, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19, marginTop: 12 },
  retryButton: { marginTop: 12, padding: 12 },
  retryText: { color: theme.primary, fontWeight: '700' },
});
