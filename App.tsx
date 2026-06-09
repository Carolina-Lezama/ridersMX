import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importar todas tus pantallas
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import InicioScreen from './src/screens/main/InicioScreen';
import MenuScreen from './src/screens/main/MenuScreen';
import PerfilScreen from './src/screens/main/PerfilScreen';

import MantenimientoScreen from './src/screens/menu_options/MantenimientoScreen';
import DiagnosticoScreen from './src/screens/menu_options/DiagnosticoScreen';
import ForoScreen from './src/screens/menu_options/ForoScreen';
import ResenasScreen from './src/screens/menu_options/ResenasScreen';
import AyudaScreen from './src/screens/menu_options/AyudaScreen';
import ConfiguracionScreen from './src/screens/menu_options/ConfiguracionScreen';
import ForoCrearPublicacion from './src/screens/menu_options/foro_crear_publicacion';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Este es el menú de abajo que verás al iniciar sesión
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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainApp" component={MainTabs} />
        
        {/* 2. AGREGA LAS NUEVAS PANTALLAS AL STACK AQUÍ */}
        {/* Ponerlas aquí hace que al abrirlas, oculten el menú inferior de pestañas, lo cual es ideal */}
        <Stack.Screen name="Mantenimiento" component={MantenimientoScreen} />
        <Stack.Screen name="Diagnostico" component={DiagnosticoScreen} />
        <Stack.Screen name="Foro" component={ForoScreen} />
        <Stack.Screen name="ForoCrearPublicacion" component={ForoCrearPublicacion}/>
        <Stack.Screen name="Resenas" component={ResenasScreen} />
        <Stack.Screen name="Ayuda" component={AyudaScreen} />
        <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
