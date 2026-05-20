import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  applyTrustedIdentityHeaders,
  getClientIpFromHeaders,
  stripUntrustedForwardedHeaders,
} from '@/lib/request-security';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request });
  const isSuperAdmin = token?.role === 'SUPER_ADMIN';
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

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward user context as headers so API route handlers can read them
  // without making extra DB calls on every request.
  const requestHeaders = new Headers(request.headers);
  stripUntrustedForwardedHeaders(requestHeaders);

  applyTrustedIdentityHeaders(requestHeaders, token as any);

  // Forward client IP for activity logging and forensic trail.
  const clientIp = getClientIpFromHeaders(request.headers);
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
