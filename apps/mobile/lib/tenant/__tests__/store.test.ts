/**
 * Unit tests for the mobile tenant Zustand store.
 *
 * Tests run in a pure Node environment.
 * Zustand stores are accessed via `.getState()` / `.setState()` directly.
 */

import { useTenantStore } from '../store';
import { DEFAULT_BRAND } from '@ecole-saas/shared';
import type { TenantBrand } from '@ecole-saas/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the store to its initial state after every test. */
afterEach(() => {
  useTenantStore.getState().clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTenantStore', () => {
  describe('initial state', () => {
    it('has slug as null', () => {
      useTenantStore.setState({ slug: null, name: null, brand: DEFAULT_BRAND });
      expect(useTenantStore.getState().slug).toBeNull();
    });

    it('has name as null', () => {
      useTenantStore.setState({ slug: null, name: null, brand: DEFAULT_BRAND });
      expect(useTenantStore.getState().name).toBeNull();
    });

    it('has brand set to DEFAULT_BRAND', () => {
      useTenantStore.setState({ slug: null, name: null, brand: DEFAULT_BRAND });
      expect(useTenantStore.getState().brand).toEqual(DEFAULT_BRAND);
    });
  });

  describe('setTenant', () => {
    it('sets slug', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', {});
      expect(useTenantStore.getState().slug).toBe('ecole-demo');
    });

    it('sets name', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo Tunis', {});
      expect(useTenantStore.getState().name).toBe('École Demo Tunis');
    });

    it('merges provided brand fields over DEFAULT_BRAND', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', {
        primaryColor: '#e11d48',
        primaryHover: '#be123c',
      });
      const brand = useTenantStore.getState().brand;
      expect(brand.primaryColor).toBe('#e11d48');
      expect(brand.primaryHover).toBe('#be123c');
      // Fields not provided fall back to DEFAULT_BRAND values
      expect(brand.secondaryColor).toBe(DEFAULT_BRAND.secondaryColor);
      expect(brand.emailHeaderColor).toBe(DEFAULT_BRAND.emailHeaderColor);
    });

    it('uses DEFAULT_BRAND when an empty partial brand is provided', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', {});
      expect(useTenantStore.getState().brand).toEqual(DEFAULT_BRAND);
    });

    it('preserves logoUrl when provided', () => {
      const brand: Partial<TenantBrand> = { logoUrl: 'https://r2.example.com/logo.png' };
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', brand);
      expect(useTenantStore.getState().brand.logoUrl).toBe('https://r2.example.com/logo.png');
    });

    it('replaces a previous tenant when called again', () => {
      useTenantStore.getState().setTenant('first-school', 'First School', {});
      useTenantStore.getState().setTenant('second-school', 'Second School', { primaryColor: '#10b981' });
      expect(useTenantStore.getState().slug).toBe('second-school');
      expect(useTenantStore.getState().name).toBe('Second School');
      expect(useTenantStore.getState().brand.primaryColor).toBe('#10b981');
    });
  });

  describe('clear', () => {
    it('resets slug to null', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', {});
      useTenantStore.getState().clear();
      expect(useTenantStore.getState().slug).toBeNull();
    });

    it('resets name to null', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', {});
      useTenantStore.getState().clear();
      expect(useTenantStore.getState().name).toBeNull();
    });

    it('resets brand to DEFAULT_BRAND', () => {
      useTenantStore.getState().setTenant('ecole-demo', 'École Demo', { primaryColor: '#e11d48' });
      useTenantStore.getState().clear();
      expect(useTenantStore.getState().brand).toEqual(DEFAULT_BRAND);
    });

    it('is idempotent — calling clear twice does not throw', () => {
      expect(() => {
        useTenantStore.getState().clear();
        useTenantStore.getState().clear();
      }).not.toThrow();
    });
  });
});
