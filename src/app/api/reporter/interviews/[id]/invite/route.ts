import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { isEmailConfigured, sendTransactionalEmail } from '@/lib/email';
import { buildReporterInterviewInviteEmail } from '@/lib/reporter/interview-invite';
import { canEditReporterRun } from '@/lib/reporter/permissions';

export async function POST(
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
    const existing = await db.reporterInterviewRequest.findUnique({
      where: { id: params.id },
      include: {
        reporterRun: {
          select: { id: true, communityId: true, title: true, topic: true },
        },
        interviewee: {
          select: { id: true, email: true },
        },
      },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Reporter interview not found' }, { status: 404 });
    }

    if (!existing.inviteEmail && !existing.intervieweeUserId) {
      return NextResponse.json(
        { error: 'Add an interviewee account or invite email before sending an invite.' },
        { status: 400 }
      );
    }

    const nextStatus = existing.intervieweeUserId ? 'READY' : 'INVITED';
    const updated = await db.reporterInterviewRequest.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        invitedAt: new Date(),
        inviteEmail: existing.interviewee?.email || existing.inviteEmail,
      },
      include: {
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        sessions: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            turns: {
              orderBy: [{ sortOrder: 'asc' }],
            },
            facts: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
            safetyFlags: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    let inviteDelivery: 'sent' | 'not_configured' | 'no_email' = 'no_email';

    if (updated.inviteEmail) {
      if (isEmailConfigured()) {
        const actor = await db.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, email: true },
        });
        const senderName =
          [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim() ||
          'Highlander Today staff';
        const emailContent = buildReporterInterviewInviteEmail({
          interviewId: updated.id,
          interviewTitle: existing.reporterRun.title || existing.reporterRun.topic,
          intervieweeName: updated.intervieweeName,
          language: updated.interviewLanguage || updated.suggestedLanguage,
          senderName,
          replyToEmail: actor?.email,
          origin: request.nextUrl.origin,
        });

        await sendTransactionalEmail({
          to: {
            email: updated.inviteEmail,
            name: updated.intervieweeName,
          },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          replyTo: emailContent.replyTo,
          tags: ['reporter-interview-invite'],
        });
        inviteDelivery = 'sent';
      } else {
        inviteDelivery = 'not_configured';
      }
    }

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_INTERVIEW_REQUEST',
      resourceId: updated.id,
      ipAddress,
      metadata: {
        reporterRunId: existing.reporterRun.id,
        inviteAction: 'sent',
        status: updated.status,
        inviteDelivery,
      },
    });

    return NextResponse.json({
      ...updated,
      inviteDelivery,
      inviteDeliveryMessage:
        inviteDelivery === 'sent'
          ? `Invite email sent to ${updated.inviteEmail}.`
          : inviteDelivery === 'not_configured'
            ? 'Invite state updated, but outbound email is not configured.'
            : 'Invite state updated. Share the copied session link manually.',
    });
  } catch (error) {
    console.error('Error inviting reporter interview:', error);
    return NextResponse.json(
      { error: 'Failed to invite reporter interview' },
      { status: 500 }
    );
  }
}
