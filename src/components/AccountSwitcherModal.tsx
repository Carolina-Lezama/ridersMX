import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext';
import { MultiAccountService, StoredAccount } from '../services/MultiAccountService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddAccount: () => void;
  onAccountSwitched: () => void;
  onNoAccountsLoggedOut: () => void;
}

export default function AccountSwitcherModal({
  visible,
  onClose,
  onAddAccount,
  onAccountSwitched,
  onNoAccountsLoggedOut,
}: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    void loadAccounts()
      .catch(error => showError('No se pudieron cargar las cuentas guardadas.', error))
      .finally(() => setLoading(false));
  }, [visible]);

  const loadAccounts = async () => {
    const [list, currentId] = await Promise.all([
      MultiAccountService.getAccounts(),
      MultiAccountService.getActiveAccountId(),
    ]);
    setAccounts(list);
    setActiveId(currentId);
  };

  const showError = (message: string, error: unknown) => {
    console.error(message, error);
    const description = error instanceof Error ? error.message : String(error);
    if (Platform.OS === 'web') {
      window.alert(`${message}\n${description}`);
    } else {
      Alert.alert('Error', `${message}\n${description}`);
    }
  };

  const handleSelectAccount = async (accountId: string) => {
    if (accountId === activeId || busy) return;

    setBusy(true);
    try {
      await MultiAccountService.switchAccount(accountId);
      onClose();
      onAccountSwitched();
    } catch (error) {
      showError('No se pudo cambiar de cuenta.', error);
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async (accountId: string) => {
    const isActive = accountId === activeId;
    const nextAccount = accounts.find(account => account.id !== accountId);

    if (isActive && nextAccount) {
      await MultiAccountService.switchAccount(nextAccount.id);
      await MultiAccountService.removeAccount(accountId);
      setActiveId(nextAccount.id);
      setAccounts(accounts.filter(account => account.id !== accountId));
      onClose();
      onAccountSwitched();
      return;
    }

    if (isActive) {
      await MultiAccountService.signOutAllAccounts();
      onClose();
      onNoAccountsLoggedOut();
      return;
    }

    await MultiAccountService.removeAccount(accountId);
    setAccounts(accounts.filter(account => account.id !== accountId));
  };

  const confirmRemoveAccount = (account: StoredAccount) => {
    const remove = async () => {
      setBusy(true);
      try {
        await removeAccount(account.id);
      } catch (error) {
        showError('No se pudo cerrar la sesión de esta cuenta.', error);
      } finally {
        setBusy(false);
      }
    };
    const message = `¿Deseas cerrar la sesión de ${account.email || account.username}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) void remove();
    } else {
      Alert.alert('Cerrar sesión', message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => void remove() },
      ]);
    }
  };

  const confirmSignOutAll = () => {
    const signOut = async () => {
      setBusy(true);
      try {
        await MultiAccountService.signOutAllAccounts();
        onClose();
        onNoAccountsLoggedOut();
      } catch (error) {
        showError('No se pudieron cerrar todas las sesiones.', error);
      } finally {
        setBusy(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Se cerrará la sesión de todas las cuentas guardadas. ¿Continuar?')) {
        void signOut();
      }
    } else {
      Alert.alert('Cerrar todas las cuentas', 'Se cerrará la sesión de todas las cuentas guardadas.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar todas', style: 'destructive', onPress: () => void signOut() },
      ]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.headerIndicator} />
          <Text style={styles.modalTitle}>Cambiar de cuenta</Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={styles.loading} />
          ) : (
            <FlatList
              data={accounts}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No hay otras cuentas guardadas.</Text>}
              renderItem={({ item }) => {
                const isActive = item.id === activeId;
                return (
                  <View style={styles.accountItem}>
                    <TouchableOpacity
                      style={styles.accountSelect}
                      disabled={busy || isActive}
                      onPress={() => void handleSelectAccount(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.username}, ${isActive ? 'cuenta activa' : 'cambiar a esta cuenta'}`}
                    >
                      <View style={styles.avatarContainer}>
                        {item.avatarUrl ? (
                          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                        ) : (
                          <Ionicons name="person" size={24} color={theme.primary} />
                        )}
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={styles.username}>{item.username || item.email}</Text>
                        <Text style={styles.email}>{item.email}</Text>
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      disabled={busy}
                      onPress={() => confirmRemoveAccount(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cerrar sesión de ${item.username || item.email}`}
                    >
                      <Ionicons name="close-circle-outline" size={22} color={theme.dangerText} />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={styles.addAccountBtn}
            disabled={busy}
            onPress={() => {
              onClose();
              onAddAccount();
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
            <Text style={styles.addAccountText}>Agregar otra cuenta</Text>
          </TouchableOpacity>

          {accounts.length > 0 && (
            <TouchableOpacity style={styles.signOutAllBtn} disabled={busy} onPress={confirmSignOutAll}>
              <Text style={styles.signOutAllText}>Cerrar sesión en todas las cuentas</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} disabled={busy} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerIndicator: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20, textAlign: 'center' },
  loading: { paddingVertical: 24 },
  emptyText: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 18 },
  accountItem: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
  accountSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 14,
    overflow: 'hidden',
  },
  avatar: { width: 48, height: 48 },
  accountInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  email: { fontSize: 13, color: theme.textSecondary },
  removeButton: { padding: 10 },
  addAccountBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  addAccountText: { fontSize: 15, fontWeight: '600', color: theme.primary, marginLeft: 12 },
  signOutAllBtn: { paddingVertical: 12, alignItems: 'center' },
  signOutAllText: { fontSize: 14, color: theme.dangerText, fontWeight: '600' },
  closeBtn: { marginTop: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.background, borderRadius: 12 },
  closeBtnText: { fontSize: 15, color: theme.textSecondary, fontWeight: '600' },
});
