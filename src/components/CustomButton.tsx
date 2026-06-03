import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  tipo?: 'primario' | 'secundario';
}

export default function CustomButton({ title, onPress, tipo = 'primario' }: Props) {
  return (
    <TouchableOpacity 
      style={[styles.boton, tipo === 'secundario' && styles.botonSecundario]} 
      onPress={onPress}
    >
      <Text style={[styles.texto, tipo === 'secundario' && styles.textoSecundario]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  botonSecundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  texto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textoSecundario: {
    color: '#007bff',
  }
});