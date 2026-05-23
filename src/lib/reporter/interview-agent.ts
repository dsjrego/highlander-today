import type {
  ReporterInterviewRequest,
  ReporterInterviewTurn,
  ReporterSupportedLanguage,
} from '@prisma/client';
import {
  estimateInterviewQuestionCount,
  getInterviewQuestionFramework,
  getInterviewQuestionPlan,
} from './interview-templates';
import {
  buildPromptTraceMetadata,
  hashReporterJson,
  loadReporterPromptTemplate,
  renderReporterPromptTemplate,
} from './prompt-loader';
import { createFailedReporterAgentTrace, createSuccessfulReporterAgentTrace } from './agent-trace-service';
import { InterviewStepDecisionSchema } from './reporter-agent-schemas';
import {
  assertReporterAgentActionAllowed,
  REPORTER_AGENT_ACTION,
  REPORTER_AGENT_ACTOR,
} from './reporter-agent-permissions';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

type InterviewRequestLike = Pick<
  ReporterInterviewRequest,
  | 'interviewType'
  | 'purpose'
  | 'mustLearn'
  | 'relationshipToStory'
  | 'intervieweeName'
  | 'editorBrief'
  | 'knownContext'
  | 'sensitivityNotes'
>;

type InterviewTurnLike = Pick<
  ReporterInterviewTurn,
  'sortOrder' | 'questionKey' | 'questionText' | 'answerText'
>;

export interface InterviewStepDecision {
  questionKey: string | null;
  questionText: string | null;
  language: ReporterSupportedLanguage;
  shouldComplete: boolean;
  source: 'model' | 'fallback';
  questionCount: number;
  rationale: string | null;
}

function getProvider() {
  return (process.env.REPORTER_MODEL_PROVIDER || 'anthropic').toLowerCase();
}

function getModel(provider: string) {
  if (provider === 'openai') {
    return process.env.REPORTER_MODEL_NAME || 'gpt-5.4-mini';
  }

  return process.env.REPORTER_MODEL_NAME || 'claude-sonnet-4-6';
}

function hasConfiguredInterviewerProvider() {
  const provider = getProvider();
  if (provider === 'openai') {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function answeredQuestionKeys(turns: InterviewTurnLike[]) {
  return turns
    .filter((turn) => turn.answerText?.trim())
    .map((turn) => turn.questionKey);
}

function parseEmbeddedJson(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not contain a JSON object');
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

function extractTextFromOpenAIResponse(data: any) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return null;
  }

  return data.output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((block: any) => block?.type === 'output_text' && typeof block?.text === 'string')
    .map((block: any) => block.text)
    .join('\n')
    .trim();
}

function extractTextFromAnthropicResponse(data: any) {
  if (!Array.isArray(data?.content)) {
    return null;
  }

  return data.content
    .filter((block: any) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block: any) => block.text)
    .join('\n')
    .trim();
}

async function buildInterviewPromptBundle(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
  turns: InterviewTurnLike[];
  outstandingRequired: string[];
  coveredRequired: string[];
  minimumTurns: number;
  maxTurns: number;
}) {
  const systemTemplate = await loadReporterPromptTemplate('interview-next-step.system');
  const userTemplate = await loadReporterPromptTemplate('interview-next-step.user');
  const transcript = params.turns.length
    ? params.turns
        .map(
          (turn) =>
            `Q${turn.sortOrder + 1} [${turn.questionKey}]: ${turn.questionText}\nA${turn.sortOrder + 1}: ${turn.answerText || ''}`
        )
        .join('\n\n')
    : 'No questions asked yet.';

  const systemPrompt = renderReporterPromptTemplate(systemTemplate, {});
  const userPrompt = renderReporterPromptTemplate(userTemplate, {
    interviewType: params.request.interviewType,
    intervieweeName: params.request.intervieweeName,
    language: params.language,
    purpose: params.request.purpose,
    mustLearnBlock: params.request.mustLearn ? `Must learn: ${params.request.mustLearn}` : '',
    relationshipBlock: params.request.relationshipToStory
      ? `Relationship to story: ${params.request.relationshipToStory}`
      : '',
    editorBriefBlock: params.request.editorBrief
      ? `Editor brief: ${params.request.editorBrief}`
      : '',
    knownContextBlock: params.request.knownContext
      ? `Known context: ${params.request.knownContext}`
      : '',
    sensitivityNotesBlock: params.request.sensitivityNotes
      ? `Sensitivity notes: ${params.request.sensitivityNotes}`
      : '',
    coveredRequired: params.coveredRequired.join(', ') || 'none yet',
    outstandingRequired: params.outstandingRequired.join(', ') || 'none',
    answeredTurnsCount: params.turns.length,
    minimumTurns: params.minimumTurns,
    maxTurns: params.maxTurns,
    transcript,
  });

  return {
    systemPrompt,
    userPrompt,
    inputSnapshotJson: {
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired: params.outstandingRequired,
      coveredRequired: params.coveredRequired,
      minimumTurns: params.minimumTurns,
      maxTurns: params.maxTurns,
    },
    traceMetadata: buildPromptTraceMetadata({
      promptFamilyKey: 'interview-next-step',
      templates: [systemTemplate, userTemplate],
      renderedPrompts: [systemPrompt, userPrompt],
    }),
  };
}

async function requestOpenAIInterviewDecision(params: {
  systemPrompt: string;
  userPrompt: string;
}) {
  const model = getModel('openai');
  const startedAt = Date.now();
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_output_tokens: 350,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: params.systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: params.userPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `OpenAI interview request failed with status ${response.status}${
        errorText ? `: ${errorText.slice(0, 300)}` : ''
      }`
    );
  }

  const data = await response.json();
  const rawText = extractTextFromOpenAIResponse(data);

  if (!rawText) {
    throw new Error('OpenAI interview response did not include text content');
  }

  const parsed = InterviewStepDecisionSchema.parse(parseEmbeddedJson(rawText));

  return {
    parsed,
    model,
    rawText,
    latencyMs: Date.now() - startedAt,
  };
}

async function requestAnthropicInterviewDecision(params: {
  systemPrompt: string;
  userPrompt: string;
}) {
  const model = getModel('anthropic');
  const startedAt = Date.now();
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 350,
      temperature: 0.4,
      system: params.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: params.userPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Anthropic interview request failed with status ${response.status}${
        errorText ? `: ${errorText.slice(0, 300)}` : ''
      }`
    );
  }

  const data = await response.json();
  const rawText = extractTextFromAnthropicResponse(data);

  if (!rawText) {
    throw new Error('Anthropic interview response did not include text content');
  }

  const parsed = InterviewStepDecisionSchema.parse(parseEmbeddedJson(rawText));

  return {
    parsed,
    model,
    rawText,
    latencyMs: Date.now() - startedAt,
  };
}

function buildFallbackDecision(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
  turns: InterviewTurnLike[];
  outstandingRequired: string[];
  requiredQuestionCount: number;
  minimumTurns: number;
  maxTurns: number;
}): InterviewStepDecision {
  const plan = getInterviewQuestionPlan({
    request: params.request,
    language: params.language,
    priorTurns: params.turns,
  });

  const shouldComplete =
    (params.outstandingRequired.length === 0 && params.turns.length >= params.minimumTurns) ||
    params.turns.length >= params.maxTurns ||
    !plan.nextQuestion;

  if (shouldComplete) {
    return {
      questionKey: null,
      questionText: null,
      language: params.language,
      shouldComplete: true,
      source: 'fallback',
      questionCount: estimateInterviewQuestionCount({
        request: params.request,
        language: params.language,
        answeredTurnsCount: params.turns.length,
        isComplete: true,
      }),
      rationale: 'Deterministic fallback decided the interview has enough coverage.',
    };
  }

  return {
    questionKey: plan.nextQuestion?.key || 'follow_up',
    questionText: plan.nextQuestion?.text || 'What else should we understand before we end this interview?',
    language: params.language,
    shouldComplete: false,
    source: 'fallback',
    questionCount: estimateInterviewQuestionCount({
      request: params.request,
      language: params.language,
      answeredTurnsCount: params.turns.length,
      isComplete: false,
    }),
    rationale: `Deterministic fallback selected the next question from the ${params.requiredQuestionCount}-topic framework.`,
  };
}

export async function decideNextInterviewStep(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
  turns: InterviewTurnLike[];
  reporterRunId?: string | null;
}): Promise<InterviewStepDecision> {
  if (params.reporterRunId) {
    await assertReporterAgentActionAllowed({
      actor: REPORTER_AGENT_ACTOR.INTERVIEW_AGENT,
      action: REPORTER_AGENT_ACTION.READ_REPORTER_RUN,
      reporterRunId: params.reporterRunId,
    });
    await assertReporterAgentActionAllowed({
      actor: REPORTER_AGENT_ACTOR.INTERVIEW_AGENT,
      action: REPORTER_AGENT_ACTION.CREATE_INTERVIEW_TURN,
      reporterRunId: params.reporterRunId,
    });
  }

  const framework = getInterviewQuestionFramework({
    request: params.request,
    language: params.language,
  });
  const coveredRequired = answeredQuestionKeys(params.turns).filter((key) =>
    framework.requiredQuestionKeys.includes(key)
  );
  const outstandingRequired = framework.requiredQuestionKeys.filter(
    (key) => !coveredRequired.includes(key)
  );

  if (!hasConfiguredInterviewerProvider()) {
    const fallbackDecision = buildFallbackDecision({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      requiredQuestionCount: framework.requiredQuestionKeys.length,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });
    if (params.reporterRunId) {
      await createSuccessfulReporterAgentTrace({
        reporterRunId: params.reporterRunId,
        traceType: 'INTERVIEW_NEXT_STEP',
        provider: 'fallback',
        modelName: null,
        parsedOutputJson: fallbackDecision,
        validationJson: { reason: 'provider_not_configured' },
      });
    }
    return fallbackDecision;
  }

  try {
    const promptBundle = await buildInterviewPromptBundle({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      coveredRequired,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });

    const response =
      getProvider() === 'openai'
        ? await requestOpenAIInterviewDecision({
            systemPrompt: promptBundle.systemPrompt,
            userPrompt: promptBundle.userPrompt,
          })
        : await requestAnthropicInterviewDecision({
            systemPrompt: promptBundle.systemPrompt,
            userPrompt: promptBundle.userPrompt,
          });
    const parsed = response.parsed;

    const wantsToComplete = Boolean(parsed.shouldComplete);
    const canComplete =
      outstandingRequired.length === 0 &&
      params.turns.length >= framework.minimumTurns;
    const shouldComplete = params.turns.length >= framework.maxTurns || (wantsToComplete && canComplete);

    if (shouldComplete) {
      const completionDecision: InterviewStepDecision = {
        questionKey: null,
        questionText: null,
        language: params.language,
        shouldComplete: true,
        source: 'model',
        questionCount: estimateInterviewQuestionCount({
          request: params.request,
          language: params.language,
          answeredTurnsCount: params.turns.length,
          isComplete: true,
        }),
        rationale:
          typeof parsed.rationale === 'string' && parsed.rationale.trim()
            ? parsed.rationale.trim()
            : 'Model decided that the interview has enough coverage to conclude.',
      };
      if (params.reporterRunId) {
        await createSuccessfulReporterAgentTrace({
          reporterRunId: params.reporterRunId,
          traceType: 'INTERVIEW_NEXT_STEP',
          provider: getProvider(),
          modelName: response.model,
          ...promptBundle.traceMetadata,
          inputHash: hashReporterJson(promptBundle.inputSnapshotJson),
          inputSnapshotJson: promptBundle.inputSnapshotJson,
          rawOutputText: response.rawText,
          parsedOutputJson: parsed,
          latencyMs: response.latencyMs,
        });
      }
      return completionDecision;
    }

    const fallback = buildFallbackDecision({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      requiredQuestionCount: framework.requiredQuestionKeys.length,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });

    const questionText =
      typeof parsed.questionText === 'string' && parsed.questionText.trim()
        ? parsed.questionText.trim()
        : fallback.questionText;
    const requestedKey =
      typeof parsed.questionKey === 'string' && parsed.questionKey.trim()
        ? parsed.questionKey.trim()
        : null;
    const normalizedKey =
      requestedKey &&
      (framework.requiredQuestionKeys.includes(requestedKey) || requestedKey === 'follow_up')
        ? requestedKey
        : outstandingRequired[0] || fallback.questionKey || 'follow_up';

    const nextDecision: InterviewStepDecision = {
      questionKey: normalizedKey,
      questionText,
      language: params.language,
      shouldComplete: false,
      source: 'model',
      questionCount: estimateInterviewQuestionCount({
        request: params.request,
        language: params.language,
        answeredTurnsCount: params.turns.length,
        isComplete: false,
      }),
      rationale:
        typeof parsed.rationale === 'string' && parsed.rationale.trim()
          ? parsed.rationale.trim()
          : 'Model selected the next follow-up question.',
    };
    if (params.reporterRunId) {
      await createSuccessfulReporterAgentTrace({
        reporterRunId: params.reporterRunId,
        traceType: 'INTERVIEW_NEXT_STEP',
        provider: getProvider(),
        modelName: response.model,
        ...promptBundle.traceMetadata,
        inputHash: hashReporterJson(promptBundle.inputSnapshotJson),
        inputSnapshotJson: promptBundle.inputSnapshotJson,
        rawOutputText: response.rawText,
        parsedOutputJson: parsed,
        validationJson: { normalizedKey },
        latencyMs: response.latencyMs,
      });
    }
    return nextDecision;
  } catch (error) {
    console.error('Reporter interview model decision failed; using deterministic fallback.', error);
    if (params.reporterRunId) {
      await createFailedReporterAgentTrace({
        reporterRunId: params.reporterRunId,
        traceType: 'INTERVIEW_NEXT_STEP',
        provider: hasConfiguredInterviewerProvider() ? getProvider() : 'fallback',
        modelName: hasConfiguredInterviewerProvider() ? getModel(getProvider()) : null,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Reporter interview model decision failed.',
      });
    }
    const fallbackDecision = buildFallbackDecision({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      requiredQuestionCount: framework.requiredQuestionKeys.length,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });
    if (params.reporterRunId) {
      await createSuccessfulReporterAgentTrace({
        reporterRunId: params.reporterRunId,
        traceType: 'INTERVIEW_NEXT_STEP',
        provider: 'fallback',
        modelName: null,
        parsedOutputJson: fallbackDecision,
        validationJson: {
          reason: error instanceof Error ? error.message : 'model_failure',
        },
      });
    }
    return fallbackDecision;
  }
}
