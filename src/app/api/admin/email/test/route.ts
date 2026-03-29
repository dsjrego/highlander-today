import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isEmailConfigured, sendTransactionalEmail } from '@/lib/email';

const TestEmailSchema = z.object({
  toEmail: z.string().trim().email(),
  toName: z.string().trim().max(120).optional(),
  subject: z.string().trim().min(1).max(200).optional(),
});

function getDisplayName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const actorEmail = request.headers.get('x-user-email') || '';
    const actorFirstName = request.headers.get('x-user-first-name');
    const actorLastName = request.headers.get('x-user-last-name');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Outbound email is not configured. Set BREVO_API_KEY, EMAIL_FROM, and EMAIL_FROM_NAME.' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const validated = TestEmailSchema.parse(body);
    const actorName = getDisplayName(actorFirstName, actorLastName) || 'Highlander Today admin';
    const subject = validated.subject || 'Highlander Today email test';

    await sendTransactionalEmail({
      to: {
        email: validated.toEmail,
        name: validated.toName,
      },
      subject,
      html: `
        <div style="font-family: Georgia, serif; line-height: 1.6; color: #172033;">
          <h1 style="margin-bottom: 12px;">Highlander Today Email Test</h1>
          <p>This is a transactional email test from Highlander Today.</p>
          <p>If you received this, the Brevo integration is working.</p>
          <p style="margin-top: 24px;">Sent by: ${actorName}</p>
          <p style="margin-top: 4px;">Reply address: ${actorEmail || process.env.EMAIL_FROM}</p>
        </div>
      `,
      text:
        `Highlander Today Email Test\n\n` +
        `This is a transactional email test from Highlander Today.\n` +
        `If you received this, the Brevo integration is working.\n\n` +
        `Sent by: ${actorName}\n` +
        `Reply address: ${actorEmail || process.env.EMAIL_FROM}`,
      replyTo: actorEmail
        ? {
            email: actorEmail,
            name: actorName,
          }
        : undefined,
      tags: ['system-test'],
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${validated.toEmail}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Error sending test email:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send test email',
      },
      { status: 500 },
    );
  }
}
