import { ReporterDraftStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { createReporterClaimsFromSourcePacketAnalysis } from './claim-service';
import { generateReporterDraftWithValidation } from './draft-generator';
import { buildReporterSourcePacket } from './source-packet';
import { REPORTER_DRAFT_TYPE, type ReporterDraftTypeValue } from './types';
import { prepareReporterResearch } from './research-service';

export async function loadReporterRunForDraft(runId: string) {
  return db.reporterRun.findUnique({
    where: { id: runId },
    include: {
      sources: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      blockers: { where: { isResolved: false } },
      claims: {
        orderBy: [{ createdAt: 'desc' }],
      },
      interviewRequests: {
        include: {
          sessions: {
            where: { status: 'COMPLETED' },
            select: {
              id: true,
              reviewedAt: true,
            },
          },
        },
      },
    },
  });
}

export function assertReporterRunReadyForDraft(run: NonNullable<Awaited<ReturnType<typeof loadReporterRunForDraft>>>) {
  if (!run.sources.length) throw new Error('Add at least one source before preparing a draft.');
  if (run.blockers?.length) throw new Error('Resolve the open reporting issues before preparing a draft.');
  if (run.status === 'ARCHIVED') throw new Error('Reopen this story before preparing a draft.');
  const unreviewedInterviewSessions = run.interviewRequests.flatMap((interview) =>
    interview.sessions.filter((session) => !session.reviewedAt)
  );

  if (unreviewedInterviewSessions.length > 0) {
    throw new Error('Completed interview output must be reviewed before generating a reporter draft.');
  }
}

export async function createReporterDraftForRun(params: {
  run: NonNullable<Awaited<ReturnType<typeof loadReporterRunForDraft>>>;
  createdByUserId: string | null;
  draftType?: ReporterDraftTypeValue;
}) {
  assertReporterRunReadyForDraft(params.run);

  const packet = await prepareReporterResearch({
    packet: buildReporterSourcePacket(params.run, params.run.sources, params.run.claims),
    communityId: params.run.communityId,
    createdByUserId: params.createdByUserId,
    requireReady: params.draftType !== REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY,
  });
  const { draft, validation } = await generateReporterDraftWithValidation(packet, params.draftType);
  draft.generationNotes = [draft.generationNotes, packet.researchNotes].filter(Boolean).join('\n') || null;

  const persisted = await db.$transaction(async (tx) => {
    const createdDraft = await tx.reporterDraft.create({
      data: {
        reporterRunId: params.run.id,
        headline: draft.headline,
        dek: draft.dek,
        body: draft.body,
        draftType: draft.draftType,
        status: ReporterDraftStatus.GENERATED,
        modelProvider: draft.modelProvider,
        modelName: draft.modelName,
        generationNotes: draft.generationNotes,
        createdByUserId: params.createdByUserId,
      },
    });

    if (validation.issues.length > 0) {
      await tx.reporterValidationIssue.createMany({
        data: validation.issues.map((issue) => ({
          reporterRunId: params.run.id,
          reporterDraftId: createdDraft.id,
          code: issue.code,
          severity: issue.severity,
          message: issue.message,
          evidenceSpan: issue.evidenceSpan || null,
        })),
      });
    }

    await tx.reporterRun.update({
      where: { id: params.run.id },
      data: {
        status:
          draft.draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
            ? validation.hasCriticalIssues
              ? 'BLOCKED'
              : params.run.status
            : validation.hasCriticalIssues
              ? 'BLOCKED'
              : params.run.linkedArticleId
                ? 'CONVERTED_TO_ARTICLE'
                : 'DRAFT_CREATED',
      },
    });

    return createdDraft;
  });

  if (draft.draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY) {
    await createReporterClaimsFromSourcePacketAnalysis({
      reporterRunId: params.run.id,
      sources: params.run.sources,
      createdByUserId: params.createdByUserId,
    });
  }

  return {
    packet,
    draft,
    validation,
    persisted,
  };
}
