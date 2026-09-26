import {
  getProxyClientIp,
  resolveTrustedTenantContext,
  stripUntrustedForwardedHeaders,
} from '@/lib/request-security';

describe('request security boundaries', () => {
  const token = {
    id: 'user-1',
    tenantMemberships: [
      {
        communityId: 'community-a',
        role: 'EDITOR',
        domains: ['alpha.example'],
      },
      {
        communityId: 'community-b',
        role: 'READER',
        domains: ['beta.example'],
      },
    ],
  };

  it('selects the membership belonging to the request host', () => {
    expect(resolveTrustedTenantContext(token, 'www.alpha.example')).toEqual({
      communityId: 'community-a',
      communityDomain: 'alpha.example',
      role: 'EDITOR',
    });
  });

  it('does not borrow a role from another tenant for an unknown host', () => {
    expect(resolveTrustedTenantContext(token, 'unknown.example')).toEqual({
      communityId: null,
      communityDomain: 'unknown.example',
      role: 'READER',
    });
  });

  it('removes caller-supplied identity and tenant headers', () => {
    const headers = new Headers({
      'x-user-id': 'spoofed',
      'x-user-role': 'SUPER_ADMIN',
      'x-community-id': 'other-tenant',
      'x-client-ip': '10.0.0.1',
      accept: 'application/json',
    });

    stripUntrustedForwardedHeaders(headers);

    expect(headers.get('x-user-id')).toBeNull();
    expect(headers.get('x-user-role')).toBeNull();
    expect(headers.get('x-community-id')).toBeNull();
    expect(headers.get('x-client-ip')).toBeNull();
    expect(headers.get('accept')).toBe('application/json');
  });

  it('ignores the internal client-ip header at the proxy boundary', () => {
    const headers = new Headers({
      'x-client-ip': '10.0.0.1',
      'x-vercel-forwarded-for': '203.0.113.9, 10.0.0.2',
    });

    expect(getProxyClientIp(headers)).toBe('203.0.113.9');
  });

  it('uses the proxy-appended X-Forwarded-For hop instead of a spoofable first value', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.25, 203.0.113.10',
    });

    expect(getProxyClientIp(headers)).toBe('203.0.113.10');
  });
});
