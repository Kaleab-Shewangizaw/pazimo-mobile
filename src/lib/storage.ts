import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * SecureStore has no web implementation, and this project builds for web.
 * `secureStorage` therefore degrades to AsyncStorage (localStorage) off-native —
 * fine for a dev/web build, but it means a web session's token is readable by
 * any script on the origin. Native builds get the Keychain/Keystore.
 */
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export type Storage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export const secureStorage: Storage = {
  get: (key) => (isNative ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key)),
  set: (key, value) =>
    isNative ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value),
  remove: (key) =>
    isNative ? SecureStore.deleteItemAsync(key) : AsyncStorage.removeItem(key),
};

export const storage: Storage = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};

export const StorageKeys = {
  token: 'pazimo.auth.token',
  user: 'pazimo.auth.user',
  wishlist: 'pazimo.wishlist',
  recentSearches: 'pazimo.search.recent',
} as const;
