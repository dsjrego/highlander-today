import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import bcrypt from 'bcryptjs';
import { db } from './db';

type SupportedProvider = 'credentials' | 'google' | 'facebook';

async function ensureDefaultMembership(userId: string) {
  const community = await db.community.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!community) {
    return;
  }

  await db.userCommunityMembership.upsert({
    where: {
      userId_communityId: {
        userId,
        communityId: community.id,
      },
    },
    update: {},
    create: {
      userId,
      communityId: community.id,
      role: 'READER',
    },
  });
}

async function findOrCreateOauthUser(params: {
  provider: Exclude<SupportedProvider, 'credentials'>;
  email: string;
  name?: string | null;
  profile?: Record<string, unknown>;
}) {
  const existing = await db.user.findUnique({
    where: { email: params.email },
  });

  if (existing) {
    await ensureDefaultMembership(existing.id);
    return existing;
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
  return user;
}

async function getUserCompletionState(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      dateOfBirth: true,
      trustLevel: true,
      memberships: {
        select: { role: true },
        take: 1,
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

          const user = await db.user.findUnique({
            where: { email: credentials.email },
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
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
      async signIn({ user, account, profile }) {
        if (!account || !profile?.email) {
          return true;
        }

        if (account.provider === 'google' || account.provider === 'facebook') {
          const dbUser = await findOrCreateOauthUser({
            provider: account.provider,
            email: profile.email,
            name: user.name,
            profile: profile as Record<string, unknown>,
          });

          user.id = dbUser.id;
        }

        return true;
      },
      async jwt({ token, user }) {
        if (user?.id) {
          token.id = user.id;

          const dbUser = await getUserCompletionState(user.id);

          if (dbUser) {
            token.trust_level = dbUser.trustLevel;
            token.role = dbUser.role;
            token.needsDobCompletion = dbUser.needsDobCompletion;
            token.needsLocationCompletion = dbUser.needsLocationCompletion;
          }
        } else if (typeof token.id === 'string') {
          const dbUser = await getUserCompletionState(token.id);

          if (dbUser) {
            token.trust_level = dbUser.trustLevel;
            token.role = dbUser.role;
            token.needsDobCompletion = dbUser.needsDobCompletion;
            token.needsLocationCompletion = dbUser.needsLocationCompletion;
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as { id?: string; role?: string; trust_level?: string }).id =
            typeof token.id === 'string' ? token.id : undefined;
          (session.user as { id?: string; role?: string; trust_level?: string }).role =
            typeof token.role === 'string' ? token.role : undefined;
          (session.user as { id?: string; role?: string; trust_level?: string }).trust_level =
            typeof token.trust_level === 'string' ? token.trust_level : undefined;
          (session.user as { needsDobCompletion?: boolean; needsLocationCompletion?: boolean }).needsDobCompletion =
            Boolean(token.needsDobCompletion);
          (session.user as { needsDobCompletion?: boolean; needsLocationCompletion?: boolean }).needsLocationCompletion =
            Boolean(token.needsLocationCompletion);
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
  };
  expires: string;
}
