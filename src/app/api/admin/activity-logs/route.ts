import { NextRequest, NextResponse } from 'next/server';
import {
  getActivityLogs,
  getResourceHistory,
  getActivityByIP,
  exportActivityLogAsCSV,
} from '@/lib/activity-log';

// These types will be available after running `prisma db push` or `prisma generate`
// to regenerate the Prisma client with the new enums.
type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'UNPUBLISH' | 'APPROVE' | 'REJECT' | 'FLAG' | 'SEND_MESSAGE';
type ResourceType =
  | 'ARTICLE'
  | 'COMMENT'
  | 'EVENT'
  | 'MARKETPLACE_LISTING'
  | 'MESSAGE'
  | 'CONVERSATION'
  | 'USER_PROFILE'
  | 'HELP_WANTED_POST'
  | 'ROADMAP_IDEA'
  | 'ROADMAP_RANKING_BALLOT'
  | 'DOMAIN_INFLUENCE_WEIGHT';

/**
 * GET /api/admin/activity-logs
 *
 * Admin-only endpoint for viewing the forensic activity trail.
 *
 * Query params:
 *   userId        — filter by user
 *   action        — filter by action type (CREATE, UPDATE, DELETE, etc.)
 *   resourceType  — filter by resource type (ARTICLE, MESSAGE, etc.)
 *   resourceId    — filter by specific resource
 *   ipAddress     — filter by IP (find all actions from one IP)
 *   startDate     — ISO date string
 *   endDate       — ISO date string
 *   history       — "true" + resourceType + resourceId → full resource history
 *   export        — "csv" + startDate + endDate → download CSV
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
  const action = (searchParams.get('action') as ActivityAction) || undefined;
  const resourceType = (searchParams.get('resourceType') as ResourceType) || undefined;
  const resourceId = searchParams.get('resourceId') || undefined;
  const ipAddress = searchParams.get('ipAddress') || undefined;
  const startDate = searchParams.get('startDate')
    ? new Date(searchParams.get('startDate')!)
    : undefined;
  const endDate = searchParams.get('endDate')
    ? new Date(searchParams.get('endDate')!)
    : undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Resource history mode: full timeline of a specific resource
  if (searchParams.get('history') === 'true' && resourceType && resourceId) {
    const history = await getResourceHistory(resourceType, resourceId);
    return NextResponse.json({ history });
  }

  // CSV export mode: download activity logs as CSV
  if (searchParams.get('export') === 'csv' && startDate && endDate) {
    const csv = await exportActivityLogAsCSV(startDate, endDate, userId);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-log-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // IP investigation mode: find all activity from a specific IP
  if (ipAddress && !userId) {
    const result = await getActivityByIP(ipAddress, limit);
    return NextResponse.json(result);
  }

  // Default: paginated list of activity logs
  const result = await getActivityLogs({
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    startDate,
    endDate,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
