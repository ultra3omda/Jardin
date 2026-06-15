import { describe, it, expect } from 'vitest';
import { isItemActive } from '@/lib/nav/active';

describe('isItemActive', () => {
  it('matche le segment exact (pas de faux positif startsWith)', () => {
    expect(isItemActive('/fr/absences', '/absences')).toBe(true);
    expect(isItemActive('/fr/absence', '/absences')).toBe(false); // faux positif évité
  });
  it('matche les sous-routes du même segment', () => {
    expect(isItemActive('/fr/students/123', '/students')).toBe(true);
  });
  it('ne matche pas un autre segment', () => {
    expect(isItemActive('/fr/classes', '/students')).toBe(false);
  });
});
