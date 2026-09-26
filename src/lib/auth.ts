import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { db } from './db';
import { recordLoginEvent } from './login-events';
import { getClientIpFromHeaders } from './request-security';
import { consumeRateLimit } from './rate-limit';
import { resolveCommunityIdByDomain } from './tenant';

async function ensureDefaultMembership(userId: string) {
  const requestHeaders = await headers();
  const explicitCommunityId = requestHeaders.get('x-community-id');
  const domain = requestHeaders.get('x-community-domain') || requestHeaders.get('host');
  const communityId =
    explicitCommunityId ||
    (domain ? await resolveCommunityIdByDomain(domain) : null);

  if (!communityId) {
    return;
  }

  await db.userCommunityMembership.upsert({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
    update: {},
    create: {
      userId,
      communityId,
      role: 'READER',
    },
  });
}

async function findOrCreateOauthUser(params: {
  provider: 'google';
  email: string;
  name?: string | null;
  profile?: Record<string, unknown>;
}) {
  const existing = await db.user.findUnique({
    where: { email: params.email },
  });

  if (existing) {
    await ensureDefaultMembership(existing.id);
    return { user: existing, isNew: false };
  }

  const fallbackName = params.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstName =
    (typeof params.profile?.given_name === 'string' && params.profile.given_name) ||
    (typeof params.profile?.first_name === 'string' && params.profile.first_name) ||
    fallbackName[0] ||
    'Unknown';
  const lastName =
    (typeof params.profile?.family_name === 'string' && params.profile.family_name) ||
    (typeof params.profile?.last_name === 'string' && params.profile.last_name) ||
    fallbackName.slice(1).join(' ');
  const profilePhotoUrl =
    (typeof params.profile?.picture === 'string' && params.profile.picture) ||
    (typeof (params.profile?.picture as { data?: { url?: string } } | undefined)?.data?.url ===
      'string' &&
      (params.profile?.picture as { data?: { url?: string } }).data?.url) ||
    null;

  const user = await db.user.create({
    data: {
      email: params.email,
      firstName,
      lastName,
      profilePhotoUrl,
      trustLevel: 'REGISTERED',
    },
  });

  await ensureDefaultMembership(user.id);
  return { user, isNew: true };
}

async function getUserCompletionState(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      dateOfBirth: true,
      trustLevel: true,
      memberships: {
        orderBy: { joinedAt: 'asc' },
        select: {
          communityId: true,
          role: true,
          community: {
            select: {
              domain: true,
              domains: {
                where: { status: 'ACTIVE' },
                select: { domain: true },
              },
            },
          },
        },
      },
      placeRelationships: {
        where: { isCurrent: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    trustLevel: user.trustLevel,
    role: user.memberships[0]?.role ?? 'READER',
    tenantMemberships: user.memberships.map((membership) => ({
      communityId: membership.communityId,
      role: membership.role,
      domains: [
        membership.community.domain,
        ...membership.community.domains.map((tenantDomain) => tenantDomain.domain),
      ].filter((domain): domain is string => Boolean(domain)),
    })),
    isPlatformSuperAdmin: user.memberships.some(
      (membership) => membership.role === 'SUPER_ADMIN'
    ),
    needsDobCompletion: !user.dateOfBirth,
    needsLocationCompletion: user.placeRelationships.length === 0,
  };
}

export function buildAuthOptions(): NextAuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const requestHeaders = await headers();
          const email = credentials.email.trim().toLowerCase();
          const clientIp = getClientIpFromHeaders(requestHeaders);
          const ipRateLimit = consumeRateLimit(`login:ip:${clientIp}`, 20, 15 * 60 * 1000);
          const identityRateLimit = consumeRateLimit(
            `login:identity:${clientIp}:${email}`,
            5,
            15 * 60 * 1000
          );

          if (!ipRateLimit.allowed || !identityRateLimit.allowed) {
            return null;
          }

          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user?.passwordHash) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
          };
        },
      }),
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
      async signIn({ user, account, profile }) {
        if (!account) {
          return true;
        }

        if (account.provider === 'google') {
          if (!profile?.email) {
            return false;
          }

          const { user: dbUser, isNew } = await findOrCreateOauthUser({
            provider: account.provider,
            email: profile.email,
            name: user.name,
            profile: profile as Record<string, unknown>,
          });

          user.id = dbUser.id;
          (user as typeof user & { oauthNeedsProfileRedirect?: boolean }).oauthNeedsProfileRedirect =
            isNew;

          const requestHeaders = await headers();
          void recordLoginEvent({
            userId: dbUser.id,
            ipAddress: getClientIpFromHeaders(requestHeaders),
            userAgent: requestHeaders.get('user-agent'),
            provider: 'google',
          }).catch(() => {});
        } else if (account.provider === 'credentials' && user.id) {
          const requestHeaders = await headers();
          void recordLoginEvent({
            userId: user.id,
            ipAddress: getClientIpFromHeaders(requestHeaders),
            userAgent: requestHeaders.get('user-agent'),
            provider: 'credentials',
          }).catch(() => {});
        }

        return true;
      },
      async jwt({ token, user }) {
        if (user?.id) {
          token.id = user.id;
          token.oauthNeedsProfileRedirect = Boolean(
            (user as typeof user & { oauthNeedsProfileRedirect?: boolean })
              .oauthNeedsProfileRedirect
          );

          const dbUser = await getUserCompletionState(user.id);

          if (dbUser) {
            token.trust_level = dbUser.trustLevel;
            token.role = dbUser.role;
            token.needsDobCompletion = dbUser.needsDobCompletion;
            token.needsLocationCompletion = dbUser.needsLocationCompletion;
            token.tenantMemberships = dbUser.tenantMemberships;
            token.isPlatformSuperAdmin = dbUser.isPlatformSuperAdmin;
          }
        } else if (typeof token.id === 'string') {
          const dbUser = await getUserCompletionState(token.id);

          if (dbUser) {
            token.trust_level = dbUser.trustLevel;
            token.role = dbUser.role;
            token.needsDobCompletion = dbUser.needsDobCompletion;
            token.needsLocationCompletion = dbUser.needsLocationCompletion;
            token.tenantMemberships = dbUser.tenantMemberships;
            token.isPlatformSuperAdmin = dbUser.isPlatformSuperAdmin;
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as { id?: string; role?: string; trust_level?: string }).id =
            typeof token.id === 'string' ? token.id : undefined;
          const requestRole = (await headers()).get('x-user-role');
          (session.user as { id?: string; role?: string; trust_level?: string }).role =
            requestRole || (typeof token.role === 'string' ? token.role : undefined);
          (session.user as { id?: string; role?: string; trust_level?: string }).trust_level =
            typeof token.trust_level === 'string' ? token.trust_level : undefined;
          (session.user as { needsDobCompletion?: boolean; needsLocationCompletion?: boolean }).needsDobCompletion =
            Boolean(token.needsDobCompletion);
          (session.user as { needsDobCompletion?: boolean; needsLocationCompletion?: boolean }).needsLocationCompletion =
            Boolean(token.needsLocationCompletion);
          session.user.tenantMemberships = token.tenantMemberships;
          session.user.oauthNeedsProfileRedirect = Boolean(token.oauthNeedsProfileRedirect);
        }

        return session;
      },
    },
    pages: {
      signIn: '/login',
    },
  };
}

export const authOptions = buildAuthOptions();

export interface CustomSession {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    trust_level?: string;
    role?: string;
    needsDobCompletion?: boolean;
    needsLocationCompletion?: boolean;
    oauthNeedsProfileRedirect?: boolean;
    tenantMemberships?: Array<{
      communityId: string;
      role: string;
      domains: string[];
    }>;
  };
  expires: string;
}
