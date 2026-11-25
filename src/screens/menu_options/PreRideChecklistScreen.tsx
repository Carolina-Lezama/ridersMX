import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  loadPreRideChecklist,
  PRE_RIDE_CHECKLIST_SECTIONS,
  type PreRideChecklistItemId,
  PreRideChecklistProgress,
  savePreRideChecklist,
} from '../../services/preRideChecklistService';

interface PreRideChecklistScreenProps {
  navigation: { goBack: () => void };
}

export default function PreRideChecklistScreen({ navigation }: PreRideChecklistScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [progress, setProgress] = useState<PreRideChecklistProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setProgress(await loadPreRideChecklist());
    } catch (error) {
      console.error('No se pudo cargar la checklist pre-rodada:', error);
      setErrorMessage('No se pudo cargar tu checklist. Revisa el almacenamiento del dispositivo e inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const totalItems = useMemo(
    () => PRE_RIDE_CHECKLIST_SECTIONS.reduce((total, section) => total + section.items.length, 0),
    [],
  );
  const completedItems = Object.values(progress).filter(Boolean).length;

  const persistProgress = async (nextProgress: PreRideChecklistProgress) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await savePreRideChecklist(nextProgress);
      setProgress(nextProgress);
    } catch (error) {
      console.error('No se pudo guardar la checklist pre-rodada:', error);
      setErrorMessage('No se pudo guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItem = (id: PreRideChecklistItemId) => {
    if (isSaving) return;
    void persistProgress({
      ...progress,
      [id]: !progress[id],
    });
  };

  const resetChecklist = () => {
    if (isSaving) return;
    void persistProgress({});
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
        <Text style={styles.headerTitle}>Checklist pre-rodada</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="shield-checkmark-outline" size={28} color={theme.primary} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.title}>Antes de arrancar</Text>
            <Text style={styles.subtitle}>Una revisión rápida basada en T-CLOCS. Tu progreso se guarda en este dispositivo.</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressText}>
            <Text style={styles.progressTitle}>Revisión completada</Text>
            <Text style={styles.progressCount}>{completedItems} de {totalItems}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${totalItems ? (completedItems / totalItems) * 100 : 0}%` },
              ]}
            />
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Text style={styles.errorText}>{errorMessage}</Text>
            {isLoading && <ActivityIndicator color={theme.dangerText} />}
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator style={styles.loader} size="large" color={theme.primary} />
        ) : !errorMessage ? (
          <>
            {PRE_RIDE_CHECKLIST_SECTIONS.map(section => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map(item => {
                  const checked = progress[item.id] === true;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => toggleItem(item.id)}
                      disabled={isSaving}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked, disabled: isSaving }}
                      accessibilityLabel={`${item.label}. ${item.detail}`}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Ionicons name="checkmark" size={18} color={theme.onPrimary} />}
                      </View>
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, checked && styles.itemTitleChecked]}>{item.label}</Text>
                        <Text style={styles.itemDetail}>{item.detail}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.resetButton, isSaving && styles.disabled]}
              onPress={resetChecklist}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Reiniciar checklist"
            >
              <Ionicons name="refresh-outline" size={19} color={theme.primary} />
              <Text style={styles.resetText}>Reiniciar checklist</Text>
            </TouchableOpacity>
            {isSaving && <ActivityIndicator style={styles.savingIndicator} color={theme.primary} />}
          </>
        ) : (
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadProgress()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    marginTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  backButton: { width: 38, paddingVertical: 5 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: theme.textPrimary },
  headerSpacer: { width: 38 },
  content: { padding: 18, paddingBottom: 36 },
  introCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  introIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.infoBg, marginRight: 12 },
  introText: { flex: 1 },
  title: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  subtitle: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  progressCard: { backgroundColor: theme.card, borderRadius: 14, padding: 16, marginTop: 14, borderWidth: 1, borderColor: theme.border },
  progressText: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  progressCount: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: theme.mutedBg, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: theme.primary },
  sectionCard: { backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, marginTop: 14, borderWidth: 1, borderColor: theme.border },
  sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  checklistItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, borderTopWidth: 1, borderTopColor: theme.divider },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: theme.iconSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1 },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  itemText: { flex: 1 },
  itemTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  itemTitleChecked: { color: theme.textSecondary, textDecorationLine: 'line-through' },
  itemDetail: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  resetButton: { minHeight: 48, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetText: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  loader: { marginTop: 36 },
  savingIndicator: { marginTop: 10 },
  errorCard: { backgroundColor: theme.dangerBg, borderWidth: 1, borderColor: theme.dangerBorder, borderRadius: 12, padding: 14, marginTop: 14 },
  errorText: { color: theme.dangerText, fontSize: 14, lineHeight: 20 },
  retryButton: { alignSelf: 'center', padding: 14 },
  retryText: { color: theme.primary, fontWeight: '700' },
});
