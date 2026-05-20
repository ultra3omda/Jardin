import { describe, expect, it } from 'vitest';
import { parseDurationMs } from './duration.utils';
import { generateRefreshToken, hashRefreshToken } from './token.utils';

describe('parseDurationMs', () => {
  it('parses seconds', () => {
    expect(parseDurationMs('30s')).toBe(30_000);
  });

  it('parses minutes', () => {
    expect(parseDurationMs('15m')).toBe(15 * 60_000);
  });

  it('parses hours', () => {
    expect(parseDurationMs('12h')).toBe(12 * 3_600_000);
  });

  it('parses days', () => {
    expect(parseDurationMs('30d')).toBe(30 * 86_400_000);
  });

  it('parses weeks', () => {
    expect(parseDurationMs('2w')).toBe(2 * 604_800_000);
  });

  it('throws on invalid format', () => {
    expect(() => parseDurationMs('30')).toThrow(/Invalid duration/);
    expect(() => parseDurationMs('30x')).toThrow(/Invalid duration/);
    expect(() => parseDurationMs('abc')).toThrow(/Invalid duration/);
    expect(() => parseDurationMs('')).toThrow(/Invalid duration/);
  });
});

describe('generateRefreshToken', () => {
  it('produces a base64url string of expected length', () => {
    const token = generateRefreshToken();
    // 32 random bytes -> 43 base64url chars (no padding)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('produces unique tokens on each call', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateRefreshToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('hashRefreshToken', () => {
  it('is deterministic for the same input', () => {
    const token = 'some-fixed-token';
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashRefreshToken('whatever');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different tokens', () => {
    expect(hashRefreshToken('a')).not.toBe(hashRefreshToken('b'));
  });
});
