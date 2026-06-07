import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@subsshare_token',
  USER: '@subsshare_user',
};

export const storageService = {
  async saveToken(token) {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },

  async getToken() {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },

  async saveUser(user) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

 async clear() {
  await AsyncStorage.removeItem(KEYS.TOKEN);
  await AsyncStorage.removeItem(KEYS.USER);
},
};
