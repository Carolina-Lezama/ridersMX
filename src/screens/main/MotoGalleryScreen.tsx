import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../assets/theme/ThemeContext';
import { supabase } from '../../services/supabase';
import {
  createMotorcycleGalleryPhoto,
  deleteMotorcycleGalleryPhoto,
  listMotorcycleGalleryPhotos,
  MOTORCYCLE_GALLERY_MAX_FILE_SIZE,
  MotorcycleGalleryPhoto,
  updateMotorcycleGalleryPhoto,
} from '../../services/motorcycleGalleryService';

const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const isValidDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.getUTCFullYear() === Number(yearText)
    && date.getUTCMonth() === Number(monthText) - 1
    && date.getUTCDate() === Number(dayText);
};

const getAssetMimeType = (asset: ImagePicker.ImagePickerAsset) => {
  const mimeType = asset.mimeType?.toLowerCase() ?? '';
  if (['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return mimeType;
  const extensions = [asset.uri, asset.fileName ?? '']
    .map((value) => value.split('?')[0].split('.').pop()?.toLowerCase());
  if (extensions.includes('png')) return 'image/png';
  if (extensions.includes('webp')) return 'image/webp';
  if (extensions.includes('jpg') || extensions.includes('jpeg')) return 'image/jpeg';
  return mimeType;
};

export default function MotoGalleryScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const motorcycleId = route.params?.motoId;
  const [motorcycleName, setMotorcycleName] = useState('');
  const [photos, setPhotos] = useState<MotorcycleGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [canRetryLoad, setCanRetryLoad] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<MotorcycleGalleryPhoto | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<MotorcycleGalleryPhoto | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fecha, setFecha] = useState(localToday());
  const [nota, setNota] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadGallery = useCallback(async (showLoading = true) => {
    if (!motorcycleId) {
      setPageError('No se indicó qué motocicleta quieres consultar.');
      setLoading(false);
      return;
    }

    setPageError(null);
    setCanRetryLoad(false);
    if (showLoading) setLoading(true);
    try {
      const [motorcycleResult, galleryPhotos] = await Promise.all([
        supabase
          .from('motocicletas')
          .select('alias, marca, modelo')
          .eq('id', motorcycleId)
          .single(),
        listMotorcycleGalleryPhotos(motorcycleId),
      ]);
      if (motorcycleResult.error) throw motorcycleResult.error;
      setMotorcycleName(
        motorcycleResult.data.alias
        || `${motorcycleResult.data.marca} ${motorcycleResult.data.modelo}`,
      );
      setPhotos(galleryPhotos);
    } catch (error) {
      console.error('No se pudo cargar la galería de la motocicleta:', error);
      setPageError(error instanceof Error ? error.message : 'No se pudo cargar la galería.');
      setCanRetryLoad(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [motorcycleId]);

  useFocusEffect(
    useCallback(() => {
      void loadGallery();
    }, [loadGallery]),
  );

  const openNewEntry = () => {
    setEditingPhoto(null);
    setSelectedAsset(null);
    setFecha(localToday());
    setNota('');
    setFormError(null);
    setModalVisible(true);
  };

  const openEditEntry = (photo: MotorcycleGalleryPhoto) => {
    setEditingPhoto(photo);
    setSelectedAsset(null);
    setFecha(photo.fecha);
    setNota(photo.nota ?? '');
    setFormError(null);
    setModalVisible(true);
  };

  const selectImage = async (source: 'camera' | 'library') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError(source === 'camera'
          ? 'Permite el acceso a la cámara para tomar una foto.'
          : 'Permite el acceso a tus fotos para elegir una imagen.');
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MOTORCYCLE_GALLERY_MAX_FILE_SIZE) {
        throw new Error('La foto debe pesar menos de 10 MB.');
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(getAssetMimeType(asset))) {
        throw new Error('Elige una imagen JPG, PNG o WebP. Si usas HEIC, guarda o comparte una copia compatible.');
      }
      setSelectedAsset(asset);
      setFormError(null);
    } catch (error) {
      console.error('No se pudo seleccionar la foto para la galería:', error);
      setFormError(error instanceof Error ? error.message : 'No se pudo seleccionar la foto.');
    }
  };

  const saveEntry = async () => {
    if (!isValidDate(fecha)) {
      setFormError('Escribe una fecha válida con formato AAAA-MM-DD.');
      return;
    }
    if (nota.trim().length > 300) {
      setFormError('La nota no puede superar 300 caracteres.');
      return;
    }
    if (!editingPhoto && !selectedAsset) {
      setFormError('Toma una foto o elige una imagen para agregarla al álbum.');
      return;
    }

    setSaving(true);
    try {
      const input = { fecha, nota: nota.trim() || null };
      if (editingPhoto) {
        await updateMotorcycleGalleryPhoto(motorcycleId, editingPhoto.id, input);
      } else if (selectedAsset) {
        await createMotorcycleGalleryPhoto(
          motorcycleId,
          selectedAsset.uri,
          getAssetMimeType(selectedAsset),
          input,
        );
      }
      setModalVisible(false);
      setSelectedAsset(null);
      await loadGallery(false);
    } catch (error) {
      console.error('No se pudo guardar la foto de la galería:', error);
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la foto.');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = (photo: MotorcycleGalleryPhoto) => {
    const executeDelete = async () => {
      try {
        await deleteMotorcycleGalleryPhoto(motorcycleId, photo.id, photo.storage_path);
        setPhotos((previous) => previous.filter((item) => item.id !== photo.id));
      } catch (error) {
        console.error('No se pudo eliminar la foto de la galería:', error);
        const message = error instanceof Error ? error.message : 'No se pudo eliminar la foto.';
        await loadGallery(false);
        setPageError(message);
        setCanRetryLoad(false);
      }
    };

    const confirmation = '¿Eliminar esta foto y su registro del álbum de la motocicleta?';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmation)) void executeDelete();
      return;
    }
    Alert.alert('Eliminar foto', confirmation, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void executeDelete() },
    ]);
  };

  const shownPhotoUri = selectedAsset?.uri ?? editingPhoto?.signedUrl ?? null;

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
          <Text style={styles.headerTitle}>Galería de la moto</Text>
          {!!motorcycleName && <Text style={styles.headerSubtitle}>{motorcycleName}</Text>}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.intro}>
        <Ionicons name="images-outline" size={22} color={theme.infoText} />
        <Text style={styles.introText}>
          Un álbum privado para tus viajes y la evolución de tu motocicleta.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={openNewEntry}
        accessibilityRole="button"
        accessibilityLabel="Agregar foto a la galería"
      >
        <Ionicons name="camera-outline" size={21} color={theme.onPrimary} />
        <Text style={styles.addButtonText}>Agregar foto</Text>
      </TouchableOpacity>

      {pageError && !loading && photos.length > 0 && (
        <Text style={styles.errorBanner} accessibilityRole="alert">{pageError}</Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      ) : pageError && photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={44} color={theme.dangerText} />
          <Text style={styles.emptyText}>{pageError}</Text>
          {canRetryLoad && (
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadGallery()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="image-outline" size={48} color={theme.iconSecondary} />
          <Text style={styles.emptyTitle}>Tu álbum está vacío</Text>
          <Text style={styles.emptyText}>Agrega fotos de viajes, destinos o mejoras de tu moto.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.galleryContent} showsVerticalScrollIndicator={false}>
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <TouchableOpacity
                  onPress={() => setViewingPhoto(photo)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver foto del ${new Date(`${photo.fecha}T00:00:00`).toLocaleDateString('es-MX')}`}
                >
                  <Image source={{ uri: photo.signedUrl }} style={styles.thumbnail} resizeMode="cover" />
                </TouchableOpacity>
                <Text style={styles.photoDate}>
                  {new Date(`${photo.fecha}T00:00:00`).toLocaleDateString('es-MX')}
                </Text>
                {!!photo.nota && <Text style={styles.photoNote} numberOfLines={3}>{photo.nota}</Text>}
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    onPress={() => openEditEntry(photo)}
                    style={styles.photoAction}
                    accessibilityRole="button"
                    accessibilityLabel="Editar nota y fecha"
                  >
                    <Ionicons name="create-outline" size={17} color={theme.primary} />
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeEntry(photo)}
                    style={styles.photoAction}
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar foto"
                  >
                    <Ionicons name="trash-outline" size={17} color={theme.dangerText} />
                    <Text style={styles.deleteText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
              <Text style={styles.modalTitle}>{editingPhoto ? 'Editar detalle de foto' : 'Agregar foto al álbum'}</Text>
              {!editingPhoto && (
                <View style={styles.pickerActions}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => void selectImage('camera')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="camera-outline" size={20} color={theme.primary} />
                    <Text style={styles.pickerButtonText}>Tomar foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => void selectImage('library')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="images-outline" size={20} color={theme.primary} />
                    <Text style={styles.pickerButtonText}>Elegir de galería</Text>
                  </TouchableOpacity>
                </View>
              )}
              {shownPhotoUri ? (
                <Image source={{ uri: shownPhotoUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={34} color={theme.iconSecondary} />
                  <Text style={styles.placeholderText}>JPG, PNG o WebP · máximo 10 MB</Text>
                </View>
              )}
              <Text style={styles.fieldLabel}>Fecha (AAAA-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={fecha}
                onChangeText={setFecha}
                placeholder="2026-01-31"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                accessibilityLabel="Fecha de la foto"
              />
              <Text style={styles.fieldLabel}>Nota (opcional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={nota}
                onChangeText={setNota}
                placeholder="¿Dónde fue o qué cambió en tu moto?"
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={300}
                accessibilityLabel="Nota de la foto"
              />
              {formError && <Text style={styles.formError} accessibilityRole="alert">{formError}</Text>}
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
                  onPress={() => void saveEntry()}
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

      <Modal
        visible={viewingPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPhoto(null)}
      >
        <Pressable style={styles.viewerOverlay} onPress={() => setViewingPhoto(null)}>
          {!!viewingPhoto?.signedUrl && (
            <Image source={{ uri: viewingPhoto.signedUrl }} style={styles.fullImage} resizeMode="contain" />
          )}
          <TouchableOpacity
            style={styles.closeViewer}
            onPress={() => setViewingPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar foto"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
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
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 18, marginTop: 14, marginBottom: 6, padding: 13, borderRadius: 11, backgroundColor: theme.primary },
  addButtonText: { color: theme.onPrimary, fontWeight: '700', fontSize: 14 },
  loader: { marginTop: 42 },
  galleryContent: { padding: 14, paddingBottom: 38 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoCard: { width: '48.5%', padding: 8, marginBottom: 12, borderRadius: 13, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  thumbnail: { width: '100%', aspectRatio: 1, borderRadius: 9, backgroundColor: theme.background },
  photoDate: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 8 },
  photoNote: { color: theme.textPrimary, fontSize: 12, lineHeight: 17, marginTop: 4, minHeight: 17 },
  photoActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: 6 },
  photoAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3 },
  editText: { color: theme.primary, fontSize: 11, fontWeight: '600' },
  deleteText: { color: theme.dangerText, fontSize: 11, fontWeight: '600' },
  errorBanner: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 9, padding: 10, marginHorizontal: 18, marginTop: 8, fontSize: 12, lineHeight: 17 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 26 },
  emptyTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  retryButton: { backgroundColor: theme.primary, borderRadius: 9, paddingHorizontal: 18, paddingVertical: 10, marginTop: 14 },
  retryText: { color: theme.onPrimary, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center', padding: 19, borderRadius: 17, backgroundColor: theme.card },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  pickerActions: { flexDirection: 'row', gap: 9, marginBottom: 11 },
  pickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.background },
  pickerButtonText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, backgroundColor: theme.background },
  photoPlaceholder: { minHeight: 130, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, backgroundColor: theme.background },
  placeholderText: { color: theme.textSecondary, fontSize: 12, marginTop: 7 },
  fieldLabel: { color: theme.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 13 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: theme.background, color: theme.textPrimary, fontSize: 15 },
  noteInput: { minHeight: 70, textAlignVertical: 'top' },
  formError: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 9, padding: 10, fontSize: 12, lineHeight: 17, marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 16 },
  cancelButton: { paddingHorizontal: 13, paddingVertical: 11 },
  cancelText: { color: theme.textSecondary, fontWeight: '600' },
  saveButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 9, backgroundColor: theme.primary },
  saveText: { color: theme.onPrimary, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  viewerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.94)', padding: 12 },
  fullImage: { width: '100%', height: '85%' },
  closeViewer: { position: 'absolute', top: 44, right: 18, padding: 8 },
});
