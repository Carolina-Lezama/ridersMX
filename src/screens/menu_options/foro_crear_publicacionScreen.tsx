import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

export default function ForoCrearPublicacion({ navigation }: any) {
  const [titulo, setTitulo] = useState('');
  const [marca, setMarca] = useState('Italika');
  const [modeloMoto, setModeloMoto] = useState('');
  const [categoria, setCategoria] = useState('Rodadas');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  const motosPorMarca: Record<string, string[]> = {
    Italika: [
      'FT150',
      'FT125',
      'FT250',
      'DM150',
      'DM200',
      'Vort-X 300',
    ],

    Bajaj: [
      'Pulsar NS160',
      'Pulsar NS200',
      'Pulsar NS250',
      'Dominar 250',
      'Dominar 400',
    ],

    Yamaha: [
      'FZ16',
      'FZ25',
      'MT03',
      'R15',
    ],

    Honda: [
      'CB190R',
      'CB300R',
      'CBR250R',
    ],

    Suzuki: [
      'Gixxer 150',
      'Gixxer 250',
      'GSX-R150',
    ],

    KTM: [
      'RC200',
      'RC390',
      'Duke 200',
      'Duke 390',
    ],
  };

  const categorias = [
    'Rodadas',
    'Mantenimiento',
    'Dudas y Ayuda',
    'Rutas',
    'Eventos',
    'Compra y Venta',
  ];

  const crearPublicacion = () => {
    console.log({
      titulo,
      marca,
      modeloMoto,
      categoria,
      descripcion,
      ubicacion,
    });

    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Crear publicación
        </Text>

        <View style={{ width: 28 }} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Título"
        value={titulo}
        onChangeText={setTitulo}
      />

      <Text style={styles.label}>Marca de Moto</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={marca}
          onValueChange={(value) => {
            setMarca(value);
            setModeloMoto('');
          }}
        >
          {Object.keys(motosPorMarca).map((item) => (
            <Picker.Item
              key={item}
              label={item}
              value={item}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Modelo de Moto</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={modeloMoto}
          onValueChange={(value) => setModeloMoto(value)}
        >
          <Picker.Item
            label="Selecciona un modelo"
            value=""
          />

          {motosPorMarca[marca].map((item) => (
            <Picker.Item
              key={item}
              label={item}
              value={item}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Categoría</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={categoria}
          onValueChange={(value) => setCategoria(value)}
        >
          {categorias.map((item) => (
            <Picker.Item
              key={item}
              label={item}
              value={item}
            />
          ))}
        </Picker>
      </View>

      <TextInput
        style={styles.descripcion}
        placeholder="Descripción"
        multiline
        value={descripcion}
        onChangeText={setDescripcion}
      />

      <TextInput
        style={styles.input}
        placeholder="Ubicación"
        value={ubicacion}
        onChangeText={setUbicacion}
      />

      <View style={styles.row}>
        <TouchableOpacity style={styles.smallButton}>
          <Text style={styles.smallButtonText}>
            📍 Ubicación
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallButton}>
          <Text style={styles.smallButtonText}>
            📷 Agregar Fotos
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.publicarButton}
        onPress={crearPublicacion}
      >
        <Text style={styles.publicarText}>
          Crear publicación
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 15,
    fontSize: 16,
  },

  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },

  descripcion: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    height: 140,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  smallButton: {
    width: '48%',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  smallButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },

  publicarButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },

  publicarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});