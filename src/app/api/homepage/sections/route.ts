import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import {
  DEFAULT_SECTION_ORDER,
  ensureHomepageSections,
  getHomepageArticleCandidates,
  getHomepageRecipeCandidates,
  getHomepageSectionsData,
  HOMEPAGE_SECTION_CONFIG,
  resolveHomepageCommunityId,
  type HomepageContentType,
  type ManagedHomepageSectionType,
} from '@/lib/homepage';

const HomepageSectionInputSchema = z.object({
  id: z.string().uuid(),
  sectionType: z.enum(DEFAULT_SECTION_ORDER),
  sortOrder: z.number().int().min(1),
  isVisible: z.boolean(),
  pinnedItems: z.array(
    z.object({
      contentType: z.enum(['ARTICLE', 'RECIPE', 'EVENT', 'MARKETPLACE_LISTING']),
      contentId: z.string().uuid(),
    })
  ),
});

const UpdateHomepageSectionsSchema = z.object({
  sections: z.array(HomepageSectionInputSchema).length(DEFAULT_SECTION_ORDER.length),
});

function getExpectedContentType(sectionType: ManagedHomepageSectionType): HomepageContentType {
  return HOMEPAGE_SECTION_CONFIG[sectionType].contentType;
}

function getSectionInput(
  sections: Array<z.infer<typeof HomepageSectionInputSchema>>,
  sectionType: ManagedHomepageSectionType
) {
  return sections.find((section) => section.sectionType === sectionType) ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const communityId = await resolveHomepageCommunityId({
      preferredCommunityId: request.headers.get('x-community-id') || undefined,
      preferredDomain: request.headers.get('x-community-domain') || undefined,
      host: request.headers.get('host') || undefined,
    });

    if (!communityId) {
      return NextResponse.json({ sections: [] });
    }

    const sections = await getHomepageSectionsData(communityId);
    const [articleCandidates, recipeCandidates] = await Promise.all([
      getHomepageArticleCandidates(communityId),
      getHomepageRecipeCandidates(communityId),
    ]);
    return NextResponse.json({ sections, articleCandidates, recipeCandidates });
  } catch (error) {
    console.error('Error fetching homepage sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage sections' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'homepage:pin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const communityId = await resolveHomepageCommunityId({
      preferredCommunityId: request.headers.get('x-community-id') || undefined,
      preferredDomain: request.headers.get('x-community-domain') || undefined,
      host: request.headers.get('host') || undefined,
    });
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateHomepageSectionsSchema.parse(body);

    const ensuredSections = await ensureHomepageSections(communityId);
    const sectionIds = new Set(ensuredSections.map((section) => section.id));

    for (const section of validated.sections) {
      if (!sectionIds.has(section.id)) {
        return NextResponse.json(
          { error: `Unknown homepage section: ${section.id}` },
          { status: 400 }
        );
      }

      const expectedContentType = getExpectedContentType(section.sectionType);
      const maxItems = HOMEPAGE_SECTION_CONFIG[section.sectionType].maxItems;

      if (section.pinnedItems.length > maxItems) {
        return NextResponse.json(
          { error: `${section.sectionType} supports at most ${maxItems} pinned items` },
          { status: 400 }
        );
      }

      if (section.pinnedItems.some((item) => item.contentType !== expectedContentType)) {
        return NextResponse.json(
          { error: `${section.sectionType} only accepts ${expectedContentType} content` },
          { status: 400 }
        );
      }
    }

    const featuredSection = getSectionInput(validated.sections, 'FEATURED_ARTICLES');
    const latestNewsSection = getSectionInput(validated.sections, 'LATEST_NEWS');

    if (featuredSection && latestNewsSection) {
      const featuredArticleIds = new Set(
        featuredSection.pinnedItems.map((item) => item.contentId)
      );

      const duplicateArticleId = latestNewsSection.pinnedItems.find((item) =>
        featuredArticleIds.has(item.contentId)
      )?.contentId;

      if (duplicateArticleId) {
        return NextResponse.json(
          { error: 'A homepage article cannot be pinned in both Hero and Latest News.' },
          { status: 400 }
        );
      }
    }

    await db.$transaction(async (tx) => {
      for (const section of validated.sections) {
        await tx.homepageSection.update({
          where: { id: section.id },
          data: {
            sortOrder: section.sortOrder,
            isVisible: section.isVisible,
          },
        });

        await tx.homepagePinnedItem.deleteMany({
          where: { homepageSectionId: section.id },
        });

        if (section.pinnedItems.length > 0) {
          await tx.homepagePinnedItem.createMany({
            data: section.pinnedItems.map((item, index) => ({
              homepageSectionId: section.id,
              contentType: item.contentType,
              contentId: item.contentId,
              pinnedByUserId: userId,
              sortOrder: index + 1,
            })),
          });
        }
      }
    });

    const sections = await getHomepageSectionsData(communityId);
    const [articleCandidates, recipeCandidates] = await Promise.all([
      getHomepageArticleCandidates(communityId),
      getHomepageRecipeCandidates(communityId),
    ]);
    return NextResponse.json({ sections, articleCandidates, recipeCandidates });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving homepage sections:', error);
    return NextResponse.json(
      { error: 'Failed to save homepage sections' },
      { status: 500 }
    );
  }
}
