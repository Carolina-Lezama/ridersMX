import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../assets/theme/ThemeContext';

interface EmergencyServicesScreenProps {
  navigation: { goBack: () => void };
}

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

export const EMERGENCY_CONTACTS_STORAGE_KEY = '@ridersmx/emergency-contacts';

const defaultEmergencyContacts: EmergencyContact[] = [
  { id: '911', name: 'Emergencias', number: '911', detail: 'Número nacional de emergencias', icon: 'alert-circle-outline' },
  { id: 'angeles-verdes', name: 'Ángeles Verdes', number: '078', detail: 'Auxilio y orientación turística en carretera', icon: 'construct-outline' },
  { id: 'cruz-roja', name: 'Cruz Roja', number: '065', detail: 'Atención prehospitalaria (sujeto a disponibilidad local)', icon: 'medkit-outline' },
  { id: 'capufe', name: 'CAPUFE', number: '074', detail: 'Auxilio en tramos operados por CAPUFE', icon: 'car-outline' },
];

const isValidPhoneNumber = (number: string) =>
  /^\+?[\d()\s-]+$/.test(number.trim()) && (number.match(/\d/g)?.length ?? 0) >= 3;

const incidentSteps = [
  { title: 'Protégete', detail: 'Aléjate del flujo vehicular si puedes hacerlo sin riesgo. Enciende intermitentes y usa equipo reflectante.' },
  { title: 'Pide ayuda', detail: 'Llama al 911 si hay personas lesionadas o peligro inmediato. Indica carretera, sentido, kilómetro y referencias.' },
  { title: 'No muevas a una persona lesionada', detail: 'Salvo peligro inminente, evita moverla y sigue las instrucciones del operador de emergencias.' },
];

const breakdownSteps = [
  { title: 'Busca un lugar seguro', detail: 'Reduce la velocidad y sal de la vía solo si puedes hacerlo con seguridad. Evita quedarte en carriles o curvas.' },
  { title: 'Hazte visible', detail: 'Enciende intermitentes y colócate detrás de una barrera de protección si existe. No trabajes junto al tránsito.' },
  { title: 'Solicita auxilio', detail: 'Usa 078 para Ángeles Verdes o 074 en tramos CAPUFE. Comparte ubicación y sentido de circulación.' },
];

export default function EmergencyServicesScreen({ navigation }: EmergencyServicesScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [contacts, setContacts] = useState(defaultEmergencyContacts);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [editedNumber, setEditedNumber] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadContacts = async () => {
      try {
        const storedContacts = await AsyncStorage.getItem(EMERGENCY_CONTACTS_STORAGE_KEY);
        if (storedContacts) {
          const parsedContacts: unknown = JSON.parse(storedContacts);
          if (!parsedContacts || typeof parsedContacts !== 'object' || Array.isArray(parsedContacts)) {
            throw new Error('La configuración guardada no tiene un formato válido.');
          }

          const savedNumbers = parsedContacts as Record<string, unknown>;
          const restoredContacts = defaultEmergencyContacts.map((contact) => {
            const number = savedNumbers[contact.id];
            if (number === undefined) return contact;
            if (typeof number !== 'string' || !isValidPhoneNumber(number)) {
              throw new Error(`El número guardado para ${contact.name} no es válido.`);
            }
            return { ...contact, number };
          });
          if (isMounted) setContacts(restoredContacts);
        }
      } catch (error) {
        console.error('No se pudieron cargar los números de auxilio:', error);
        if (isMounted) {
          setCallError('No se pudieron cargar los números guardados. Se muestran los números originales.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadContacts();
    return () => {
      isMounted = false;
    };
  }, []);

  const callNumber = async (name: string, number: string) => {
    setCallError(null);
    try {
      await Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`);
    } catch (error) {
      console.error(`No se pudo abrir el marcador para ${name}:`, error);
      setCallError(`No se pudo abrir la llamada a ${name}. Marca ${number} directamente desde tu teléfono.`);
    }
  };

  const saveContacts = async (updatedContacts: EmergencyContact[]) => {
    setIsSaving(true);
    try {
      const savedNumbers = Object.fromEntries(updatedContacts.map(({ id, number }) => [id, number]));
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_STORAGE_KEY, JSON.stringify(savedNumbers));
      setContacts(updatedContacts);
      setCallError(null);
      setEditingContact(null);
      setEditError(null);
    } catch (error) {
      console.error('No se pudieron guardar los números de auxilio:', error);
      setEditError('No se pudieron guardar los cambios. Inténtalo de nuevo.');
      setCallError('No se pudieron guardar los números configurados.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditor = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setEditedNumber(contact.number);
    setEditError(null);
  };

  const saveEditedNumber = () => {
    const number = editedNumber.trim();
    if (!isValidPhoneNumber(number)) {
      setEditError('Escribe un número válido con al menos 3 dígitos.');
      return;
    }
    if (!editingContact) return;
    void saveContacts(contacts.map((contact) =>
      contact.id === editingContact.id ? { ...contact, number } : contact,
    ));
  };

  const resetContacts = () => {
    Alert.alert(
      'Restablecer números',
      'Se reemplazarán tus números configurados por los números originales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', style: 'destructive', onPress: () => void saveContacts(defaultEmergencyContacts) },
      ],
    );
  };

  const renderGuide = (title: string, icon: React.ComponentProps<typeof Ionicons>['name'], steps: typeof incidentSteps) => (
    <View style={styles.guideCard}>
      <View style={styles.guideHeading}>
        <Ionicons name={icon} size={22} color={theme.primary} />
        <Text style={styles.guideTitle}>{title}</Text>
      </View>
      {steps.map((step, index) => (
        <View key={step.title} style={styles.guideStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDetail}>{step.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );

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
        <Text style={styles.headerTitle}>Auxilio en carretera</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={23} color={theme.infoText} />
          <Text style={styles.noticeText}>Accesos rápidos y guía disponibles sin conexión. La llamada requiere señal celular; el teléfono abrirá el marcador.</Text>
        </View>

        <Text style={styles.sectionTitle}>Llamadas de emergencia</Text>
        {isLoading ? (
          <Text style={styles.contactDetail}>Cargando números configurados...</Text>
        ) : contacts.map((contact, index) => (
          <View key={contact.id} style={[styles.contactCard, index === 0 && styles.primaryContact]}>
            <View style={[styles.contactIcon, index === 0 && styles.primaryContactIcon]}>
              <Ionicons name={contact.icon} size={23} color={index === 0 ? theme.dangerText : theme.primary} />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactDetail}>{contact.detail}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditor(contact)}
              accessibilityRole="button"
              accessibilityLabel={`Editar número de ${contact.name}`}
              disabled={isSaving}
            >
              <Ionicons name="create-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => void callNumber(contact.name, contact.number)}
              accessibilityRole="button"
              accessibilityLabel={`Llamar a ${contact.name}, ${contact.number}`}
            >
              <Text style={styles.callNumber}>{contact.number}</Text>
              <Ionicons name="call-outline" size={16} color={theme.onPrimary} />
            </TouchableOpacity>
          </View>
        ))}

        {!isLoading && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetContacts}
            accessibilityRole="button"
            disabled={isSaving}
          >
            <Text style={styles.resetButtonText}>Restablecer números originales</Text>
          </TouchableOpacity>
        )}

        {callError && <Text style={styles.errorText} accessibilityRole="alert">{callError}</Text>}

        <Text style={[styles.sectionTitle, styles.guideSectionTitle]}>Qué hacer</Text>
        {renderGuide('En caso de incidente vial', 'warning-outline', incidentSteps)}
        {renderGuide('En caso de falla mecánica', 'build-outline', breakdownSteps)}
        <Text style={styles.footerNote}>La seguridad es primero. Sigue las instrucciones de los servicios de emergencia y las autoridades locales.</Text>
      </ScrollView>

      <Modal
        visible={editingContact !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingContact(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingContact(null)}>
          <Pressable style={styles.editModal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Configurar número</Text>
            <Text style={styles.modalDescription}>{editingContact?.name}</Text>
            <TextInput
              style={styles.numberInput}
              value={editedNumber}
              onChangeText={setEditedNumber}
              placeholder="Número de teléfono"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              maxLength={24}
              accessibilityLabel="Número de teléfono"
            />
            {editError && <Text style={styles.errorText} accessibilityRole="alert">{editError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingContact(null)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={saveEditedNumber}
                disabled={isSaving}
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, backgroundColor: theme.infoBg, borderWidth: 1, borderColor: theme.infoBorder },
  noticeText: { flex: 1, color: theme.infoText, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  contactCard: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 15 },
  primaryContact: { borderColor: theme.dangerBorder },
  contactIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: theme.infoBg, marginRight: 11 },
  primaryContactIcon: { backgroundColor: theme.dangerBg },
  contactText: { flex: 1, marginRight: 8 },
  contactName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  contactDetail: { color: theme.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 3 },
  editButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  callButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  callNumber: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  resetButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 3 },
  resetButtonText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  errorText: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  editModal: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, borderRadius: 18, backgroundColor: theme.card },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  modalDescription: { color: theme.textSecondary, fontSize: 14, marginTop: 5, marginBottom: 14 },
  numberInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, color: theme.textPrimary, backgroundColor: theme.background, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 11 },
  cancelButtonText: { color: theme.textSecondary, fontWeight: '600' },
  saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 17, paddingVertical: 11 },
  saveButtonText: { color: theme.onPrimary, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  guideSectionTitle: { marginTop: 22 },
  guideCard: { backgroundColor: theme.card, borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  guideHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 },
  guideTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 13 },
  stepNumber: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.infoBg, marginRight: 10 },
  stepNumberText: { color: theme.infoText, fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1 },
  stepTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  stepDetail: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  footerNote: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
});
