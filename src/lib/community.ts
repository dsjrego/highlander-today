import { TenantDomainStatus } from '@prisma/client';
import { db } from './db';
import { BRAND_COLORS } from './constants';
import { normalizeDomain, resolveCommunityIdByDomain } from './tenant';

export interface CommunitySummary {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  logoUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
  createdAt: Date;
  themeManifestSlug: string | null;
}

interface CommunitySummaryRecord {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  logoUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
  createdAt: Date;
  siteSettings: Array<{
    value: string;
  }>;
}

function selectCommunitySummary() {
  return {
    id: true,
    name: true,
    slug: true,
    domain: true,
    description: true,
    logoUrl: true,
    colorPrimary: true,
    colorAccent: true,
    createdAt: true,
    siteSettings: {
      where: {
        key: 'theme_manifest_slug',
      },
      select: {
        value: true,
      },
      take: 1,
    },
  } as const;
}

function normalizeCommunitySummary(community: CommunitySummaryRecord | null): CommunitySummary | null {
  if (!community) {
    return null;
  }

  const { siteSettings, ...rest } = community;

  return {
    ...rest,
    themeManifestSlug: siteSettings[0]?.value?.trim() || null,
  };
}

export async function ensureDefaultSiteSettings(communityId: string) {
  await db.siteSetting.upsert({
    where: {
      communityId_key: {
        communityId,
        key: 'comment_default_status',
      },
    },
    update: {},
    create: {
      communityId,
      key: 'comment_default_status',
      value: 'approved',
    },
  });
}

export async function getCommunityFromDomain(domain: string): Promise<CommunitySummary | null> {
  const communityId = await resolveCommunityIdByDomain(domain);
  if (!communityId) {
    return null;
  }

  const community = await db.community.findUnique({
    where: { id: communityId },
    select: selectCommunitySummary(),
  });

  if (community) {
    await ensureDefaultSiteSettings(community.id);
  }

  return normalizeCommunitySummary(community);
}

export async function getCommunityFromSlug(slug: string): Promise<CommunitySummary | null> {
  if (!slug.trim()) {
    return null;
  }

  const community = await db.community.findUnique({
    where: { slug },
    select: selectCommunitySummary(),
  });

  if (community) {
    await ensureDefaultSiteSettings(community.id);
  }

  return normalizeCommunitySummary(community);
}

export async function getCurrentCommunity(request: {
  headers?: Headers | Map<string, string> | Record<string, string | undefined>;
  nextUrl?: { searchParams: URLSearchParams };
}): Promise<CommunitySummary | null> {
  const headers =
    request.headers instanceof Headers
      ? request.headers
      : request.headers instanceof Map
        ? new Headers(Array.from(request.headers.entries()))
        : new Headers(
            Object.entries(request.headers || {}).flatMap<[string, string]>(([key, value]) =>
              value ? [[key, value]] : []
            )
          );

  const explicitCommunityId = headers.get('x-community-id');
  if (explicitCommunityId) {
    const community = await db.community.findUnique({
      where: { id: explicitCommunityId },
      select: selectCommunitySummary(),
    });

    if (community) {
      await ensureDefaultSiteSettings(community.id);
      return normalizeCommunitySummary(community);
    }
  }

  const explicitDomain = headers.get('x-community-domain');
  if (explicitDomain) {
    const community = await getCommunityFromDomain(explicitDomain);
    if (community) {
      return community;
    }
  }

  const host = headers.get('host');
  if (host) {
    const community = await getCommunityFromDomain(host);
    if (community) {
      return community;
    }
  }

  const querySlug = request.nextUrl?.searchParams.get('community');
  if (querySlug) {
    const community = await getCommunityFromSlug(querySlug);
    if (community) {
      return community;
    }
  }

  return null;
}

export function getAllCommunities(): Promise<CommunitySummary[]> {
  return db.community
    .findMany({
      select: selectCommunitySummary(),
      orderBy: { name: 'asc' },
    })
    .then((communities) =>
      communities
        .map((community) => normalizeCommunitySummary(community))
        .filter((community): community is CommunitySummary => Boolean(community))
    );
}

export async function createCommunity(data: {
  name: string;
  slug: string;
  domain?: string | null;
  primaryDomainStatus?: TenantDomainStatus;
  description?: string | null;
  logoUrl?: string | null;
  colorPrimary?: string;
  colorAccent?: string;
}): Promise<CommunitySummary> {
  const normalizedDomain = data.domain ? normalizeDomain(data.domain) : null;

  return db.$transaction(async (tx) => {
    const community = await tx.community.create({
      data: {
        name: data.name,
        slug: data.slug,
        domain: normalizedDomain,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        colorPrimary: data.colorPrimary || BRAND_COLORS.primary,
        colorAccent: data.colorAccent || BRAND_COLORS.accent,
      },
      select: selectCommunitySummary(),
    });

    if (normalizedDomain) {
      await tx.tenantDomain.create({
        data: {
          communityId: community.id,
          domain: normalizedDomain,
          isPrimary: true,
          status: data.primaryDomainStatus ?? TenantDomainStatus.ACTIVE,
        },
      });
    }

    await tx.siteSetting.upsert({
      where: {
        communityId_key: {
          communityId: community.id,
          key: 'comment_default_status',
        },
      },
      update: {},
      create: {
        communityId: community.id,
        key: 'comment_default_status',
        value: 'approved',
      },
    });

    return normalizeCommunitySummary(community) as CommunitySummary;
  });
}
