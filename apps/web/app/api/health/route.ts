import { NextResponse } from 'next/server';
import { SHARED_VERSION } from '@ecole-saas/shared';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ecole-saas-web',
    sharedVersion: SHARED_VERSION,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
