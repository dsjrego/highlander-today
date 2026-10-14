import { db } from "@/lib/db";
import { resolveCommunityIdByDomain } from "@/lib/tenant";
import { getCurrentRequestIdentity } from "@/lib/request-identity";
import { checkPermission } from "@/lib/permissions";

export class AnalyticsAccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function resolveAnalyticsCommunity(headers: Headers) {
  return (
    headers.get("x-community-id") ||
    (await resolveCommunityIdByDomain(
      headers.get("x-community-domain") || headers.get("host") || "",
    ))
  );
}

/** Middleware strips forged headers; refresh authority again at the report boundary. */
export async function authorizeAnalytics(
  headers: Headers,
  requestedCommunityId?: string | null,
) {
  const userId = headers.get("x-user-id");
  if (!userId)
    throw new AnalyticsAccessError("Sign in to view analytics.", 401);
  const identity = await getCurrentRequestIdentity(userId);
  if (!identity || identity.trust_level !== "TRUSTED")
    throw new AnalyticsAccessError("Analytics access denied.", 403);
  const communityId =
    requestedCommunityId || (await resolveAnalyticsCommunity(headers));
  if (!communityId)
    throw new AnalyticsAccessError("A community must be selected.", 404);
  const role = identity.tenantMemberships.find(
    (m) => m.communityId === communityId,
  )?.role;
  if (
    !identity.isPlatformSuperAdmin &&
    (!role || !checkPermission(role, "analytics:view"))
  ) {
    throw new AnalyticsAccessError(
      "Analytics access denied for this community.",
      403,
    );
  }
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { id: true, name: true, slug: true },
  });
  if (!community) throw new AnalyticsAccessError("Community not found.", 404);
  return {
    community,
    userId,
    isPlatformAdmin: identity.isPlatformSuperAdmin,
    role: role || "SUPER_ADMIN",
  };
}
