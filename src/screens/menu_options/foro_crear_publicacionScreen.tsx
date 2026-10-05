import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ForoCrearPublicacion({ navigation }: any) {
  const [titulo, setTitulo] = useState('');
  const [marca, setMarca] = useState('Italika');
  const [modeloMoto, setModeloMoto] = useState('');
  const [categoria, setCategoria] = useState('Rodadas');
  const [descripcion, setDescripcion] = useState('');
  
  // Estado para la ubicación y búsqueda de LocationIQ
  const [ubicacionQuery, setUbicacionQuery] = useState('');
  const [resultadosUbicacion, setResultadosUbicacion] = useState<any[]>([]);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);

  // Control de Modales para Marca y Modelo
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState<'marca' | 'modelo' | null>(null);

  const LOCATIONIQ_KEY = 'pk.55df4ad365d5d977461ab6f7adfadfa8';

  const motosPorMarca: Record<string, string[]> = {
    Italika: ['FT150', 'FT125', 'FT250', 'DM150', 'DM200', 'Vort-X 300'],
    Bajaj: ['Pulsar NS160', 'Pulsar NS200', 'Pulsar NS250', 'Dominar 250', 'Dominar 400'],
    Yamaha: ['FZ16', 'FZ25', 'MT03', 'R15'],
    Honda: ['CB190R', 'CB300R', 'CBR250R'],
    Suzuki: ['Gixxer 150', 'Gixxer 250', 'GSX-R150'],
    KTM: ['RC200', 'RC390', 'Duke 200', 'Duke 390'],
  };

  const categorias = [
    'Rodadas',
    'Mantenimiento',
    'Dudas y Ayuda',
    'Rutas',
    'Eventos',
    'Compra y Venta',
  ];

  // Función para autocompletar ubicaciones con LocationIQ
  const buscarUbicacion = async (texto: string) => {
    setUbicacionQuery(texto);

    if (texto.length < 3) {
      setResultadosUbicacion([]);
      return;
    }

    setCargandoUbicacion(true);
    try {
      const response = await fetch(
        `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
          texto
        )}&countrycodes=mx&limit=5&format=json&lang=es`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setResultadosUbicacion(data);
      } else {
        setResultadosUbicacion([]);
      }
    } catch (error) {
      console.error('Error al buscar ubicación:', error);
    } finally {
      setCargandoUbicacion(false);
    }
  };

  const seleccionarUbicacion = (item: any) => {
    setUbicacionQuery(item.display_name);
    setResultadosUbicacion([]);
  };

  const abrirModal = (tipo: 'marca' | 'modelo') => {
    setModalTipo(tipo);
    setModalVisible(true);
  };

  const seleccionarOpcion = (item: string) => {
    if (modalTipo === 'marca') {
      setMarca(item);
      setModeloMoto('');
    } else if (modalTipo === 'modelo') {
      setModeloMoto(item);
    }
    setModalVisible(false);
  };

  const crearPublicacion = () => {
    console.log({
      titulo,
      marca,
      modeloMoto,
      categoria,
      descripcion,
      ubicacion: ubicacionQuery,
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ENCABEZADO */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Publicación</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* TÍTULO */}
        <Text style={styles.sectionLabel}>Título de la publicación</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Ej. Rodada al Volcán este domingo"
            placeholderTextColor="#94a3b8"
            value={titulo}
            onChangeText={setTitulo}
          />
        </View>

        {/* CATEGORÍAS TIPO CHIPS */}
        <Text style={styles.sectionLabel}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {categorias.map((cat) => {
            const isSelected = categoria === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setCategoria(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* MARCA Y MODELO */}
        <Text style={styles.sectionLabel}>Detalles de la Moto</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.selectCard} onPress={() => abrirModal('marca')}>
            <Text style={styles.selectCardSub}>Marca</Text>
            <View style={styles.selectCardRow}>
              <Text style={styles.selectCardValue}>{marca}</Text>
              <Ionicons name="chevron-down" size={18} color="#007bff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectCard} onPress={() => abrirModal('modelo')}>
            <Text style={styles.selectCardSub}>Modelo</Text>
            <View style={styles.selectCardRow}>
              <Text style={[styles.selectCardValue, !modeloMoto && { color: '#94a3b8' }]}>
                {modeloMoto || 'Seleccionar'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#007bff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* DESCRIPCIÓN */}
        <Text style={styles.sectionLabel}>Descripción</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textArea}
            placeholder="Escribe el itinerario, recomendaciones, punto de encuentro..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
            value={descripcion}
            onChangeText={setDescripcion}
          />
        </View>

        {/* BUSCADOR DE UBICACIÓN LOCATIONIQ */}
        <Text style={styles.sectionLabel}>Punto de salida / Ubicación</Text>
        <View style={styles.locationContainer}>
          <View style={styles.inputCard}>
            <Ionicons name="location-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Ej. Gasolinera Zavaleta, Puebla"
              placeholderTextColor="#94a3b8"
              value={ubicacionQuery}
              onChangeText={buscarUbicacion}
            />
            {cargandoUbicacion && <ActivityIndicator size="small" color="#007bff" />}
          </View>

          {/* LISTA DESPLEGABLE DE RESULTADOS */}
          {resultadosUbicacion.length > 0 && (
            <View style={styles.resultadosCard}>
              {resultadosUbicacion.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.resultadoItem}
                  onPress={() => seleccionarUbicacion(item)}
                >
                  <Ionicons name="pin-outline" size={16} color="#007bff" style={{ marginRight: 8 }} />
                  <Text style={styles.resultadoTexto} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ADJUNTOS */}
        <View style={styles.rowActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="camera-outline" size={20} color="#007bff" />
            <Text style={styles.actionBtnText}>Adjuntar foto</Text>
          </TouchableOpacity>
        </View>

        {/* BOTÓN PUBLICAR */}
        <TouchableOpacity style={styles.publicarButton} onPress={crearPublicacion} activeOpacity={0.85}>
          <Text style={styles.publicarText}>Publicar en la comunidad</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL DE SELECCIÓN DE MARCA / MODELO */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalBar} />
            <Text style={styles.modalTitle}>
              {modalTipo === 'marca' ? 'Selecciona una Marca' : 'Selecciona un Modelo'}
            </Text>

            <FlatList
              data={modalTipo === 'marca' ? Object.keys(motosPorMarca) : (motosPorMarca[marca] || [])}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => seleccionarOpcion(item)}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#007bff" />
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },

  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  textArea: { flex: 1, minHeight: 90, textAlignVertical: 'top', fontSize: 15, color: '#0f172a' },

  // Estilos Ubicación LocationIQ
  locationContainer: {
    marginBottom: 20,
    zIndex: 1000,
  },
  resultadosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  resultadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultadoTexto: { fontSize: 13, color: '#334155', flex: 1 },

  chipsScroll: { flexDirection: 'row', marginBottom: 20 },
  chip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  chipSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  chipTextSelected: { color: '#ffffff' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  selectCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectCardSub: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  selectCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  selectCardValue: { fontSize: 15, fontWeight: '600', color: '#0f172a' },

  rowActions: { marginBottom: 25 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#007bff', marginLeft: 8 },

  publicarButton: {
    backgroundColor: '#007bff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  publicarText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '50%',
  },
  modalBar: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 15, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
});