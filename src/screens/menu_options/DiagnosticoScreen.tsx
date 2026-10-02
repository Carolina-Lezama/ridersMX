import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import geminiapi from '../../services/geminiapiurl';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export default function DiagnosticoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  // Referencia para controlar el desplazamiento del FlatList
  const flatListRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hola! ¿En qué puedo ayudarte hoy?',
      sender: 'ai',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Función para desplazar la lista hacia el último mensaje
  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  // Auto-scroll al cambiar los mensajes o el estado de carga
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    const texto = inputText.trim();
    if (!texto || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: texto,
      sender: 'user',
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsLoading(true);
    try {
      const respuestaIA = await geminiapi.enviarMensaje(texto);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: respuestaIA,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error al enviar el mensaje a Gemini:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: 'No se pudo obtener una respuesta. Inténtalo nuevamente.',
          sender: 'ai',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER CON BOTÓN DE REGRESO */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={28}
            color={theme.iconPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.titulo}>Diagnóstico</Text>
        <View style={styles.headerSpace} />
      </View>

      {/* CONTENIDO DEL CHAT */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* LISTA DE MENSAJES */}
        <FlatList
          ref={flatListRef}
          style={styles.messageList}
          data={messages}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messages}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.sender === 'user'
                  ? styles.userBubble
                  : styles.aiBubble,
              ]}
            >
              <Text
                style={
                  item.sender === 'user'
                    ? styles.userText
                    : styles.aiText
                }
              >
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            isLoading ? (
              <View style={[styles.bubble, styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={theme.iconPrimary} />
                <Text style={styles.loadingText}>Escribiendo...</Text>
              </View>
            ) : null
          }
        />
        {/* BARRA DE ESCRITURA */}
        <View style={styles.inputContainer}>
          {/* INPUT */}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu consulta..."
            placeholderTextColor={theme.iconSecondary}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!isLoading}
          />

          {/* ADJUNTAR */}
          <TouchableOpacity
            style={styles.toolButton}
            disabled={isLoading}
            onPress={() => {
              // Funcionalidad para adjuntar archivos.
            }}>
            <Ionicons
              name="attach"
              size={22}
              color={theme.iconSecondary}/>
          </TouchableOpacity>

          {/* MICRÓFONO */}
          <TouchableOpacity
            style={styles.toolButton}
            disabled={isLoading}
            onPress={() => {
              // Funcionalidad de voz.
            }}>
            <Ionicons
              name="mic"
              size={22}
              color={theme.iconSecondary}
            />
          </TouchableOpacity>

          {/* BORRAR */}
          <TouchableOpacity
            style={styles.toolButton}
            disabled={isLoading}
            onPress={() => setMessages([])}>
            <Ionicons
              name="trash-outline"
              size={22}
              color={theme.iconSecondary}/>
          </TouchableOpacity>

          {/* ENVIAR */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isLoading}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const createStyles = (
  theme: ReturnType<typeof useTheme>['theme']
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },

    /* HEADER */
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

    backButton: {
      padding: 5,
      width: 38,
    },

    titulo: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },

    headerSpace: {
      width: 38,
    },

    /* CONTENIDO */
    content: {
      flex: 1,
      minHeight: 0,
    },

    /* LISTA DE MENSAJES */
    messageList: {
      flex: 1,
      minHeight: 0,
    },

    messages: {
      padding: 20,
      paddingBottom: 20,
      flexGrow: 1,
    },

    /* BURBUJAS */
    bubble: {
      padding: 15,
      borderRadius: 20,
      marginVertical: 5,
      maxWidth: '85%',
    },

    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: '#2563eb',
    },

    aiBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },

    userText: {
      color: '#ffffff',
    },

    aiText: {
      color: theme.textPrimary,
    },

    /* ESTILOS DE CARGA */
    loadingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    loadingText: {
      color: theme.iconSecondary,
      fontSize: 14,
      fontStyle: 'italic',
    },

    /* BARRA DE ESCRITURA */
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      alignItems: 'center',
    },

    input: {
      flex: 1,
      minWidth: 0,
      backgroundColor: theme.background,
      color: theme.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 6,
    },

    toolButton: {
      padding: 7,
      borderRadius: 10,
      backgroundColor: theme.background,
      marginLeft: 3,
    },

    sendButton: {
      backgroundColor: theme.iconPrimary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      marginLeft: 6,
    },

    sendButtonDisabled: {
      opacity: 0.5,
    },

    sendButtonText: {
      color: theme.background,
      fontWeight: 'bold',
    },
  }
);