import type { Request } from 'express';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Extracts the request metadata we persist on RefreshToken and AuditLog rows.
 * Truncates user-agent to a sane length to avoid log/DB bloat.
 */
export function getRequestMeta(req: Request): RequestMeta {
  const userAgent = req.headers['user-agent'];
  return {
    ip: req.ip,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : undefined,
  };
}
