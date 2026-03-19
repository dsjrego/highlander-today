import { prismaMock } from '@/__mocks__/prisma';
import { reinstateUser, revokeTrust } from '@/lib/trust';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const logTrustActionMock = jest.fn();

jest.mock('@/lib/audit', () => ({
  logTrustAction: (...args: unknown[]) => logTrustActionMock(...args),
}));

describe('trust helper cascade logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suspends the target and downstream vouched users once each', async () => {
    (prismaMock.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@example.com',
        trustLevel: 'TRUSTED',
      })
      .mockResolvedValueOnce({
        id: 'user-a',
        trustLevel: 'TRUSTED',
      });

    (prismaMock.userCommunityMembership.findFirst as any).mockResolvedValue({
      role: 'ADMIN',
    });

    (prismaMock.vouchRecord.findMany as any)
      .mockResolvedValueOnce([{ vouchedUserId: 'user-b' }, { vouchedUserId: 'user-c' }])
      .mockResolvedValueOnce([{ vouchedUserId: 'user-d' }])
      .mockResolvedValueOnce([{ vouchedUserId: 'user-d' }])
      .mockResolvedValueOnce([]);

    (prismaMock.user.update as any).mockResolvedValue({ id: 'ignored' });

    await revokeTrust('admin-1', 'user-a', 'manual review');

    expect(prismaMock.user.update.mock.calls).toEqual([
      [{ where: { id: 'user-a' }, data: { trustLevel: 'SUSPENDED' } }],
      [{ where: { id: 'user-b' }, data: { trustLevel: 'SUSPENDED' } }],
      [{ where: { id: 'user-c' }, data: { trustLevel: 'SUSPENDED' } }],
      [{ where: { id: 'user-d' }, data: { trustLevel: 'SUSPENDED' } }],
    ]);

    expect(logTrustActionMock.mock.calls).toEqual([
      ['admin-1', 'user-a', 'TRUST_REVOKED', 'manual review'],
      ['admin-1', 'user-b', 'SUSPENDED', 'manual review'],
      ['admin-1', 'user-c', 'SUSPENDED', 'manual review'],
      ['admin-1', 'user-d', 'SUSPENDED', 'manual review'],
    ]);
  });

  it('rejects revocation when the target is not trusted', async () => {
    (prismaMock.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@example.com',
        trustLevel: 'TRUSTED',
      })
      .mockResolvedValueOnce({
        id: 'user-a',
        trustLevel: 'REGISTERED',
      });

    (prismaMock.userCommunityMembership.findFirst as any).mockResolvedValue({
      role: 'ADMIN',
    });

    await expect(revokeTrust('admin-1', 'user-a')).rejects.toThrow(
      'Target must be TRUSTED to revoke trust'
    );
  });

  it('reinstates a suspended user once their email ban is cleared', async () => {
    (prismaMock.user.findUnique as any)
      .mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@example.com',
        trustLevel: 'TRUSTED',
      })
      .mockResolvedValueOnce({
        id: 'user-a',
        email: 'user@example.com',
        trustLevel: 'SUSPENDED',
      });

    (prismaMock.userCommunityMembership.findFirst as any).mockResolvedValue({
      role: 'ADMIN',
    });

    (prismaMock.bannedEmail.findUnique as any).mockResolvedValue(null);
    (prismaMock.user.update as any).mockResolvedValue({
      id: 'user-a',
      trustLevel: 'TRUSTED',
    });

    await reinstateUser('admin-1', 'user-a');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { trustLevel: 'TRUSTED' },
    });
    expect(logTrustActionMock).toHaveBeenCalledWith(
      'admin-1',
      'user-a',
      'REINSTATED'
    );
  });
});
