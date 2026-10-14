const FORWARDED_IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-role',
  'x-user-trust-level',
  'x-user-email',
  'x-user-first-name',
  'x-user-last-name',
  'x-user-name',
  'x-community-id',
  'x-community-domain',
  'x-client-ip',
] as const;

type TokenLike = {
  id?: string | null;
  role?: string | null;
  trust_level?: string | null;
  email?: string | null;
  name?: string | null;
  tenantMemberships?: Array<{
    communityId: string;
    role: string;
    domains: string[];
  }> | null;
  isPlatformSuperAdmin?: boolean | null;
};

export type TrustedTenantContext = {
  communityId: string | null;
  communityDomain: string;
  role: string;
};

export function normalizeRequestHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

/** Use the actual HTTP destination authority, preserving the request protocol.
 * Forwarded-host values are not trusted as an allowlist or redirect target. */
export function getPublicRequestUrl(request: { url: string; headers: Headers }) {
  const target = new URL(request.url);
  const host = request.headers.get('host');
  if (!host) return target;
  const authority = new URL(`${target.protocol}//${host}`);
  if (authority.username || authority.password || authority.pathname !== '/' || authority.search || authority.hash) throw new Error('Invalid request host');
  return new URL(target.pathname + target.search, authority);
}

/** Cookie-authenticated mutations must originate on this origin. Requests
 * without browser origin metadata remain available to authenticated workers. */
export function isSameOriginMutation(request: { method: string; url: string; headers: Headers }) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return true;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === getPublicRequestUrl(request).origin;
  } catch { return false; }
}

export function resolveTrustedTenantContext(
  token: TokenLike | null | undefined,
  hostname: string
): TrustedTenantContext {
  const communityDomain = normalizeRequestHostname(hostname);
  const memberships = Array.isArray(token?.tenantMemberships) ? token.tenantMemberships : [];
  const membership = memberships.find((candidate) =>
    candidate.domains.some((domain) => normalizeRequestHostname(domain) === communityDomain)
  );

  if (membership) {
    return {
      communityId: membership.communityId,
      communityDomain,
      role: membership.role,
    };
  }

  if (
    (communityDomain === 'localhost' || communityDomain === '127.0.0.1') &&
    memberships.length > 0
  ) {
    return {
      communityId: memberships[0].communityId,
      communityDomain,
      role: memberships[0].role,
    };
  }

  return {
    communityId: null,
    communityDomain,
    role: token?.isPlatformSuperAdmin ? 'SUPER_ADMIN' : 'READER',
  };
}

export function stripUntrustedForwardedHeaders(headers: Headers) {
  for (const header of FORWARDED_IDENTITY_HEADERS) {
    headers.delete(header);
  }
}

export function applyTrustedIdentityHeaders(headers: Headers, token: TokenLike | null | undefined) {
  if (!token) {
    return;
  }

  if (token.id) {
    headers.set('x-user-id', token.id);
  }

  if (token.role) {
    headers.set('x-user-role', token.role);
  }

  if (token.trust_level) {
    headers.set('x-user-trust-level', token.trust_level);
  }

  if (token.email) {
    headers.set('x-user-email', token.email);
  }

  if (token.name) {
    headers.set('x-user-name', token.name);

    const [firstName, ...rest] = token.name.trim().split(/\s+/).filter(Boolean);
    if (firstName) {
      headers.set('x-user-first-name', firstName);
    }
    if (rest.length > 0) {
      headers.set('x-user-last-name', rest.join(' '));
    }
  }
}

export function getClientIpFromHeaders(headers: Headers): string {
  const trustedClientIp = headers.get('x-client-ip');
  if (trustedClientIp) {
    return trustedClientIp;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // AWS ALB appends the address it observed. The left-most value can be
    // supplied by a client, so use the right-most hop at this trust boundary.
    return forwarded.split(',').at(-1)?.trim() || '127.0.0.1';
  }

  return headers.get('x-real-ip') || '127.0.0.1';
}

/** Resolve the edge/proxy-provided address without trusting our internal header. */
export function getProxyClientIp(headers: Headers): string {
  const vercelForwarded = headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0].trim();
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',').at(-1)?.trim() || '127.0.0.1';
  }

  return headers.get('x-real-ip') || '127.0.0.1';
}
