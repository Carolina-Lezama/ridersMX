import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase'; // IMPORTANTE: Asegúrate de que esta ruta sea correcta

export default function MenuScreen({ navigation }: any) {
  // SECCIÓN 1: Actualizada con las pantallas que ya construimos
  const seccionVehiculo = [
    { id: 'MisMotos', icon: 'bicycle-outline', label: 'Mi Garaje', color: '#3b82f6' },
    { id: 'Calendario', icon: 'calendar-outline', label: 'Mi Agenda', color: '#ef4444' },
    { id: 'Foro', icon: 'chatbubbles-outline', label: 'Foro de Riders', color: '#10b981' },
    { id: 'Resenas', icon: 'star-outline', label: 'Mis Reseñas', color: '#f59e0b' },
  ];

  // SECCIÓN 2: Cuenta
  const seccionCuenta = [
    { id: 'Perfil', icon: 'person-outline', label: 'Mi Perfil', color: '#8b5cf6' },
    { id: 'Ayuda', icon: 'help-circle-outline', label: 'Ayuda y Soporte', color: '#06b6d4' },
    { id: 'Configuracion', icon: 'settings-outline', label: 'Configuración', color: '#64748b' },
  ];

  // FUNCIÓN: Manejo del cierre de sesión seguro con Supabase
  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás segura de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, salir', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Destruimos la sesión en el servidor
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              // 2. Limpiamos la navegación y volvemos al Login
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo cerrar la sesión: ' + error.message);
            }
          }
        }
      ]
    );
  };

  // Componente reutilizable interno para renderizar cada fila
  const renderItem = (item: any, isLast: boolean) => (
    <TouchableOpacity 
      key={item.id} 
      style={[styles.opcion, isLast && styles.opcionSinBorde]}
      // Navegación dinámica
      onPress={() => {
        // Validación temporal: Si la pantalla aún no existe, mostramos un aviso
        if (item.id === 'Foro' || item.id === 'Resenas' || item.id === 'Ayuda' || item.id === 'Configuracion') {
          Alert.alert('Próximamente', 'Este módulo está en construcción.');
        } else {
          navigation.navigate(item.id);
        }
      }}
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

      {/* Botón de Cerrar Sesión Independiente y Seguro */}
      <TouchableOpacity 
        style={styles.botonCerrarSesion}
        onPress={handleCerrarSesion}
      >
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.textoCerrarSesion}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  header: { marginTop: 60, marginBottom: 20 },
  tituloMenu: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  seccionTitulo: { fontSize: 14, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 15, marginLeft: 5 },
  tarjetaSeccion: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  opcion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  opcionSinBorde: { borderBottomWidth: 0 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  opcionLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1e293b' },
  botonCerrarSesion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 16, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: '#fecaca' },
  textoCerrarSesion: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#ef4444' }
});