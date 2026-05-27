/**
 * Unit tests for the mobile auth Zustand store.
 *
 * Tests run in a pure Node environment — no React, no native bridge needed.
 * Zustand stores are accessed via `.getState()` / `.setState()` directly.
 */

import { useAuthStore } from '../store';
import type { AuthUser, AuthTenant } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockUser: AuthUser = {
  id: 'user-001',
  tenantId: 'tenant-001',
  email: 'admin@ecole-demo.fr',
  firstName: 'Ali',
  lastName: 'Ben Salah',
  role: 'SCHOOL_ADMIN',
  locale: 'fr',
};

const mockTenant: AuthTenant = {
  id: 'tenant-001',
  name: 'École Demo Tunis',
  slug: 'ecole-demo',
  type: 'PRIMARY_SCHOOL',
  locale: 'fr',
  timezone: 'Africa/Tunis',
  brand: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to its initial state after every test. */
afterEach(() => {
  useAuthStore.getState().clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('has accessToken as null', () => {
      // Use setState to force a clean slate (bypasses afterEach ordering)
      useAuthStore.setState({ accessToken: null, user: null, tenant: null, isHydrated: false });
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('has user as null', () => {
      useAuthStore.setState({ accessToken: null, user: null, tenant: null, isHydrated: false });
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('has tenant as null', () => {
      useAuthStore.setState({ accessToken: null, user: null, tenant: null, isHydrated: false });
      expect(useAuthStore.getState().tenant).toBeNull();
    });

    it('exposes isHydrated as a boolean', () => {
      expect(typeof useAuthStore.getState().isHydrated).toBe('boolean');
    });
  });

  describe('setSession', () => {
    it('sets accessToken', () => {
      useAuthStore.getState().setSession({
        accessToken: 'tok_access_abc123',
        user: mockUser,
        tenant: mockTenant,
      });
      expect(useAuthStore.getState().accessToken).toBe('tok_access_abc123');
    });

    it('sets user with all required fields', () => {
      useAuthStore.getState().setSession({
        accessToken: 'tok_access_abc123',
        user: mockUser,
        tenant: mockTenant,
      });
      const user = useAuthStore.getState().user;
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-001');
      expect(user?.email).toBe('admin@ecole-demo.fr');
      expect(user?.firstName).toBe('Ali');
      expect(user?.lastName).toBe('Ben Salah');
      expect(user?.role).toBe('SCHOOL_ADMIN');
      expect(user?.locale).toBe('fr');
      expect(user?.tenantId).toBe('tenant-001');
    });

    it('sets tenant with all required fields', () => {
      useAuthStore.getState().setSession({
        accessToken: 'tok_access_abc123',
        user: mockUser,
        tenant: mockTenant,
      });
      const tenant = useAuthStore.getState().tenant;
      expect(tenant).not.toBeNull();
      expect(tenant?.id).toBe('tenant-001');
      expect(tenant?.name).toBe('École Demo Tunis');
      expect(tenant?.slug).toBe('ecole-demo');
      expect(tenant?.type).toBe('PRIMARY_SCHOOL');
    });

    it('accepts null tenant (super-admin without tenant)', () => {
      const superAdmin: AuthUser = {
        ...mockUser,
        id: 'sa-001',
        tenantId: null,
        role: 'SUPER_ADMIN',
      };
      useAuthStore.getState().setSession({
        accessToken: 'tok_sa',
        user: superAdmin,
        tenant: null,
      });
      expect(useAuthStore.getState().accessToken).toBe('tok_sa');
      expect(useAuthStore.getState().tenant).toBeNull();
      expect(useAuthStore.getState().user?.role).toBe('SUPER_ADMIN');
    });

    it('sets isHydrated to true', () => {
      useAuthStore.setState({ isHydrated: false });
      useAuthStore.getState().setSession({
        accessToken: 'tok_access_abc123',
        user: mockUser,
        tenant: mockTenant,
      });
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    it('replaces a previous session when called again', () => {
      useAuthStore.getState().setSession({
        accessToken: 'first_tok',
        user: mockUser,
        tenant: mockTenant,
      });
      const newUser: AuthUser = { ...mockUser, id: 'user-002', email: 'other@ecole.fr' };
      useAuthStore.getState().setSession({
        accessToken: 'second_tok',
        user: newUser,
        tenant: null,
      });

      expect(useAuthStore.getState().accessToken).toBe('second_tok');
      expect(useAuthStore.getState().user?.id).toBe('user-002');
      expect(useAuthStore.getState().tenant).toBeNull();
    });
  });

  describe('clear', () => {
    it('resets accessToken to null', () => {
      useAuthStore.getState().setSession({ accessToken: 'tok', user: mockUser, tenant: mockTenant });
      useAuthStore.getState().clear();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('resets user to null', () => {
      useAuthStore.getState().setSession({ accessToken: 'tok', user: mockUser, tenant: mockTenant });
      useAuthStore.getState().clear();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('resets tenant to null', () => {
      useAuthStore.getState().setSession({ accessToken: 'tok', user: mockUser, tenant: mockTenant });
      useAuthStore.getState().clear();
      expect(useAuthStore.getState().tenant).toBeNull();
    });

    it('sets isHydrated to true after clear (bootstrap complete)', () => {
      useAuthStore.getState().setSession({ accessToken: 'tok', user: mockUser, tenant: mockTenant });
      useAuthStore.getState().clear();
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    it('is idempotent — calling clear twice does not throw', () => {
      expect(() => {
        useAuthStore.getState().clear();
        useAuthStore.getState().clear();
      }).not.toThrow();
    });
  });

  describe('setHydrated', () => {
    it('sets isHydrated to true', () => {
      useAuthStore.getState().setHydrated(true);
      expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    it('sets isHydrated to false', () => {
      useAuthStore.getState().setHydrated(true);
      useAuthStore.getState().setHydrated(false);
      expect(useAuthStore.getState().isHydrated).toBe(false);
    });
  });
});
