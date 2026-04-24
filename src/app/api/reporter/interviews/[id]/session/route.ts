import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ReporterSupportedLanguage } from '@prisma/client';
import { db } from '@/lib/db';
import { canAccessReporterInterviewSession } from '@/lib/reporter/interview-access';
import { getReporterInterviewAccessState } from '@/lib/reporter/interview';
import { decideNextInterviewStep } from '@/lib/reporter/interview-agent';
import { estimateInterviewQuestionCount } from '@/lib/reporter/interview-templates';

const StartInterviewSessionSchema = z.object({
  language: z.nativeEnum(ReporterSupportedLanguage).optional(),
});

async function getAuthorizedInterview(request: NextRequest, interviewId: string) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  const interview = await db.reporterInterviewRequest.findUnique({
    where: { id: interviewId },
    include: {
      interviewee: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      reporterRun: {
        select: { id: true, topic: true, title: true },
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

  if (!interview) {
    return { error: NextResponse.json({ error: 'Interview not found' }, { status: 404 }) };
  }

  const user =
    userId
      ? await db.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        })
      : null;

  if (
    !canAccessReporterInterviewSession({
      userId,
      userEmail: user?.email,
      userRole,
      intervieweeUserId: interview.intervieweeUserId,
      inviteEmail: interview.inviteEmail,
    })
  ) {
    return {
      error: NextResponse.json({ error: 'Interview access denied' }, { status: 403 }),
    };
  }

  const accessState = getReporterInterviewAccessState(interview.status);
  if (!accessState.canOpenSession) {
    return {
      error: NextResponse.json(
        { error: 'Interview is not ready to open yet.' },
        { status: 403 }
      ),
    };
  }

  return {
    interview,
    userId,
  };
}

function getOpenTurn(session: { turns?: Array<any> } | null | undefined) {
  if (!session?.turns?.length) {
    return null;
  }

  return session.turns.find((turn) => !turn.answeredAt) || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getAuthorizedInterview(request, params.id);
    if ('error' in result) {
      return result.error;
    }

    const activeSession =
      result.interview.sessions.find((session) =>
        ['ACTIVE', 'NOT_STARTED'].includes(session.status)
      ) || result.interview.sessions[0] || null;
    const language =
      activeSession?.language ||
      result.interview.interviewLanguage ||
      result.interview.suggestedLanguage;
    const currentQuestionTurn = getOpenTurn(activeSession);
    const answeredCount =
      activeSession?.turns.filter((turn) => Boolean(turn.answeredAt)).length || 0;
    const isComplete = Boolean(activeSession?.status === 'COMPLETED');

    return NextResponse.json({
      interview: result.interview,
      session: activeSession,
      currentQuestion: currentQuestionTurn
        ? {
            key: currentQuestionTurn.questionKey,
            text: currentQuestionTurn.questionText,
            language: currentQuestionTurn.questionLanguage,
          }
        : null,
      questionCount: estimateInterviewQuestionCount({
        request: result.interview,
        language,
        answeredTurnsCount: answeredCount,
        isComplete,
      }),
      answeredCount,
      isComplete,
    });
  } catch (error) {
    console.error('Error fetching reporter interview session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporter interview session' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getAuthorizedInterview(request, params.id);
    if ('error' in result) {
      return result.error;
    }

    const existingActiveSession = result.interview.sessions.find((session) =>
      ['ACTIVE', 'NOT_STARTED'].includes(session.status)
    );

    if (existingActiveSession) {
      const language =
        existingActiveSession.language ||
        result.interview.interviewLanguage ||
        result.interview.suggestedLanguage;
      const currentQuestionTurn = getOpenTurn(existingActiveSession);
      const answeredCount = existingActiveSession.turns.filter((turn) =>
        Boolean(turn.answeredAt)
      ).length;

      return NextResponse.json({
        interview: result.interview,
        session: existingActiveSession,
        currentQuestion: currentQuestionTurn
          ? {
              key: currentQuestionTurn.questionKey,
              text: currentQuestionTurn.questionText,
              language: currentQuestionTurn.questionLanguage,
            }
          : null,
        questionCount: estimateInterviewQuestionCount({
          request: result.interview,
          language,
          answeredTurnsCount: answeredCount,
          isComplete: existingActiveSession.status === 'COMPLETED',
        }),
        answeredCount,
        isComplete: existingActiveSession.status === 'COMPLETED',
      });
    }

    const body = await request.json().catch(() => ({}));
    const payload = StartInterviewSessionSchema.parse(body);
    const language =
      payload.language ||
      result.interview.interviewLanguage ||
      result.interview.nativeLanguage ||
      result.interview.suggestedLanguage;
    const decision = await decideNextInterviewStep({
      request: result.interview,
      language,
      turns: [],
    });

    const session = await db.reporterInterviewSession.create({
      data: {
        interviewRequestId: result.interview.id,
        status: 'ACTIVE',
        language,
        currentStep: 0,
        questionTemplateKey: result.interview.interviewType,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        turns: decision.questionText
          ? {
              create: {
                sortOrder: 0,
                questionKey: decision.questionKey || 'opening_context',
                questionText: decision.questionText,
                questionLanguage: decision.language,
                askedAt: new Date(),
              },
            }
          : undefined,
      },
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
    });

    await db.reporterInterviewRequest.update({
      where: { id: result.interview.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        interviewLanguage: language,
      },
    });

    return NextResponse.json({
      interview: {
        ...result.interview,
        status: 'IN_PROGRESS',
        interviewLanguage: language,
      },
      session,
      currentQuestion: decision.questionText
        ? {
            key: decision.questionKey,
            text: decision.questionText,
            language: decision.language,
          }
        : null,
      questionCount: decision.questionCount,
      answeredCount: 0,
      isComplete: decision.shouldComplete,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error starting reporter interview session:', error);
    return NextResponse.json(
      { error: 'Failed to start reporter interview session' },
      { status: 500 }
    );
  }
}
