import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import EventoCard from '../../components/EventoCard';

// 1. Configuración del idioma del calendario a Español (COMPLETA)
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function CalendarioScreen({ navigation }: any) {
  const fechaHoy = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  
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
          .eq('perfil_id', session.user.id);
        
        if (error) throw error;
        setEventos(data || []);
      }
    } catch (error) {
      console.log('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convertir los eventos al formato que pide el calendario
  const markedDates = useMemo(() => {
    let marcas: any = {};
    eventos.forEach((evento) => {
      if (!marcas[evento.fecha]) marcas[evento.fecha] = { dots: [] };
      marcas[evento.fecha].dots.push({
        key: evento.id,
        color: evento.tipo === 'mantenimiento' ? '#ef4444' : '#007bff'
      });
    });

    marcas[fechaSeleccionada] = { ...marcas[fechaSeleccionada], selected: true, selectedColor: '#0f172a' };
    return marcas;
  }, [eventos, fechaSeleccionada]);

  // Filtrar la lista de abajo según el día seleccionado
  const eventosDelDia = eventos.filter(e => e.fecha === fechaSeleccionada);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Mi Agenda</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.calendarWrapper}>
        <Calendar
          current={fechaHoy}
          onDayPress={(day: any) => setFechaSeleccionada(day.dateString)}
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

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>
          {fechaSeleccionada === fechaHoy ? 'Actividades de hoy' : `Actividades del día`}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" style={{marginTop: 20}} />
        ) : eventosDelDia.length === 0 ? (
          /* ESTADO VACÍO (Manejo por si no hay nada planeado) */
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Día libre</Text>
            <Text style={styles.emptyText}>No tienes rodadas ni mantenimientos programados para esta fecha.</Text>
          </View>
        ) : (
          <FlatList
            data={eventosDelDia}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <EventoCard 
                  evento={item} 
                  // Ahora enviamos el ID y la fecha para activar el "Modo Edición"
                  onPress={() => navigation.navigate('EventoForm', { eventoId: item.id, fechaBase: item.fecha })} 
                />
              )}
          />
        )}
      </View>

      {/* BOTÓN FLOTANTE QUE LLEVARÁ AL FORMULARIO */}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 60, paddingBottom: 15 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  calendarWrapper: { backgroundColor: '#fff', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 3 },
  listContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginBottom: 15 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 15, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#007bff', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#007bff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }
});