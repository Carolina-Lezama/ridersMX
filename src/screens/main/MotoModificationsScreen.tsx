import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
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
  createMotorcycleModification,
  deleteMotorcycleModification,
  listMotorcycleModifications,
  MotorcycleModification,
  MotorcycleModificationCategory,
  MotorcycleModificationInput,
  updateMotorcycleModification,
} from '../../services/motorcycleModificationService';

interface ModificationForm {
  nombre: string;
  categoria: MotorcycleModificationCategory;
  marca: string;
  fecha_instalacion: string;
  garantia: string;
  costo: string;
  notas: string;
}

const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const emptyForm = (): ModificationForm => ({
  nombre: '',
  categoria: 'accesorio',
  marca: '',
  fecha_instalacion: localToday(),
  garantia: '',
  costo: '',
  notas: '',
});

const isValidDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.getUTCFullYear() === Number(yearText)
    && date.getUTCMonth() === Number(monthText) - 1
    && date.getUTCDate() === Number(dayText);
};

const parseCost = (value: string): number | null => {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
};

export default function MotoModificationsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const motorcycleId = route.params?.motoId;
  const [motorcycleName, setMotorcycleName] = useState('');
  const [modifications, setModifications] = useState<MotorcycleModification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModificationForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (!motorcycleId) {
      setPageError('No se indicó qué motocicleta quieres consultar.');
      setLoading(false);
      return;
    }

    setPageError(null);
    if (showLoading) setLoading(true);
    try {
      const [motorcycleResult, records] = await Promise.all([
        supabase
          .from('motocicletas')
          .select('alias, marca, modelo')
          .eq('id', motorcycleId)
          .single(),
        listMotorcycleModifications(motorcycleId),
      ]);
      if (motorcycleResult.error) throw motorcycleResult.error;
      setMotorcycleName(
        motorcycleResult.data.alias
        || `${motorcycleResult.data.marca} ${motorcycleResult.data.modelo}`,
      );
      setModifications(records);
    } catch (error) {
      console.error('No se pudo cargar el historial de modificaciones:', error);
      setPageError(error instanceof Error ? error.message : 'No se pudo cargar el historial.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [motorcycleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalVisible(true);
  };

  const openEditForm = (record: MotorcycleModification) => {
    setEditingId(record.id);
    setForm({
      nombre: record.nombre,
      categoria: record.categoria,
      marca: record.marca ?? '',
      fecha_instalacion: record.fecha_instalacion,
      garantia: record.garantia ?? '',
      costo: String(record.costo),
      notas: record.notas ?? '',
    });
    setFormError(null);
    setModalVisible(true);
  };

  const saveRecord = async () => {
    const nombre = form.nombre.trim();
    const costo = parseCost(form.costo);
    if (!nombre) {
      setFormError('El nombre de la pieza o mejora es obligatorio.');
      return;
    }
    if (!isValidDate(form.fecha_instalacion)) {
      setFormError('Escribe una fecha de instalación válida (AAAA-MM-DD).');
      return;
    }
    if (costo === null) {
      setFormError('El costo debe ser un número válido, con máximo 2 decimales.');
      return;
    }

    const input: MotorcycleModificationInput = {
      nombre,
      categoria: form.categoria,
      marca: form.marca.trim() || null,
      fecha_instalacion: form.fecha_instalacion,
      garantia: form.garantia.trim() || null,
      costo,
      notas: form.notas.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateMotorcycleModification(motorcycleId, editingId, input);
      } else {
        await createMotorcycleModification(motorcycleId, input);
      }
      setModalVisible(false);
      await loadData(false);
    } catch (error) {
      console.error('No se pudo guardar la modificación:', error);
      setFormError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = (record: MotorcycleModification) => {
    const executeDelete = async () => {
      try {
        await deleteMotorcycleModification(motorcycleId, record.id);
        setModifications((previous) => previous.filter((item) => item.id !== record.id));
      } catch (error) {
        console.error('No se pudo eliminar la modificación:', error);
        const message = error instanceof Error ? error.message : 'Inténtalo de nuevo.';
        if (Platform.OS === 'web') window.alert(`No se pudo eliminar: ${message}`);
        else Alert.alert('No se pudo eliminar', message);
      }
    };

    const confirmation = `¿Eliminar "${record.nombre}" del historial?`;
    if (Platform.OS === 'web') {
      if (window.confirm(confirmation)) void executeDelete();
      return;
    }
    Alert.alert('Eliminar registro', confirmation, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void executeDelete() },
    ]);
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
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Mejoras y accesorios</Text>
          {!!motorcycleName && <Text style={styles.headerSubtitle}>{motorcycleName}</Text>}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.intro}>
        <Ionicons name="document-text-outline" size={22} color={theme.infoText} />
        <Text style={styles.introText}>
          Guarda piezas instaladas, garantía y costo para tener un historial por motocicleta.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={openNewForm}
        accessibilityRole="button"
        accessibilityLabel="Registrar mejora o accesorio"
      >
        <Ionicons name="add" size={22} color={theme.onPrimary} />
        <Text style={styles.addButtonText}>Registrar mejora o accesorio</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      ) : pageError ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{pageError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadData()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : modifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={44} color={theme.iconSecondary} />
          <Text style={styles.emptyTitle}>Aún no hay mejoras registradas</Text>
          <Text style={styles.emptyText}>Agrega escapes, sliders, maleteros u otras piezas instaladas.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {modifications.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeading}>
                <View style={styles.recordIcon}>
                  <Ionicons
                    name={record.categoria === 'accesorio' ? 'briefcase-outline' : 'build-outline'}
                    size={21}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.recordTitleBlock}>
                  <Text style={styles.recordName}>{record.nombre}</Text>
                  <Text style={styles.recordCategory}>
                    {record.categoria === 'accesorio' ? 'Accesorio' : 'Modificación'}
                  </Text>
                </View>
                <Text style={styles.recordCost}>
                  ${Number(record.costo).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.recordDetails}>
                <Text style={styles.detailText}>
                  Instalación: {new Date(`${record.fecha_instalacion}T00:00:00`).toLocaleDateString('es-MX')}
                </Text>
                {record.marca && <Text style={styles.detailText}>Marca: {record.marca}</Text>}
                {record.garantia && <Text style={styles.detailText}>Garantía: {record.garantia}</Text>}
                {record.notas && <Text style={styles.detailText}>{record.notas}</Text>}
              </View>
              <View style={styles.recordActions}>
                <TouchableOpacity
                  onPress={() => openEditForm(record)}
                  style={styles.recordAction}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${record.nombre}`}
                >
                  <Ionicons name="create-outline" size={18} color={theme.primary} />
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeRecord(record)}
                  style={styles.recordAction}
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ${record.nombre}`}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.dangerText} />
                  <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar registro' : 'Nueva mejora o accesorio'}
              </Text>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.categoryRow}>
                {(['accesorio', 'modificacion'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryChip, form.categoria === category && styles.categoryChipActive]}
                    onPress={() => setForm((current) => ({ ...current, categoria: category }))}
                  >
                    <Text style={[styles.categoryText, form.categoria === category && styles.categoryTextActive]}>
                      {category === 'accesorio' ? 'Accesorio' : 'Modificación'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Nombre de pieza o mejora *</Text>
              <TextInput
                style={styles.input}
                value={form.nombre}
                onChangeText={(nombre) => setForm((current) => ({ ...current, nombre }))}
                placeholder="Ej. Escape, sliders, maletero"
                placeholderTextColor={theme.textSecondary}
                maxLength={120}
              />
              <Text style={styles.fieldLabel}>Marca de la pieza</Text>
              <TextInput
                style={styles.input}
                value={form.marca}
                onChangeText={(marca) => setForm((current) => ({ ...current, marca }))}
                placeholder="Opcional"
                placeholderTextColor={theme.textSecondary}
                maxLength={100}
              />
              <Text style={styles.fieldLabel}>Fecha de instalación (AAAA-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={form.fecha_instalacion}
                onChangeText={(fecha_instalacion) => setForm((current) => ({ ...current, fecha_instalacion }))}
                placeholder="2026-01-31"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              <Text style={styles.fieldLabel}>Garantía</Text>
              <TextInput
                style={styles.input}
                value={form.garantia}
                onChangeText={(garantia) => setForm((current) => ({ ...current, garantia }))}
                placeholder="Ej. 12 meses o hasta 2027-01"
                placeholderTextColor={theme.textSecondary}
                maxLength={120}
              />
              <Text style={styles.fieldLabel}>Costo (MXN) *</Text>
              <TextInput
                style={styles.input}
                value={form.costo}
                onChangeText={(costo) => setForm((current) => ({ ...current, costo }))}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                maxLength={14}
              />
              <Text style={styles.fieldLabel}>Notas</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={form.notas}
                onChangeText={(notas) => setForm((current) => ({ ...current, notas }))}
                placeholder="Detalles adicionales"
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={1000}
              />
              {formError && <Text style={styles.errorText}>{formError}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.disabledButton]}
                  onPress={() => void saveRecord()}
                  disabled={saving}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backButton: { width: 38, paddingVertical: 5 },
  headerText: { flex: 1 },
  headerTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  headerSpacer: { width: 12 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginHorizontal: 18, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.infoBorder, backgroundColor: theme.infoBg },
  introText: { flex: 1, color: theme.infoText, fontSize: 13, lineHeight: 18 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: 18, marginTop: 14, padding: 13, borderRadius: 11, backgroundColor: theme.primary },
  addButtonText: { color: theme.onPrimary, fontWeight: '700', fontSize: 14 },
  loader: { marginTop: 40 },
  listContent: { padding: 18, paddingBottom: 40 },
  recordCard: { padding: 15, marginBottom: 12, borderRadius: 15, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  recordHeading: { flexDirection: 'row', alignItems: 'center' },
  recordIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.infoBg, marginRight: 10 },
  recordTitleBlock: { flex: 1 },
  recordName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  recordCategory: { color: theme.textSecondary, fontSize: 12, marginTop: 3 },
  recordCost: { color: theme.primary, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  recordDetails: { borderTopWidth: 1, borderTopColor: theme.divider, marginTop: 12, paddingTop: 9, gap: 4 },
  detailText: { color: theme.textSecondary, fontSize: 12, lineHeight: 17 },
  recordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 },
  recordAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  actionText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  deleteText: { color: theme.dangerText },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  emptyTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginTop: 13, textAlign: 'center' },
  emptyText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  errorText: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 9, padding: 11, fontSize: 13, lineHeight: 18, marginTop: 10 },
  retryButton: { backgroundColor: theme.primary, borderRadius: 9, paddingHorizontal: 18, paddingVertical: 10, marginTop: 14 },
  retryText: { color: theme.onPrimary, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center', padding: 19, borderRadius: 17, backgroundColor: theme.card },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  fieldLabel: { color: theme.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 11 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: theme.background, color: theme.textPrimary, fontSize: 15 },
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: theme.border },
  categoryChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: theme.onPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 17, marginBottom: 4 },
  cancelButton: { paddingHorizontal: 13, paddingVertical: 11 },
  cancelText: { color: theme.textSecondary, fontWeight: '600' },
  saveButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 9, backgroundColor: theme.primary },
  saveText: { color: theme.onPrimary, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});
