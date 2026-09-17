revisar el codigo siguiente:
import React, { useState, useEffect } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

// IMPORTANTE: Ajusta esta ruta dependiendo de dónde guardaste ThemeContext.tsx
import { useTheme } from '../../theme/ThemeContext'; 

export default function ConfiguracionScreen({ navigation }: any) {
  // PASO 5: Obtenemos el tema global y la función para cambiarlo
  const { isDarkMode, toggleTheme, theme } = useTheme();
  
  // Generamos los estilos inyectando el tema actual (PASO 6)
  const styles = createStyles(theme);

  // Estados de otras configuraciones
  const [notificaciones, setNotificaciones] = useState(true);
  const [alertasMantenimiento, setAlertasMantenimiento] = useState(true);
  const [usuarioDesde, setUsuarioDesde] = useState('Cargando...');

  const handleLogout = () => {
    const confirmLogout = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error: any) {
        Alert.alert('Error', 'Hubo un problema al intentar cerrar sesión. Inténtalo de nuevo.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que deseas salir de tu cuenta?')) void confirmLogout();
      return;
    }
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, salir', style: 'destructive', onPress: () => void confirmLogout() },
    ]);
  };

  const ejecutarBorradoDeCuenta = async () => {
    try {
      const { error } = await supabase.rpc('borrar_mi_cuenta');
      if (error) throw error;
      await supabase.auth.signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      const mensajeError = 'Hubo un problema al intentar borrar tu cuenta. Inténtalo más tarde.';
      if (Platform.OS === 'web') window.alert(mensajeError);
      else Alert.alert('Error', mensajeError);
    }
  };

  const handleBorrarCuenta = () => {
    const titulo = 'Borrar Cuenta';
    const mensaje = '¿Estás seguro de que deseas borrar tu cuenta DEFINITIVAMENTE?\n\nEsta acción no se puede deshacer y perderás todos tus datos registrados.';

    if (Platform.OS === 'web') {
      if (window.confirm(`${titulo}\n\n${mensaje}`)) void ejecutarBorradoDeCuenta();
      return;
    }
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, borrar cuenta', style: 'destructive', onPress: () => void ejecutarBorradoDeCuenta() },
    ]);
  };

  useEffect(() => {
    const fetchFechaCreacion = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          const { data, error } = await supabase.from('perfiles').select('created_at').eq('id', session.user.id).single();
          if (error) {
            setUsuarioDesde('Fecha no disponible');
            return;
          }
          if (data?.created_at) {
            const fecha = new Date(data.created_at);
            const fechaFormateada = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
            setUsuarioDesde(fechaFormateada);
          }
        }
      } catch (error) {
        setUsuarioDesde('Fecha no disponible');
      }
    };
    fetchFechaCreacion();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          {/* PASO 6: Iconos dinámicos */}
          <Ionicons name="arrow-back" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.titulo}>Configuración</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Cuenta y Accesos</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Cambiar Contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-add-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Agregar otra cuenta</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Actividad y Bienestar</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="pulse-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Mi actividad reciente</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="hourglass-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Gestionar mi tiempo de uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.iconSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Preferencias de la App</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Notificaciones Push</Text>
            </View>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: theme.switchTrackFalse, true: theme.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="construct-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Recordatorios de Mantenimiento</Text>
            </View>
            <Switch
              value={alertasMantenimiento}
              onValueChange={setAlertasMantenimiento}
              trackColor={{ false: theme.switchTrackFalse, true: theme.primary }}
            />
          </View>

          <View style={styles.divider} />

          {/* PASO 5: EL SWITCH DE MODO OSCURO CONECTADO */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color={theme.iconPrimary} />
              <Text style={styles.rowText}>Modo Oscuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.switchTrackFalse, true: theme.primary }}
            />
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <TouchableOpacity style={styles.btnAccionPeligro} activeOpacity={0.7} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.dangerText} />
            <Text style={styles.textAccionPeligro}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAccionPeligro, { marginTop: 12 }]}
            activeOpacity={0.7}
            onPress={handleBorrarCuenta}
          >
            <Ionicons name="trash-outline" size={20} color={theme.dangerText} />
            <Text style={styles.textAccionPeligro}>Borrar Cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Usuario desde: {usuarioDesde}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// PASO 6: Transformamos StyleSheet en una función que recibe el 'theme'
const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: theme.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
    marginTop: 10,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 15, fontWeight: '500', color: theme.textPrimary, marginLeft: 12 },
  divider: { height: 1, backgroundColor: theme.divider },
  btnAccionPeligro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dangerBg,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
  },
  textAccionPeligro: { color: theme.dangerText, fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  footerContainer: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  }
});




















































hacer los apartados de configuracion:
Notificaciones Push
Recordatorios de Mantenimiento

cambiar contraseña
agregar otra cuenta
mi actividad reciente
gestionar mi tiempo de eso  







Para tu perfil como desarrolladora y con múltiples proyectos en puerta (como tu sistema de papelería en PHP/MySQL y tus aplicaciones web/móviles), lo más inteligente y económico es comprar un VPS único (como un servidor en Hetzner o DigitalOcean).

pero no se guardan kilometros ni nada, sino que solo son fechas, pero me diste una gran idea, porque no agregar un apartado, despues de que la rodada pase(ese mismo dia o al siguiente), que se le pregunte al usuario como estuvo, duracion, distancias, etc. y de eso si podemos hacer registros y graficos para el lobby 


Pedir al usuario al terminar la rodada —o recordárselo al día siguiente— que ingrese datos sencillos como la distancia aproximada, el tiempo de duración, una foto o una breve reseña transforma una simple fecha en una bitácora de experiencias.















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