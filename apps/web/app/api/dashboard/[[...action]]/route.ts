import { NextRequest, NextResponse } from 'next/server';

/**
 * Passthrough proxy `/api/dashboard*` → NestJS API. The dashboard overview is
 * read-only, so only GET is needed. Without this proxy the web hit its own
 * origin (404) and every KPI rendered as "—".
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error(`NEXT_PUBLIC_API_URL must be an absolute http(s) URL. Got: "${API_URL}"`);
}

interface Context {
  params: { action?: string[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }
  const url = new URL(request.url);
  const suffix = action ? `/${action}` : '';
  const upstream = await fetch(`${API_URL}/api/dashboard${suffix}${url.search}`, {
    method: 'GET',
    headers: { Authorization: auth },
  });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
