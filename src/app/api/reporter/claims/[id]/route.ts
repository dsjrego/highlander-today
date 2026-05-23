import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { updateReporterClaimVerificationStatus } from '@/lib/reporter/claim-service';
import { canEditReporterRun } from '@/lib/reporter/permissions';

const UpdateReporterClaimSchema = z.object({
  verificationStatus: z.enum([
    'UNREVIEWED',
    'SUPPORTED',
    'NEEDS_CORROBORATION',
    'DISPUTED',
    'REJECTED',
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const existing = await db.reporterClaim.findUnique({
      where: { id: params.id },
      include: {
        reporterRun: {
          select: { id: true, communityId: true },
        },
      },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateReporterClaimSchema.parse(body);

    const claim = await updateReporterClaimVerificationStatus(
      params.id,
      validated.verificationStatus
    );

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existing.reporterRun.id,
      ipAddress,
      metadata: {
        claimUpdated: claim.id,
        verificationStatus: claim.verificationStatus,
      },
    });

    return NextResponse.json(claim);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating reporter claim:', error);
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 });
  }
}
