import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MenuScreen({ navigation }: any) {
  // CORRECCIÓN: IDs con primera letra mayúscula para coincidir con App.tsx
  const seccionVehiculo = [
    { id: 'Mantenimiento', icon: 'build-outline', label: 'Mantenimiento', color: '#3b82f6' },
    { id: 'Diagnostico', icon: 'pulse-outline', label: 'Diagnóstico', color: '#ef4444' },
    { id: 'Foro', icon: 'chatbubbles-outline', label: 'Foro de Riders', color: '#10b981' },
    { id: 'Resenas', icon: 'star-outline', label: 'Mis Reseñas', color: '#f59e0b' },
  ];

  const seccionCuenta = [
    { id: 'Perfil', icon: 'person-outline', label: 'Mi Perfil', color: '#8b5cf6' },
    { id: 'Ayuda', icon: 'help-circle-outline', label: 'Ayuda y Soporte', color: '#06b6d4' },
    { id: 'Configuracion', icon: 'settings-outline', label: 'Configuración', color: '#64748b' },
  ];

  // Componente reutilizable interno para renderizar cada fila
  const renderItem = (item: any, isLast: boolean) => (
    <TouchableOpacity 
      key={item.id} 
      style={[styles.opcion, isLast && styles.opcionSinBorde]}
      // CORRECCIÓN: Acción de navegar al presionar la opción
      onPress={() => navigation.navigate(item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <Text style={styles.opcionLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.tituloMenu}>Menú</Text>
      </View>

      {/* BLOQUE 1: Mi Vehículo y Comunidad */}
      <Text style={styles.seccionTitulo}>Mi Vehículo y Comunidad</Text>
      <View style={styles.tarjetaSeccion}>
        {seccionVehiculo.map((item, index) => 
          renderItem(item, index === seccionVehiculo.length - 1)
        )}
      </View>

      {/* BLOQUE 2: Cuenta y Ajustes */}
      <Text style={styles.seccionTitulo}>Cuenta y Ajustes</Text>
      <View style={styles.tarjetaSeccion}>
        {seccionCuenta.map((item, index) => 
          renderItem(item, index === seccionCuenta.length - 1)
        )}
      </View>

      {/* Botón de Cerrar Sesión Independiente */}
      <TouchableOpacity 
        style={styles.botonCerrarSesion}
        // CORRECCIÓN: Lógica para cerrar sesión y volver a la pantalla de Login
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
      >
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.textoCerrarSesion}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Espaciado extra al final para que no choque con la barra de navegación */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 20 
  },
  header: { 
    marginTop: 60, 
    marginBottom: 20 
  },
  tituloMenu: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#0f172a' 
  },
  seccionTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 15,
    marginLeft: 5
  },
  tarjetaSeccion: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  opcion: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  opcionSinBorde: {
    borderBottomWidth: 0 
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  opcionLabel: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '500',
    color: '#1e293b' 
  },
  botonCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2', 
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  textoCerrarSesion: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444'
  }
});