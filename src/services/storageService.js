import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const KEYS = {
  TOKEN: '@subsshare_token',
  USER: '@subsshare_user',
  YOUTUBE_CONNECTED: '@subsshare_youtube_connected',
};

export const storageService = {
  async saveToken(token) {
    // Prefer the OS secure store (Keychain / Keystore). Retry a few times because
    // Keychain writes fail transiently on some Android OEMs. Only if every attempt
    // fails do we fall back to (unencrypted) AsyncStorage as a last resort, so a
    // flaky write doesn't silently downgrade a healthy device's token to plaintext.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await Keychain.setGenericPassword('token', token);
        await AsyncStorage.removeItem(KEYS.TOKEN);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
    }
    // Last resort — keep the user signed in rather than lock them out.
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },

  async getToken() {
    try {
      const creds = await Keychain.getGenericPassword();
      if (creds) return creds.password;
    } catch { /* keychain not available */ }
    const legacy = await AsyncStorage.getItem(KEYS.TOKEN);
    if (legacy) {
      try {
        await Keychain.setGenericPassword('token', legacy);
        await AsyncStorage.removeItem(KEYS.TOKEN);
      } catch { /* migration best-effort */ }
    }
    return legacy;
  },

  async saveUser(user) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  async clear() {
    // Remove keys individually — multiRemove isn't reliably bridged on the RN 0.85
    // new architecture (comes back undefined on some devices), which crashed sign-out.
    // removeItem is available everywhere. Wrapped so a storage hiccup never blocks
    // the user from signing out.
    try {
      await Promise.all(Object.values(KEYS).map((k) => AsyncStorage.removeItem(k)));
    } catch { /* ignore storage errors on clear */ }
    try {
      await Keychain.resetGenericPassword();
    } catch { /* keychain not available */ }
  },
};
