import type {
  ReporterInterviewFactType,
  ReporterInterviewSession,
  ReporterInterviewTurn,
} from '@prisma/client';

interface InterviewFactSeed {
  factType: ReporterInterviewFactType;
  summary: string;
  detail?: string | null;
  sourceLabel?: string | null;
  sortOrder: number;
  interviewTurnId?: string | null;
}

function firstSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/(.+?[.!?])(\s|$)/);
  return (match?.[1] || trimmed).slice(0, 280).trim();
}

function detectUncertainty(value: string) {
  return /\b(maybe|might|i think|i believe|not sure|unclear|heard|told|rumor|seems like)\b/i.test(
    value
  );
}

export function buildInterviewFacts(params: {
  session: Pick<ReporterInterviewSession, 'id' | 'language'>;
  turns: Array<
    Pick<
      ReporterInterviewTurn,
      'id' | 'sortOrder' | 'questionKey' | 'questionText' | 'answerText'
    >
  >;
}) {
  const facts: InterviewFactSeed[] = [];

  params.turns.forEach((turn) => {
    const answerText = turn.answerText?.trim();
    if (!answerText) {
      return;
    }

    const quote = firstSentence(answerText);
    const baseSourceLabel = `Q${turn.sortOrder + 1}`;

    if (turn.questionKey === 'timeline') {
      facts.push({
        factType: 'CHRONOLOGY_ITEM',
        summary: quote || answerText.slice(0, 280),
        detail: answerText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    } else if (turn.questionKey === 'evidence' || turn.questionKey === 'witness_scene') {
      facts.push({
        factType: detectUncertainty(answerText) ? 'DISPUTED_CLAIM' : 'DIRECT_OBSERVATION',
        summary: quote || answerText.slice(0, 280),
        detail: answerText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    } else if (turn.questionKey === 'follow_up') {
      facts.push({
        factType: 'FOLLOW_UP_REQUIREMENT',
        summary: quote || answerText.slice(0, 280),
        detail: answerText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    } else if (turn.questionKey === 'names_dates_locations') {
      facts.push({
        factType: 'NAMED_ENTITY',
        summary: quote || answerText.slice(0, 280),
        detail: answerText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    } else {
      facts.push({
        factType: detectUncertainty(answerText) ? 'ATTRIBUTED_CLAIM' : 'ATTRIBUTED_CLAIM',
        summary: quote || answerText.slice(0, 280),
        detail: answerText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    }

    if (quote) {
      facts.push({
        factType: 'QUOTED_STATEMENT',
        summary: quote,
        detail: answerText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    }

    if (detectUncertainty(answerText) && turn.questionKey !== 'follow_up') {
      facts.push({
        factType: 'FOLLOW_UP_REQUIREMENT',
        summary: `Verify or clarify: ${quote || answerText.slice(0, 180)}`,
        detail: turn.questionText,
        sourceLabel: baseSourceLabel,
        sortOrder: facts.length,
        interviewTurnId: turn.id,
      });
    }
  });

  return facts;
}

export function buildInterviewSourcePayload(params: {
  intervieweeName: string;
  interviewType: string;
  purpose: string;
  transcriptText: string;
  englishSummary: string | null;
  factCount: number;
}) {
  return {
    sourceType: 'INTERVIEW_NOTE' as const,
    title: `Interview: ${params.intervieweeName}`,
    note: [
      `Interview type: ${params.interviewType}`,
      `Purpose: ${params.purpose}`,
      params.englishSummary ? `Summary: ${params.englishSummary}` : null,
      `Structured fact count: ${params.factCount}`,
    ]
      .filter(Boolean)
      .join('\n'),
    excerpt: params.englishSummary,
    contentText: params.transcriptText,
    reliabilityTier: 'PRIMARY' as const,
  };
}
