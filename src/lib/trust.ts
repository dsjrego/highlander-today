import type { MembershipRole, TrustLevel } from '@prisma/client';
import { db } from './db';
import { TRUST_CONFIG } from './constants';
import { logTrustAction } from './audit';

async function getUserRole(userId: string): Promise<MembershipRole | null> {
  const membership = await db.userCommunityMembership.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: { role: true },
  });

  return membership?.role ?? null;
}

async function getActor(userId: string) {
  const [user, role] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        trustLevel: true,
      },
    }),
    getUserRole(userId),
  ]);

  if (!user) {
    return null;
  }

  return {
    ...user,
    role,
  };
}

function canManageTrust(role: MembershipRole | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

async function setTrustLevel(targetUserId: string, trustLevel: TrustLevel) {
  await db.user.update({
    where: { id: targetUserId },
    data: { trustLevel },
  });
}

export async function vouchForUser(voucherId: string, targetId: string): Promise<void> {
  const voucher = await db.user.findUnique({
    where: { id: voucherId },
    select: {
      id: true,
      trustLevel: true,
    },
  });

  if (!voucher || voucher.trustLevel !== 'TRUSTED') {
    throw new Error('Only TRUSTED users can vouch for others');
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      trustLevel: true,
      dateOfBirth: true,
    },
  });

  if (!target || target.trustLevel !== 'REGISTERED') {
    throw new Error('Target must be REGISTERED to receive a vouch');
  }

  if (!target.dateOfBirth) {
    throw new Error('Target must have a date of birth on file before vouching');
  }

  const [voucherVouchCount, targetVouchCount, existingRecord] = await Promise.all([
    db.vouchRecord.count({
      where: { voucherUserId: voucherId },
    }),
    db.vouchRecord.count({
      where: { vouchedUserId: targetId },
    }),
    db.vouchRecord.findUnique({
      where: {
        voucherUserId_vouchedUserId: {
          voucherUserId: voucherId,
          vouchedUserId: targetId,
        },
      },
      select: { id: true },
    }),
  ]);

  if (existingRecord) {
    throw new Error('User has already vouched for this person');
  }

  if (voucherVouchCount >= TRUST_CONFIG.maxVouchesPerUser) {
    throw new Error(
      `User has reached maximum number of vouches (${TRUST_CONFIG.maxVouchesPerUser})`
    );
  }

  if (targetVouchCount >= TRUST_CONFIG.maxVouchesReceivedPerUser) {
    throw new Error(
      `User has received maximum number of vouches (${TRUST_CONFIG.maxVouchesReceivedPerUser})`
    );
  }

  await db.$transaction([
    db.vouchRecord.create({
      data: {
        voucherUserId: voucherId,
        vouchedUserId: targetId,
      },
    }),
    db.user.update({
      where: { id: targetId },
      data: {
        trustLevel: 'TRUSTED',
        isIdentityLocked: true,
      },
    }),
  ]);

  await logTrustAction(voucherId, targetId, 'TRUST_GRANTED');
}

export async function revokeTrust(
  actorId: string,
  targetId: string,
  reason?: string
): Promise<void> {
  const actor = await getActor(actorId);
  if (!actor || !canManageTrust(actor.role)) {
    throw new Error('Actor not authorized to revoke trust');
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, trustLevel: true },
  });

  if (!target || target.trustLevel !== 'TRUSTED') {
    throw new Error('Target must be TRUSTED to revoke trust');
  }

  await setTrustLevel(targetId, 'SUSPENDED');
  await logTrustAction(actorId, targetId, 'TRUST_REVOKED', reason);

  const queue = [targetId];
  const visited = new Set<string>([targetId]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const downstream = await db.vouchRecord.findMany({
      where: { voucherUserId: currentId },
      select: { vouchedUserId: true },
    });

    for (const record of downstream) {
      if (visited.has(record.vouchedUserId)) {
        continue;
      }

      visited.add(record.vouchedUserId);
      queue.push(record.vouchedUserId);

      await setTrustLevel(record.vouchedUserId, 'SUSPENDED');
      await logTrustAction(actorId, record.vouchedUserId, 'SUSPENDED', reason);
    }
  }
}

export async function reinstateUser(
  actorId: string,
  targetId: string,
  trustLevel: Extract<TrustLevel, 'REGISTERED' | 'TRUSTED'> = 'TRUSTED'
): Promise<void> {
  const actor = await getActor(actorId);
  if (!actor || !canManageTrust(actor.role)) {
    throw new Error('Actor not authorized to reinstate users');
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, trustLevel: true, email: true },
  });

  if (!target || target.trustLevel !== 'SUSPENDED') {
    throw new Error('Target must be SUSPENDED to reinstate');
  }

  const bannedEmail = await db.bannedEmail.findUnique({
    where: { email: target.email },
    select: { unbannedAt: true },
  });

  if (bannedEmail && !bannedEmail.unbannedAt) {
    throw new Error('User is email-banned. Unban them first before reinstating.');
  }

  await setTrustLevel(targetId, trustLevel);
  await logTrustAction(actorId, targetId, 'REINSTATED');
}

export async function banUser(actorId: string, targetId: string, reason?: string): Promise<void> {
  const actor = await getActor(actorId);
  if (!actor || !canManageTrust(actor.role)) {
    throw new Error('Actor not authorized to ban users');
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true },
  });

  if (!target) {
    throw new Error('Target not found');
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: { trustLevel: 'SUSPENDED' },
    });

    const existingBan = await tx.bannedEmail.findUnique({
      where: { email: target.email },
      select: { email: true, unbannedAt: true },
    });

    if (existingBan) {
      await tx.bannedEmail.update({
        where: { email: target.email },
        data: {
          bannedByUserId: actorId,
          bannedAt: new Date(),
          unbannedByUserId: null,
          unbannedAt: null,
        },
      });
    } else {
      await tx.bannedEmail.create({
        data: {
          email: target.email,
          bannedByUserId: actorId,
        },
      });
    }
  });

  await logTrustAction(actorId, targetId, 'BANNED', reason);
}

export async function unbanUser(actorId: string, targetId: string): Promise<void> {
  const actor = await getActor(actorId);
  if (!actor || !canManageTrust(actor.role)) {
    throw new Error('Actor not authorized to unban users');
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true },
  });

  if (!target) {
    throw new Error('Target not found');
  }

  const bannedEmail = await db.bannedEmail.findUnique({
    where: { email: target.email },
    select: { email: true, unbannedAt: true },
  });

  if (!bannedEmail || bannedEmail.unbannedAt) {
    throw new Error('User is not currently banned');
  }

  await db.$transaction([
    db.bannedEmail.update({
      where: { email: target.email },
      data: {
        unbannedByUserId: actorId,
        unbannedAt: new Date(),
      },
    }),
    db.user.update({
      where: { id: targetId },
      data: { trustLevel: 'REGISTERED' },
    }),
  ]);

  await logTrustAction(actorId, targetId, 'UNBANNED');
}
