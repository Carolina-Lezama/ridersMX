import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function ConfiguracionScreen({ navigation }: any) {
  // Estados para probar la interacción de los switches
  const [notificaciones, setNotificaciones] = useState(true);
  const [alertasMantenimiento, setAlertasMantenimiento] = useState(true);
  const [modoOscuro, setModoOscuro] = useState(false);

  // Estado para guardar la fecha de creación del usuario
  const [usuarioDesde, setUsuarioDesde] = useState('Cargando...');

useEffect(() => {
    const fetchFechaCreacion = async () => {
      try {
        // 1. Obtenemos la sesión actual del usuario
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          // 2. Consultamos la tabla 'perfiles' buscando la columna 'created_at'
          const { data, error } = await supabase
            .from('perfiles')
            .select('created_at')
            .eq('id', session.user.id)
            .single();
            
          // Validamos si Supabase devolvió un error en la consulta
          if (error) {
            console.error("Error en la consulta a Supabase:", error.message);
            setUsuarioDesde('Fecha no disponible');
            return;
          }
            
          // 3. Transformamos el timestamp a una fecha legible en español
          if (data?.created_at) {
            const fecha = new Date(data.created_at);
            const fechaFormateada = fecha.toLocaleDateString('es-MX', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            setUsuarioDesde(fechaFormateada);
          }
        }
      } catch (error) {
        console.error("Error inesperado obteniendo fecha:", error);
        setUsuarioDesde('Fecha no disponible');
      }
    };

    fetchFechaCreacion();
  }, []);


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

        {/* SECCIÓN 1: MI CUENTA */}
        <Text style={styles.sectionTitle}>Cuenta y Accesos</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Cambiar Contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* NUEVO: Agregar otra cuenta */}
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-add-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Agregar otra cuenta</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* NUEVA SECCIÓN: ACTIVIDAD Y TIEMPO */}
        <Text style={styles.sectionTitle}>Actividad y Bienestar</Text>
        <View style={styles.card}>
          {/* NUEVO: Mi actividad reciente */}
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="pulse-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Mi actividad reciente</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* NUEVO: Gestionar mi tiempo de uso */}
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="hourglass-outline" size={22} color="#0f172a" />
              <Text style={styles.rowText}>Gestionar mi tiempo de uso</Text>
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

        {/* ZONA DE PELIGRO / ACCIONES DE CUENTA */}
        <View style={{ marginTop: 10 }}>
          {/* BOTÓN CERRAR SESIÓN */}
          <TouchableOpacity style={styles.btnAccionPeligro} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.textAccionPeligro}>Cerrar Sesión</Text>
          </TouchableOpacity>

          {/* NUEVO: BOTÓN BORRAR CUENTA */}
          <TouchableOpacity style={[styles.btnAccionPeligro, { marginTop: 12 }]} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.textAccionPeligro}>Borrar Cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* NUEVO: USUARIO DESDE */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Usuario desde: {usuarioDesde}</Text>
        </View>

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

  /* Títulos de sección */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
    marginTop: 10,
  },

  /* Tarjetas de Opciones */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
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

  /* Botones Destructivos (Reutilizables para Cerrar sesión y Borrar cuenta) */
  btnAccionPeligro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  textAccionPeligro: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },

  /* Footer: Usuario Desde */
  footerContainer: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  }
});