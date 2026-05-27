import { NextRequest, NextResponse } from 'next/server';

/**
 * V6 — Passthrough proxy `/api/bulletins*` → NestJS `/api/bulletins*`.
 *
 * Unlike other proxies, the `POST /generate` endpoint returns `application/pdf`
 * (binary). We detect non-JSON content types upstream and pass the raw bytes
 * back to the caller, preserving Content-Disposition / X-Bulletin-Id headers.
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
  const auth = req.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }
  const url = new URL(req.url);
  const suffix = action ? `/${action}` : '';
  const target = `${API_URL}/api/bulletins${suffix}${url.search}`;

  const headers: Record<string, string> = { Authorization: auth };
  if (method === 'POST') {
    headers['Content-Type'] = req.headers.get('content-type') ?? 'application/json';
  }
  const body: BodyInit | undefined = method === 'POST' ? await req.text() : undefined;

  const upstream = await fetch(target, { method, headers, body });
  const upstreamCt = upstream.headers.get('content-type') ?? 'application/json';

  // Binary PDF passthrough
  if (upstreamCt.startsWith('application/pdf')) {
    const buf = await upstream.arrayBuffer();
    const respHeaders: Record<string, string> = { 'Content-Type': upstreamCt };
    const disposition = upstream.headers.get('content-disposition');
    if (disposition) respHeaders['Content-Disposition'] = disposition;
    const bulletinId = upstream.headers.get('x-bulletin-id');
    if (bulletinId) respHeaders['X-Bulletin-Id'] = bulletinId;
    return new NextResponse(buf, { status: upstream.status, headers: respHeaders });
  }

  // JSON / text passthrough
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstreamCt },
  });
}
