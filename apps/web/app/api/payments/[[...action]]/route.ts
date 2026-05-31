import { NextRequest, NextResponse } from 'next/server';

/**
 * GTM — Passthrough proxy /api/payments* → NestJS API (checkout, plans, return, callback).
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

export async function GET(req: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(req, ctx, 'GET');
}
export async function POST(req: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(req, ctx, 'POST');
}

async function passthrough(
  req: NextRequest,
  ctx: Context,
  method: 'GET' | 'POST',
): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const url = new URL(req.url);
  const suffix = action ? `/${action}` : '';
  const target = `${API_URL}/api/payments${suffix}${url.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;
  let body: BodyInit | undefined;
  if (method === 'POST') {
    headers['Content-Type'] = req.headers.get('content-type') ?? 'application/json';
    body = await req.text();
  }

  const upstream = await fetch(target, { method, headers, body });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
