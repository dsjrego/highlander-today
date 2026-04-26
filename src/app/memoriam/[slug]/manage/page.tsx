import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';
import { db } from '@/lib/db';
import MemorialManageClient from './MemorialManageClient';

interface PageProps {
  params: { slug: string };
}

export default async function MemorialManagePage({ params }: PageProps) {
  const [session, community] = await Promise.all([
    getServerSession(authOptions),
    getCurrentCommunity({ headers: headers() }),
  ]);

  const sessionUser = session?.user as
    | { id: string; name?: string; email?: string; role?: string; trust_level?: string }
    | undefined;

  if (!sessionUser?.id) {
    redirect('/login');
  }

  // Look up the memorial page by slug + communityId
  const page = await db.memorialPage.findFirst({
    where: {
      slug: params.slug,
      ...(community ? { communityId: community.id } : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      pageType: true,
      shortSummary: true,
      biography: true,
      lifeStory: true,
      serviceDetails: true,
      familyDetails: true,
      videoEmbeds: true,
      serviceStreamUrl: true,
      heroImageUrl: true,
    },
  });

  if (!page) {
    notFound();
  }

  // Authorization: must be active STEWARD or CO_STEWARD on this page,
  // OR have global canReviewMemoriam permission.
  const isGlobalReviewer = canReviewMemoriam(sessionUser.role);

  if (!isGlobalReviewer) {
    const contributorRecord = await db.memorialContributor.findFirst({
      where: {
        memorialPageId: page.id,
        userId: sessionUser.id,
        status: 'ACTIVE',
        role: { in: ['STEWARD', 'CO_STEWARD'] },
      },
      select: { id: true, role: true },
    });

    if (!contributorRecord) {
      notFound();
    }
  }

  // Fetch pending memories
  const pendingMemories = await db.memorialMemory.findMany({
    where: { memorialPageId: page.id, status: 'PENDING' },
    select: {
      id: true,
      displayName: true,
      relationshipToDeceased: true,
      body: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch all photos
  const photos = await db.memorialPhoto.findMany({
    where: { memorialPageId: page.id },
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch all contributors with user name
  const contributors = await db.memorialContributor.findMany({
    where: { memorialPageId: page.id },
    select: {
      id: true,
      role: true,
      displayName: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Determine if current user is primary STEWARD (for invite permissions)
  const currentContributor = await db.memorialContributor.findFirst({
    where: {
      memorialPageId: page.id,
      userId: sessionUser.id,
      status: 'ACTIVE',
      role: 'STEWARD',
    },
    select: { id: true },
  });

  const isPrimarySteward = Boolean(currentContributor) || isGlobalReviewer;

  return (
    <MemorialManageClient
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        shortSummary: page.shortSummary,
        biography: page.biography,
        lifeStory: page.lifeStory,
        serviceDetails: page.serviceDetails,
        familyDetails: page.familyDetails,
        videoEmbeds: page.videoEmbeds,
        serviceStreamUrl: page.serviceStreamUrl,
        heroImageUrl: page.heroImageUrl,
      }}
      pendingMemories={pendingMemories}
      photos={photos.map((p) => ({ ...p, status: p.status as string }))}
      contributors={contributors.map((c) => ({
        id: c.id,
        role: c.role as string,
        displayName: c.displayName,
        user: c.user ?? null,
      }))}
      isPrimarySteward={isPrimarySteward}
    />
  );
}
