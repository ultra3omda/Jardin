import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  PLATFORM_SHARED_MODELS,
  TENANT_SCOPED_EXCEPTIONS,
  TENANT_SCOPED_MODELS,
} from './tenant.extension';

/**
 * Guard test (risque R10) : toute table du schéma Prisma qui porte une
 * colonne `tenantId` DOIT être couverte par l'extension d'isolation
 * (TENANT_SCOPED_MODELS) ou être une exception documentée
 * (TENANT_SCOPED_EXCEPTIONS, avec justification écrite dans
 * tenant.extension.ts).
 *
 * Si ce test échoue après l'ajout d'un modèle : ajouter le modèle à
 * TENANT_SCOPED_MODELS + étendre multi-tenant-isolation.e2e-spec.ts,
 * OU documenter l'exception. Ne JAMAIS l'ignorer.
 */
describe('TENANT_SCOPED_MODELS guard (R10)', () => {
  const schemaModelsWithTenantId = Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === 'tenantId'))
    .map((model) => model.name);

  const covered: readonly string[] = [...TENANT_SCOPED_MODELS, ...TENANT_SCOPED_EXCEPTIONS];

  it('every schema model with a tenantId column is scoped or a documented exception', () => {
    const uncovered = schemaModelsWithTenantId.filter((name) => !covered.includes(name));
    expect(
      uncovered,
      `Models with a tenantId column missing from TENANT_SCOPED_MODELS (or exceptions): ${uncovered.join(', ')}. ` +
        'Add them to TENANT_SCOPED_MODELS in tenant.extension.ts AND cover them in multi-tenant-isolation.e2e-spec.ts.',
    ).toEqual([]);
  });

  it('every listed scoped model still exists in the schema with a tenantId column', () => {
    const stale = TENANT_SCOPED_MODELS.filter((name) => !schemaModelsWithTenantId.includes(name));
    expect(stale, `Stale entries in TENANT_SCOPED_MODELS: ${stale.join(', ')}`).toEqual([]);
  });

  it('exceptions and scoped lists do not overlap', () => {
    const overlap = TENANT_SCOPED_EXCEPTIONS.filter((name) =>
      (TENANT_SCOPED_MODELS as readonly string[]).includes(name),
    );
    expect(overlap).toEqual([]);
  });

  it('platform-shared models are a subset of scoped models', () => {
    const notScoped = PLATFORM_SHARED_MODELS.filter(
      (name) => !(TENANT_SCOPED_MODELS as readonly string[]).includes(name),
    );
    expect(notScoped).toEqual([]);
  });
});
