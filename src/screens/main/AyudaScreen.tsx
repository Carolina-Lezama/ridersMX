import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import Skeleton from '../../components/Skeleton';
import type { Theme } from '../../../assets/theme/theme';
import { supabase } from '../../services/supabase';
import appConfig from '../../../app.json';

interface FAQ {
  id: string;
  pregunta: string;
  respuesta: string;
}

type LegalDocument = 'terms' | 'privacy';

export default function AyudaScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [faqRetry, setFaqRetry] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let mounted = true;

    const cargarFaqs = async () => {
      setLoadingFaqs(true);
      setFaqError(null);
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('id, pregunta, respuesta')
          .order('orden', { ascending: true });

        if (error) throw error;
        if (mounted) setFaqs(data ?? []);
      } catch (error) {
        console.error('Error cargando las preguntas frecuentes:', error);
        if (mounted) setFaqError('No se pudieron cargar las preguntas frecuentes. Inténtalo de nuevo.');
      } finally {
        if (mounted) setLoadingFaqs(false);
      }
    };

    void cargarFaqs();
    return () => {
      mounted = false;
    };
  }, [faqRetry]);

  const mostrarAviso = (titulo: string, mensajeAviso: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensajeAviso}`);
    } else {
      Alert.alert(titulo, mensajeAviso);
    }
  };

  const enviarTicketSoporte = async () => {
    const mensajeLimpio = mensaje.trim();
    if (!mensajeLimpio) {
      mostrarAviso('Mensaje requerido', 'Escribe un mensaje detallando tu problema.');
      return;
    }

    setEnviando(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        mostrarAviso('Sesión requerida', 'Inicia sesión para enviar un mensaje al equipo de soporte.');
        return;
      }

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          perfil_id: user.id,
          asunto: 'Soporte desde App',
          mensaje: mensajeLimpio,
        });

      if (error) throw error;

      setMensaje('');
      setContactVisible(false);
      mostrarAviso('¡Enviado!', 'Hemos recibido tu mensaje. Te contactaremos pronto.');
    } catch (error) {
      console.error('Error enviando ticket de soporte:', error);
      mostrarAviso('Error', 'No se pudo enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const abrirDocumentoLegal = (documento: LegalDocument) => {
    setLegalDocument(documento);
  };

  const tituloLegal = legalDocument === 'terms' ? 'Términos de Servicio' : 'Política de Privacidad';
  const version = appConfig.expo.version;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Ayuda y Soporte</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
        {loadingFaqs ? (
          <View style={styles.faqContainer} accessible={false}>
            {[0, 1, 2, 3].map((item) => (
              <View key={item} style={styles.faqItem}>
                <Skeleton width="78%" height={16} />
              </View>
            ))}
          </View>
        ) : faqError ? (
          <View style={styles.messageCard}>
            <Text style={styles.bodyText}>{faqError}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setFaqRetry((current) => current + 1)}
            >
              <Text style={styles.inlineAction}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : faqs.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.bodyText}>Por el momento no hay preguntas frecuentes disponibles.</Text>
          </View>
        ) : (
          <View style={styles.faqContainer}>
            {faqs.map((faq, index) => {
              const isExpanded = expandedId === faq.id;
              return (
                <TouchableOpacity
                  key={faq.id}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                  style={[styles.faqItem, index === faqs.length - 1 && styles.lastFaqItem]}
                >
                  <View style={styles.faqRow}>
                    <Text style={styles.faqQuestion}>{faq.pregunta}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.iconSecondary}
                    />
                  </View>
                  {isExpanded && <Text style={styles.faqAnswer}>{faq.respuesta}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, styles.contactSectionTitle]}>¿Aún necesitas ayuda?</Text>
        <View style={styles.contactCard}>
          <Text style={styles.bodyText}>
            Envíanos un mensaje detallando tu problema o sugerencia y nuestro equipo lo revisará.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setContactVisible(true)}
            style={styles.primaryButton}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Contactar soporte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => abrirDocumentoLegal('terms')}
            style={styles.legalLink}
          >
            <Text style={styles.legalText}>Términos de Servicio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => abrirDocumentoLegal('privacy')}
            style={styles.legalLink}
          > 
            <Text style={styles.legalText}>Política de Privacidad</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Versión {version}</Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={contactVisible}
        onRequestClose={() => setContactVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Contactar soporte</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={() => setContactVisible(false)}
                  disabled={enviando}
                >
                  <Ionicons name="close" size={24} color={theme.iconPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.bodyText}>Cuéntanos cómo podemos ayudarte.</Text>
              <TextInput
                accessibilityLabel="Mensaje para soporte"
                editable={!enviando}
                style={styles.textInput}
                placeholder="Describe tu problema aquí..."
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={4000}
                value={mensaje}
                onChangeText={setMensaje}
              />
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void enviarTicketSoporte()}
                disabled={enviando}
                style={[styles.primaryButton, enviando && styles.disabledButton]}
              >
                {enviando ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>Enviar mensaje</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={legalDocument !== null}
        onRequestClose={() => setLegalDocument(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tituloLegal}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={() => setLegalDocument(null)}
              >
                <Ionicons name="close" size={24} color={theme.iconPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.bodyText}>
              Esta información estará disponible aquí cuando se publiquen los documentos legales de RidersApp.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  backButton: { padding: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  headerSpacer: { width: 28 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 15 },
  faqContainer: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  faqItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
  lastFaqItem: { borderBottomWidth: 0 },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, flex: 1, paddingRight: 10 },
  faqAnswer: { fontSize: 14, color: theme.textSecondary, marginTop: 10, lineHeight: 20 },
  messageCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
  },
  bodyText: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
  inlineAction: { color: theme.primary, fontWeight: '700', marginTop: 12 },
  contactSectionTitle: { marginTop: 30 },
  contactCard: {
    backgroundColor: theme.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { opacity: 0.7 },
  legalContainer: { marginTop: 32, alignItems: 'center' },
  legalLink: { paddingVertical: 8 },
  legalText: { fontSize: 14, color: theme.primary, fontWeight: '600' },
  versionText: { fontSize: 12, color: theme.iconSecondary, marginTop: 10 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', flex: 1 },
  textInput: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 15,
    color: theme.textPrimary,
    minHeight: 120,
    maxHeight: 220,
    textAlignVertical: 'top',
  },
});
