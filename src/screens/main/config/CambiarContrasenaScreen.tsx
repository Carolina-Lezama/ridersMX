import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../assets/theme/ThemeContext';
import { supabase } from '../../../services/supabase';

const SUCCESS_COLOR = '#22c55e';
const WARNING_COLOR = '#eab308';
const ERROR_COLOR = '#ef4444';

export default function CambiarContrasenaScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ current: false, new: false, confirm: false });
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[@$!%*?&]/.test(newPassword);
  const isDifferentFromCurrent = newPassword !== '' && newPassword !== currentPassword;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;
  const strengthColor = strengthScore === 4
    ? SUCCESS_COLOR
    : strengthScore >= 2
      ? WARNING_COLOR
      : ERROR_COLOR;
  const strengthLabel = strengthScore === 4
    ? 'Fuerte'
    : strengthScore >= 2
      ? 'Media'
      : 'Débil';
  const isFormValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasNumber &&
    hasSpecialChar &&
    isDifferentFromCurrent &&
    passwordsMatch;
  const currentPasswordError = touchedFields.current && !currentPassword
    ? 'La contraseña actual es obligatoria.'
    : undefined;
  const newPasswordError = touchedFields.new && !newPassword
    ? 'La nueva contraseña es obligatoria.'
    : touchedFields.new && strengthScore < 4
      ? 'La contraseña debe cumplir todos los requisitos.'
      : touchedFields.new && !isDifferentFromCurrent
        ? 'Elige una contraseña distinta a la actual.'
        : undefined;
  const confirmPasswordError = touchedFields.confirm && !confirmPassword
    ? 'La confirmación es obligatoria.'
    : touchedFields.confirm && !passwordsMatch
      ? 'Las contraseñas no coinciden.'
      : undefined;

  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;

    const timeout = setTimeout(() => navigation.goBack(), 1800);
    return () => clearTimeout(timeout);
  }, [feedback, navigation]);

  const handleChangePassword = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user?.email) {
        throw new Error('No se pudo verificar la sesión actual. Vuelve a iniciar sesión e inténtalo de nuevo.');
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (authError) {
        if (authError.code === 'invalid_credentials') {
          setFeedback({ type: 'error', message: 'La contraseña actual ingresada es incorrecta.' });
          return;
        }
        throw authError;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setFeedback({ type: 'success', message: 'Tu contraseña se actualizó correctamente. Volviendo a tu cuenta…' });
    } catch (error: unknown) {
      console.error('Error al cambiar la contraseña:', error);
      const message = error instanceof Error ? error.message : '';
      const isNetworkError = /network|fetch|connection|internet/i.test(message);
      setFeedback({
        type: 'error',
        message: isNetworkError
          ? 'No se pudo conectar. Revisa tu conexión a Internet e inténtalo de nuevo.'
          : 'No se pudo actualizar la contraseña. Inténtalo de nuevo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const RequirementItem = ({ fulfilled, text }: { fulfilled: boolean; text: string }) => (
    <View style={styles.requirementRow}>
      <Ionicons
        name={fulfilled ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={fulfilled ? SUCCESS_COLOR : theme.iconSecondary}
      />
      <Text style={[styles.requirementText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );

  const renderPasswordInput = (
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (value: string) => void,
    isVisible: boolean,
    toggleVisibility: () => void,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    autoComplete: 'current-password' | 'new-password',
    fieldError: string | undefined,
    onBlur: () => void,
  ) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name={icon} size={20} color={theme.iconSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={!isVisible}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoComplete={autoComplete}
          textContentType={autoComplete === 'current-password' ? 'password' : 'newPassword'}
          onBlur={onBlur}
        />
        <TouchableOpacity
          onPress={toggleVisibility}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Ionicons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.iconSecondary}
          />
        </TouchableOpacity>
      </View>
      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons name="chevron-back" size={26} color={theme.iconPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Cambiar Contraseña</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderPasswordInput(
            'Contraseña actual',
            'Ingresa tu contraseña actual',
            currentPassword,
            setCurrentPassword,
            showCurrent,
            () => setShowCurrent((visible) => !visible),
            'lock-closed-outline',
            'current-password',
            currentPasswordError,
            () => setTouchedFields((fields) => ({ ...fields, current: true })),
          )}

          {renderPasswordInput(
            'Nueva contraseña',
            'Crea una nueva contraseña',
            newPassword,
            setNewPassword,
            showNew,
            () => setShowNew((visible) => !visible),
            'key-outline',
            'new-password',
            newPasswordError,
            () => setTouchedFields((fields) => ({ ...fields, new: true })),
          )}

          <View style={[styles.requirementsCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.strengthHeader}>
              <Text style={[styles.requirementsTitle, { color: theme.textPrimary }]}>Fortaleza de la contraseña</Text>
              <Text style={[styles.strengthLabel, { color: newPassword ? strengthColor : theme.textSecondary }]}>
                {newPassword ? strengthLabel : 'Sin evaluar'}
              </Text>
            </View>
            <View style={styles.strengthMeter} accessibilityLabel={`Fortaleza ${newPassword ? strengthLabel : 'sin evaluar'}`}>
              {[0, 1, 2, 3].map((segment) => (
                <View
                  key={segment}
                  style={[
                    styles.strengthSegment,
                    { backgroundColor: segment < strengthScore ? strengthColor : theme.border },
                  ]}
                />
              ))}
            </View>
            <RequirementItem fulfilled={hasMinLength} text="Mínimo 8 caracteres" />
            <RequirementItem fulfilled={hasUppercase} text="Al menos una letra mayúscula" />
            <RequirementItem fulfilled={hasNumber} text="Al menos un número" />
            <RequirementItem fulfilled={hasSpecialChar} text="Al menos un carácter especial (@$!%*?&)" />
            <RequirementItem fulfilled={isDifferentFromCurrent} text="Diferente de la contraseña actual" />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Confirmar nueva contraseña</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={theme.iconSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onBlur={() => setTouchedFields((fields) => ({ ...fields, confirm: true }))}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.iconSecondary}
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
          </View>

          {feedback && (
            <Text
              style={[
                styles.feedbackText,
                { color: feedback.type === 'success' ? SUCCESS_COLOR : theme.dangerText },
              ]}
              accessibilityRole="alert"
            >
              {feedback.message}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: isFormValid && !isSubmitting ? theme.primary : theme.iconSecondary },
            ]}
            disabled={!isFormValid || isSubmitting}
            onPress={handleChangePassword}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isFormValid || isSubmitting, busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Actualizar Contraseña</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 26,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  formCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  requirementsCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  strengthMeter: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  strengthSegment: {
    height: 5,
    flex: 1,
    borderRadius: 3,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    marginLeft: 8,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  feedbackText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitButton: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
