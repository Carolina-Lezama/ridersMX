import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { supabase } from '../../services/supabase';
import {
  getSelectedMotorcycleId,
  setSelectedMotorcycleId as persistSelectedMotorcycleId,
} from '../../services/motorcycleSelectionService';
import {
  calculateFuelPlan,
  DEFAULT_FUEL_RESERVE_PERCENT,
  FuelBikeProfile,
  FuelPlan,
  loadFuelBikeProfiles,
  saveFuelBikeProfiles,
} from '../../services/fuelRangeService';

const parseNumber = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value: number) =>
  value.toLocaleString('es-MX', { maximumFractionDigits: 1 });

export default function FuelRangeCalculatorScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<FuelBikeProfile[]>([]);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<string | null>(null);
  const [tankCapacity, setTankCapacity] = useState('');
  const [efficiency, setEfficiency] = useState('');
  const [reservePercent, setReservePercent] = useState(String(DEFAULT_FUEL_RESERVE_PERCENT));
  const [routeDistance, setRouteDistance] = useState('');
  const [plan, setPlan] = useState<FuelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const setDraft = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPlan(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const loadProfiles = async (refreshFromGarage = false) => {
    const showLoader = profiles.length === 0;
    if (showLoader) setLoading(true);
    setErrorMessage(null);
    setOfflineNotice(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Inicia sesión para consultar las motocicletas de tu garaje.');
      const activeUserId = session.user.id;
      setUserId(activeUserId);

      let cachedProfiles: FuelBikeProfile[] = [];
      let cacheError: unknown = null;
      try {
        cachedProfiles = await loadFuelBikeProfiles(activeUserId);
      } catch (error) {
        cacheError = error;
        console.error('No se pudo leer la caché local de combustible:', error);
      }

      const applyProfiles = async (nextProfiles: FuelBikeProfile[]) => {
        setProfiles(nextProfiles);
        const storedSelection = await getSelectedMotorcycleId(activeUserId);
        const selectedProfile = nextProfiles.find((profile) => profile.motorcycleId === storedSelection)
          ?? nextProfiles[0];
        setSelectedMotorcycleId(selectedProfile?.motorcycleId ?? null);
        setTankCapacity(
          selectedProfile?.tankCapacityLiters === null || selectedProfile?.tankCapacityLiters === undefined
            ? ''
            : String(selectedProfile.tankCapacityLiters),
        );
        setEfficiency(
          selectedProfile?.efficiencyKmPerLiter === null || selectedProfile?.efficiencyKmPerLiter === undefined
            ? ''
            : String(selectedProfile.efficiencyKmPerLiter),
        );
        setReservePercent(String(selectedProfile?.reservePercent ?? DEFAULT_FUEL_RESERVE_PERCENT));
      };

      if (cachedProfiles.length > 0 && !refreshFromGarage) {
        await applyProfiles(cachedProfiles);
        setOfflineNotice('Cargado desde la memoria local. Puedes actualizar la lista de motos cuando tengas conexión.');
        return;
      }

      const { data: motorcycles, error } = await supabase
        .from('motocicletas')
        .select('id, alias, marca, modelo')
        .eq('perfil_id', activeUserId);

      let nextProfiles: FuelBikeProfile[];
      if (error) {
        if (cachedProfiles.length === 0) throw error;
        nextProfiles = cachedProfiles;
        setOfflineNotice('Sin conexión: se conservan las motocicletas y configuraciones guardadas en este dispositivo.');
      } else {
        nextProfiles = (motorcycles ?? []).map((motorcycle) => {
          const previous = cachedProfiles.find((profile) => profile.motorcycleId === motorcycle.id);
          const motorcycleName = motorcycle.alias || `${motorcycle.marca} ${motorcycle.modelo}`;
          return previous
            ? { ...previous, motorcycleName }
            : {
              motorcycleId: motorcycle.id,
              motorcycleName,
              tankCapacityLiters: null,
              efficiencyKmPerLiter: null,
              reservePercent: DEFAULT_FUEL_RESERVE_PERCENT,
            };
        });
        await saveFuelBikeProfiles(activeUserId, nextProfiles);
        if (cacheError) {
          setOfflineNotice('No se pudo leer la configuración anterior; se cargaron las motos del garaje. Revisa y guarda los datos de autonomía.');
        }
      }

      await applyProfiles(nextProfiles);
    } catch (error) {
      console.error('No se pudieron cargar las motos para la calculadora:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar las motocicletas.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  const chooseMotorcycle = async (profile: FuelBikeProfile) => {
    setSelectedMotorcycleId(profile.motorcycleId);
    setTankCapacity(profile.tankCapacityLiters === null ? '' : String(profile.tankCapacityLiters));
    setEfficiency(profile.efficiencyKmPerLiter === null ? '' : String(profile.efficiencyKmPerLiter));
    setReservePercent(String(profile.reservePercent));
    setPlan(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (userId) {
      try {
        await persistSelectedMotorcycleId(userId, profile.motorcycleId);
      } catch (error) {
        console.error('No se pudo guardar la motocicleta seleccionada:', error);
        setErrorMessage('No se pudo guardar la moto seleccionada en este dispositivo.');
      }
    }
  };

  const saveConfiguration = async () => {
    const tank = parseNumber(tankCapacity);
    const kmPerLiter = parseNumber(efficiency);
    const reserve = parseNumber(reservePercent);
    if (tank === null || tank <= 0 || tank > 100) {
      setErrorMessage('La capacidad del tanque debe ser mayor que 0 y no superar 100 litros.');
      return;
    }
    if (kmPerLiter === null || kmPerLiter <= 0 || kmPerLiter > 200) {
      setErrorMessage('El rendimiento debe ser mayor que 0 y no superar 200 km/L.');
      return;
    }
    if (reserve === null || reserve < 0 || reserve > 80) {
      setErrorMessage('El margen de reserva debe estar entre 0% y 80%.');
      return;
    }
    if (!userId || !selectedMotorcycleId) {
      setErrorMessage('Selecciona una motocicleta para guardar la configuración.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updatedProfiles = profiles.map((profile) =>
        profile.motorcycleId === selectedMotorcycleId
          ? {
            ...profile,
            tankCapacityLiters: tank,
            efficiencyKmPerLiter: kmPerLiter,
            reservePercent: reserve,
          }
          : profile,
      );
      await saveFuelBikeProfiles(userId, updatedProfiles);
      setProfiles(updatedProfiles);
      setSuccessMessage('Configuración guardada en este dispositivo.');
    } catch (error) {
      console.error('No se pudo guardar la configuración de autonomía:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la configuración local.');
    } finally {
      setSaving(false);
    }
  };

  const calculatePlan = () => {
    const distance = parseNumber(routeDistance);
    const tank = parseNumber(tankCapacity);
    const kmPerLiter = parseNumber(efficiency);
    const reserve = parseNumber(reservePercent);
    if (distance === null || distance <= 0 || distance > 100000) {
      setErrorMessage('La distancia debe ser mayor que 0 y no superar 100,000 km.');
      setPlan(null);
      return;
    }
    if (tank === null || tank <= 0 || kmPerLiter === null || kmPerLiter <= 0 || reserve === null) {
      setErrorMessage('Completa una capacidad, rendimiento y reserva válidos antes de calcular.');
      setPlan(null);
      return;
    }

    try {
      setPlan(calculateFuelPlan(distance, {
        motorcycleId: selectedMotorcycleId ?? '',
        motorcycleName: '',
        tankCapacityLiters: tank,
        efficiencyKmPerLiter: kmPerLiter,
        reservePercent: reserve,
      }));
      setErrorMessage(null);
    } catch (error) {
      setPlan(null);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo calcular la autonomía.');
    }
  };

  const selectedProfile = profiles.find((profile) => profile.motorcycleId === selectedMotorcycleId);

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
        <Text style={styles.headerTitle}>Autonomía y paradas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      ) : errorMessage && profiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={44} color={theme.dangerText} />
          <Text style={styles.emptyText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => void loadProfiles()}>
            <Text style={styles.saveButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bicycle-outline" size={44} color={theme.iconSecondary} />
          <Text style={styles.emptyTitle}>Agrega una moto a tu garaje</Text>
          <Text style={styles.emptyText}>La calculadora guarda tanque y rendimiento por cada motocicleta.</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => navigation.navigate('MisMotos')}>
            <Text style={styles.saveButtonText}>Ir a Mi Garaje</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!!offlineNotice && <Text style={styles.noticeText}>{offlineNotice}</Text>}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void loadProfiles(true)}
            accessibilityRole="button"
          >
            <Ionicons name="refresh-outline" size={16} color={theme.primary} />
            <Text style={styles.refreshButtonText}>Actualizar motos del garaje</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Selecciona tu moto</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileRow}>
            {profiles.map((profile) => {
              const selected = profile.motorcycleId === selectedMotorcycleId;
              return (
                <TouchableOpacity
                  key={profile.motorcycleId}
                  style={[styles.profileChip, selected && styles.profileChipActive]}
                  onPress={() => void chooseMotorcycle(profile)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.profileChipText, selected && styles.profileChipTextActive]}>
                    {profile.motorcycleName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!!selectedProfile && (
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <Ionicons name="settings-outline" size={21} color={theme.primary} />
                <Text style={styles.sectionTitle}>Datos de {selectedProfile.motorcycleName}</Text>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputColumn}>
                  <Text style={styles.label}>Capacidad (litros)</Text>
                  <TextInput
                    style={styles.input}
                    value={tankCapacity}
                    onChangeText={(value) => setDraft(setTankCapacity, value)}
                    placeholder="Ej. 15"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Capacidad del tanque en litros"
                  />
                </View>
                <View style={styles.inputColumn}>
                  <Text style={styles.label}>Rendimiento (km/L)</Text>
                  <TextInput
                    style={styles.input}
                    value={efficiency}
                    onChangeText={(value) => setDraft(setEfficiency, value)}
                    placeholder="Ej. 25"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Rendimiento en kilómetros por litro"
                  />
                </View>
              </View>
              <Text style={styles.label}>Reserva de combustible (%)</Text>
              <TextInput
                style={styles.input}
                value={reservePercent}
                onChangeText={(value) => setDraft(setReservePercent, value)}
                placeholder="20"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                accessibilityLabel="Margen de reserva en porcentaje"
              />
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={() => void saveConfiguration()}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar configuración local'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.sectionHeading}>
              <Ionicons name="map-outline" size={21} color={theme.primary} />
              <Text style={styles.sectionTitle}>Planear ruta</Text>
            </View>
            <Text style={styles.label}>Distancia total (km)</Text>
            <TextInput
              style={styles.input}
              value={routeDistance}
              onChangeText={(value) => {
                setRouteDistance(value);
                setPlan(null);
                setErrorMessage(null);
              }}
              placeholder="Ej. 500"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              accessibilityLabel="Distancia total de la ruta en kilómetros"
            />
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculatePlan}
              accessibilityRole="button"
            >
              <Ionicons name="calculator-outline" size={19} color={theme.onPrimary} />
              <Text style={styles.saveButtonText}>Calcular paradas</Text>
            </TouchableOpacity>
          </View>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

          {plan && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeading}>
                <Ionicons name="checkmark-circle-outline" size={23} color={theme.successText} />
                <Text style={styles.resultTitle}>Plan estimado</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Autonomía completa estimada</Text>
                <Text style={styles.resultValue}>{formatNumber(plan.fullRangePerTankKm)} km</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Paradas recomendadas</Text>
                <Text style={styles.resultValue}>{plan.recommendedStops}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Distancia máxima por tramo</Text>
                <Text style={styles.resultValue}>{formatNumber(plan.safeRangePerTankKm)} km</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Tanques completos equivalentes</Text>
                <Text style={styles.resultValue}>{plan.fullTankEquivalentCount}</Text>
              </View>
              <Text style={styles.resultNote}>
                La distancia por tramo ya descuenta {reservePercent}% de reserva. El rendimiento real puede variar por carga, velocidad, clima y terreno.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 15, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backButton: { width: 38, paddingVertical: 5 },
  headerTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 38 },
  loader: { marginTop: 50 },
  content: { padding: 18, paddingBottom: 36 },
  noticeText: { color: theme.infoText, backgroundColor: theme.infoBg, borderWidth: 1, borderColor: theme.infoBorder, padding: 11, borderRadius: 10, fontSize: 12, lineHeight: 17, marginBottom: 16 },
  refreshButton: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginBottom: 12, paddingVertical: 5 },
  refreshButtonText: { color: theme.primary, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  profileRow: { gap: 8, paddingBottom: 6 },
  profileChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  profileChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  profileChipText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  profileChipTextActive: { color: theme.onPrimary },
  card: { padding: 16, marginTop: 14, borderRadius: 15, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputColumn: { flex: 1 },
  label: { color: theme.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: theme.background, color: theme.textPrimary, fontSize: 15 },
  saveButton: { alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 13, borderRadius: 10, backgroundColor: theme.primary },
  saveButtonText: { color: theme.onPrimary, fontSize: 14, fontWeight: '700' },
  calculateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, marginTop: 14, borderRadius: 10, backgroundColor: theme.primary },
  disabledButton: { opacity: 0.6 },
  errorText: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 9, padding: 11, fontSize: 13, lineHeight: 18, marginTop: 12 },
  successText: { color: theme.successText, fontSize: 13, textAlign: 'center', marginTop: 10 },
  resultCard: { padding: 16, marginTop: 14, borderRadius: 15, borderWidth: 1, borderColor: theme.successText, backgroundColor: theme.card },
  resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  resultTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.divider },
  resultLabel: { flex: 1, color: theme.textSecondary, fontSize: 13 },
  resultValue: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  resultNote: { color: theme.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 10 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  emptyTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  emptyText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
});
