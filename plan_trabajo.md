Fase 1: Blindaje de la Base de Datos (RLS para Motocicletas)
Acción: Ejecutaremos un script SQL en Supabase para crear las Políticas de Seguridad (Policies) específicas para la tabla motocicletas.

Justificación: Si recuerdas nuestro tropiezo con el error 401 en el registro, fue porque la tabla estaba bloqueada. Necesitamos decirle a Supabase: "Permite que un usuario inserte, actualice y borre motos, pero solo si el perfil_id de esa moto coincide con su sesión actual". Sin esto, el frontend fallará silenciosamente.

Fase 2: Creación de MotoFormScreen.tsx (El Formulario Maestro)
Acción: Crearemos una pantalla completamente nueva dedicada exclusivamente al formulario de la motocicleta (Marca, Modelo, Año, etc.).

Justificación: En lugar de tener una pantalla para "Agregar" y otra idéntica para "Editar", usaremos la misma pantalla para ambas acciones. Si la pantalla recibe un ID, se comportará como editor (llenando los datos previos); si no recibe nada, será un lienzo en blanco para una moto nueva. Esto reduce el código a la mitad y facilita el mantenimiento.

Fase 3: Conexión y Navegación con Parámetros
Acción: Actualizaremos el archivo App.tsx para registrar la nueva pantalla y modificaremos tu actual MisMotosScreen.

Justificación: Haremos que el botón flotante (FAB) de MisMotosScreen abra el formulario "en blanco". Además, haremos que, al tocar una moto de la lista, se abra el mismo formulario, pero enviándole el ID de la moto tocada a través de los parámetros de navegación de React Navigation.

Fase 4: Lógica de Eliminación Segura (Delete)
Acción: Agregaremos un botón rojo de "Eliminar Vehículo" al final de MotoFormScreen (que solo será visible si se está editando una moto, no si se está creando una nueva).

Justificación: Borrar registros de una base de datos es una acción destructiva. Implementaremos un Alert de doble confirmación nativo del celular ("¿Estás seguro de que deseas eliminar esta moto?") antes de ejecutar el borrado real en Supabase para prevenir toques accidentales.

Nuevos Módulos que puedes construir (Frontend puro)

Pantalla de Ajustes (Settings): Un menú donde el usuario pueda configurar sus preferencias visuales (preparar la estructura para un Modo Oscuro/Claro), preferencias de notificaciones, y políticas de privacidad.

2. Mejoras de UI/UX a tus módulos actuales
   Ya tienes la estructura funcional de varios apartados. Ahora podemos hacer que se sientan como una aplicación Premium:

Skeletons Loaders (Dashboard y Perfil): En lugar de mostrar la clásica ruedita azul girando (ActivityIndicator) cuando la app cargue datos, podemos construir "Skeletons". Son esos bloques de color gris claro que parpadean y simulan la forma que tendrá el contenido (como hace YouTube o Facebook antes de cargar un video).

Validación de Formularios "En Vivo" (Login, Register, Moto): Actualmente, la aplicación espera a que el usuario presione "Guardar" para decirle si hay un error. Podemos implementar lógica local para que, si el usuario escribe un correo inválido o una contraseña muy corta, el borde del CustomInput se ponga rojo de inmediato y muestre un texto de ayuda debajo, antes de enviar el formulario.

Micro-animaciones (Barra de opciones / Menú): Podemos agregar efectos visuales para que, cuando el usuario toque un icono de la barra de navegación inferior, este haga un pequeño rebote o cambie de tamaño suavemente.

Estados Vacíos Ilustrados (Empty States): Ya hicimos uno básico en el Garaje (cuando no hay motos), pero podemos mejorarlo en el Dashboard. Diseñar componentes atractivos que guíen al usuario sobre qué hacer cuando no tiene datos registrados aún.

codigo de app a revisar:
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- IMPORTANTE

// Importar todas tus pantallas
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import InicioScreen from './src/screens/main/InicioScreen';
import MenuScreen from './src/screens/main/MenuScreen';
import PerfilScreen from './src/screens/main/PerfilScreen';
import MisMotosScreen from './src/screens/main/MisMotosScreen';
import MotoFormScreen from './src/screens/main/MotoFormScreen';
import CalendarioScreen from './src/screens/main/CalendarioScreen';
import EventoFormScreen from './src/screens/main/EventoFormScreen';

import MantenimientoScreen from './src/screens/menu_options/MantenimientoScreen';
import DiagnosticoScreen from './src/screens/menu_options/DiagnosticoScreen';
import ForoScreen from './src/screens/menu_options/ForoScreen';
import ResenasScreen from './src/screens/menu_options/ResenasScreen';
import AyudaScreen from './src/screens/menu_options/AyudaScreen';
import ConfiguracionScreen from './src/screens/menu_options/ConfiguracionScreen';

import SimuladorEditorScreen from './src/screens/menu_options/SimuladorEditorScreen';
import SimuladorLibreriaScreen from './src/screens/menu_options/SimuladorLibreriaScreen';

// 1. IMPORTAMOS TU NUEVA PANTALLA (Ajusta la ruta según dónde la guardaste)
import OnboardingScreen from './src/screens/main/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
return (
<Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#007bff' }}>
<Tab.Screen name="Inicio" component={InicioScreen}
options={{ tabBarIcon: ({color}) => <Ionicons name="home" size={24} color={color} /> }} />
<Tab.Screen name="Menu" component={MenuScreen}
options={{ tabBarIcon: ({color}) => <Ionicons name="menu" size={24} color={color} /> }} />
<Tab.Screen name="Perfil" component={PerfilScreen}
options={{ tabBarIcon: ({color}) => <Ionicons name="person" size={24} color={color} /> }} />
</Tab.Navigator>
);
}

export default function App() {
// Estado para saber si es la primera vez que inicia la app
const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

useEffect(() => {
// Función que revisa la memoria del teléfono al abrir la app
const checkFirstLaunch = async () => {
try {
const value = await AsyncStorage.getItem('@ya_vio_onboarding');
if (value === null) {
setIsFirstLaunch(true); // Es la primera vez
} else {
setIsFirstLaunch(false); // Ya lo vio antes
}
} catch (error) {
setIsFirstLaunch(false); // En caso de error, lo mandamos al Login por seguridad
}
};
checkFirstLaunch();
}, []);

// Mientras revisa la memoria, mostramos un pequeño loader para que no parpadee la pantalla
if (isFirstLaunch === null) {
return (
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
<ActivityIndicator size="large" color="#007bff" />
</View>
);
}

return (
<NavigationContainer>
{/_ 2. CONFIGURAMOS LA RUTA INICIAL DINÁMICAMENTE _/}
<Stack.Navigator
screenOptions={{ headerShown: false }}
initialRouteName={isFirstLaunch ? 'Onboarding' : 'Login'} >
{/_ LA NUEVA PANTALLA EN EL STACK _/}
<Stack.Screen name="Onboarding" component={OnboardingScreen} />

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainApp" component={MainTabs} />

        <Stack.Screen name="Mantenimiento" component={MantenimientoScreen} />
        <Stack.Screen name="MisMotos" component={MisMotosScreen} />
        <Stack.Screen name="MotoForm" component={MotoFormScreen} />
        <Stack.Screen name="Diagnostico" component={DiagnosticoScreen} />
        <Stack.Screen name="Foro" component={ForoScreen} />
        <Stack.Screen name="Resenas" component={ResenasScreen} />
        <Stack.Screen name="Ayuda" component={AyudaScreen} />
        <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />

        <Stack.Screen name="SimuladorEditor" component={SimuladorEditorScreen} />
        <Stack.Screen name="SimuladorLibreria" component={SimuladorLibreriaScreen} />
        <Stack.Screen name="Calendario" component={CalendarioScreen} />
        <Stack.Screen name="EventoForm" component={EventoFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>

);
}

Etapa 4: Animaciones y Microinteracciones (Opcional pero recomendado)
¿Qué haremos? Utilizaremos la API Animated nativa de React Native o la librería react-native-reanimated para hacer que los puntitos indicadores crezcan o cambien de color suavemente conforme el usuario desliza la pantalla.

Justificación: Este es el "excelente ejercicio de diseño" que mencionaste. Las transiciones fluidas marcan la diferencia entre una app que se siente "de juguete" y una app que se siente "premium".

Etapa 5: Lógica de Persistencia (AsyncStorage)
¿Qué haremos? Instalaremos e integraremos @react-native-async-storage/async-storage. Cuando el usuario presione "Empezar" en la última pantalla, guardaremos un valor (ej. hasViewedOnboarding = true) en el almacenamiento local del teléfono.

Justificación: ¡Fundamental! Un onboarding solo debe aparecer la primera vez que se abre la app. Sin esta lógica, tus usuarios tendrían que saltar el carrusel cada vez que abran la aplicación, lo cual sería muy frustrante.

Etapa 6: Integración con las Rutas (React Navigation)
¿Qué haremos? Modificaremos el archivo de navegación principal de la app. Antes de mostrar la pantalla de Login, la app leerá el AsyncStorage. Si es la primera vez, renderiza el Onboarding; si no, manda al usuario directo al Login.

Justificación: Es el paso final que conecta este nuevo módulo aislado con el flujo real de la aplicación, dándole sentido y funcionalidad dentro del ecosistema que ya construimos.
