import { db } from './db';

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
}

function normalizeDomain(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(':')[0]
    .toLowerCase();
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
  } as const;
}

export async function getCommunityFromDomain(domain: string): Promise<CommunitySummary | null> {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    return null;
  }

  const exactMatch = await db.community.findFirst({
    where: {
      domain: {
        equals: normalizedDomain,
        mode: 'insensitive',
      },
    },
    select: selectCommunitySummary(),
  });

  if (exactMatch) {
    return exactMatch;
  }

  return db.community.findFirst({
    where: {
      domain: {
        equals: `www.${normalizedDomain}`,
        mode: 'insensitive',
      },
    },
    select: selectCommunitySummary(),
  });
}

export function getCommunityFromSlug(slug: string): Promise<CommunitySummary | null> {
  if (!slug.trim()) {
    return Promise.resolve(null);
  }

  return db.community.findUnique({
    where: { slug },
    select: selectCommunitySummary(),
  });
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
      return community;
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
  return db.community.findMany({
    select: selectCommunitySummary(),
    orderBy: { name: 'asc' },
  });
}

export async function createCommunity(data: {
  name: string;
  slug: string;
  domain?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  colorPrimary?: string;
  colorAccent?: string;
}): Promise<CommunitySummary> {
  return db.community.create({
    data: {
      name: data.name,
      slug: data.slug,
      domain: data.domain || null,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      colorPrimary: data.colorPrimary || '#46A8CC',
      colorAccent: data.colorAccent || '#A51E30',
    },
    select: selectCommunitySummary(),
  });
}
