import type {
  ReporterInterviewRequest,
  ReporterInterviewTurn,
  ReporterSupportedLanguage,
} from '@prisma/client';

type InterviewRequestLike = Pick<
  ReporterInterviewRequest,
  'interviewType' | 'purpose' | 'mustLearn' | 'relationshipToStory' | 'intervieweeName'
>;

type InterviewTurnLike = Pick<ReporterInterviewTurn, 'questionKey' | 'answerText' | 'sortOrder'>;

export interface InterviewQuestion {
  key: string;
  text: string;
  language: ReporterSupportedLanguage;
}

export interface InterviewQuestionFramework {
  questions: InterviewQuestion[];
  requiredQuestionKeys: string[];
  minimumTurns: number;
  maxTurns: number;
}

function buildCorePrompt(
  intro: string,
  request: InterviewRequestLike,
  fallback: string
) {
  const emphasis = [request.purpose, request.mustLearn, request.relationshipToStory]
    .filter(Boolean)
    .join(' ');

  if (!emphasis) {
    return `${intro} ${fallback}`.trim();
  }

  return `${intro} ${emphasis}`.trim();
}

function templateQuestions(
  request: InterviewRequestLike,
  language: ReporterSupportedLanguage
): InterviewQuestion[] {
  const common: InterviewQuestion[] = [
    {
      key: 'opening_context',
      text: buildCorePrompt(
        `To start, please explain your connection to this story in your own words.`,
        request,
        `Tell me what role you have and why you are the right person to interview.`
      ),
      language,
    },
    {
      key: 'timeline',
      text: 'Please walk through the timeline in order, including when this started, what happened next, and what is still unresolved.',
      language,
    },
    {
      key: 'evidence',
      text: 'What did you directly see, hear, or document yourself, and what details are secondhand or still uncertain?',
      language,
    },
    {
      key: 'names_dates_locations',
      text: 'What names, dates, locations, documents, or other concrete details should we record accurately?',
      language,
    },
    {
      key: 'certainty_probe',
      text: 'Which parts of your account are firsthand and solid, and which parts are uncertain, incomplete, or based on what someone else told you?',
      language,
    },
    {
      key: 'verification_follow_up',
      text: 'Who else should we contact, what records should we check, or what official source could confirm or challenge your account?',
      language,
    },
    {
      key: 'follow_up',
      text: 'What important detail have we not covered yet, and who else should we speak with to verify or deepen this reporting?',
      language,
    },
  ];

  const byType: Record<string, InterviewQuestion[]> = {
    WITNESS: [
      {
        key: 'witness_scene',
        text: 'What did you personally observe at the scene, and where were you positioned when it happened?',
        language,
      },
    ],
    EVENT_ORGANIZER: [
      {
        key: 'organizer_basics',
        text: 'What is this event, who is organizing it, and what should the public understand first before attending or responding?',
        language,
      },
    ],
    ORG_REPRESENTATIVE: [
      {
        key: 'organization_role',
        text: 'What is your role in the organization, and what is the organization’s clearest explanation of this situation?',
        language,
      },
    ],
    PROFILE_SUBJECT: [
      {
        key: 'profile_background',
        text: `For readers meeting you for the first time, what background should they understand about your work, history, or ties to the community?`,
        language,
      },
    ],
    TIPSTER: [
      {
        key: 'tip_origin',
        text: 'How did you first learn about this tip, and what made you think it needed reporting attention?',
        language,
      },
    ],
  };

  const typeSpecific = byType[request.interviewType] || [];
  return [...typeSpecific, ...common];
}

export function getInterviewQuestionFramework(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
}): InterviewQuestionFramework {
  const questions = templateQuestions(params.request, params.language);
  const requiredQuestionKeys = questions
    .filter((question) => question.key !== 'follow_up')
    .map((question) => question.key);

  return {
    questions,
    requiredQuestionKeys,
    minimumTurns: Math.max(questions.length, 8),
    maxTurns: Math.max(questions.length + 3, 15),
  };
}

export function estimateInterviewQuestionCount(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
  answeredTurnsCount: number;
  isComplete: boolean;
}) {
  const framework = getInterviewQuestionFramework({
    request: params.request,
    language: params.language,
  });

  if (params.isComplete) {
    return Math.max(
      params.answeredTurnsCount,
      framework.requiredQuestionKeys.length,
      framework.minimumTurns
    );
  }

  return Math.min(
    framework.maxTurns,
    Math.max(framework.minimumTurns, params.answeredTurnsCount + 1)
  );
}

export function getInterviewQuestionPlan(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
  priorTurns?: InterviewTurnLike[];
}) {
  const framework = getInterviewQuestionFramework({
    request: params.request,
    language: params.language,
  });
  const questions = framework.questions;
  const nextIndex = params.priorTurns?.length ?? 0;
  const nextQuestion = questions[nextIndex] || null;

  return {
    questions,
    requiredQuestionKeys: framework.requiredQuestionKeys,
    minimumTurns: framework.minimumTurns,
    maxTurns: framework.maxTurns,
    nextIndex,
    nextQuestion,
    isComplete: nextIndex >= questions.length,
  };
}

export function buildTranscriptFromTurns(
  turns: Array<
    Pick<
      ReporterInterviewTurn,
      'questionText' | 'answerText' | 'sortOrder'
    >
  >
) {
  return turns
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (turn) =>
        `Q${turn.sortOrder + 1}: ${turn.questionText}\nA${turn.sortOrder + 1}: ${turn.answerText || ''}`.trim()
    )
    .join('\n\n');
}

export function buildEnglishSummaryFromTurns(
  turns: Array<Pick<ReporterInterviewTurn, 'answerText' | 'sortOrder'>>
) {
  const answered = turns
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((turn) => turn.answerText?.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (answered.length === 0) {
    return null;
  }

  return answered.join(' ');
}
