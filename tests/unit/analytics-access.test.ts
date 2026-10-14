import { jest } from "@jest/globals";
import { prismaMock } from "@/__mocks__/prisma";
jest.mock("@/lib/db", () => ({ db: prismaMock }));
jest.mock("@/lib/request-identity", () => ({
  getCurrentRequestIdentity: jest.fn(),
}));
jest.mock("@/lib/tenant", () => ({ resolveCommunityIdByDomain: jest.fn() }));
const { authorizeAnalytics, resolveAnalyticsCommunity } =
  require("@/lib/analytics/access") as typeof import("@/lib/analytics/access");
const { getCurrentRequestIdentity } =
  require("@/lib/request-identity") as typeof import("@/lib/request-identity");
const { resolveCommunityIdByDomain } =
  require("@/lib/tenant") as typeof import("@/lib/tenant");
const identity = {
  id: "user",
  trust_level: "TRUSTED",
  isPlatformSuperAdmin: false,
  tenantMemberships: [{ communityId: "own", role: "EDITOR" }],
};
beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentRequestIdentity as any).mockResolvedValue(identity);
  (prismaMock.community.findUnique as any).mockImplementation(
    async ({ where }: any) => ({ id: where.id, name: "Community" }),
  );
});
test("checks current tenant membership rather than a forged global role", async () => {
  await expect(
    authorizeAnalytics(
      new Headers({
        "x-user-id": "user",
        "x-community-id": "foreign",
        "x-user-role": "SUPER_ADMIN",
      }),
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(prismaMock.community.findUnique).not.toHaveBeenCalled();
});
test("rejects missing identity, suspended users, unresolved tenant and readers", async () => {
  await expect(authorizeAnalytics(new Headers())).rejects.toMatchObject({
    status: 401,
  });
  (getCurrentRequestIdentity as any).mockResolvedValue({
    ...identity,
    trust_level: "SUSPENDED",
  });
  await expect(
    authorizeAnalytics(
      new Headers({ "x-user-id": "user", "x-community-id": "own" }),
    ),
  ).rejects.toMatchObject({ status: 403 });
  (getCurrentRequestIdentity as any).mockResolvedValue({
    ...identity,
    tenantMemberships: [{ communityId: "own", role: "READER" }],
  });
  await expect(
    authorizeAnalytics(
      new Headers({ "x-user-id": "user", "x-community-id": "own" }),
    ),
  ).rejects.toMatchObject({ status: 403 });
});
test("permits own-tenant editors and explicit platform tenant selection", async () => {
  expect(
    (
      await authorizeAnalytics(
        new Headers({ "x-user-id": "user", "x-community-id": "own" }),
      )
    ).community.id,
  ).toBe("own");
  (getCurrentRequestIdentity as any).mockResolvedValue({
    ...identity,
    isPlatformSuperAdmin: true,
  });
  expect(
    (await authorizeAnalytics(new Headers({ "x-user-id": "user" }), "foreign"))
      .community.id,
  ).toBe("foreign");
});
test("resolves ordinary anonymous traffic by trusted host/domain", async () => {
  (resolveCommunityIdByDomain as any).mockResolvedValue("own");
  expect(
    await resolveAnalyticsCommunity(
      new Headers({ "x-community-domain": "community.test" }),
    ),
  ).toBe("own");
});
