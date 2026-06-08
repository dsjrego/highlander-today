import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import ProfileWorkspaceSidebar from '@/components/profile/ProfileWorkspaceSidebar';
import { authOptions } from '@/lib/auth';
import { getProfileWorkspaceSections } from '@/lib/profile-workspace';

export default async function ProfileWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
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
    <div className="admin-shell -mx-[2px] -mt-[2px] min-h-[calc(100vh-5rem)] overflow-hidden border border-[var(--hl-admin-border)] bg-[#e9edf3] shadow-[0_20px_45px_rgba(15,23,42,0.08)] md:-mx-4 md:mt-0">
      <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[272px_minmax(0,1fr)]">
        <ProfileWorkspaceSidebar sections={sections} />
        <div className="min-w-0">
          <div className="px-8 py-7">
            <div className="min-w-0 max-w-[1320px]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
