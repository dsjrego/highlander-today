export function canAccessReporterInterviewSession(params: {
  userId: string | null | undefined;
  userEmail: string | null | undefined;
  userRole: string | null | undefined;
  intervieweeUserId: string | null | undefined;
  inviteEmail: string | null | undefined;
}) {
  const normalizedUserEmail = params.userEmail?.trim().toLowerCase() || null;
  const normalizedInviteEmail = params.inviteEmail?.trim().toLowerCase() || null;

  if (
    params.userRole &&
    ['EDITOR', 'ADMIN', 'SUPER_ADMIN', 'STAFF_WRITER'].includes(params.userRole)
  ) {
    return true;
  }

  if (params.userId && params.intervieweeUserId && params.userId === params.intervieweeUserId) {
    return true;
  }

  if (normalizedUserEmail && normalizedInviteEmail && normalizedUserEmail === normalizedInviteEmail) {
    return true;
  }

  return false;
}
