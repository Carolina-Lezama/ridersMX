import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../assets/theme/ThemeContext';

interface Props {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  value?: string;
  onChangeText?: (text: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export default function CustomInput({ 
  label, 
  placeholder, 
  secureTextEntry, 
  keyboardType, 
  value, 
  onChangeText,
  autoCapitalize = 'none' 
}: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        style={styles.input}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholderTextColor={theme.iconSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { marginBottom: 15, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 5 },
  input: { 
    backgroundColor: theme.background,
    borderWidth: 1, 
    borderColor: theme.border, 
    padding: 12, 
    borderRadius: 10, 
    fontSize: 16,
    color: theme.textPrimary
  }
});