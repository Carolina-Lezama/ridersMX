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
  Alert,
  Image,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
import geminiapi from '../../services/geminiapiurl';
import Markdown from 'react-native-markdown-display'; //y esta tambien
import * as ImagePicker from 'expo-image-picker'; //npx expo install expo-image-picker react-native-markdown-display para esta libreria
import * as FileSystem from 'expo-file-system/legacy';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  imageUris?: string[]; // Soportar múltiples URIs en la burbuja del chat
}

export default function DiagnosticoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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

  // Estado para manejar múltiples imágenes seleccionadas en espera (Preview horizontal)
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState<Array<{ uri: string; base64: string }>>([]);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 1. Abre la galería permitiendo selección múltiple y acumula las imágenes en el preview
  const handleSeleccionarImagen = async () => {
    if (isLoading) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true, // Permite seleccionar varias imágenes a la vez
      quality: 0.9,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imagenesNuevas = result.assets
        .filter(asset => asset.base64)
        .map(asset => ({
          uri: asset.uri,
          base64: asset.base64 as string,
        }));

      // Acumulamos las nuevas imágenes al arreglo existente
      setImagenesSeleccionadas(prev => [...prev, ...imagenesNuevas]);
    }
  };

  // Función para eliminar una sola imagen del preview deslizable
  const eliminarImagenPendiente = (indexToRemove: number) => {
    setImagenesSeleccionadas(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Función unificada para enviar texto solo o texto + imágenes pendientes en espera
  const enviarmensajeconimagenopcional = async () => {
    const textoAEscribir = inputText.trim();
    if ((!textoAEscribir && imagenesSeleccionadas.length === 0) || isLoading) return;

    setIsLoading(true);
    setInputText('');

    if (imagenesSeleccionadas.length > 0) {
      // CASO A: Hay imágenes en espera + texto (o prompt por defecto)
      const promptFinal = textoAEscribir || 'Analiza estas imágenes y dime qué observas o qué problema podría tener.';

      // Extraemos todas las URIs para el mensaje visual y todos los Base64 para enviarlos a la API
      const urisParaMensaje = imagenesSeleccionadas.map(img => img.uri);
      const base64ParaEnviar = imagenesSeleccionadas.map(img => img.base64);

      const newUserMessage: Message = {
        id: Date.now().toString(),
        text: promptFinal,
        sender: 'user',
        imageUris: urisParaMensaje, // Guardamos todas las URIs de las fotos seleccionadas
      };

      setMessages(prev => [...prev, newUserMessage]);
      setImagenesSeleccionadas([]); // Limpiamos el preview

      try {
        const respuestaIA = await geminiapi.enviarImagenYTexto(base64ParaEnviar, promptFinal);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: respuestaIA,
          sender: 'ai',
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error al enviar las imágenes:', error);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            text: error instanceof Error ? error.message : 'No se pudo procesar la imagen.',
            sender: 'ai',
          },
        ]);
      } finally {
        setIsLoading(false);
      }

    } else {
      // CASO B: Es solo texto normal (sin imágenes adjuntas)
      const newUserMessage: Message = {
        id: Date.now().toString(),
        text: textoAEscribir,
        sender: 'user',
      };
      setMessages(prev => [...prev, newUserMessage]);

      try {
        const respuestaIA = await geminiapi.enviarMensaje(textoAEscribir);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: respuestaIA,
          sender: 'ai',
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            text: error instanceof Error ? error.message : 'No se pudo obtener una respuesta.',
            sender: 'ai',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 3. FUNCIONALIDAD BORRAR CHAT
  const handleClearChat = () => {
    Keyboard.dismiss(); // Cierra el teclado si está abierto
    Alert.alert(
      'Borrar chat',
      '¿Estás seguro de que deseas limpiar toda la conversación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: '1',
                text: 'Hola! ¿En qué puedo ayudarte hoy?',
                sender: 'ai',
              },
            ]);
            setImagenesSeleccionadas([]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
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
                item.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {/* Renderizar múltiples imágenes dentro de la burbuja si existen */}
              {item.imageUris && item.imageUris.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {item.imageUris.map((uri, idx) => (
                    <Image
                      key={idx}
                      source={{ uri }}
                      style={{ width: 140, height: 110, borderRadius: 8, marginRight: 6 }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              )}

              {item.sender === 'user' ? (
                <Text style={styles.userText}>{item.text}</Text>
              ) : (
                <Markdown style={{ body: styles.aiText }}>
                  {item.text}
                </Markdown>
              )}
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

        {/* VISTA PREVIA HORIZONTAL DE LAS IMÁGENES SELECCIONADAS EN ESPERA */}
        {imagenesSeleccionadas.length > 0 && (
          <View style={styles.previewContainer}>
            <FlatList
              horizontal
              data={imagenesSeleccionadas}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={styles.previewThumbnailContainer}>
                  <Image source={{ uri: item.uri }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.deletePreviewButton} 
                    onPress={() => eliminarImagenPendiente(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#ff4d4d" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {/* BARRA DE ESCRITURA */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={imagenesSeleccionadas.length > 0 ? "Escribe detalles sobre las imágenes..." : "Escribe tu consulta..."}
            placeholderTextColor={theme.iconSecondary}
            returnKeyType="send"
            onSubmitEditing={enviarmensajeconimagenopcional}
            editable={!isLoading}
          />

          {/* ADJUNTAR IMAGEN */}
          <TouchableOpacity
            style={styles.toolButton}
            disabled={isLoading}
            onPress={handleSeleccionarImagen}
          >
            <Ionicons name="attach" size={22} color={theme.iconSecondary} />
          </TouchableOpacity>

          {/* BORRAR */}
          <TouchableOpacity
            style={styles.toolButton}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              console.log('¡Botón de borrar presionado!'); // <-- Comprueba esto en tu terminal
              handleClearChat();
            }}
          >
            <Ionicons name="trash-outline" size={22} color={theme.iconSecondary} />
          </TouchableOpacity>

          {/* ENVIAR */}
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={enviarmensajeconimagenopcional}
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
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
    backButton: { padding: 5, width: 38 },
    titulo: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.textPrimary,
    },
    headerSpace: { width: 38 },
    content: { flex: 1, minHeight: 0 },
    messageList: { flex: 1, minHeight: 0 },
    messages: { padding: 20, paddingBottom: 20, flexGrow: 1 },
    bubble: { padding: 15, borderRadius: 20, marginVertical: 5, maxWidth: '85%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: theme.primary },
    aiBubble: {
      alignSelf: 'flex-start',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    userText: { color: theme.onPrimary },
    aiText: { color: theme.textPrimary },
    loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loadingText: { color: theme.iconSecondary, fontSize: 14, fontStyle: 'italic' },
    previewContainer: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    previewThumbnailContainer: {
      marginRight: 8,
      position: 'relative',
    },
    previewImage: {
      width: 65,
      height: 65,
      borderRadius: 8,
    },
    deletePreviewButton: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.card,
      borderRadius: 12,
    },
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
    toolButton: { padding: 7, borderRadius: 10, backgroundColor: theme.background, marginLeft: 3 },
    sendButton: {
      backgroundColor: theme.iconPrimary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      marginLeft: 6,
    },
    sendButtonDisabled: { opacity: 0.5 },
    sendButtonText: { color: theme.background, fontWeight: 'bold' },
  });