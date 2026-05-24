import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Clés de stockage sécurisé */
export const STORAGE_KEYS = {
  REFRESH_TOKEN: 'klasso_refresh_token',
  TENANT_SLUG: 'klasso_tenant_slug',
} as const;

/**
 * V1.7-A2 fix : expo-secure-store n'a pas d'implémentation web (Keychain/
 * Keystore = iOS/Android only). Sur web (Expo Web export → Vercel), on
 * fallback sur `window.localStorage`.
 *
 * Trade-off sécurité : localStorage est lisible par JS donc XSS-exposed.
 * Acceptable en V1.7-A pour la preview cloud parce que :
 *   - Le refresh token mobile est court-vivant (30j max comme web)
 *   - L'app web vraie (apps/web) utilise httpOnly cookies, pas localStorage
 *   - klasso-mobile.vercel.app sert uniquement le preview UX (pas prod user)
 *
 * Migration future (V12 EAS Build natif) : ce fallback web ne sera utilisé
 * que pour la preview / debug. Les builds iOS/Android utiliseront SecureStore.
 */
const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    const w = (globalThis as { localStorage?: Storage }).localStorage;
    if (!w) return; // SSR safety
    w.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    const w = (globalThis as { localStorage?: Storage }).localStorage;
    if (!w) return null; // SSR safety
    return w.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    const w = (globalThis as { localStorage?: Storage }).localStorage;
    if (!w) return; // SSR safety
    w.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function deleteRefreshToken(): Promise<void> {
  await deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function saveTenantSlug(slug: string): Promise<void> {
  await setItem(STORAGE_KEYS.TENANT_SLUG, slug);
}

export async function getSavedTenantSlug(): Promise<string | null> {
  return getItem(STORAGE_KEYS.TENANT_SLUG);
}

export async function deleteTenantSlug(): Promise<void> {
  await deleteItem(STORAGE_KEYS.TENANT_SLUG);
}
