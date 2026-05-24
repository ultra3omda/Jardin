import * as SecureStore from 'expo-secure-store';

/** Clés de stockage sécurisé */
export const STORAGE_KEYS = {
  REFRESH_TOKEN: 'klasso_refresh_token',
  TENANT_SLUG: 'klasso_tenant_slug',
} as const;

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function saveTenantSlug(slug: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.TENANT_SLUG, slug);
}

export async function getSavedTenantSlug(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.TENANT_SLUG);
}

export async function deleteTenantSlug(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.TENANT_SLUG);
}
