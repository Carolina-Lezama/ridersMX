import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../assets/theme/ThemeContext';

interface Props {
  title: string;
  onPress: () => void;
  tipo?: 'primario' | 'secundario';
}

export default function CustomButton({ title, onPress, tipo = 'primario' }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  boton: {
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  botonSecundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.primary,
  },
  texto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textoSecundario: {
    color: theme.primary,
  }
});