import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import ProfileWorkspaceSidebar from '@/components/profile/ProfileWorkspaceSidebar';
import { authOptions } from '@/lib/auth';
import { getProfileWorkspaceSections } from '@/lib/profile-workspace';

export default async function ProfileWorkspaceLayout(
  props: {
    children: ReactNode;
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;

  if (!sessionUser?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/profile/${params.id}/workspace`)}`);
  }

  if (sessionUser.id !== params.id) {
    redirect(`/profile/${params.id}`);
  }

  const sections = getProfileWorkspaceSections(params.id);

  return (
    <div className="admin-shell -mx-[2px] -mt-[2px] min-h-[calc(100vh-5rem)] overflow-hidden border-b border-r border-[var(--hl-admin-border)] bg-[#e9edf3] shadow-[0_20px_45px_rgba(15,23,42,0.08)] md:-mx-4 md:mt-0">
      <div className="grid w-full min-h-[calc(100vh-5rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <ProfileWorkspaceSidebar sections={sections} />
        <div className="min-w-0">
          <div className="px-3 py-3 lg:px-3.5 lg:py-3.5">
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
