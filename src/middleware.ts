import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  applyTrustedIdentityHeaders,
  getProxyClientIp,
  resolveTrustedTenantContext,
  stripUntrustedForwardedHeaders,
} from '@/lib/request-security';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let token = null;
  try {
    token = await getToken({ req: request });
  } catch {
    token = null;
  }

  const tenantContext = resolveTrustedTenantContext(token as any, request.nextUrl.hostname);
  const isSuspended = token?.trust_level === 'SUSPENDED';
  const isTrusted = token?.trust_level === 'TRUSTED';
  // A privileged membership never overrides the account trust boundary. This
  // also protects older/stale JWTs after an account is demoted or suspended.
  const effectiveRole = isSuspended ? '' : isTrusted ? tenantContext.role : 'READER';
  const isSuperAdmin = effectiveRole === 'SUPER_ADMIN';
  const isRoadmapUiRoute =
    pathname === '/roadmap' ||
    pathname.startsWith('/roadmap/') ||
    pathname === '/about/roadmap' ||
    pathname === '/admin/roadmap';
  const isRoadmapApiRoute =
    pathname === '/api/roadmap' ||
    pathname.startsWith('/api/roadmap/') ||
    pathname === '/api/admin/roadmap/weights';

  if ((isRoadmapUiRoute || isRoadmapApiRoute) && !isSuperAdmin) {
    if (isRoadmapApiRoute) {
      return NextResponse.json(
        { error: 'Roadmap is restricted to Super Admins' },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protected UI routes — redirect to login if unauthenticated
  const protectedPaths = ['/admin', '/messages', '/help-us-grow', '/local-life/submit', '/local-life/drafts', '/marketplace/create', '/marketplace/stores', '/marketplace/stores/create'];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  const adminRoles = new Set(['CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']);
  const hasAdminSurfaceAccess =
    token?.trust_level === 'TRUSTED' && adminRoles.has(effectiveRole);

  if (isProtected && (!token || isSuspended)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && !hasAdminSurfaceAccess) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Forward user context as headers so API route handlers can read them
  // without making extra DB calls on every request.
  const requestHeaders = new Headers(request.headers);
  stripUntrustedForwardedHeaders(requestHeaders);

  applyTrustedIdentityHeaders(
    requestHeaders,
    token && !isSuspended ? ({ ...token, role: effectiveRole } as any) : null
  );

  requestHeaders.set('x-community-domain', tenantContext.communityDomain);
  if (tenantContext.communityId) {
    requestHeaders.set('x-community-id', tenantContext.communityId);
  }

  // Forward client IP for activity logging and forensic trail.
  const clientIp = getProxyClientIp(request.headers);
  requestHeaders.set('x-client-ip', clientIp);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/messages/:path*',
    '/help-us-grow',
    '/local-life/submit',
    '/local-life/drafts',
    '/marketplace/create',
    '/marketplace/stores',
    '/marketplace/stores/:path*',
    '/marketplace/stores/create',
    '/roadmap',
    '/roadmap/:path*',
    '/about/roadmap',
    '/api/:path*',
  ],
};
