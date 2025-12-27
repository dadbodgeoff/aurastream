import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Web fallback using localStorage (SecureStore is not available on web)
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const TokenStorage = {
  /**
   * Get the stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      if (isNative) {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      }
      return await webStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },

  /**
   * Store the access token securely
   */
  async setAccessToken(token: string): Promise<void> {
    try {
      if (isNative) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } else {
        await webStorage.setItem(ACCESS_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Failed to set access token:', error);
    }
  },

  /**
   * Get the stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (isNative) {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      }
      return await webStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  },

  /**
   * Store the refresh token securely
   */
  async setRefreshToken(token: string): Promise<void> {
    try {
      if (isNative) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } else {
        await webStorage.setItem(REFRESH_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Failed to set refresh token:', error);
    }
  },

  /**
   * Store both tokens at once
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.setAccessToken(accessToken),
      this.setRefreshToken(refreshToken),
    ]);
  },

  /**
   * Clear all stored tokens (for logout)
   */
  async clearTokens(): Promise<void> {
    try {
      if (isNative) {
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
      } else {
        await Promise.all([
          webStorage.deleteItem(ACCESS_TOKEN_KEY),
          webStorage.deleteItem(REFRESH_TOKEN_KEY),
        ]);
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  },

  /**
   * Check if tokens exist (user might be logged in)
   */
  async hasTokens(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return accessToken !== null;
  },
};
