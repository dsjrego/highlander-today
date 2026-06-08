import { db } from '@/lib/db';
import AccountSettingsPanel from '../../AccountSettingsPanel';

export default async function ProfileWorkspaceAccountPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    select: {
      isDirectoryListed: true,
    },
  });

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-8">
      <AccountSettingsPanel initialDirectoryListed={user?.isDirectoryListed ?? false} />
    </section>
  );
}
