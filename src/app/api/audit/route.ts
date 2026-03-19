import { NextRequest, NextResponse } from 'next/server';
import { type Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/audit
 *
 * Unified audit log endpoint that pulls from three data sources:
 *   - TrustAuditLog (trust actions: vouch, ban, suspend, reinstate)
 *   - ActivityLog (content actions: create, update, delete, publish)
 *   - LoginEvent (login events with anomaly flags)
 *
 * Query params:
 *   tab           — "all" | "trust" | "activity" | "logins" (default: "all")
 *   page          — page number (default: 1)
 *   limit         — items per page (default: 50)
 *   action        — filter by action type
 *   userId        — filter by actor/user ID
 *   startDate     — ISO date string
 *   endDate       — ISO date string
 *   anomaliesOnly — "true" to show only anomalous logins (logins tab only)
 *   ipAddress     — filter by IP address (logins + activity tabs)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth: check role from middleware headers
    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'audit:view')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const tab = searchParams.get('tab') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const anomaliesOnly = searchParams.get('anomaliesOnly') === 'true';
    const ipAddress = searchParams.get('ipAddress') || undefined;

    // Build date filter
    const dateFilter: Record<string, any> = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const params: QueryParams = { page, limit, action, userId, dateFilter, hasDateFilter, anomaliesOnly, ipAddress };

    if (tab === 'trust') return await getTrustLogs(params);
    if (tab === 'activity') return await getActivityLogs(params);
    if (tab === 'logins') return await getLoginLogs(params);

    // tab === 'all': merge all three sources into a unified timeline
    return await getUnifiedLogs(params);
  } catch (error: any) {
    console.error('[Audit API] Error:', error);
    return NextResponse.json(
      { error: `Failed to fetch audit log: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface QueryParams {
  page: number;
  limit: number;
  action?: string;
  userId?: string;
  dateFilter: Record<string, any>;
  hasDateFilter: boolean;
  anomaliesOnly?: boolean;
  ipAddress?: string;
}

// ============================================================================
// TRUST AUDIT LOGS
// ============================================================================

async function getTrustLogs({ page, limit, action, userId, dateFilter, hasDateFilter }: QueryParams) {
  const where: Record<string, any> = {};
  if (action) where.action = action;
  if (userId) where.actorUserId = userId;
  if (hasDateFilter) where.timestamp = dateFilter;

  const [entries, total] = await Promise.all([
    db.trustAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.trustAuditLog.count({ where }),
  ]);

  const normalized = entries.map((e) => ({
    id: e.id,
    source: 'trust' as const,
    timestamp: e.timestamp.toISOString(),
    action: formatTrustAction(e.action),
    actionRaw: e.action,
    actor: {
      id: e.actorUser.id,
      name: `${e.actorUser.firstName} ${e.actorUser.lastName}`.trim(),
      email: e.actorUser.email,
    },
    target: e.targetUser
      ? {
          id: e.targetUser.id,
          name: `${e.targetUser.firstName} ${e.targetUser.lastName}`.trim(),
          email: e.targetUser.email,
          type: 'user',
        }
      : null,
    details: e.reason || null,
    ipAddress: null as string | null,
  }));

  return NextResponse.json({
    entries: normalized,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    tab: 'trust',
  });
}

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

async function getActivityLogs({ page, limit, action, userId, dateFilter, hasDateFilter, ipAddress }: QueryParams) {
  const where: Record<string, any> = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (hasDateFilter) where.createdAt = dateFilter;
  if (ipAddress) where.ipAddress = ipAddress;

  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.activityLog.count({ where }),
  ]);

  const normalized = entries.map((e) => ({
    id: e.id,
    source: 'activity' as const,
    timestamp: e.createdAt.toISOString(),
    action: formatActivityAction(e.action),
    actionRaw: e.action,
    actor: {
      id: e.user.id,
      name: `${e.user.firstName} ${e.user.lastName}`.trim(),
      email: e.user.email,
    },
    target: {
      id: e.resourceId,
      name: e.resourceId,
      type: e.resourceType.toLowerCase().replace('_', ' '),
    },
    details: e.metadata ? summarizeMetadata(e.metadata as Record<string, any>) : null,
    ipAddress: e.ipAddress,
  }));

  return NextResponse.json({
    entries: normalized,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    tab: 'activity',
  });
}

// ============================================================================
// LOGIN LOGS
// ============================================================================

async function getLoginLogs({ page, limit, userId, dateFilter, hasDateFilter, anomaliesOnly, ipAddress }: QueryParams) {
  const where: Record<string, any> = {};
  if (userId) where.userId = userId;
  if (hasDateFilter) where.createdAt = dateFilter;
  if (anomaliesOnly) where.isAnomaly = true;
  if (ipAddress) where.ipAddress = ipAddress;

  const [entries, total] = await Promise.all([
    db.loginEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.loginEvent.count({ where }),
  ]);

  const normalized = entries.map((e) => ({
    id: e.id,
    source: 'login' as const,
    timestamp: e.createdAt.toISOString(),
    action: e.isAnomaly ? 'Suspicious Login' : 'Login',
    actionRaw: e.isAnomaly ? 'ANOMALY_LOGIN' : 'LOGIN',
    actor: {
      id: e.user.id,
      name: `${e.user.firstName} ${e.user.lastName}`.trim(),
      email: e.user.email,
    },
    target: null,
    details: buildLoginDetails(e),
    ipAddress: e.ipAddress,
    loginMeta: {
      provider: e.provider,
      city: e.city,
      region: e.region,
      country: e.country,
      userAgent: e.userAgent,
      isAnomaly: e.isAnomaly,
      anomalyReason: e.anomalyReason,
    },
  }));

  return NextResponse.json({
    entries: normalized,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    tab: 'logins',
  });
}

// ============================================================================
// UNIFIED "ALL" TAB — merge all three sources into a single timeline
// ============================================================================

async function getUnifiedLogs({ page, limit, userId, dateFilter, hasDateFilter }: QueryParams) {
  const fetchLimit = limit * 2;

  const trustWhere: Record<string, any> = {};
  const activityWhere: Record<string, any> = {};
  const loginWhere: Record<string, any> = {};

  if (userId) {
    trustWhere.actorUserId = userId;
    activityWhere.userId = userId;
    loginWhere.userId = userId;
  }
  if (hasDateFilter) {
    trustWhere.timestamp = dateFilter;
    activityWhere.createdAt = dateFilter;
    loginWhere.createdAt = dateFilter;
  }

  // Fetch each source independently — if one table has issues, the others still load
  type TrustEntry = Prisma.TrustAuditLogGetPayload<{
    include: {
      actorUser: { select: { id: true; firstName: true; lastName: true; email: true } };
      targetUser: { select: { id: true; firstName: true; lastName: true; email: true } };
    };
  }>[];
  type ActivityEntry = Prisma.ActivityLogGetPayload<{
    include: {
      user: { select: { id: true; firstName: true; lastName: true; email: true } };
    };
  }>[];
  type LoginEntry = Prisma.LoginEventGetPayload<{
    include: {
      user: { select: { id: true; firstName: true; lastName: true; email: true } };
    };
  }>[];

  const safeTrust = Promise.all([
    db.trustAuditLog.findMany({
      where: trustWhere,
      orderBy: { timestamp: 'desc' },
      take: fetchLimit,
      include: {
        actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.trustAuditLog.count({ where: trustWhere }),
  ]).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Audit] Trust query failed:', message);
    return [[] as TrustEntry, 0] as const;
  });

  const safeActivity = Promise.all([
    db.activityLog.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.activityLog.count({ where: activityWhere }),
  ]).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Audit] Activity query failed:', message);
    return [[] as ActivityEntry, 0] as const;
  });

  const safeLogin = Promise.all([
    db.loginEvent.findMany({
      where: loginWhere,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    db.loginEvent.count({ where: loginWhere }),
  ]).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Audit] Login query failed:', message);
    return [[] as LoginEntry, 0] as const;
  });

  const [trustResult, activityResult, loginResult] = await Promise.all([safeTrust, safeActivity, safeLogin]);
  const [trustEntries, trustTotal] = trustResult;
  const [activityEntries, activityTotal] = activityResult;
  const [loginEntries, loginTotal] = loginResult;

  // Normalize all entries into a common shape
  const normalized = [
    ...trustEntries.map((e) => ({
      id: e.id,
      source: 'trust' as const,
      timestamp: e.timestamp.toISOString(),
      action: formatTrustAction(e.action),
      actionRaw: e.action,
      actor: {
        id: e.actorUser.id,
        name: `${e.actorUser.firstName} ${e.actorUser.lastName}`.trim(),
        email: e.actorUser.email,
      },
      target: e.targetUser
        ? { id: e.targetUser.id, name: `${e.targetUser.firstName} ${e.targetUser.lastName}`.trim(), email: e.targetUser.email, type: 'user' }
        : null,
      details: e.reason || null,
      ipAddress: null as string | null,
    })),
    ...activityEntries.map((e) => ({
      id: e.id,
      source: 'activity' as const,
      timestamp: e.createdAt.toISOString(),
      action: formatActivityAction(e.action),
      actionRaw: e.action,
      actor: {
        id: e.user.id,
        name: `${e.user.firstName} ${e.user.lastName}`.trim(),
        email: e.user.email,
      },
      target: { id: e.resourceId, name: e.resourceId, type: e.resourceType.toLowerCase().replace('_', ' ') },
      details: e.metadata ? summarizeMetadata(e.metadata as Record<string, any>) : null,
      ipAddress: e.ipAddress,
    })),
    ...loginEntries.map((e) => ({
      id: e.id,
      source: 'login' as const,
      timestamp: e.createdAt.toISOString(),
      action: e.isAnomaly ? 'Suspicious Login' : 'Login',
      actionRaw: e.isAnomaly ? 'ANOMALY_LOGIN' : 'LOGIN',
      actor: {
        id: e.user.id,
        name: `${e.user.firstName} ${e.user.lastName}`.trim(),
        email: e.user.email,
      },
      target: null,
      details: buildLoginDetails(e),
      ipAddress: e.ipAddress,
    })),
  ];

  // Sort by timestamp descending
  normalized.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalCombined = trustTotal + activityTotal + loginTotal;
  const start = (page - 1) * limit;
  const paged = normalized.slice(start, start + limit);

  return NextResponse.json({
    entries: paged,
    pagination: { page, limit, total: totalCombined, pages: Math.max(1, Math.ceil(totalCombined / limit)) },
    tab: 'all',
    counts: { trust: trustTotal, activity: activityTotal, logins: loginTotal },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTrustAction(action: string): string {
  const map: Record<string, string> = {
    TRUST_GRANTED: 'Trust Granted',
    TRUST_REVOKED: 'Trust Revoked',
    SUSPENDED: 'User Suspended',
    REINSTATED: 'User Reinstated',
    BANNED: 'User Banned',
    UNBANNED: 'User Unbanned',
    IDENTITY_MODIFIED: 'Identity Modified',
  };
  return map[action] || action;
}

function formatActivityAction(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    PUBLISH: 'Published',
    UNPUBLISH: 'Unpublished',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    FLAG: 'Flagged',
    SEND_MESSAGE: 'Message Sent',
  };
  return map[action] || action;
}

function summarizeMetadata(metadata: Record<string, any>): string {
  if (metadata.title) return metadata.title;
  if (
    metadata.domain === 'ROADMAP_FEATURE_PRIORITIZATION' &&
    typeof metadata.multiplierPercent === 'number'
  ) {
    return `Roadmap weight ${metadata.multiplierPercent}% for ${metadata.targetUserName || metadata.targetUserId || 'user'}`;
  }
  if (metadata.conversationId) return `Conversation: ${metadata.conversationId.slice(0, 8)}...`;
  if (metadata.changedFields) return `Changed: ${metadata.changedFields.join(', ')}`;
  return JSON.stringify(metadata).slice(0, 100);
}

function buildLoginDetails(event: {
  provider: string;
  city: string | null;
  country: string | null;
  isAnomaly: boolean;
  anomalyReason: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`Provider: ${event.provider}`);
  if (event.city && event.country) {
    parts.push(`Location: ${event.city}, ${event.country}`);
  }
  if (event.isAnomaly && event.anomalyReason) {
    parts.push(`Alert: ${event.anomalyReason}`);
  }
  return parts.join(' | ');
}
