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
};

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
    return forwarded.split(',')[0].trim();
  }

  return headers.get('x-real-ip') || '127.0.0.1';
}
