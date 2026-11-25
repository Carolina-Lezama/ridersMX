import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';

interface EmergencyServicesScreenProps {
  navigation: { goBack: () => void };
}

const emergencyContacts = [
  { id: '911', name: 'Emergencias', number: '911', detail: 'Número nacional de emergencias', icon: 'alert-circle-outline' },
  { id: 'angeles-verdes', name: 'Ángeles Verdes', number: '078', detail: 'Auxilio y orientación turística en carretera', icon: 'construct-outline' },
  { id: 'cruz-roja', name: 'Cruz Roja', number: '065', detail: 'Atención prehospitalaria (sujeto a disponibilidad local)', icon: 'medkit-outline' },
  { id: 'capufe', name: 'CAPUFE', number: '074', detail: 'Auxilio en tramos operados por CAPUFE', icon: 'car-outline' },
] as const;

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
  const [callError, setCallError] = useState<string | null>(null);

  const callNumber = async (name: string, number: string) => {
    setCallError(null);
    try {
      await Linking.openURL(`tel:${number}`);
    } catch (error) {
      console.error(`No se pudo abrir el marcador para ${name}:`, error);
      setCallError(`No se pudo abrir la llamada a ${name}. Marca ${number} directamente desde tu teléfono.`);
    }
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
        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={contact.id}
            style={[styles.contactCard, index === 0 && styles.primaryContact]}
            onPress={() => void callNumber(contact.name, contact.number)}
            accessibilityRole="button"
            accessibilityLabel={`Llamar a ${contact.name}, ${contact.number}`}
          >
            <View style={[styles.contactIcon, index === 0 && styles.primaryContactIcon]}>
              <Ionicons name={contact.icon} size={23} color={index === 0 ? theme.dangerText : theme.primary} />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactDetail}>{contact.detail}</Text>
            </View>
            <View style={styles.callButton}>
              <Text style={styles.callNumber}>{contact.number}</Text>
              <Ionicons name="call-outline" size={16} color={theme.onPrimary} />
            </View>
          </TouchableOpacity>
        ))}

        {callError && <Text style={styles.errorText} accessibilityRole="alert">{callError}</Text>}

        <Text style={[styles.sectionTitle, styles.guideSectionTitle]}>Qué hacer</Text>
        {renderGuide('En caso de incidente vial', 'warning-outline', incidentSteps)}
        {renderGuide('En caso de falla mecánica', 'build-outline', breakdownSteps)}
        <Text style={styles.footerNote}>La seguridad es primero. Sigue las instrucciones de los servicios de emergencia y las autoridades locales.</Text>
      </ScrollView>
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
  callButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  callNumber: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  errorText: { color: theme.dangerText, backgroundColor: theme.dangerBg, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19 },
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
