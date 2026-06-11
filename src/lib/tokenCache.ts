import * as SecureStore from 'expo-secure-store';

type TokenCache = {
  getToken: (key: string) => Promise<string | undefined | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => void | Promise<void>;
};

/**
 * Resilient token cache for Clerk.
 *
 * Prefers the iOS Keychain / Android Keystore via expo-secure-store, but falls
 * back to an in-memory store when SecureStore is unavailable. This happens on
 * the iOS Simulator when the app is built without a development team, where the
 * app has no `application-identifier` entitlement and Keychain access fails with
 * `errSecMissingEntitlement`. Without this fallback, Clerk's `load()` hangs and
 * the UI is stuck on a loading state.
 */
const memoryStore = new Map<string, string>();

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // Keychain unavailable (e.g. unsigned simulator build) — fall back.
    }
    return memoryStore.get(key) ?? null;
  },
  async saveToken(key: string, value: string) {
    memoryStore.set(key, value);
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Keychain unavailable — value is still kept in memory for this session.
    }
  },
  async clearToken(key: string) {
    memoryStore.delete(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore.
    }
  },
};
