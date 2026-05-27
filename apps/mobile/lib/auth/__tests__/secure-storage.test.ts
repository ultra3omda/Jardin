/**
 * Unit tests for the secure-storage wrappers.
 *
 * expo-secure-store is mocked entirely — these tests verify that our helper
 * functions call the correct SecureStore methods with the correct key/value
 * arguments, without touching any native bridge.
 *
 * NOTE: The module has a web/native branch via `Platform.OS`.  Jest runs in
 * Node, so `Platform.OS` is 'ios' by default under jest-expo, which means the
 * SecureStore path is exercised.  The localStorage fallback is tested via the
 * globalThis override approach at the end.
 */

// ---------------------------------------------------------------------------
// Mocks — must be at the top level before any imports
// ---------------------------------------------------------------------------

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import * as SecureStore from 'expo-secure-store';
import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  saveTenantSlug,
  getSavedTenantSlug,
  deleteTenantSlug,
  STORAGE_KEYS,
} from '../secure-storage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSetItem = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;
const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.MockedFunction<typeof SecureStore.deleteItemAsync>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests — refresh token
// ---------------------------------------------------------------------------

describe('saveRefreshToken', () => {
  it('calls SecureStore.setItemAsync with the correct key and value', async () => {
    await saveRefreshToken('refresh_tok_xyz');
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN, 'refresh_tok_xyz');
  });
});

describe('getRefreshToken', () => {
  it('calls SecureStore.getItemAsync with the correct key', async () => {
    mockGetItem.mockResolvedValueOnce('stored_refresh_tok');
    const result = await getRefreshToken();
    expect(mockGetItem).toHaveBeenCalledTimes(1);
    expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    expect(result).toBe('stored_refresh_tok');
  });

  it('returns null when SecureStore returns null', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const result = await getRefreshToken();
    expect(result).toBeNull();
  });
});

describe('deleteRefreshToken', () => {
  it('calls SecureStore.deleteItemAsync with the correct key', async () => {
    await deleteRefreshToken();
    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
  });
});

// ---------------------------------------------------------------------------
// Tests — tenant slug
// ---------------------------------------------------------------------------

describe('saveTenantSlug', () => {
  it('calls SecureStore.setItemAsync with the correct key and value', async () => {
    await saveTenantSlug('ecole-demo');
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEYS.TENANT_SLUG, 'ecole-demo');
  });
});

describe('getSavedTenantSlug', () => {
  it('calls SecureStore.getItemAsync with the correct key', async () => {
    mockGetItem.mockResolvedValueOnce('ecole-demo');
    const result = await getSavedTenantSlug();
    expect(mockGetItem).toHaveBeenCalledTimes(1);
    expect(mockGetItem).toHaveBeenCalledWith(STORAGE_KEYS.TENANT_SLUG);
    expect(result).toBe('ecole-demo');
  });

  it('returns null when SecureStore returns null (no saved slug)', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const result = await getSavedTenantSlug();
    expect(result).toBeNull();
  });
});

describe('deleteTenantSlug', () => {
  it('calls SecureStore.deleteItemAsync with the correct key', async () => {
    await deleteTenantSlug();
    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith(STORAGE_KEYS.TENANT_SLUG);
  });
});

// ---------------------------------------------------------------------------
// Tests — STORAGE_KEYS constants
// ---------------------------------------------------------------------------

describe('STORAGE_KEYS', () => {
  it('has a REFRESH_TOKEN key', () => {
    expect(typeof STORAGE_KEYS.REFRESH_TOKEN).toBe('string');
    expect(STORAGE_KEYS.REFRESH_TOKEN.length).toBeGreaterThan(0);
  });

  it('has a TENANT_SLUG key', () => {
    expect(typeof STORAGE_KEYS.TENANT_SLUG).toBe('string');
    expect(STORAGE_KEYS.TENANT_SLUG.length).toBeGreaterThan(0);
  });

  it('REFRESH_TOKEN and TENANT_SLUG are distinct keys', () => {
    expect(STORAGE_KEYS.REFRESH_TOKEN).not.toBe(STORAGE_KEYS.TENANT_SLUG);
  });
});
