import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { db } from '@/lib/db';
import { recordLoginEvent } from '@/lib/login-events';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

const handler = NextAuth({
  // NOTE: PrismaAdapter removed intentionally.
  // PrismaAdapter is designed for database-session flows (e.g. magic-link / OAuth).
  // When combined with CredentialsProvider + JWT strategy it silently fails
  // because the adapter tries to create a DB session that JWT mode never reads.
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers (Google, Facebook): find or create user in our DB
      if ((account?.provider === 'google' || account?.provider === 'facebook') && profile?.email) {
        try {
          let dbUser = await db.user.findUnique({
            where: { email: profile.email },
          });

          if (!dbUser) {
            const oauthProfile = profile as any;

            // Extract name fields — Google uses given_name/family_name,
            // Facebook uses first_name/last_name
            let firstName = 'Unknown';
            let lastName = '';
            let photoUrl: string | null = null;

            if (account.provider === 'google') {
              firstName = oauthProfile.given_name || profile.name?.split(' ')[0] || 'Unknown';
              lastName = oauthProfile.family_name || profile.name?.split(' ').slice(1).join(' ') || '';
              photoUrl = oauthProfile.picture || null;
            } else if (account.provider === 'facebook') {
              firstName = oauthProfile.first_name || profile.name?.split(' ')[0] || 'Unknown';
              lastName = oauthProfile.last_name || profile.name?.split(' ').slice(1).join(' ') || '';
              photoUrl = oauthProfile.picture?.data?.url || null;
            }

            dbUser = await db.user.create({
              data: {
                email: profile.email,
                firstName,
                lastName,
                profilePhotoUrl: photoUrl,
                passwordHash: null, // No password for OAuth users
                trustLevel: 'REGISTERED',
              },
            });

            // Create community membership (default community)
            const community = await db.community.findFirst();
            if (community) {
              await db.userCommunityMembership.create({
                data: {
                  userId: dbUser.id,
                  communityId: community.id,
                  role: 'READER',
                },
              });
            }
          }

          // Stash the DB user ID on the user object so the jwt callback can read it
          user.id = dbUser.id;

          // Record login event for OAuth provider (fire-and-forget)
          const headersList = headers();
          const forwarded = headersList.get('x-forwarded-for');
          const ip = forwarded
            ? forwarded.split(',')[0].trim()
            : headersList.get('x-real-ip') || '127.0.0.1';
          const ua = headersList.get('user-agent') || null;

          recordLoginEvent({
            userId: dbUser.id,
            ipAddress: ip,
            userAgent: ua,
            provider: account.provider,
          }).catch(() => {}); // swallow — login logging must not block auth

          return true;
        } catch (err) {
          console.error(`[SignIn] ${account.provider} OAuth error:`, err);
          return false;
        }
      }

      // Credentials provider — always allow (authorize already validated)
      // Record login event for credentials provider
      if (account?.provider === 'credentials' && user?.id) {
        // Fire-and-forget: don't block the login flow
        const headersList = headers();
        const forwarded = headersList.get('x-forwarded-for');
        const ip = forwarded
          ? forwarded.split(',')[0].trim()
          : headersList.get('x-real-ip') || '127.0.0.1';
        const ua = headersList.get('user-agent') || null;

        recordLoginEvent({
          userId: user.id,
          ipAddress: ip,
          userAgent: ua,
          provider: 'credentials',
        }).catch(() => {}); // swallow — login logging must not block auth
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        // For Google OAuth, user.id was set to our DB id in signIn callback
        // For credentials, user.id is already our DB id
        token.id = user.id;

        // Fetch membership role
        try {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: {
              trustLevel: true,
              memberships: {
                select: { role: true },
                take: 1,
              },
            },
          });

          if (dbUser) {
            token.trust_level = dbUser.trustLevel;
            token.role = dbUser.memberships?.[0]?.role ?? 'READER';
          }
        } catch (err) {
          console.error('[JWT] Error fetching user role:', err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).trust_level = token.trust_level;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
});

export { handler as GET, handler as POST };
