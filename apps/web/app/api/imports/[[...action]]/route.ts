import { NextRequest, NextResponse } from 'next/server';

/**
 * Passthrough proxy `/api/imports*` → NestJS API. Handles:
 *  - GET  /imports/entities
 *  - GET  /imports/:entity/template?format=xlsx|csv  (binary download)
 *  - POST /imports/:entity?dryRun=…                   (multipart upload)
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
  const upstream = await fetch(`${API_URL}/api/imports/${action}${url.search}`, {
    method: 'GET',
    headers: { Authorization: auth },
  });
  // Templates are binary; stream them through with their content headers.
  const buf = await upstream.arrayBuffer();
  const res = new NextResponse(buf, { status: upstream.status });
  const ct = upstream.headers.get('content-type');
  const cd = upstream.headers.get('content-disposition');
  if (ct) res.headers.set('Content-Type', ct);
  if (cd) res.headers.set('Content-Disposition', cd);
  return res;
}

export async function POST(request: NextRequest, ctx: Context): Promise<NextResponse> {
  const action = ctx.params.action?.join('/') ?? '';
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ message: 'Missing Authorization header' }, { status: 401 });
  }
  const url = new URL(request.url);
  // Forward the multipart body untouched (preserve the boundary content-type).
  const body = await request.arrayBuffer();
  const upstream = await fetch(`${API_URL}/api/imports/${action}${url.search}`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': request.headers.get('content-type') ?? 'application/octet-stream',
    },
    body,
  });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
