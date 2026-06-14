/**
 * Guard test — design system V7 « Médina » token contract (@ecole-saas/shared).
 *
 * Locks the web CSS variables (app/globals.css) against the shared contract:
 *  - STRUCTURAL tokens must equal the contract (identical to mobile).
 *  - WEB BRAND tokens (muted coral accent, cream paper) must equal the contract.
 *
 * Parses the raw `--token: #hex;` declarations so any drift in globals.css fails
 * CI — keeping web and the shared contract honest without coupling the runtime.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { STRUCTURAL_TOKENS, WEB_BRAND_TOKENS } from '@ecole-saas/shared';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, '../../../app/globals.css'), 'utf8');

/** Extract `--name: #rrggbb;` hex custom properties into a lowercase lookup. */
function hexVars(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

const vars = hexVars(css);

describe('web CSS tokens conform to the shared V7 contract', () => {
  describe('structural tokens (identical to mobile)', () => {
    it('navy ramp', () => {
      expect(vars['navy-500']).toBe(STRUCTURAL_TOKENS.navy[500]);
      expect(vars['navy-600']).toBe(STRUCTURAL_TOKENS.navy[600]);
      expect(vars['navy-700']).toBe(STRUCTURAL_TOKENS.navy[700]);
      expect(vars['navy-800']).toBe(STRUCTURAL_TOKENS.navy[800]);
      expect(vars['navy-900']).toBe(STRUCTURAL_TOKENS.navy[900]);
    });
    it('ink ramp', () => {
      expect(vars['ink-300']).toBe(STRUCTURAL_TOKENS.ink[300]);
      expect(vars['ink-500']).toBe(STRUCTURAL_TOKENS.ink[500]);
      expect(vars['ink-700']).toBe(STRUCTURAL_TOKENS.ink[700]);
      expect(vars['ink-900']).toBe(STRUCTURAL_TOKENS.ink[900]);
    });
    it('status colors', () => {
      expect(vars['success-500']).toBe(STRUCTURAL_TOKENS.status.success500);
      expect(vars['success-100']).toBe(STRUCTURAL_TOKENS.status.success100);
      expect(vars['info-500']).toBe(STRUCTURAL_TOKENS.status.info500);
      expect(vars['info-100']).toBe(STRUCTURAL_TOKENS.status.info100);
      expect(vars['danger-500']).toBe(STRUCTURAL_TOKENS.status.danger500);
    });
    it('paper-100', () => {
      expect(vars['paper-100']).toBe(STRUCTURAL_TOKENS.paper100);
    });
  });

  describe('web brand tokens (muted coral accent, cream paper)', () => {
    it('coral accent (ambre)', () => {
      expect(vars['ambre-50']).toBe(WEB_BRAND_TOKENS.ambre[50]);
      expect(vars['ambre-100']).toBe(WEB_BRAND_TOKENS.ambre[100]);
      expect(vars['ambre-500']).toBe(WEB_BRAND_TOKENS.ambre[500]);
      expect(vars['ambre-600']).toBe(WEB_BRAND_TOKENS.ambre[600]);
      expect(vars['ambre-700']).toBe(WEB_BRAND_TOKENS.ambre[700]);
    });
    it('cream paper-50', () => {
      expect(vars['paper-50']).toBe(WEB_BRAND_TOKENS.paper50);
    });
  });
});
