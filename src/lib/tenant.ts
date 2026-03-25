import { TenantDomainStatus } from '@prisma/client';
import { db } from './db';

export interface ResolveTenantCommunityOptions {
  preferredCommunityId?: string;
  preferredDomain?: string;
  host?: string;
}

export function normalizeDomain(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(':')[0]
    .toLowerCase();
}

export function isLocalDevelopmentHost(domain: string) {
  return domain === 'localhost' || domain === '127.0.0.1';
}

async function findCommunityIdByTenantDomain(domain: string) {
  const tenantDomain = await db.tenantDomain.findFirst({
    where: {
      domain: {
        equals: domain,
        mode: 'insensitive',
      },
      status: TenantDomainStatus.ACTIVE,
    },
    select: { communityId: true },
  });

  return tenantDomain?.communityId ?? null;
}

async function findCommunityIdByLegacyDomain(domain: string) {
  const community = await db.community.findFirst({
    where: {
      domain: {
        equals: domain,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  return community?.id ?? null;
}

export async function resolveCommunityIdByDomain(domain: string) {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return null;
  }

  const candidateDomains = [normalizedDomain, `www.${normalizedDomain}`];

  for (const candidate of candidateDomains) {
    const communityId =
      (await findCommunityIdByTenantDomain(candidate)) ||
      (await findCommunityIdByLegacyDomain(candidate));

    if (communityId) {
      return communityId;
    }
  }

  if (isLocalDevelopmentHost(normalizedDomain)) {
    return (await db.community.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }))?.id ?? null;
  }

  return null;
}

export async function resolveTenantCommunityId(options?: ResolveTenantCommunityOptions) {
  if (options?.preferredCommunityId) {
    return options.preferredCommunityId;
  }

  if (options?.preferredDomain) {
    const communityId = await resolveCommunityIdByDomain(options.preferredDomain);
    if (communityId) {
      return communityId;
    }
  }

  if (options?.host) {
    const communityId = await resolveCommunityIdByDomain(options.host);
    if (communityId) {
      return communityId;
    }
  }

  if (options?.preferredDomain || options?.host) {
    return null;
  }

  return (await db.community.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  }))?.id ?? null;
}
