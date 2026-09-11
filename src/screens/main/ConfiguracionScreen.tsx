import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConfiguracionScreen({ navigation }: any) {
  // Estados para probar la interacción de los switches
  const [notificaciones, setNotificaciones] = useState(true);
  const [alertasMantenimiento, setAlertasMantenimiento] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);

  return (
    <View style={styles.container}>
      {/* HEADER CON ADAPTACIÓN MULTIPLATAFORMA */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Configuración</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* RESUMEN DE PERFIL */}
        <TouchableOpacity style={styles.perfilCard} activeOpacity={0.8}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={30} color="#007bff" />
          </View>
          <View style={styles.perfilInfo}>
            <Text style={styles.perfilNombre}>Usuario Motero</Text>
            <Text style={styles.perfilEmail}>usuario@ejemplo.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* SECCIÓN 1: MI CUENTA */}
        <Text style={styles.sectionTitle}>Cuenta y Garaje</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Editar Datos de Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="bicycle-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Mis Motocicletas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Cambiar Contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* SECCIÓN 2: PREFERENCIAS */}
        <Text style={styles.sectionTitle}>Preferencias de la App</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Notificaciones Push</Text>
            </View>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: '#cbd5e1', true: '#007bff' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="construct-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Recordatorios de Mantenimiento</Text>
            </View>
            <Switch
              value={alertasMantenimiento}
              onValueChange={setAlertasMantenimiento}
              trackColor={{ false: '#cbd5e1', true: '#007bff' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Modo Oscuro</Text>
            </View>
            <Switch
              value={modoOscuro}
              onValueChange={setModoOscuro}
              trackColor={{ false: '#cbd5e1', true: '#007bff' }}
            />
          </View>
        </View>

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

        {/* BOTÓN CERRAR SESIÓN */}
        <TouchableOpacity style={styles.btnCerrarSesion} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.textCerrarSesion}>Cerrar Sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },

  /* Tarjeta Perfil */
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilInfo: { flex: 1, marginLeft: 14 },
  perfilNombre: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  perfilEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },

  /* Títulos de sección */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },

  /* Tarjetas de Opciones */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 15, fontWeight: '500', color: '#0f172a', marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  versionText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  /* Botón Destructivo */
  btnCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  textCerrarSesion: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
});