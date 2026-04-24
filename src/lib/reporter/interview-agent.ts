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

interface ParsedDecision {
  shouldComplete?: boolean;
  questionKey?: string | null;
  questionText?: string | null;
  rationale?: string | null;
}

function getProvider() {
  return (process.env.REPORTER_MODEL_PROVIDER || 'anthropic').toLowerCase();
}

function getModel(provider: string) {
  if (provider === 'openai') {
    return process.env.REPORTER_MODEL_NAME || 'gpt-5.4-mini';
  }

  return process.env.REPORTER_MODEL_NAME || 'claude-haiku-4-5';
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

function parseEmbeddedJson(text: string): ParsedDecision {
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

function buildSystemPrompt() {
  return [
    'You are the Highlander Today interviewer agent.',
    'Act like a careful local reporter conducting a one-question-at-a-time interview.',
    'Be conversational and specific, not robotic or generic.',
    'Use the prior answers to ask the most useful next follow-up question.',
    'You are expected to conduct a deeper reporting interview, not a quick intake form.',
    'Do not ask multiple unrelated questions at once.',
    'Do not invent facts or assume details not stated by the source.',
    'Keep each question concise and understandable to an ordinary community member.',
    'Probe chronology, direct observation, uncertainty, missing concrete details, and verification paths before ending.',
    'The interview should usually continue well past the first surface-level answers.',
    'Only end the interview when the required topics are covered, the minimum depth has been reached, and no high-value follow-up remains, or when the turn cap has been reached.',
    'Return valid JSON only with keys: shouldComplete, questionKey, questionText, rationale.',
  ].join(' ');
}

function buildUserPrompt(params: {
  request: InterviewRequestLike;
  language: ReporterSupportedLanguage;
  turns: InterviewTurnLike[];
  outstandingRequired: string[];
  coveredRequired: string[];
  minimumTurns: number;
  maxTurns: number;
}) {
  const transcript = params.turns.length
    ? params.turns
        .map(
          (turn) =>
            `Q${turn.sortOrder + 1} [${turn.questionKey}]: ${turn.questionText}\nA${turn.sortOrder + 1}: ${turn.answerText || ''}`
        )
        .join('\n\n')
    : 'No questions asked yet.';

  return [
    'Decide the next step for this interview.',
    'Return JSON only.',
    `Interview type: ${params.request.interviewType}`,
    `Interviewee: ${params.request.intervieweeName}`,
    `Interview language: ${params.language}`,
    `Purpose: ${params.request.purpose}`,
    params.request.mustLearn ? `Must learn: ${params.request.mustLearn}` : null,
    params.request.relationshipToStory
      ? `Relationship to story: ${params.request.relationshipToStory}`
      : null,
    params.request.editorBrief ? `Editor brief: ${params.request.editorBrief}` : null,
    params.request.knownContext ? `Known context: ${params.request.knownContext}` : null,
    params.request.sensitivityNotes
      ? `Sensitivity notes: ${params.request.sensitivityNotes}`
      : null,
    `Covered required topics: ${params.coveredRequired.join(', ') || 'none yet'}`,
    `Outstanding required topics: ${params.outstandingRequired.join(', ') || 'none'}`,
    `Answered turns so far: ${params.turns.length}`,
    `Minimum turns before completion: ${params.minimumTurns}`,
    `Turn cap: ${params.maxTurns}`,
    'If shouldComplete is false, questionText must contain exactly one natural next question.',
    'Prefer a direct follow-up tied to what the person just said.',
    'Use questionKey from the outstanding required topic when possible. If all required topics are covered but deeper clarification is still needed, use follow_up.',
    'Before completion, make sure you have probed uncertainty, missing specifics, and who or what could verify the account.',
    'If the source gives a vague answer, ask for examples, timing, names, places, or documents rather than moving on.',
    'Do not ask for sensitive personal data unless necessary to verify the story.',
    '',
    'Interview transcript so far:',
    transcript,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

async function requestOpenAIInterviewDecision(prompt: string) {
  const model = getModel('openai');
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
          content: [{ type: 'input_text', text: buildSystemPrompt() }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
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

  return parseEmbeddedJson(rawText);
}

async function requestAnthropicInterviewDecision(prompt: string) {
  const model = getModel('anthropic');
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
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
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

  return parseEmbeddedJson(rawText);
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
}): Promise<InterviewStepDecision> {
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
    return buildFallbackDecision({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      requiredQuestionCount: framework.requiredQuestionKeys.length,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });
  }

  try {
    const prompt = buildUserPrompt({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      coveredRequired,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });

    const parsed =
      getProvider() === 'openai'
        ? await requestOpenAIInterviewDecision(prompt)
        : await requestAnthropicInterviewDecision(prompt);

    const wantsToComplete = Boolean(parsed.shouldComplete);
    const canComplete =
      outstandingRequired.length === 0 &&
      params.turns.length >= framework.minimumTurns;
    const shouldComplete = params.turns.length >= framework.maxTurns || (wantsToComplete && canComplete);

    if (shouldComplete) {
      return {
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

    return {
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
  } catch (error) {
    console.error('Reporter interview model decision failed; using deterministic fallback.', error);
    return buildFallbackDecision({
      request: params.request,
      language: params.language,
      turns: params.turns,
      outstandingRequired,
      requiredQuestionCount: framework.requiredQuestionKeys.length,
      minimumTurns: framework.minimumTurns,
      maxTurns: framework.maxTurns,
    });
  }
}
