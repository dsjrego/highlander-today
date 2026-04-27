import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import {
  DEFAULT_HOMEPAGE_BOX_ORDER,
  ensureHomepageBoxes,
  getHomepageArticleCandidates,
  getHomepageBoxesData,
  getHomepageEventCandidates,
  getHomepageMarketplaceCandidates,
  getHomepageRecipeCandidates,
  resolveHomepageCommunityId,
  type HomepageBoxType,
  type HomepageContentType,
} from '@/lib/homepage';

const HomepageBoxTypeSchema = z.enum(['ARTICLES', 'RECIPES', 'EVENTS', 'MARKETPLACE', 'MEMORIAM']);
const HomepageItemSelectionSchema = z.object({
  contentType: z.enum(['ARTICLE', 'RECIPE', 'EVENT', 'MARKETPLACE_LISTING']),
  contentId: z.string().uuid(),
});

const HomepageBoxInputSchema = z.object({
  boxType: HomepageBoxTypeSchema,
  sortOrder: z.number().int().min(1),
  isVisible: z.boolean(),
  maxLinks: z.number().int().min(0).max(5).optional(),
  heroItem: HomepageItemSelectionSchema.nullable(),
  linkItems: z.array(HomepageItemSelectionSchema).max(5),
});

const UpdateHomepageBoxesSchema = z.object({
  boxes: z.array(HomepageBoxInputSchema).length(DEFAULT_HOMEPAGE_BOX_ORDER.length),
});

const BOX_CONTENT_TYPE: Record<HomepageBoxType, HomepageContentType> = {
  ARTICLES: 'ARTICLE',
  RECIPES: 'RECIPE',
  EVENTS: 'EVENT',
  MARKETPLACE: 'MARKETPLACE_LISTING',
  MEMORIAM: 'ARTICLE', // unused — MEMORIAM has no pinnable content items
};

function validateBoxPayload(box: z.infer<typeof HomepageBoxInputSchema>) {
  const expectedContentType = BOX_CONTENT_TYPE[box.boxType];

  if (box.heroItem && box.heroItem.contentType !== expectedContentType) {
    throw new Error(`${box.boxType} hero must be ${expectedContentType}`);
  }

  if (box.linkItems.some((item) => item.contentType !== expectedContentType)) {
    throw new Error(`${box.boxType} only accepts ${expectedContentType} content`);
  }

  if (!box.heroItem && box.linkItems.length > 0) {
    throw new Error(`${box.boxType} needs a hero item before supporting links can be added`);
  }

  if (box.heroItem) {
    const heroKey = `${box.heroItem.contentType}:${box.heroItem.contentId}`;
    if (box.linkItems.some((item) => `${item.contentType}:${item.contentId}` === heroKey)) {
      throw new Error(`${box.boxType} hero cannot also appear in the supporting links`);
    }
  }
}

function responsePayload(communityId: string) {
  return Promise.all([
    getHomepageBoxesData(communityId),
    getHomepageArticleCandidates(communityId),
    getHomepageRecipeCandidates(communityId),
    getHomepageEventCandidates(communityId),
    getHomepageMarketplaceCandidates(communityId),
  ]).then(([boxes, articleCandidates, recipeCandidates, eventCandidates, marketplaceCandidates]) => ({
    boxes,
    articleCandidates,
    recipeCandidates,
    eventCandidates,
    marketplaceCandidates,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const communityId = await resolveHomepageCommunityId({
      preferredCommunityId: request.headers.get('x-community-id') || undefined,
      preferredDomain: request.headers.get('x-community-domain') || undefined,
      host: request.headers.get('host') || undefined,
    });

    if (!communityId) {
      return NextResponse.json({ boxes: [] });
    }

    return NextResponse.json(await responsePayload(communityId));
  } catch (error) {
    console.error('Error fetching homepage boxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage boxes' },
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const communityId = await resolveHomepageCommunityId({
      preferredCommunityId: request.headers.get('x-community-id') || undefined,
      preferredDomain: request.headers.get('x-community-domain') || undefined,
      host: request.headers.get('host') || undefined,
    });

    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const validated = UpdateHomepageBoxesSchema.parse(await request.json());
    validated.boxes.forEach(validateBoxPayload);

    const uniqueBoxTypes = new Set(validated.boxes.map((box) => box.boxType));
    if (uniqueBoxTypes.size !== validated.boxes.length) {
      return NextResponse.json(
        { error: 'Each homepage box type can appear only once.' },
        { status: 400 }
      );
    }

    const ensuredBoxes = await ensureHomepageBoxes(communityId);
    const boxIdsByType = new Map(
      ensuredBoxes.map((box) => [box.boxType as HomepageBoxType, box.id])
    );
    const orderedBoxes = [...validated.boxes].sort((a, b) => a.sortOrder - b.sortOrder);

    await db.$transaction(async (tx) => {
      for (const [index, box] of orderedBoxes.entries()) {
        const homepageBoxId = boxIdsByType.get(box.boxType);

        if (!homepageBoxId) {
          throw new Error(`Homepage box missing for ${box.boxType}`);
        }

        await tx.homepageBox.update({
          where: { id: homepageBoxId },
          data: {
            sortOrder: index + 1,
            isVisible: box.isVisible,
            maxLinks: box.maxLinks ?? 5,
          },
        });

        await tx.homepageBoxItem.deleteMany({
          where: { homepageBoxId },
        });

        const items = [
          ...(box.heroItem
            ? [
                {
                  ...box.heroItem,
                  role: 'HERO' as const,
                },
              ]
            : []),
          ...box.linkItems.map((item) => ({
            ...item,
            role: 'LINK' as const,
          })),
        ];

        if (items.length > 0) {
          await tx.homepageBoxItem.createMany({
            data: items.map((item, itemIndex) => ({
              homepageBoxId,
              role: item.role,
              contentType: item.contentType,
              contentId: item.contentId,
              pinnedByUserId: userId,
              sortOrder: itemIndex + 1,
            })),
          });
        }
      }
    });

    return NextResponse.json(await responsePayload(communityId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error saving homepage boxes:', error);
    return NextResponse.json(
      { error: 'Failed to save homepage boxes' },
      { status: 500 }
    );
  }
}
