import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';

const VIDEO_URL_RE = /^https:\/\/(www\.)?(youtube\.com\/watch\?.*v=[\w-]+|youtu\.be\/[\w-]+|vimeo\.com\/\d+)/;

function isValidVideoUrl(url: string): boolean {
  return VIDEO_URL_RE.test(url);
}

const ManagePageSchema = z
  .object({
    // Page content fields (all optional — only provided fields are updated)
    title: z.string().trim().min(1).max(500).optional(),
    shortSummary: z.string().trim().max(2000).nullable().optional(),
    biography: z.string().trim().max(20000).nullable().optional(),
    lifeStory: z.string().trim().max(60000).nullable().optional(),
    serviceDetails: z.string().trim().max(10000).nullable().optional(),
    familyDetails: z.string().trim().max(10000).nullable().optional(),
    videoEmbeds: z.array(z.string().url()).max(10).optional(),
    serviceStreamUrl: z.string().url().nullable().optional(),

    // Memory moderation sub-action
    memoryAction: z.enum(['approve', 'reject', 'hide']).optional(),
    memoryId: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // If a memory action is provided, memoryId must also be present
      if (data.memoryAction && !data.memoryId) return false;
      if (data.memoryId && !data.memoryAction) return false;
      return true;
    },
    { message: 'memoryAction and memoryId must both be provided together' }
  );

async function getActiveStewardship(memorialPageId: string, userId: string) {
  return db.memorialContributor.findFirst({
    where: {
      memorialPageId,
      userId,
      status: 'ACTIVE',
      role: { in: ['STEWARD', 'CO_STEWARD'] },
    },
    select: { id: true, role: true },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const communityId = request.headers.get('x-community-id') || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = ManagePageSchema.parse(body);

    const page = await db.memorialPage.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: {
        id: true,
        communityId: true,
        title: true,
        shortSummary: true,
        biography: true,
        lifeStory: true,
        serviceDetails: true,
        familyDetails: true,
        videoEmbeds: true,
        serviceStreamUrl: true,
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Memorial page not found' }, { status: 404 });
    }

    const isStaff = canReviewMemoriam(userRole);

    const stewardship = isStaff ? null : await getActiveStewardship(page.id, userId);

    if (!isStaff && !stewardship) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // --- Memory moderation sub-action ---
    if (validated.memoryAction && validated.memoryId) {
      const memory = await db.memorialMemory.findFirst({
        where: {
          id: validated.memoryId,
          memorialPageId: page.id,
        },
        select: { id: true, status: true },
      });

      if (!memory) {
        return NextResponse.json({ error: 'Memory not found on this page' }, { status: 404 });
      }

      const statusMap: Record<string, string> = {
        approve: 'APPROVED',
        reject: 'REJECTED',
        hide: 'HIDDEN',
      };

      const nextStatus = statusMap[validated.memoryAction];

      const updatedMemory = await db.$transaction(async (tx) => {
        const updated = await tx.memorialMemory.update({
          where: { id: memory.id },
          data: {
            status: nextStatus as 'APPROVED' | 'REJECTED' | 'HIDDEN',
            reviewedByUserId: userId,
            reviewedAt: new Date(),
          },
          select: { id: true, status: true, reviewedAt: true },
        });

        await tx.memorialAuditLog.create({
          data: {
            communityId: page.communityId,
            memorialPageId: page.id,
            memorialMemoryId: memory.id,
            actorUserId: userId,
            action: 'UPDATE_MEMORY',
            note: `Memory ${validated.memoryAction}d by ${isStaff ? 'staff' : 'steward'}`,
            metadata: {
              previousStatus: memory.status,
              nextStatus,
            },
          },
        });

        return updated;
      });

      return NextResponse.json({ memory: updatedMemory });
    }

    // --- Page content update ---

    // Validate video embed URLs
    if (validated.videoEmbeds) {
      const invalidUrls = validated.videoEmbeds.filter((url) => !isValidVideoUrl(url));
      if (invalidUrls.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid video URL(s): only YouTube and Vimeo links are accepted',
            invalidUrls,
          },
          { status: 400 }
        );
      }
    }

    // Build the update payload from whichever fields were provided
    const updateData: Record<string, unknown> = {};
    const changedFields: string[] = [];

    if (validated.title !== undefined && validated.title !== page.title) {
      updateData.title = validated.title;
      changedFields.push('title');
    }
    if (validated.shortSummary !== undefined && validated.shortSummary !== page.shortSummary) {
      updateData.shortSummary = validated.shortSummary?.trim() || null;
      changedFields.push('shortSummary');
    }
    if (validated.biography !== undefined && validated.biography !== page.biography) {
      updateData.biography = validated.biography?.trim() || null;
      changedFields.push('biography');
    }
    if (validated.lifeStory !== undefined && validated.lifeStory !== page.lifeStory) {
      updateData.lifeStory = validated.lifeStory?.trim() || null;
      changedFields.push('lifeStory');
    }
    if (validated.serviceDetails !== undefined && validated.serviceDetails !== page.serviceDetails) {
      updateData.serviceDetails = validated.serviceDetails?.trim() || null;
      changedFields.push('serviceDetails');
    }
    if (validated.familyDetails !== undefined && validated.familyDetails !== page.familyDetails) {
      updateData.familyDetails = validated.familyDetails?.trim() || null;
      changedFields.push('familyDetails');
    }
    if (validated.videoEmbeds !== undefined) {
      updateData.videoEmbeds = validated.videoEmbeds;
      changedFields.push('videoEmbeds');
    }
    if (validated.serviceStreamUrl !== undefined && validated.serviceStreamUrl !== page.serviceStreamUrl) {
      updateData.serviceStreamUrl = validated.serviceStreamUrl || null;
      changedFields.push('serviceStreamUrl');
    }

    if (changedFields.length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updatedPage = await db.$transaction(async (tx) => {
      const updated = await tx.memorialPage.update({
        where: { id: page.id },
        data: updateData,
        select: {
          id: true,
          title: true,
          slug: true,
          shortSummary: true,
          biography: true,
          lifeStory: true,
          serviceDetails: true,
          familyDetails: true,
          videoEmbeds: true,
          serviceStreamUrl: true,
          heroImageUrl: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.memorialAuditLog.create({
        data: {
          communityId: page.communityId,
          memorialPageId: page.id,
          actorUserId: userId,
          action: 'STEWARD_EDIT',
          note: `Fields updated: ${changedFields.join(', ')}`,
          metadata: {
            changedFields,
            performedByRole: isStaff ? 'STAFF' : stewardship?.role,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ page: updatedPage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating memorial page:', error);
    return NextResponse.json({ error: 'Failed to update memorial page' }, { status: 500 });
  }
}
