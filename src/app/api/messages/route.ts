import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areUsersBlocked } from '@/lib/blocks';
import { checkPermission } from '@/lib/permissions';
import { logMessageSent } from '@/lib/activity-log';
import { z } from 'zod';

const SendMessageSchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    recipientId: z.string().uuid().optional(),
    body: z.string().trim().min(1).max(5000).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    createOnly: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.createOnly || data.body || data.content), {
    message: 'Message body is required',
    path: ['body'],
  })
  .refine((data) => Boolean(data.conversationId || data.recipientId), {
    message: 'conversationId or recipientId is required',
    path: ['conversationId'],
  });

function getDisplayName(user: {
  firstName: string;
  lastName: string;
}) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const memberships = await db.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
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
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const conversations = await Promise.all(
      memberships.map(async ({ conversation, lastReadAt }) => {
        const otherParticipants = conversation.participants
          .map((participant) => participant.user)
          .filter((participant) => participant.id !== userId);
        const participant = otherParticipants[0] ?? conversation.participants[0]?.user;
        const latestMessage = conversation.messages[0] ?? null;

        if (!participant) {
          return null;
        }

        const usersBlocked = await areUsersBlocked(userId, participant.id);
        if (usersBlocked) {
          return null;
        }

        const unreadCount = await db.message.count({
          where: {
            conversationId: conversation.id,
            senderUserId: { not: userId },
            createdAt: { gt: lastReadAt },
          },
        });

        return {
          id: conversation.id,
          participant: {
            id: participant.id,
            firstName: participant.firstName,
            lastName: participant.lastName,
            displayName: getDisplayName(participant),
            profilePhotoUrl: participant.profilePhotoUrl,
            trustLevel: participant.trustLevel,
          },
          lastMessage: latestMessage?.body ?? '',
          lastMessageAt:
            latestMessage?.createdAt.toISOString() ??
            conversation.createdAt.toISOString(),
          lastMessageSenderName: latestMessage
            ? getDisplayName(latestMessage.sender)
            : null,
          unreadCount,
        };
      })
    );

    const visibleConversations = conversations
      .filter(
        (
          conversation
        ): conversation is NonNullable<typeof conversation> =>
          Boolean(conversation)
      )
      .filter((conversation) => {
        if (!search) return true;

        return (
          conversation.participant.displayName.toLowerCase().includes(search) ||
          conversation.lastMessage.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      });

    const total = visibleConversations.length;
    const paginated = visibleConversations.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      conversations: paginated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = SendMessageSchema.parse(body);
    const messageBody = validated.body ?? validated.content ?? null;
    const ipAddress = request.headers.get('x-client-ip');

    let conversationId = validated.conversationId;

    if (conversationId) {
      const participant = await db.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

      if (!participant) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    if (!conversationId && validated.recipientId) {
      if (validated.recipientId === userId) {
        return NextResponse.json(
          { error: 'Cannot message yourself' },
          { status: 400 }
        );
      }

      const recipient = await db.user.findUnique({
        where: { id: validated.recipientId },
        select: { id: true },
      });

      if (!recipient) {
        return NextResponse.json(
          { error: 'Recipient not found' },
          { status: 404 }
        );
      }

      const usersBlocked = await areUsersBlocked(userId, validated.recipientId);
      if (usersBlocked) {
        return NextResponse.json(
          { error: 'You cannot message this user' },
          { status: 403 }
        );
      }

      const existingConversation = await db.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: validated.recipientId } } },
          ],
        },
      });

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const now = new Date();
        const conversation = await db.conversation.create({
          data: {
            participants: {
              create: [
                { userId, lastReadAt: now },
                { userId: validated.recipientId, lastReadAt: now },
              ],
            },
          },
        });
        conversationId = conversation.id;
      }
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId or recipientId is required' },
        { status: 400 }
      );
    }

    if (validated.createOnly) {
      return NextResponse.json(
        {
          conversationId,
          created: true,
        },
        { status: 200 }
      );
    }

    const message = await db.message.create({
      data: {
        body: messageBody!,
        conversationId,
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
        conversationId,
        userId,
      },
      data: {
        lastReadAt: message.createdAt,
      },
    });

    await logMessageSent(userId, message.id, conversationId, ipAddress);

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
