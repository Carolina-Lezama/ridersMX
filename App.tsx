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
import OnboardingScreen from './src/screens/main/OnboardingScreen';
import AyudaScreen from './src/screens/main/AyudaScreen';
import ConfiguracionScreen from './src/screens/main/ConfiguracionScreen';


import DiagnosticoScreen from './src/screens/menu_options/DiagnosticoScreen';
import MantenimientoScreen from './src/screens/menu_options/MantenimientoScreen';
import ForoScreen from './src/screens/menu_options/ForoScreen';
import ResenasScreen from './src/screens/menu_options/ResenasScreen';
import SimuladorEditorScreen from './src/screens/menu_options/SimuladorEditorScreen';
import SimuladorLibreriaScreen from './src/screens/menu_options/SimuladorLibreriaScreen';


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
<Stack.Navigator
screenOptions={{ headerShown: false }}
initialRouteName={isFirstLaunch ? 'Onboarding' : 'Login'} >

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







