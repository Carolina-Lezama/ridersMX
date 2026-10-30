import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const ACCOUNTS_KEY = Platform.OS === 'web' ? '@multi_accounts_ids' : 'riders_multi_accounts_ids';
const ACTIVE_ACCOUNT_KEY = Platform.OS === 'web' ? '@active_account_id' : 'riders_active_account_id';

export interface StoredAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

interface AccountMetadata extends Omit<StoredAccount, 'session'> {}

const storage = {
  getItem: (key: string) => Platform.OS === 'web'
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => Platform.OS === 'web'
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => Platform.OS === 'web'
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key),
};

const accountKey = (id: string, field: 'metadata' | 'access_token' | 'refresh_token') =>
  Platform.OS === 'web'
    ? `@multi_account:${id}:${field}`
    : `riders_multi_account_${id}_${field}`;

async function readAccountIds(): Promise<string[]> {
  const storedIds = await storage.getItem(ACCOUNTS_KEY);
  if (storedIds === null) return [];

  const ids: unknown = JSON.parse(storedIds);
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
    throw new Error('La lista de cuentas guardadas tiene un formato inválido.');
  }
  return ids;
}

async function writeAccount(account: StoredAccount): Promise<void> {
  const metadata: AccountMetadata = {
    id: account.id,
    email: account.email,
    username: account.username,
    avatarUrl: account.avatarUrl,
  };

  await Promise.all([
    storage.setItem(accountKey(account.id, 'metadata'), JSON.stringify(metadata)),
    storage.setItem(accountKey(account.id, 'access_token'), account.session.access_token),
    storage.setItem(accountKey(account.id, 'refresh_token'), account.session.refresh_token),
  ]);

  const ids = await readAccountIds();
  if (!ids.includes(account.id)) {
    ids.push(account.id);
    await storage.setItem(ACCOUNTS_KEY, JSON.stringify(ids));
  }
}

function metadataString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const MultiAccountService = {
  async getAccounts(): Promise<StoredAccount[]> {
    const ids = await readAccountIds();
    return Promise.all(ids.map(async id => {
      const [metadataData, accessToken, refreshToken] = await Promise.all([
        storage.getItem(accountKey(id, 'metadata')),
        storage.getItem(accountKey(id, 'access_token')),
        storage.getItem(accountKey(id, 'refresh_token')),
      ]);

      if (!metadataData || !accessToken || !refreshToken) {
        throw new Error(`No se pudieron recuperar las credenciales guardadas para la cuenta ${id}.`);
      }

      const metadata: AccountMetadata = JSON.parse(metadataData);
      if (metadata.id !== id) {
        throw new Error(`Los datos guardados para la cuenta ${id} no son válidos.`);
      }

      return {
        ...metadata,
        session: { access_token: accessToken, refresh_token: refreshToken },
      };
    }));
  },

  async getActiveAccountId(): Promise<string | null> {
    return storage.getItem(ACTIVE_ACCOUNT_KEY);
  },

  async addOrUpdateAccount(account: StoredAccount): Promise<void> {
    await writeAccount(account);
    await storage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  },

  async saveSession(session: Session): Promise<void> {
    const userMetadata = session.user.user_metadata ?? {};
    let profile: { username?: string | null; nombre_completo?: string | null } | null = null;

    const { data, error } = await supabase
      .from('perfiles')
      .select('username,nombre_completo')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo cargar el perfil para el selector de cuentas:', error.message);
    } else {
      profile = data;

      const username = metadataString(userMetadata.username);
      if (!profile && username) {
        const { data: createdProfile, error: insertError } = await supabase
          .from('perfiles')
          .insert({
            id: session.user.id,
            username: username.toLowerCase(),
            nombre_completo: metadataString(userMetadata.full_name) ?? '',
          })
          .select('username,nombre_completo')
          .maybeSingle();

        if (insertError) {
          console.warn('No se pudo crear el perfil después de iniciar sesión:', insertError.message);
        } else {
          profile = createdProfile;
        }
      }
    }

    const account: StoredAccount = {
      id: session.user.id,
      email: session.user.email ?? '',
      username: metadataString(profile?.username)
        ?? metadataString(userMetadata.username)
        ?? metadataString(profile?.nombre_completo)
        ?? metadataString(userMetadata.full_name)
        ?? session.user.email
        ?? 'Cuenta',
      avatarUrl: metadataString(userMetadata.avatar_url) ?? metadataString(userMetadata.picture),
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    };

    await this.addOrUpdateAccount(account);
  },

  async updateKnownSession(session: Session): Promise<void> {
    const accounts = await this.getAccounts();
    const account = accounts.find(item => item.id === session.user.id);
    if (!account) return;

    await writeAccount({
      ...account,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    });
  },

  async switchAccount(accountId: string): Promise<void> {
    const accounts = await this.getAccounts();
    const targetAccount = accounts.find(account => account.id === accountId);
    if (!targetAccount) {
      throw new Error('La cuenta seleccionada ya no está guardada en este dispositivo.');
    }

    const { data: { session: previousSession }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const { data, error } = await supabase.auth.setSession(targetAccount.session);

    if (error) throw error;
    if (!data.session) throw new Error('Supabase no devolvió una sesión para la cuenta seleccionada.');

    try {
      await this.updateKnownSession(data.session);
      await storage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
    } catch (storageError) {
      if (previousSession) {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: previousSession.access_token,
          refresh_token: previousSession.refresh_token,
        });
        if (restoreError) {
          console.error('No se pudo restaurar la sesión anterior tras un error de almacenamiento:', restoreError);
        }
      }
      throw storageError;
    }
  },

  async removeAccount(accountId: string): Promise<void> {
    const ids = await readAccountIds();
    if (!ids.includes(accountId)) return;

    await Promise.all([
      storage.removeItem(accountKey(accountId, 'metadata')),
      storage.removeItem(accountKey(accountId, 'access_token')),
      storage.removeItem(accountKey(accountId, 'refresh_token')),
    ]);
    await storage.setItem(ACCOUNTS_KEY, JSON.stringify(ids.filter(id => id !== accountId)));

    if (await this.getActiveAccountId() === accountId) {
      await storage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  },

  async signOutActiveAccount(): Promise<string | null> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const activeId = session?.user.id ?? await this.getActiveAccountId();
    const accounts = await this.getAccounts();
    const nextAccount = accounts.find(account => account.id !== activeId);

    if (nextAccount) {
      await this.switchAccount(nextAccount.id);
      if (activeId) await this.removeAccount(activeId);
      return nextAccount.id;
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    if (activeId) await this.removeAccount(activeId);
    return null;
  },

  async signOutAllAccounts(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;

    const ids = await readAccountIds();
    await Promise.all(ids.map(id => Promise.all([
      storage.removeItem(accountKey(id, 'metadata')),
      storage.removeItem(accountKey(id, 'access_token')),
      storage.removeItem(accountKey(id, 'refresh_token')),
    ])));
    await Promise.all([
      storage.removeItem(ACCOUNTS_KEY),
      storage.removeItem(ACTIVE_ACCOUNT_KEY),
    ]);
  },
};
