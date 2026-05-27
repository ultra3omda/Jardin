import { describe, it, expect } from 'vitest';
import { getNavForUser } from './menu';
import type { AuthTenant, AuthUser } from '@/lib/auth/types';

const baseUser = (overrides: Partial<AuthUser>): AuthUser => ({
  id: 'u1',
  tenantId: 't1',
  email: 'x@y.tn',
  firstName: 'A',
  lastName: 'B',
  role: 'SCHOOL_ADMIN',
  locale: 'fr',
  ...overrides,
});

const tenant = (type: 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED'): AuthTenant => ({
  id: 't1',
  name: 'T',
  slug: 's',
  type,
  locale: 'fr',
  timezone: 'Africa/Tunis',
  brand: null,
});

describe('getNavForUser', () => {
  it('returns platform menu when role is SUPER_ADMIN (ignores tenant)', () => {
    const sections = getNavForUser(baseUser({ role: 'SUPER_ADMIN' }), null);
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('tenants');
    expect(ids).toContain('audit');
    expect(ids).not.toContain('students');
    expect(ids).not.toContain('notes');
  });

  it('PRIMARY_SCHOOL admin sees Notes + Bulletins + Discipline', () => {
    const sections = getNavForUser(baseUser({ role: 'SCHOOL_ADMIN' }), tenant('PRIMARY_SCHOOL'));
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('notes');
    expect(ids).toContain('bulletins');
    expect(ids).toContain('discipline');
    expect(ids).toContain('students');
  });

  it('KINDERGARTEN admin sees journal/activities and NOT notes/bulletins/discipline', () => {
    const sections = getNavForUser(baseUser({ role: 'SCHOOL_ADMIN' }), tenant('KINDERGARTEN'));
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('journal');
    expect(ids).toContain('activities');
    expect(ids).not.toContain('notes');
    expect(ids).not.toContain('bulletins');
    expect(ids).not.toContain('discipline');
  });

  it('KINDERGARTEN labels: Enfants instead of Élèves, Animateurs instead of Enseignants', () => {
    const sections = getNavForUser(baseUser({ role: 'SCHOOL_ADMIN' }), tenant('KINDERGARTEN'));
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'students')?.label).toBe('Enfants');
    expect(items.find((i) => i.id === 'teachers')?.label).toBe('Animateurs');
    expect(items.find((i) => i.id === 'classes')?.label).toBe("Groupes d'âge");
  });

  it('TEACHER on PRIMARY sees own classes section, no Administration/RH', () => {
    const sections = getNavForUser(baseUser({ role: 'TEACHER' }), tenant('PRIMARY_SCHOOL'));
    const sectionIds = sections.map((s) => s.id);
    expect(sectionIds).not.toContain('administration');
    expect(sectionIds).toContain('pedagogie');
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'notes')).toBeDefined();
    expect(items.find((i) => i.id === 'hrPayroll')).toBeUndefined();
  });

  it('PARENT on PRIMARY sees mesEnfants + finance.payments', () => {
    const sections = getNavForUser(baseUser({ role: 'PARENT' }), tenant('PRIMARY_SCHOOL'));
    const sectionIds = sections.map((s) => s.id);
    expect(sectionIds).toContain('mesEnfants');
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'payments')).toBeDefined();
    expect(items.find((i) => i.id === 'discipline')).toBeUndefined();
  });

  it('STAFF sees Vie École + read-only Élèves', () => {
    const sections = getNavForUser(baseUser({ role: 'STAFF' }), tenant('PRIMARY_SCHOOL'));
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'canteen')).toBeDefined();
    expect(items.find((i) => i.id === 'transport')).toBeDefined();
    expect(items.find((i) => i.id === 'notes')).toBeUndefined();
  });
});
