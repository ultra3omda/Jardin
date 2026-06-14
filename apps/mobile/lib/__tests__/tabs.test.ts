/**
 * Unit tests for the runtime role→tabs resolver.
 *
 * Pure function — no React or native bridge needed. Verifies each UserRole
 * maps to the correct bottom-tab set and that every set ends with `profile`.
 */

import { getTabsForRole } from '../tabs';

describe('getTabsForRole', () => {
  it('returns admin tabs for SCHOOL_ADMIN', () => {
    expect(getTabsForRole('SCHOOL_ADMIN').map((t) => t.name)).toEqual([
      'dashboard', 'students', 'classes', 'pedagogy', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns teacher tabs for TEACHER', () => {
    expect(getTabsForRole('TEACHER').map((t) => t.name)).toEqual([
      'dashboard', 'classes', 'life', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns parent tabs for PARENT', () => {
    expect(getTabsForRole('PARENT').map((t) => t.name)).toEqual([
      'dashboard', 'students', 'life', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns minimal tabs for STAFF', () => {
    expect(getTabsForRole('STAFF').map((t) => t.name)).toEqual([
      'dashboard', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns minimal tabs for SUPER_ADMIN (no tenant → no messaging)', () => {
    expect(getTabsForRole('SUPER_ADMIN').map((t) => t.name)).toEqual([
      'dashboard', 'notifications', 'profile',
    ]);
  });

  it('returns platform pipeline tabs for COMMERCIAL (no tenant → no messaging)', () => {
    expect(getTabsForRole('COMMERCIAL').map((t) => t.name)).toEqual([
      'dashboard', 'commercial', 'notifications', 'profile',
    ]);
  });

  it('always ends with the profile tab', () => {
    (['SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STAFF', 'SUPER_ADMIN', 'COMMERCIAL'] as const).forEach((role) => {
      const tabs = getTabsForRole(role);
      expect(tabs[tabs.length - 1].name).toBe('profile');
    });
  });
});
