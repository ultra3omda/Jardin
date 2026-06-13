/**
 * Tests for interpretLoginError — the pure decision function that maps a
 * failed login() call to the next UI action:
 *   - 'tenant-required'      → show the establishment picker (multi-tenant email)
 *   - 'invalid-credentials'  → show "Email ou mot de passe incorrect."
 *   - 'generic'              → show a generic connection error
 *
 * Keeping this logic pure (no React) lets us test the whole branching without
 * rendering the screen.
 */

import { ApiError } from '../../api/client';
import { interpretLoginError, TENANT_SLUG_REQUIRED } from '../login-flow';

describe('interpretLoginError', () => {
  it('asks for tenant selection with the available slugs', () => {
    const err = new ApiError(400, 'Multiple accounts', TENANT_SLUG_REQUIRED, {
      availableTenantSlugs: ['smiley', 'demo-ecole'],
    });

    expect(interpretLoginError(err)).toEqual({
      type: 'tenant-required',
      slugs: ['smiley', 'demo-ecole'],
    });
  });

  it('falls back to empty slug list when details are missing', () => {
    const err = new ApiError(400, 'Multiple accounts', TENANT_SLUG_REQUIRED);

    expect(interpretLoginError(err)).toEqual({ type: 'tenant-required', slugs: [] });
  });

  it('reports invalid credentials on 401', () => {
    expect(interpretLoginError(new ApiError(401, 'Invalid credentials'))).toEqual({
      type: 'invalid-credentials',
    });
  });

  it('reports a generic error for network/unknown failures', () => {
    expect(interpretLoginError(new Error('network down'))).toEqual({ type: 'generic' });
  });

  it('treats a non-401 ApiError without a known code as generic', () => {
    expect(interpretLoginError(new ApiError(500, 'Server error'))).toEqual({ type: 'generic' });
  });
});
