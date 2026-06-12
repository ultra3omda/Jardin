import { NextRequest, NextResponse } from 'next/server';

/** G6 — Passthrough proxy `/api/appointments*` → NestJS `/api/appointments*`. */
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
export async function PATCH(req: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(req, ctx, 'PATCH');
}
export async function PUT(req: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(req, ctx, 'PUT');
}
export async function DELETE(req: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(req, ctx, 'DELETE');
}

async function passthrough(
  req: NextRequest,
  ctx: Context,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const auth = req.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }
  const url = new URL(req.url);
  const suffix = action ? `/${action}` : '';
  const target = `${API_URL}/api/appointments${suffix}${url.search}`;

  const headers: Record<string, string> = { Authorization: auth };
  const hasBody = method !== 'GET' && method !== 'DELETE';
  if (hasBody) {
    headers['Content-Type'] = req.headers.get('content-type') ?? 'application/json';
  }
  const body: BodyInit | undefined = hasBody ? await req.text() : undefined;

  const upstream = await fetch(target, { method, headers, body });
  const upstreamCt = upstream.headers.get('content-type') ?? 'application/json';
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstreamCt },
  });
}
