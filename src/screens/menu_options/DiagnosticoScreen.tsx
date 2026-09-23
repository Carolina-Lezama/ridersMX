import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import geminiapi from '../../services/apiurl';


interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export default function DiagnosticoScreen() {
  const navigation = useNavigation<any>();

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola! ¿En qué puedo ayudarte hoy?', sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };
    setMessages((prev)=>[...prev, newUserMessage]);
    setInputText('');

    try{
      const respuestaIA = await geminiapi.enviarMensaje(inputText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: respuestaIA,
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
    }
  };
  const openSidebar = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.titulo}>Diagnóstico</Text>
        {/*----------------Boton de SideBar-----------------*/}
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.backButton}>
          <FontAwesome name="bars" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text style={item.sender === 'user' ? styles.userText : styles.aiText}>
                {item.text}
              </Text>
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu consulta..."
            placeholderTextColor="#94a3b8"
          />

          <TouchableOpacity style={styles.toolButton}>
            <Ionicons name="attach" size={22} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton}>
            <Ionicons name="mic" size={22} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={() => setMessages([])}>
            <Ionicons name="trash-outline" size={22} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: { padding: 5 },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: { flex: 1 },
  bubble: { padding: 15, borderRadius: 20, marginVertical: 5, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  userText: { color: '#fff' },
  aiText: { color: '#0f172a' },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  input: { flex: 1, backgroundColor: '#f1f5f9', padding: 10, borderRadius: 20, marginRight: 10 },
  toolButton: { padding: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  sendButton: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginLeft: 8 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
  logo: { color: '#0f172a', fontSize: 22, fontWeight: 'bold' },
  label: { color: '#0f172a', fontWeight: '600', marginLeft: -20 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10, marginHorizontal: 20 },
  historySection: { marginTop: 10, paddingHorizontal: 10 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, marginBottom: 10, marginLeft: 20, textTransform: 'uppercase' },
  historyLabel: { color: '#475569', marginLeft: -20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  profileBox: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: '#2563eb', width: 45, height: 45, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  userName: { color: '#0f172a', fontWeight: 'bold' },
  userPlan: { color: '#64748b', fontSize: 12 },
});