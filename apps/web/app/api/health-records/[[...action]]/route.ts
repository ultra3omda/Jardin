import { NextRequest, NextResponse } from 'next/server';

/**
 * T2b — Proxy passthrough /api/health-records*  → NestJS API.
 * Uses [[...action]] so the base path GET /api/health-records also resolves.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error(
    `NEXT_PUBLIC_API_URL must be an absolute http(s) URL. Got: "${API_URL}"`,
  );
}

interface Context {
  params: { action?: string[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(request, ctx, 'GET');
}

export async function POST(request: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(request, ctx, 'POST');
}

export async function PATCH(request: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(request, ctx, 'PATCH');
}

export async function DELETE(request: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(request, ctx, 'DELETE');
}

async function passthrough(
  request: NextRequest,
  ctx: Context,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }

  const incomingType = request.headers.get('content-type') ?? '';
  const isMultipart = incomingType.toLowerCase().startsWith('multipart/');
  const url = new URL(request.url);
  const suffix = action ? `/${action}` : '';
  const targetUrl = `${API_URL}/api/health-records${suffix}${url.search}`;

  const headers: Record<string, string> = { Authorization: auth };
  if (method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = incomingType || 'application/json';
  }

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    body = isMultipart ? await request.arrayBuffer() : await request.text();
  }

  const upstream = await fetch(targetUrl, { method, headers, body });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
