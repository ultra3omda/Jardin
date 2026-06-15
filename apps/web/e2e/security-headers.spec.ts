import { test, expect } from '@playwright/test';

/**
 * Asserts the hardened security headers are served. `upgrade-insecure-requests`
 * and HSTS are Vercel-only (real HTTPS) and intentionally absent on the
 * http://localhost E2E origin, so they are NOT asserted here.
 */
test.describe('Security headers', () => {
  test('serves CSP + standard hardening headers on every response', async ({ page }) => {
    const response = await page.goto('/fr');
    expect(response).not.toBeNull();
    const headers = response!.headers();

    const csp = headers['content-security-policy'];
    expect(csp, 'CSP header present').toBeTruthy();
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ]) {
      expect(csp, `CSP contains "${directive}"`).toContain(directive);
    }

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('geolocation=()');
  });
});
