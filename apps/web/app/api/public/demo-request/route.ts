import { NextRequest, NextResponse } from 'next/server';

/**
 * V0 Landing — passthrough proxy `/api/public/demo-request` → NestJS API.
 * No auth required (public endpoint).
 * Forwards X-Forwarded-For for Cloudflare Turnstile remoteip verification.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error(`NEXT_PUBLIC_API_URL must be absolute http(s). Got: "${API_URL}"`);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const upstream = await fetch(`${API_URL}/api/public/demo-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For':
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        '',
    },
    body,
  });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
