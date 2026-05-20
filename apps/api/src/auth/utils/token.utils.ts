import { createHash, randomBytes } from 'node:crypto';

/**
 * Generates an opaque refresh token (32 bytes random, base64url-encoded).
 * Sent to the client in the response body and stored client-side; the
 * server never persists the plaintext — only its SHA-256 hash.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 of the refresh token (hex). Stored in DB and used for lookups
 * on /refresh and /logout. SHA-256 is sufficient (not bcrypt) because the
 * input has 256 bits of entropy — brute-forcing the hash is infeasible.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
