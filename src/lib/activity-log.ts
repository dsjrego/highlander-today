import { db } from './db';
import type { ActivityAction, ResourceType } from '@prisma/client';

// ============================================================================
// ACTIVITY LOG — FORENSIC TRAIL FOR ALL CONTENT ACTIONS
// ============================================================================

// Re-export enums for convenience
export type { ActivityAction, ResourceType } from '@prisma/client';

interface LogActivityInput {
  userId: string;
  action: ActivityAction;
  resourceType: ResourceType;
  resourceId: string;
  ipAddress?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Log a user activity to the immutable forensic trail.
 *
 * Call this from API route handlers whenever content is created, modified,
 * or deleted. The ipAddress can be read from the `x-client-ip` header
 * that the middleware sets.
 *
 * @example
 * ```ts
 * await logActivity({
 *   userId: req.headers.get('x-user-id')!,
 *   action: 'CREATE',
 *   resourceType: 'ARTICLE',
 *   resourceId: article.id,
 *   ipAddress: req.headers.get('x-client-ip'),
 *   metadata: { title: article.title },
 * });
 * ```
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ipAddress: input.ipAddress || null,
        metadata: input.metadata || undefined,
      },
    });
  } catch (error) {
    // Activity logging should never break application logic
    console.error('[ActivityLog] Failed to log activity:', error);
  }
}

/**
 * Convenience: log a content creation event.
 */
export async function logContentCreated(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  ipAddress?: string | null,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    action: 'CREATE',
    resourceType,
    resourceId,
    ipAddress,
    metadata,
  });
}

/**
 * Convenience: log a content update event.
 * Pass before/after in metadata for forensic diff capability.
 */
export async function logContentUpdated(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  ipAddress?: string | null,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    action: 'UPDATE',
    resourceType,
    resourceId,
    ipAddress,
    metadata,
  });
}

/**
 * Convenience: log a content deletion event.
 * Always include content snapshot in metadata for forensic preservation.
 */
export async function logContentDeleted(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  ipAddress?: string | null,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    action: 'DELETE',
    resourceType,
    resourceId,
    ipAddress,
    metadata,
  });
}

/**
 * Convenience: log a message sent event.
 */
export async function logMessageSent(
  userId: string,
  messageId: string,
  conversationId: string,
  ipAddress?: string | null
) {
  return logActivity({
    userId,
    action: 'SEND_MESSAGE',
    resourceType: 'MESSAGE',
    resourceId: messageId,
    ipAddress,
    metadata: { conversationId },
  });
}

export async function logUserBlockAction(
  userId: string,
  targetUserId: string,
  action: 'block' | 'unblock',
  ipAddress?: string | null
) {
  return logActivity({
    userId,
    action: 'UPDATE',
    resourceType: 'USER_PROFILE',
    resourceId: targetUserId,
    ipAddress,
    metadata: { interaction: action },
  });
}

// ============================================================================
// QUERY HELPERS (for admin UI and forensic investigation)
// ============================================================================

interface ActivityLogFilters {
  userId?: string;
  action?: ActivityAction;
  resourceType?: ResourceType;
  resourceId?: string;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query activity logs with flexible filtering.
 * Used by admin dashboards and forensic investigation tools.
 */
export async function getActivityLogs(filters: ActivityLogFilters = {}) {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const where: Record<string, any> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (ipAddress) where.ipAddress = ipAddress;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    db.activityLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Get all activity for a specific resource (e.g., full history of an article).
 * Useful for investigating what happened to a piece of content.
 */
export async function getResourceHistory(
  resourceType: ResourceType,
  resourceId: string
) {
  return db.activityLog.findMany({
    where: { resourceType, resourceId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Get all actions taken by a specific user (full user activity timeline).
 * Essential for investigating a specific user's behavior.
 */
export async function getUserActivityTimeline(
  userId: string,
  limit = 100,
  offset = 0
) {
  return getActivityLogs({ userId, limit, offset });
}

/**
 * Get all actions from a specific IP address.
 * Useful for investigating if multiple accounts are used from the same location.
 */
export async function getActivityByIP(ipAddress: string, limit = 100) {
  return getActivityLogs({ ipAddress, limit });
}

/**
 * Export activity logs as CSV for compliance/law enforcement.
 */
export async function exportActivityLogAsCSV(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<string> {
  const where: Record<string, any> = {
    createdAt: { gte: startDate, lte: endDate },
  };
  if (userId) where.userId = userId;

  const logs = await db.activityLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
  });

  const headers = [
    'Timestamp',
    'User Email',
    'User Name',
    'Action',
    'Resource Type',
    'Resource ID',
    'IP Address',
    'Metadata',
  ];

  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.user?.email || '',
    `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim(),
    log.action,
    log.resourceType,
    log.resourceId,
    log.ipAddress || '',
    log.metadata ? JSON.stringify(log.metadata) : '',
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
