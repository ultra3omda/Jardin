import { NextRequest, NextResponse } from 'next/server';

/** GTM — Passthrough proxy /api/subscriptions* → NestJS API. */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error(`NEXT_PUBLIC_API_URL must be an absolute http(s) URL. Got: "${API_URL}"`);
}

interface Context {
  params: { action?: string[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const auth = req.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }
  const url = new URL(req.url);
  const suffix = action ? `/${action}` : '';
  const target = `${API_URL}/api/subscriptions${suffix}${url.search}`;
  const upstream = await fetch(target, { method: 'GET', headers: { Authorization: auth } });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
