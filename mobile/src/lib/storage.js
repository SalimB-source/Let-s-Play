import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store limite chaque entrée à ~2048 octets sur certains appareils :
// on découpe les jetons de session Supabase en tranches de 1800 caractères sur
// iOS/Android, avec repli transparent sur AsyncStorage sur le Web.
const CHUNK_SIZE = 1800;

function sanitizeSecureKey(key) {
  return String(key).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const secureAuthStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    try {
      const safeKey = sanitizeSecureKey(key);
      const countStr = await SecureStore.getItemAsync(`${safeKey}__chunks`);
      if (!countStr) {
        return await SecureStore.getItemAsync(safeKey);
      }
      const count = Number(countStr);
      if (!Number.isFinite(count) || count <= 0) return null;
      const parts = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(`${safeKey}__${i}`);
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key, value) {
    const str = String(value ?? '');
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, str);
      return;
    }
    try {
      const safeKey = sanitizeSecureKey(key);
      if (str.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(safeKey, str);
        await SecureStore.deleteItemAsync(`${safeKey}__chunks`);
        return;
      }
      const chunks = [];
      for (let i = 0; i < str.length; i += CHUNK_SIZE) {
        chunks.push(str.slice(i, i + CHUNK_SIZE));
      }
      await Promise.all(
        chunks.map((chunk, idx) => SecureStore.setItemAsync(`${safeKey}__${idx}`, chunk)),
      );
      await SecureStore.setItemAsync(`${safeKey}__chunks`, String(chunks.length));
      await SecureStore.deleteItemAsync(safeKey);
    } catch {
      await AsyncStorage.setItem(key, str);
    }
  },

  async removeItem(key) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      const safeKey = sanitizeSecureKey(key);
      const countStr = await SecureStore.getItemAsync(`${safeKey}__chunks`);
      const count = Number(countStr || 0);
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${safeKey}__${i}`);
      }
      await SecureStore.deleteItemAsync(`${safeKey}__chunks`);
      await SecureStore.deleteItemAsync(safeKey);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

export async function readJsonCache(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJsonCache(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}
