import { describe, it, expect } from 'vitest';
import {
  extractTenantSlugFromHost,
  RESERVED_SLUGS,
} from '../extract-tenant-slug';

describe('extractTenantSlugFromHost', () => {
  it('extrait le slug pour <slug>.klasso.tn', () => {
    expect(extractTenantSlugFromHost('mon-ecole.klasso.tn', 'klasso.tn')).toBe('mon-ecole');
  });

  it('extrait le slug pour <slug>.klasso.fr', () => {
    expect(extractTenantSlugFromHost('victor-hugo.klasso.fr', 'klasso.fr')).toBe('victor-hugo');
  });

  it('retourne null pour le domaine racine', () => {
    expect(extractTenantSlugFromHost('klasso.tn', 'klasso.tn')).toBeNull();
  });

  it('retourne null pour www', () => {
    expect(extractTenantSlugFromHost('www.klasso.tn', 'klasso.tn')).toBeNull();
  });

  it('retourne null pour app (reservé)', () => {
    expect(extractTenantSlugFromHost('app.klasso.tn', 'klasso.tn')).toBeNull();
  });

  it('retourne null pour localhost', () => {
    expect(extractTenantSlugFromHost('localhost:3000', 'klasso.tn')).toBeNull();
  });

  it('retourne null pour un host qui ne correspond pas au baseDomain', () => {
    expect(extractTenantSlugFromHost('evil.other.com', 'klasso.tn')).toBeNull();
  });

  it('retourne null si le slug contient des caractères invalides', () => {
    expect(extractTenantSlugFromHost('MAJUSCULE.klasso.tn', 'klasso.tn')).toBeNull();
  });

  it('accepte un slug avec tirets valides', () => {
    expect(extractTenantSlugFromHost('ecole-victor-hugo.klasso.tn', 'klasso.tn')).toBe('ecole-victor-hugo');
  });
});

// Reference RESERVED_SLUGS to ensure the named export is wired through.
void RESERVED_SLUGS;
