

Fase 2: Lógica de Detección (El "Trigger" o Disparador)
Necesitamos que la app "se dé cuenta" de que una rodada ya pasó y pida la reseña.

Cuándo preguntar: Al abrir la app (en el componente principal como MainApp o el Lobby), hacemos un fetch a Supabase buscando eventos cuya fecha (y hora) sea en el pasado, que pertenezcan al usuario y cuyo estado_review sea 'pendiente'.

Cómo preguntar: Mostrar un Modal interactivo o un Banner superior que diga: "¡Parece que ayer tuviste una rodada a [Destino/Nombre]! ¿Qué tal estuvo?".

Fase 3: Interfaz de Usuario (UI del Formulario de Reseña)
Crearemos una pantalla o modal hermoso y rápido de llenar.

Estrellas (Rating): ¿Qué tan buena fue la ruta? (1-5).

Inputs Numéricos: Distancia (Km) y Tiempo (Horas/Minutos).

Foto (Opcional): Botón para subir la mejor foto del día (subida a Supabase Storage).

Botones de Acción: "Guardar Bitácora" o "Saltar por ahora".

Fase 4: Consolidación para el Lobby/Estadísticas
Una vez guardado, este evento se muestra en un "Feed" personal (o público en el foro si así lo configuran) con la foto, la distancia y la calificación.

Sumar los Km a un total global del usuario para darle la insignia de "1,000 Km recorridos".

💻 Esqueleto del Código (UI del Modal de Reseña)
Este código asume que detectaste una rodada pasada y lanzas un Modal (o navegas a esta pantalla) pasándole los datos del evento pendiente.

TypeScript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../assets/theme/ThemeContext';
// import * as ImagePicker from 'expo-image-picker'; // Para seleccionar fotos
// import { supabase } from '../../../lib/supabase';

interface ReviewModalProps {
  visible: boolean;
  evento: any; // Datos del evento pendiente (id, titulo, fecha)
  onClose: () => void;
  onSuccess: () => void;
}

export default function PostRideReviewModal({ visible, evento, onClose, onSuccess }: ReviewModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Estados del formulario
  const [rating, setRating] = useState(0);
  const [distancia, setDistancia] = useState('');
  const [duracion, setDuracion] = useState('');
  const [notas, setNotas] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  
  const [guardando, setGuardando] = useState(false);

  // --- FUNCIÓN PARA SELECCIONAR FOTO ---
  const seleccionarFoto = async () => {
    /* Descomentar cuando instales expo-image-picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
    */
  };

  // --- FUNCIÓN PARA GUARDAR EN SUPABASE ---
  const handleGuardar = async () => {
    if (rating === 0) {
      alert('¡Por favor califica tu rodada!');
      return;
    }
    
    setGuardando(true);
    try {
      /* EJEMPLO DE ACTUALIZACIÓN EN SUPABASE:
      
      // 1. (Opcional) Si hay foto, subirla a Supabase Storage y obtener la URL pública...
      // let publicFotoUrl = await uploadImage(fotoUri);

      // 2. Actualizar el evento original
      const { error } = await supabase
        .from('eventos')
        .update({
          calificacion: rating,
          distancia_km: parseFloat(distancia) || 0,
          duracion_minutos: parseInt(duracion) || 0,
          comentarios_review: notas,
          // foto_url: publicFotoUrl,
          estado_review: 'completado', // Ya no volverá a preguntar
          completado: true // Marcar cita como realizada
        })
        .eq('id', evento.id);

      if (error) throw error;
      */
      
      // Simulación de guardado exitoso
      setTimeout(() => {
        setGuardando(false);
        onSuccess(); // Cierra el modal y refresca la lista
      }, 1000);

    } catch (error) {
      console.error('Error guardando reseña', error);
      setGuardando(false);
    }
  };

  const handleIgnorar = async () => {
    /* Aquí podrías actualizar Supabase con estado_review = 'ignorado' 
       para no volver a molestar al usuario con este evento específico. */
    onClose();
  };

  if (!evento) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <Text style={styles.titulo}>¡Rodada Completada!</Text>
          <Text style={styles.subtitulo}>¿Qué tal estuvo tu salida a {evento.titulo}?</Text>

          {/* RATING ESTRELLAS */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"} 
                  size={40} 
                  color={theme.primary} 
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* INPUTS DE DATOS */}
          <View style={styles.rowInputs}>
            <View style={styles.inputWrapper}>
              <Ionicons name="speedometer-outline" size={20} color={theme.iconSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Km aprox."
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={distancia}
                onChangeText={setDistancia}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="time-outline" size={20} color={theme.iconSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Minutos"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={duracion}
                onChangeText={setDuracion}
              />
            </View>
          </View>

          {/* NOTAS */}
          <TextInput
            style={styles.textArea}
            placeholder="¿Algún comentario o anécdota de la ruta?"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            value={notas}
            onChangeText={setNotas}
          />

          {/* FOTO (Opcional) */}
          <TouchableOpacity style={styles.photoButton} onPress={seleccionarFoto}>
            <Ionicons name={fotoUri ? "image" : "camera-outline"} size={24} color={theme.primary} />
            <Text style={styles.photoButtonText}>
              {fotoUri ? 'Cambiar Foto' : 'Añadir Foto del día (Opcional)'}
            </Text>
          </TouchableOpacity>
          
          {fotoUri && <Image source={{ uri: fotoUri }} style={styles.previewImage} />}

          {/* BOTONES DE ACCIÓN */}
          <TouchableOpacity 
            style={[styles.saveBtn, guardando && { opacity: 0.7 }]} 
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar en mi Bitácora</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleIgnorar}>
            <Text style={styles.skipBtnText}>No registrar esta vez</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: theme.card, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 24, 
    borderTopWidth: 1,
    borderColor: theme.border
  },
  titulo: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, textAlign: 'center' },
  subtitulo: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 25 },
  
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 15 },
  inputWrapper: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.background, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: theme.border,
    paddingHorizontal: 12 
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, color: theme.textPrimary, fontSize: 15 },
  
  textArea: { 
    backgroundColor: theme.background, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: theme.border, 
    padding: 15, 
    color: theme.textPrimary, 
    fontSize: 15, 
    minHeight: 80, 
    textAlignVertical: 'top', 
    marginBottom: 15 
  },
  
  photoButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 15, 
    backgroundColor: theme.primary + '15', // Transparencia suave
    borderRadius: 12, 
    marginBottom: 15 
  },
  photoButtonText: { color: theme.primary, fontWeight: '600', marginLeft: 10, fontSize: 15 },
  previewImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 15, resizeMode: 'cover' },
  
  saveBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  skipBtn: { paddingVertical: 14, alignItems: 'center' },
  skipBtnText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' }
});















Para tu perfil como desarrolladora y con múltiples proyectos en puerta (como tu sistema de papelería en PHP/MySQL y tus aplicaciones web/móviles), lo más inteligente y económico es comprar un VPS único (como un servidor en Hetzner o DigitalOcean).

















Fase 1: Blindaje de la Base de Datos (RLS para Motocicletas)
Acción: Ejecutaremos un script SQL en Supabase para crear las Políticas de Seguridad (Policies) específicas para la tabla motocicletas.

Justificación: Si recuerdas nuestro tropiezo con el error 401 en el registro, fue porque la tabla estaba bloqueada. Necesitamos decirle a Supabase: "Permite que un usuario inserte, actualice y borre motos, pero solo si el perfil_id de esa moto coincide con su sesión actual". Sin esto, el frontend fallará silenciosamente.







2. Mejoras de UI/UX a tus módulos actuales
   Ya tienes la estructura funcional de varios apartados. Ahora podemos hacer que se sientan como una aplicación Premium:

Skeletons Loaders (Dashboard y Perfil): En lugar de mostrar la clásica ruedita azul girando (ActivityIndicator) cuando la app cargue datos, podemos construir "Skeletons". Son esos bloques de color gris claro que parpadean y simulan la forma que tendrá el contenido (como hace YouTube o Facebook antes de cargar un video).

Validación de Formularios "En Vivo" (Login, Register, Moto): Actualmente, la aplicación espera a que el usuario presione "Guardar" para decirle si hay un error. Podemos implementar lógica local para que, si el usuario escribe un correo inválido o una contraseña muy corta, el borde del CustomInput se ponga rojo de inmediato y muestre un texto de ayuda debajo, antes de enviar el formulario.

Micro-animaciones (Barra de opciones / Menú): Podemos agregar efectos visuales para que, cuando el usuario toque un icono de la barra de navegación inferior, este haga un pequeño rebote o cambie de tamaño suavemente.

Estados Vacíos Ilustrados (Empty States): Ya hicimos uno básico en el Garaje (cuando no hay motos), pero podemos mejorarlo en el Dashboard. Diseñar componentes atractivos que guíen al usuario sobre qué hacer cuando no tiene datos registrados aún.

codigo de app a revisar:

Etapa 4: Animaciones y Microinteracciones (Opcional pero recomendado)
¿Qué haremos? Utilizaremos la API Animated nativa de React Native o la librería react-native-reanimated para hacer que los puntitos indicadores crezcan o cambien de color suavemente conforme el usuario desliza la pantalla.

Justificación: Este es el "excelente ejercicio de diseño" que mencionaste. Las transiciones fluidas marcan la diferencia entre una app que se siente "de juguete" y una app que se siente "premium".




        {/* SECCIÓN 3: SOPORTE E INFORMACIÓN */}
        <Text style={styles.sectionTitle}>Soporte e Información</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Centro de Ayuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="document-text-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Términos y Privacidad</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Versión de la App</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>