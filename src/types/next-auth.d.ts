import 'next-auth';
import 'next-auth/jwt';

type TenantMembershipClaim = {
  communityId: string;
  role: string;
  domains: string[];
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      trust_level?: string;
      tenantMemberships?: TenantMembershipClaim[];
      oauthNeedsProfileRedirect?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    trust_level?: string;
    tenantMemberships?: TenantMembershipClaim[];
    isPlatformSuperAdmin?: boolean;
    oauthNeedsProfileRedirect?: boolean;
  }
}
