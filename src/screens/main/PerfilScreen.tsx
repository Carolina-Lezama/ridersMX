import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

export default function PerfilScreen() {
  // Estado simulado para la fecha (más adelante lo conectaremos a un DatePicker real)
  const [fechaNacimiento, setFechaNacimiento] = useState('15 / 08 / 1998');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Cabecera con un poco de color de fondo */}
      <View style={styles.headerBackground} />

      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>CA</Text>
          {/* Botoncito flotante para editar la foto */}
          <TouchableOpacity style={styles.editBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.nombreUsuario}>Carolina</Text>
        <Text style={styles.rolUsuario}>Rider Pro</Text>
      </View>

      {/* SECCIÓN 1: Información Personal */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Datos Personales</Text>
        </View>

        <CustomInput label="Nombre de usuario" placeholder="caro_rider" />
        
        {/* Simulador de Input de Calendario */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TouchableOpacity style={styles.datePickerButton}>
            <Text style={styles.dateText}>{fechaNacimiento}</Text>
            <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <CustomInput label="Teléfono" placeholder="+52 000 000 0000" keyboardType="numeric" />
        <CustomInput label="Ciudad" placeholder="Puebla, México" />
        <CustomInput label="Bio" placeholder="¿Qué te motiva a rodar?" />
      </View>

      {/* SECCIÓN 2: Información de la Motocicleta */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bicycle-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Mi Vehículo</Text>
        </View>

        <CustomInput label="Tipo de Motocicleta" placeholder="Ej. Deportiva, Scooter, Doble Propósito..." />
        <CustomInput label="Marca" placeholder="Ej. Yamaha, Honda, Suzuki..." />
        <CustomInput label="Modelo y Cilindrada" placeholder="Ej. MT-07, 689cc" />
        <CustomInput label="Año" placeholder="Ej. 2023" keyboardType="numeric" />
        <CustomInput label="Color" placeholder="Ej. Negro Mate" />
        <CustomInput label="Placas" placeholder="Ej. ABC-123" />
      </View>

      {/* SECCIÓN 3: Documentación Extra */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={20} color="#007bff" />
          <Text style={styles.cardTitle}>Documentos</Text>
        </View>

        <CustomInput label="Número de Licencia" placeholder="Opcional" />
        <CustomInput label="Aseguradora" placeholder="Opcional" />
        <CustomInput label="Número de Póliza" placeholder="Opcional" />
      </View>

      <View style={styles.footer}>
        <CustomButton title="Guardar Cambios" onPress={() => console.log("Guardando...")} />
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#f8fafc', // Fondo general más grisáceo para que resalten las tarjetas blancas
    flexGrow: 1,
    paddingBottom: 40
  },
  headerBackground: {
    backgroundColor: '#007bff',
    height: 120,
    width: '100%',
    position: 'absolute',
    top: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: { 
    alignItems: 'center', 
    marginTop: 60, 
    marginBottom: 20 
  },
  avatarPlaceholder: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5, // Sombra para Android
    borderWidth: 3,
    borderColor: '#f8fafc'
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#cbd5e1' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007bff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff'
  },
  nombreUsuario: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginTop: 10 },
  rolUsuario: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 20,
    borderRadius: 16,
    // Sombras
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 10
  },
  inputContainer: { marginBottom: 15, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 5 },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 10,
  },
  dateText: { fontSize: 16, color: '#0f172a' },
  footer: {
    paddingHorizontal: 20,
    marginTop: 30
  }
});