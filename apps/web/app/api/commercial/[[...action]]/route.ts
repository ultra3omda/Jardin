import { NextRequest, NextResponse } from 'next/server';

// GTM — passthrough proxy for /api/commercial/* (commercial back-office).
// Pure Bearer auth (no refresh cookie management), mirrors /api/admin.
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
  return passthrough(request, ctx, 'GET');
}

export async function POST(request: NextRequest, ctx: Context): Promise<NextResponse> {
  return passthrough(request, ctx, 'POST');
}

async function passthrough(
  request: NextRequest,
  ctx: Context,
  method: 'GET' | 'POST',
): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }

  const init: RequestInit = {
    method,
    headers: {
      Authorization: auth,
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
    },
  };
  if (method !== 'GET') {
    init.body = await request.text();
  }

  const upstream = await fetch(
    `${API_URL}/api/commercial${action ? `/${action}` : ''}${new URL(request.url).search}`,
    init,
  );
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
