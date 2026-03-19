import { NextRequest, NextResponse } from 'next/server';
import { getLoginEvents, getUserLoginSummary, getUserKnownIPs } from '@/lib/login-events';

/**
 * GET /api/admin/login-events
 *
 * Admin-only endpoint for viewing login events.
 *
 * Query params:
 *   userId        — filter by user
 *   ipAddress     — filter by IP
 *   anomaliesOnly — "true" to show only flagged logins
 *   startDate     — ISO date string
 *   endDate       — ISO date string
 *   summary       — "true" + userId to get login summary for a user
 *   knownIPs      — "true" + userId to get all known IPs for a user
 *   limit         — page size (default 50)
 *   offset        — pagination offset
 */
export async function GET(request: NextRequest) {
  // Auth check: require ADMIN or SUPER_ADMIN role
  const role = request.headers.get('x-user-role');
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId') || undefined;
  const ipAddress = searchParams.get('ipAddress') || undefined;
  const anomaliesOnly = searchParams.get('anomaliesOnly') === 'true';
  const startDate = searchParams.get('startDate')
    ? new Date(searchParams.get('startDate')!)
    : undefined;
  const endDate = searchParams.get('endDate')
    ? new Date(searchParams.get('endDate')!)
    : undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Summary mode: return aggregated stats for a specific user
  if (searchParams.get('summary') === 'true' && userId) {
    const summary = await getUserLoginSummary(userId);
    return NextResponse.json(summary);
  }

  // Known IPs mode: return all distinct IPs for a specific user
  if (searchParams.get('knownIPs') === 'true' && userId) {
    const ips = await getUserKnownIPs(userId);
    return NextResponse.json({ ips });
  }

  // Default: paginated list of login events
  const result = await getLoginEvents({
    userId,
    ipAddress,
    anomaliesOnly,
    startDate,
    endDate,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
