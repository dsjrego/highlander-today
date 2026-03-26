import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
  const protectedPaths = ['/admin', '/messages', '/profile/edit', '/local-life/submit', '/local-life/drafts', '/marketplace/create', '/marketplace/stores', '/marketplace/stores/create'];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward user context as headers so API route handlers can read them
  // without making extra DB calls on every request.
  const requestHeaders = new Headers(request.headers);

  if (token) {
    if (token.id)          requestHeaders.set('x-user-id',          String(token.id));
    if (token.role)        requestHeaders.set('x-user-role',        String(token.role));
    if (token.trust_level) requestHeaders.set('x-user-trust-level', String(token.trust_level));
  }

  // Forward client IP for activity logging and forensic trail.
  // x-forwarded-for may contain a comma-separated list; take the first (original client).
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || '127.0.0.1';
  requestHeaders.set('x-client-ip', clientIp);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/messages/:path*',
    '/profile/edit',
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
