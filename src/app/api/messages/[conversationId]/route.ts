import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areUsersBlocked } from '@/lib/blocks';
import { checkPermission } from '@/lib/permissions';
import { logMessageSent } from '@/lib/activity-log';
import { z } from 'zod';

const SendMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(5000).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
  })
  .refine((data) => Boolean(data.body || data.content), {
    message: 'Message body is required',
    path: ['body'],
  });

function getDisplayName(user: {
  firstName: string;
  lastName: string;
}) {
  return `${user.firstName} ${user.lastName}`.trim();
}

async function getAuthorizedParticipant(
  conversationId: string,
  userId: string
) {
  return db.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });
}

async function getOtherParticipantId(conversationId: string, userId: string) {
  const otherParticipant = await db.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: { not: userId },
    },
    select: {
      userId: true,
    },
  });

  return otherParticipant?.userId ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'messages:access')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const participant = await getAuthorizedParticipant(params.conversationId, userId);

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const otherParticipantId = await getOtherParticipantId(
      params.conversationId,
      userId
    );
    if (!otherParticipantId) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const usersBlocked = await areUsersBlocked(userId, otherParticipantId);
    if (usersBlocked) {
      return NextResponse.json(
        { error: 'This conversation is unavailable because one of you has blocked the other' },
        { status: 403 }
      );
    }

    await db.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: params.conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    const conversation = await db.conversation.findUnique({
      where: { id: params.conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
                trustLevel: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10), 1),
      100
    );

    const total = await db.message.count({
      where: { conversationId: params.conversationId },
    });

    const messages = await db.message.findMany({
      where: { conversationId: params.conversationId },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const otherParticipant =
      conversation.participants
        .map((membership) => membership.user)
        .find((user) => user.id !== userId) ??
      conversation.participants[0]?.user;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        participant: otherParticipant
          ? {
              id: otherParticipant.id,
              firstName: otherParticipant.firstName,
              lastName: otherParticipant.lastName,
              displayName: getDisplayName(otherParticipant),
              profilePhotoUrl: otherParticipant.profilePhotoUrl,
              trustLevel: otherParticipant.trustLevel,
            }
          : null,
      },
      currentUserId: userId,
      messages: messages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        conversationId: message.conversationId,
        sender: {
          id: message.sender.id,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          displayName: getDisplayName(message.sender),
          profilePhotoUrl: message.sender.profilePhotoUrl,
          trustLevel: message.sender.trustLevel,
        },
        attachments: message.attachments,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'messages:send')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const participant = await getAuthorizedParticipant(params.conversationId, userId);

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const otherParticipantId = await getOtherParticipantId(
      params.conversationId,
      userId
    );
    if (!otherParticipantId) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const usersBlocked = await areUsersBlocked(userId, otherParticipantId);
    if (usersBlocked) {
      return NextResponse.json(
        { error: 'You cannot send messages in this conversation anymore' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = SendMessageSchema.parse(body);
    const messageBody = validated.body ?? validated.content!;
    const ipAddress = request.headers.get('x-client-ip');

    const message = await db.message.create({
      data: {
        body: messageBody,
        conversationId: params.conversationId,
        senderUserId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
        attachments: true,
      },
    });

    await db.conversationParticipant.updateMany({
      where: {
        conversationId: params.conversationId,
        userId,
      },
      data: {
        lastReadAt: message.createdAt,
      },
    });

    await logMessageSent(userId, message.id, params.conversationId, ipAddress);

    return NextResponse.json(
      {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        conversationId: message.conversationId,
        sender: {
          id: message.sender.id,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          displayName: getDisplayName(message.sender),
          profilePhotoUrl: message.sender.profilePhotoUrl,
          trustLevel: message.sender.trustLevel,
        },
        attachments: message.attachments,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
