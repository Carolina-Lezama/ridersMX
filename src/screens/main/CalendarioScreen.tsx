import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import EventoCard from '../../components/EventoCard';

// Configuración del idioma del calendario a Español
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function CalendarioScreen({ navigation }: any) {
  // Obtener fecha local (YYYY-MM-DD) sin desfase UTC
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  
  // NUEVO ESTADO: 'dia' para ver el día seleccionado o 'todas' para ver la lista completa
  const [filtroVista, setFiltroVista] = useState<'dia' | 'todas'>('dia');
  
  // Estados para Supabase
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Se recarga cada vez que entras a la pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarEventos();
    });
    return unsubscribe;
  }, [navigation]);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('eventos')
          .select('*')
          .eq('perfil_id', session.user.id)
          .order('fecha', { ascending: true }); // Ordenados por fecha
        
        if (error) throw error;
        setEventos(data || []);
      }
    } catch (error) {
      console.log('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convertir los eventos al formato del calendario
  const markedDates = useMemo(() => {
    let marcas: any = {};
    eventos.forEach((evento) => {
      if (!marcas[evento.fecha]) marcas[evento.fecha] = { dots: [] };
      marcas[evento.fecha].dots.push({
        key: evento.id,
        color: evento.tipo === 'mantenimiento' ? '#ef4444' : '#007bff'
      });
    });

    marcas[fechaSeleccionada] = { 
      ...marcas[fechaSeleccionada], 
      selected: true, 
      selectedColor: '#0f172a' 
    };
    return marcas;
  }, [eventos, fechaSeleccionada]);

  // Filtrar eventos a mostrar según la pestaña activa
  const eventosAMostrar = useMemo(() => {
    if (filtroVista === 'todas') {
      return eventos;
    }
    return eventos.filter(e => e.fecha === fechaSeleccionada);
  }, [eventos, fechaSeleccionada, filtroVista]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Agenda</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* CALENDARIO */}
      <View style={styles.calendarWrapper}>
        <Calendar
          current={fechaHoy}
          onDayPress={(day: any) => {
            setFechaSeleccionada(day.dateString);
            setFiltroVista('dia'); // Al tocar un día, cambiamos automáticamente a la vista por día
          }}
          markingType={'multi-dot'}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: '#0f172a',
            todayTextColor: '#007bff',
            dotColor: '#007bff',
            arrowColor: '#0f172a',
          }}
        />
      </View>

      {/* SECCIÓN INFERIOR CON SELECTOR DE PESTAÑAS (FILTRO) */}
      <View style={styles.listContainer}>
        
        {/* FILTRO DE PESTAÑAS (DÍA / TODAS) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, filtroVista === 'dia' && styles.tabButtonActive]}
            onPress={() => setFiltroVista('dia')}
          >
            <Text style={[styles.tabText, filtroVista === 'dia' && styles.tabTextActive]}>
              {fechaSeleccionada === fechaHoy ? 'Hoy' : 'Día seleccionado'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, filtroVista === 'todas' && styles.tabButtonActive]}
            onPress={() => setFiltroVista('todas')}
          >
            <Text style={[styles.tabText, filtroVista === 'todas' && styles.tabTextActive]}>
              Todas ({eventos.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENIDO DE LA LISTA */}
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
        ) : eventosAMostrar.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={50} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {filtroVista === 'dia' ? 'Sin actividades este día' : 'Sin eventos programados'}
            </Text>
            <Text style={styles.emptyText}>
              {filtroVista === 'dia' 
                ? 'No tienes rodadas ni mantenimientos agendados para esta fecha.' 
                : 'Usa el botón "+" para registrar tu primera rodada o mantenimiento.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={eventosAMostrar}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <EventoCard 
                evento={item} 
                onPress={() => navigation.navigate('EventoForm', { eventoId: item.id, fechaBase: item.fecha })} 
              />
            )}
          />
        )}
      </View>

      {/* BOTÓN FLOTANTE */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('EventoForm', { fechaBase: fechaSeleccionada })}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
    marginTop: 60, 
    paddingBottom: 15 
  },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  calendarWrapper: { 
    backgroundColor: '#fff', 
    paddingBottom: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0', 
    elevation: 2 
  },
  listContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  
  /* ESTILOS DEL SELECTOR DE PESTAÑAS (TABS) */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },

  /* ESTADOS VACÍOS */
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
  
  /* FAB */
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    backgroundColor: '#007bff', 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#007bff', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 10, 
    elevation: 6 
  }
});