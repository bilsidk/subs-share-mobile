import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const KEYS = {
  TOKEN: '@subsshare_token',
  USER: '@subsshare_user',
  YOUTUBE_CONNECTED: '@subsshare_youtube_connected',
};

export const storageService = {
  async saveToken(token) {
    try {
      await Keychain.setGenericPassword('token', token);
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    }
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

  async saveYoutubeConnected(val) {
    await AsyncStorage.setItem(KEYS.YOUTUBE_CONNECTED, val ? 'true' : 'false');
  },

  async getYoutubeConnected() {
    const raw = await AsyncStorage.getItem(KEYS.YOUTUBE_CONNECTED);
    return raw === 'true';
  },

  async clear() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    try {
      await Keychain.resetGenericPassword();
    } catch { /* keychain not available */ }
  },
};
