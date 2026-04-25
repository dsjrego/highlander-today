import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { canCreateMemoriamSubmission } from '@/lib/memoriam/permissions';

const CreateMemorySchema = z.object({
  displayName: z.string().trim().max(120).optional().nullable(),
  relationshipToDeceased: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().min(10).max(4000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userTrustLevel = request.headers.get('x-user-trust-level');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canCreateMemoriamSubmission(userRole, userTrustLevel)) {
      return NextResponse.json(
        { error: 'Trusted membership is required before sharing a memory' },
        { status: 403 }
      );
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const body = await request.json();
    const validated = CreateMemorySchema.parse(body);

    const memorialPage = await db.memorialPage.findFirst({
      where: {
        id: params.id,
        status: 'PUBLISHED',
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        communityId: true,
      },
    });

    if (!memorialPage) {
      return NextResponse.json({ error: 'Published memorial page not found' }, { status: 404 });
    }

    const memory = await db.memorialMemory.create({
      data: {
        communityId: memorialPage.communityId,
        memorialPageId: memorialPage.id,
        createdByUserId: userId,
        displayName: validated.displayName?.trim() || null,
        relationshipToDeceased: validated.relationshipToDeceased?.trim() || null,
        body: validated.body.trim(),
        status: 'PENDING',
        auditLogs: {
          create: {
            communityId: memorialPage.communityId,
            memorialPageId: memorialPage.id,
            actorUserId: userId,
            action: 'CREATE_MEMORY',
            note: 'Memory submitted for review',
          },
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating memorial memory:', error);
    return NextResponse.json(
      { error: 'Failed to submit memory' },
      { status: 500 }
    );
  }
}
