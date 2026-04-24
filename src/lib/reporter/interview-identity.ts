import { db } from '@/lib/db';

export async function normalizeReporterInterviewIdentity(params: {
  communityId: string;
  intervieweeUserId?: string | null;
  inviteEmail?: string | null;
  intervieweeName: string;
}) {
  let linkedUser = null;

  if (params.intervieweeUserId) {
    linkedUser = await db.user.findFirst({
      where: {
        id: params.intervieweeUserId,
        memberships: {
          some: {
            communityId: params.communityId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!linkedUser) {
      throw new Error('Selected interviewee account is not available in this community.');
    }
  } else if (params.inviteEmail) {
    linkedUser = await db.user.findFirst({
      where: {
        email: params.inviteEmail,
        memberships: {
          some: {
            communityId: params.communityId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  const normalizedIntervieweeName = linkedUser
    ? `${linkedUser.firstName} ${linkedUser.lastName}`.trim()
    : params.intervieweeName.trim();

  return {
    intervieweeUserId: linkedUser?.id || null,
    inviteEmail: linkedUser?.email || params.inviteEmail || null,
    intervieweeName: normalizedIntervieweeName,
  };
}
