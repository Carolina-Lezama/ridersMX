import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext';

interface Props {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  value?: string;
  onChangeText?: (text: string) => void;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}

export default function CustomInput({ 
  label, 
  placeholder, 
  secureTextEntry, 
  showPasswordToggle = false,
  keyboardType, 
  value, 
  onChangeText,
  maxLength,
  autoCapitalize = 'none',
  error
}: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error ? styles.inputError : undefined]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry && !passwordVisible}
          keyboardType={keyboardType}
          placeholderTextColor={theme.iconSecondary}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
        />
        {secureTextEntry && showPasswordToggle && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.iconSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: { marginBottom: 15, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 5 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: 10,
  },
  input: {
    flex: 1,
    padding: 12, 
    fontSize: 16,
    color: theme.textPrimary
  },
  inputError: { borderColor: theme.dangerText },
  passwordToggle: { paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { color: theme.dangerText, fontSize: 12, marginTop: 5 }
});