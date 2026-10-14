import { prismaMock } from '@/__mocks__/prisma';
jest.mock('@/lib/db', () => ({ db: prismaMock }));
import { getCurrentRequestIdentity } from '@/lib/request-identity';

beforeEach(() => { jest.clearAllMocks(); });

it('uses current trust and tenant memberships rather than earlier JWT authority', async () => {
  (prismaMock.user.findUnique as any).mockResolvedValue({
    id: 'user-1', email: 'person@example.test', firstName: 'Test', lastName: 'Person', trustLevel: 'SUSPENDED',
    memberships: [{ communityId: 'community-1', role: 'READER', community: { domain: null, domains: [{ domain: 'example.test' }] } }],
  });
  expect(await getCurrentRequestIdentity('user-1')).toMatchObject({
    trust_level: 'SUSPENDED', role: 'READER', isPlatformSuperAdmin: false,
    tenantMemberships: [{ communityId: 'community-1', role: 'READER', domains: ['example.test'] }],
  });
});
it('removes authority when an account was deleted', async () => {
  (prismaMock.user.findUnique as any).mockResolvedValue(null);
  expect(await getCurrentRequestIdentity('removed-user')).toBeNull();
});
it('does not conceal a database failure as valid authentication', async () => {
  (prismaMock.user.findUnique as any).mockRejectedValue(new Error('Unavailable'));
  await expect(getCurrentRequestIdentity('user-1')).rejects.toThrow('Unavailable');
});
