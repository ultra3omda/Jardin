import { describe, it, expect } from 'vitest';

import {
  normalizeName,
  parseAmount,
  parseClassLabel,
  parseLegacyDate,
  splitName,
} from './parse';

describe('splitName', () => {
  it('dernier token = prénom, reste = nom', () => {
    expect(splitName('ben jaballah Elyana')).toEqual({
      firstName: 'Elyana',
      lastName: 'ben jaballah',
    });
  });
  it('un seul token', () => {
    expect(splitName('Sami')).toEqual({ firstName: 'Sami', lastName: '' });
  });
  it('chaîne vide', () => {
    expect(splitName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('parseLegacyDate', () => {
  it('retire le suffixe Z legacy', () => {
    expect(parseLegacyDate('2026-02-11Z')).toEqual(new Date('2026-02-11'));
  });
});

describe('parseAmount', () => {
  it('parse "520.0" en nombre', () => {
    expect(parseAmount('520.0')).toBe(520);
  });
  it('arrondit au millime', () => {
    expect(parseAmount('33.3334')).toBe(33.333);
  });
  it('valeur non numérique → 0', () => {
    expect(parseAmount('abc')).toBe(0);
  });
});

describe('parseClassLabel', () => {
  it('extrait niveau et nom', () => {
    expect(parseClassLabel("Jardin d'enfants -3ans: 3ans-Les poussins")).toEqual({
      level: "Jardin d'enfants -3ans",
      name: '3ans-Les poussins',
    });
  });
  it('sans séparateur → level = name = label', () => {
    expect(parseClassLabel('Prépa')).toEqual({ level: 'Prépa', name: 'Prépa' });
  });
});

describe('normalizeName', () => {
  it('minuscule + espaces compactés', () => {
    expect(normalizeName('  Jana   CHERIF ')).toBe('jana cherif');
  });
});
