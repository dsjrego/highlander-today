import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import {
  ensureHomepageSections,
  getHomepageSectionsData,
  HOMEPAGE_SECTION_CONFIG,
  resolveHomepageCommunityId,
  type HomepageContentType,
  type ManagedHomepageSectionType,
} from '@/lib/homepage';

const PinSchema = z.object({
  action: z.enum(['pin', 'unpin', 'reorder']),
  sectionType: z.enum([
    'FEATURED_ARTICLES',
    'LATEST_NEWS',
    'FEATURED_RECIPES',
    'UPCOMING_EVENTS',
    'RECENT_MARKETPLACE',
  ]),
  contentType: z.enum(['ARTICLE', 'RECIPE', 'EVENT', 'MARKETPLACE_LISTING']).optional(),
  contentId: z.string().uuid().optional(),
  pinnedItemId: z.string().uuid().optional(),
  order: z.array(z.string().uuid()).optional(),
});

function expectedContentType(sectionType: ManagedHomepageSectionType): HomepageContentType {
  return HOMEPAGE_SECTION_CONFIG[sectionType].contentType;
}

export async function POST(request: NextRequest) {
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

    const validated = PinSchema.parse(await request.json());
    const sections = await ensureHomepageSections(communityId);
    const section = sections.find((item) => item.sectionType === validated.sectionType);

    if (!section) {
      return NextResponse.json({ error: 'Homepage section not found' }, { status: 404 });
    }

    if (validated.action === 'pin') {
      if (!validated.contentId || !validated.contentType) {
        return NextResponse.json(
          { error: 'contentId and contentType are required for pin action' },
          { status: 400 }
        );
      }

      if (validated.contentType !== expectedContentType(validated.sectionType)) {
        return NextResponse.json(
          { error: `${validated.sectionType} does not accept ${validated.contentType}` },
          { status: 400 }
        );
      }

      const maxItems = HOMEPAGE_SECTION_CONFIG[validated.sectionType].maxItems;
      const existingPins = await db.homepagePinnedItem.findMany({
        where: { homepageSectionId: section.id },
        orderBy: { sortOrder: 'asc' },
      });

      if (
        existingPins.some(
          (pin) => pin.contentType === validated.contentType && pin.contentId === validated.contentId
        )
      ) {
        return NextResponse.json({ error: 'Item is already pinned' }, { status: 400 });
      }

      if (existingPins.length >= maxItems) {
        return NextResponse.json(
          { error: `${validated.sectionType} already has the maximum number of pinned items` },
          { status: 400 }
        );
      }

      await db.homepagePinnedItem.create({
        data: {
          homepageSectionId: section.id,
          contentType: validated.contentType,
          contentId: validated.contentId,
          pinnedByUserId: userId,
          sortOrder: existingPins.length + 1,
        },
      });
    }

    if (validated.action === 'unpin') {
      if (!validated.pinnedItemId) {
        return NextResponse.json(
          { error: 'pinnedItemId is required for unpin action' },
          { status: 400 }
        );
      }

      await db.homepagePinnedItem.delete({
        where: { id: validated.pinnedItemId },
      });
    }

    if (validated.action === 'reorder') {
      if (!validated.order) {
        return NextResponse.json(
          { error: 'order is required for reorder action' },
          { status: 400 }
        );
      }

      await db.$transaction(
        validated.order.map((pinnedItemId, index) =>
          db.homepagePinnedItem.update({
            where: { id: pinnedItemId },
            data: { sortOrder: index + 1 },
          })
        )
      );
    }

    const updatedSections = await getHomepageSectionsData(communityId);
    return NextResponse.json({ sections: updatedSections });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating homepage pins:', error);
    return NextResponse.json(
      { error: 'Failed to update homepage pins' },
      { status: 500 }
    );
  }
}
