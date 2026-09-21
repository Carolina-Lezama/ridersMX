import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DiagnosticoScreen, { CustomDrawerContent } from '../screens/menu_options/DiagnosticoScreen';

const Drawer = createDrawerNavigator();

export default function DiagnosticoNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerPosition:'right'}}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="DiagnosticoHome" component={DiagnosticoScreen} />
    </Drawer.Navigator>
  );
}