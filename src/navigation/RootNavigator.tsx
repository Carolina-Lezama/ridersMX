import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Estilo y colores
import { useTheme } from '../../assets/theme/ThemeContext';


// ============================================================================
// ZONA DE IMPORTACIONES: CARO
// ============================================================================
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/main/OnboardingScreen';

import InicioScreen from '../screens/main/InicioScreen';
import MenuScreen from '../screens/main/MenuScreen';
import PerfilScreen from '../screens/main/PerfilScreen';

import AyudaScreen from '../screens/main/AyudaScreen';
import ConfiguracionScreen from '../screens/main/ConfiguracionScreen';
import TiempoUsoScreen from '../screens/main/config/TiempoUsoScreen';

import MisMotosScreen from '../screens/main/MisMotosScreen';
import MotoFormScreen from '../screens/main/MotoFormScreen';
import CalendarioScreen from '../screens/main/CalendarioScreen';
import EventoFormScreen from '../screens/main/EventoFormScreen';

import { useAppTimeTracker } from '../utils/hooks/useAppTimeTracker';

// ============================================================================
// ZONA DE IMPORTACIONES: JOSHUA
// ============================================================================
import ForoScreen from '../screens/menu_options/ForoScreen';
import ForoCrearPublicacion from '../screens/menu_options/foro_crear_publicacion';











// ============================================================================
// ZONA DE IMPORTACIONES: DANIELA
// ============================================================================
import SimuladorEditorScreen from '../screens/menu_options/SimuladorEditorScreen';
import SimuladorLibreriaScreen from '../screens/menu_options/SimuladorLibreriaScreen';
import MantenimientoScreen from '../screens/menu_options/MantenimientoScreen';










// ============================================================================
// ZONA DE IMPORTACIONES: FERNANDO
// ============================================================================
import DiagnosticoScreen from '../screens/menu_options/DiagnosticoScreen';











// ============================================================================
// ZONA DE IMPORTACIONES: LEONARDO
// ============================================================================
import ResenasScreen from '../screens/menu_options/ResenasScreen';













const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={InicioScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="menu" size={24} color={color} /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator({ isFirstLaunch }: { isFirstLaunch: boolean }) {
  const { isDarkMode, theme } = useTheme();
  
  const navigationTheme = {
    ...DefaultTheme,
    dark: isDarkMode,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.textPrimary,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
          initialRouteName={isFirstLaunch ? 'Onboarding' : 'Login'}
        >
          
          {/* ============================================================================ */}
          {/* ZONA DE PANTALLAS: CARO */}
          {/* ============================================================================ */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          
          <Stack.Screen name="MainApp" component={MainTabs} />
          
          <Stack.Screen name="Ayuda" component={AyudaScreen} />
          <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
          <Stack.Screen name="TiempoUso" component={TiempoUsoScreen} />

          <Stack.Screen name="MisMotos" component={MisMotosScreen} />
          <Stack.Screen name="MotoForm" component={MotoFormScreen} />
          <Stack.Screen name="Calendario" component={CalendarioScreen} />
          <Stack.Screen name="EventoForm" component={EventoFormScreen} />



          {/* ============================================================================ */}
          {/* ZONA DE PANTALLAS: JOSHUA       */}
          {/* ============================================================================ */}
          <Stack.Screen name="Foro" component={ForoScreen} />
          <Stack.Screen name="ForoCrearPublicacion" component={ForoCrearPublicacion} />











          {/* ============================================================================ */}
          {/* ZONA DE PANTALLAS: LEONARDO       */}
          {/* ============================================================================ */}
          <Stack.Screen name="Resenas" component={ResenasScreen} />












          {/* ============================================================================ */}
          {/* ZONA DE PANTALLAS: DANIELA       */}
          {/* ============================================================================ */}
          <Stack.Screen name="SimuladorEditor" component={SimuladorEditorScreen} />
          <Stack.Screen name="SimuladorLibreria" component={SimuladorLibreriaScreen} />
          <Stack.Screen name="Mantenimiento" component={MantenimientoScreen} />











          {/* ============================================================================ */}
          {/* ZONA DE PANTALLAS: FERNANDO       */}
          {/* ============================================================================ */}
          <Stack.Screen name="Diagnostico" component={DiagnosticoScreen} />














        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}