import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './src/navigation/AuthNavigator';
import DashboardScreen from './src/screens/main/DashboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      {/* Este es el Stack principal de toda la app */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Primero mostramos el flujo de Login/Registro */}
        <Stack.Screen name="Auth" component={AuthNavigator} />
        {/* Si el login es exitoso, viajamos aquí */}
        <Stack.Screen name="MainApp" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}