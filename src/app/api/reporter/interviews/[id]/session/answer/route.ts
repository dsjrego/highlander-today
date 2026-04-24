import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canAccessReporterInterviewSession } from '@/lib/reporter/interview-access';
import { decideNextInterviewStep } from '@/lib/reporter/interview-agent';
import {
  buildInterviewFacts,
  buildInterviewSourcePayload,
} from '@/lib/reporter/interview-facts';
import { getReporterInterviewAccessState } from '@/lib/reporter/interview';
import { buildInterviewSafetyFlags } from '@/lib/reporter/interview-safety';
import {
  buildEnglishSummaryFromTurns,
  buildTranscriptFromTurns,
} from '@/lib/reporter/interview-templates';

const SubmitAnswerSchema = z.object({
  answerText: z.string().trim().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    const interview = await db.reporterInterviewRequest.findUnique({
      where: { id: params.id },
      include: {
        sessions: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            turns: {
              orderBy: [{ sortOrder: 'asc' }],
            },
          },
        },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (
      !canAccessReporterInterviewSession({
        userId,
        userEmail: user?.email,
        userRole,
        intervieweeUserId: interview.intervieweeUserId,
        inviteEmail: interview.inviteEmail,
      })
    ) {
      return NextResponse.json({ error: 'Interview access denied' }, { status: 403 });
    }

    if (!getReporterInterviewAccessState(interview.status).canOpenSession) {
      return NextResponse.json(
        { error: 'Interview is not ready to accept answers yet.' },
        { status: 403 }
      );
    }

    const session = interview.sessions.find((entry) => ['ACTIVE', 'NOT_STARTED'].includes(entry.status));

    if (!session) {
      return NextResponse.json({ error: 'No active interview session found' }, { status: 400 });
    }

    const payload = SubmitAnswerSchema.parse(await request.json());
    const currentTurn = session.turns[session.turns.length - 1];

    if (!currentTurn || currentTurn.answeredAt) {
      return NextResponse.json({ error: 'No open interview question found' }, { status: 400 });
    }

    const updatedTurn = await db.reporterInterviewTurn.update({
      where: { id: currentTurn.id },
      data: {
        answerText: payload.answerText,
        answerLanguage: session.language,
        answerTranslatedEnglish:
          session.language === 'ENGLISH' ? payload.answerText : null,
        answeredAt: new Date(),
      },
    });

    const answeredTurns = [...session.turns.slice(0, -1), updatedTurn];
    const decision = await decideNextInterviewStep({
      request: interview,
      language: session.language,
      turns: answeredTurns,
    });

    let nextSessionState: any = null;

    if (!decision.shouldComplete && decision.questionText) {
      const createdTurn = await db.reporterInterviewTurn.create({
        data: {
          interviewSessionId: session.id,
          sortOrder: answeredTurns.length,
          questionKey: decision.questionKey || 'follow_up',
          questionText: decision.questionText,
          questionLanguage: decision.language,
          askedAt: new Date(),
        },
      });

      nextSessionState = await db.reporterInterviewSession.update({
        where: { id: session.id },
        data: {
          status: 'ACTIVE',
          currentStep: answeredTurns.length,
          lastActivityAt: new Date(),
        },
        include: {
          turns: {
            orderBy: [{ sortOrder: 'asc' }],
          },
        },
      });

      return NextResponse.json({
        session: nextSessionState,
        currentQuestion: createdTurn
          ? {
              key: createdTurn.questionKey,
              text: createdTurn.questionText,
              language: createdTurn.questionLanguage,
            }
          : null,
        answeredCount: answeredTurns.length,
        questionCount: decision.questionCount,
        isComplete: false,
      });
    }

    const transcriptText = buildTranscriptFromTurns(answeredTurns);
    const englishSummary = buildEnglishSummaryFromTurns(answeredTurns);
    const factSeeds = buildInterviewFacts({
      session,
      turns: answeredTurns,
    });
    const safetyFlagSeeds = buildInterviewSafetyFlags({
      turns: answeredTurns,
      intervieweeName: interview.intervieweeName,
    });

    const existingRun = await db.reporterRun.findUnique({
      where: { id: interview.reporterRunId },
      select: { id: true, status: true, _count: { select: { sources: true } } },
    });

    const createdBlockers = existingRun
      ? await Promise.all(
          safetyFlagSeeds.map((flag) =>
            db.reporterBlocker.create({
              data: {
                reporterRunId: existingRun.id,
                code: flag.blockerCode,
                message: flag.blockerMessage,
              },
            })
          )
        )
      : [];

    nextSessionState = await db.reporterInterviewSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        currentStep: answeredTurns.length,
        lastActivityAt: new Date(),
        completedAt: new Date(),
        transcriptText,
        englishSummary,
        facts: factSeeds.length
          ? {
              deleteMany: {},
              create: factSeeds.map((fact) => ({
                factType: fact.factType,
                summary: fact.summary,
                detail: fact.detail || null,
                sourceLabel: fact.sourceLabel || null,
                sortOrder: fact.sortOrder,
                interviewTurnId: fact.interviewTurnId || null,
              })),
            }
          : undefined,
        safetyFlags: safetyFlagSeeds.length
          ? {
              deleteMany: {},
              create: safetyFlagSeeds.map((flag, index) => ({
                flagType: flag.flagType,
                headline: flag.headline,
                detail: flag.detail,
                evidenceSpan: flag.evidenceSpan,
                blockerId: createdBlockers[index]?.id || null,
                sortOrder: flag.sortOrder,
              })),
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
      where: { id: interview.id },
      data: {
        status: safetyFlagSeeds.length > 0 ? 'BLOCKED' : 'COMPLETED',
        completedAt: new Date(),
        interviewLanguage: session.language,
      },
    });

    if (existingRun) {
      const sourcePayload = buildInterviewSourcePayload({
        intervieweeName: interview.intervieweeName,
        interviewType: interview.interviewType,
        purpose: interview.purpose,
        transcriptText,
        englishSummary,
        factCount: factSeeds.length,
      });

      await db.reporterSource.create({
        data: {
          reporterRunId: existingRun.id,
          sourceType: sourcePayload.sourceType,
          title: sourcePayload.title,
          note: sourcePayload.note,
          excerpt: sourcePayload.excerpt,
          contentText: sourcePayload.contentText,
          reliabilityTier: sourcePayload.reliabilityTier,
          sortOrder: existingRun._count.sources,
          createdByUserId: userId,
        },
      });

      if (safetyFlagSeeds.length > 0 && existingRun.status !== 'BLOCKED') {
        await db.reporterRun.update({
          where: { id: existingRun.id },
          data: { status: 'BLOCKED' },
        });
      }
    }

    return NextResponse.json({
      session: nextSessionState,
      currentQuestion: null,
      answeredCount: answeredTurns.length,
      questionCount: decision.questionCount,
      isComplete: true,
      safetyFlags: nextSessionState.safetyFlags || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error submitting reporter interview answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit reporter interview answer' },
      { status: 500 }
    );
  }
}
