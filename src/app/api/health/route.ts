import { NextResponse } from 'next/server';

/**
 * Lightweight container health check.
 * This intentionally avoids DB access so an app process can report readiness
 * independently of transient database issues.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'highlander-today',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
