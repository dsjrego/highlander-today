import type { TrustAction } from '@prisma/client';
import { db } from './db';

interface AuditFilters {
  actorUserId?: string;
  targetUserId?: string;
  action?: TrustAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function logTrustAction(
  actorUserId: string,
  targetUserId: string,
  action: TrustAction,
  reason?: string
): Promise<void> {
  try {
    await db.trustAuditLog.create({
      data: {
        actorUserId,
        targetUserId,
        action,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('[TrustAudit] Failed to log trust action:', error);
  }
}

export async function getAuditLog(filters: AuditFilters = {}) {
  const {
    actorUserId,
    targetUserId,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const where: Record<string, unknown> = {};

  if (actorUserId) where.actorUserId = actorUserId;
  if (targetUserId) where.targetUserId = targetUserId;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) (where.timestamp as { gte?: Date }).gte = startDate;
    if (endDate) (where.timestamp as { lte?: Date }).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    db.trustAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    db.trustAuditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

export function getUserAuditLog(actorUserId: string, limit = 50, offset = 0) {
  return getAuditLog({ actorUserId, limit, offset });
}

export function getActionsOnUser(targetUserId: string, limit = 50, offset = 0) {
  return getAuditLog({ targetUserId, limit, offset });
}

export function getAuditLogByAction(action: TrustAction, startDate?: Date, endDate?: Date) {
  return getAuditLog({ action, startDate, endDate });
}

export async function getAuditStats(startDate: Date, endDate: Date) {
  const logs = await db.trustAuditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      action: true,
      actorUserId: true,
    },
  });

  const stats = {
    total: logs.length,
    byAction: {} as Record<TrustAction, number>,
    byActor: {} as Record<string, number>,
  };

  for (const log of logs) {
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    stats.byActor[log.actorUserId] = (stats.byActor[log.actorUserId] || 0) + 1;
  }

  return stats;
}

export async function exportAuditLogAsCSV(startDate: Date, endDate: Date): Promise<string> {
  const logs = await db.trustAuditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      actorUser: {
        select: { email: true, firstName: true, lastName: true },
      },
      targetUser: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  const headers = [
    'Timestamp',
    'Actor Email',
    'Actor Name',
    'Target Email',
    'Target Name',
    'Action',
    'Reason',
  ];

  const rows = logs.map((log) => [
    log.timestamp.toISOString(),
    log.actorUser.email,
    `${log.actorUser.firstName} ${log.actorUser.lastName}`.trim(),
    log.targetUser.email,
    `${log.targetUser.firstName} ${log.targetUser.lastName}`.trim(),
    log.action,
    log.reason || '',
  ]);

  return [
    headers.map((value) => `"${value}"`).join(','),
    ...rows.map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
}
