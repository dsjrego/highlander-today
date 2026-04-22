import type { ReporterProviderAdapter } from './provider-adapter';
import {
  REPORTER_DRAFT_TYPE,
  type ReporterDraftGenerationInput,
  type ReporterProviderDraftResult,
} from './types';
import { buildFallbackDraft } from './provider-adapter';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

function buildSourcePacketPrompt(input: ReporterDraftGenerationInput) {
  const sources = input.packet.sources
    .map((source, index) => {
      const parts = [
        `Source ${index + 1}`,
        `type=${source.sourceType}`,
        `reliability=${source.reliabilityTier}`,
        source.title ? `title=${source.title}` : null,
        source.url ? `url=${source.url}` : null,
        source.publisher ? `publisher=${source.publisher}` : null,
        source.author ? `author=${source.author}` : null,
        source.excerpt ? `excerpt=${source.excerpt}` : null,
        source.note ? `note=${source.note}` : null,
        source.contentText ? `content=${source.contentText}` : null,
      ].filter(Boolean);

      return parts.join('\n');
    })
    .join('\n\n');

  return [
    `Topic: ${input.packet.topic}`,
    input.packet.title ? `Title hint: ${input.packet.title}` : null,
    input.packet.subjectName ? `Subject: ${input.packet.subjectName}` : null,
    input.packet.requestSummary ? `Request summary: ${input.packet.requestSummary}` : null,
    input.packet.editorNotes ? `Editor notes: ${input.packet.editorNotes}` : null,
    '',
    'Sources:',
    sources || 'No sources provided.',
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

function buildAnthropicUserPrompt(input: ReporterDraftGenerationInput, draftType: string) {
  if (draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY) {
    return [
      'Generate Reporter Agent analysis from this source packet.',
      'Return JSON only.',
      'The body must use exactly these section headings in this order:',
      'What we know',
      'Source strength',
      'Missing information',
      'Reporting gaps',
      'Coverage recommendation',
      'Next steps',
      'This is internal newsroom analysis, not a public article or press-brief rewrite.',
      'Each section should contain concise bullet-style lines or short paragraphs.',
      'Make every section specific to this story. Do not use generic placeholder advice.',
      'Do not write vague filler such as "additional sourcing may still be needed", "review the strongest source items", or "identify missing primary-source confirmation".',
      'Source strength must name the strongest source item and the weakest source item or weakest unsupported claim in this packet.',
      'Missing information must name the exact unanswered questions for this story.',
      'Reporting gaps must explain what is weak, missing, single-sourced, or unverified in this packet.',
      'Coverage recommendation must explicitly choose one of: draft-ready, brief-ready, or needs more sourcing.',
      'Coverage recommendation must explain why that label fits this specific packet.',
      'If only a brief is supportable, say so directly. If the packet is too weak for a draft, say so directly.',
      'Next steps must be concrete reporting actions tied to this story, not generic process advice.',
      'Separate confirmed facts from claims that appear only once or remain unattributed.',
      'Do not output a public news story lead or framing brainstorm in this analysis.',
      buildSourcePacketPrompt(input),
    ].join('\n\n');
  }

  return [
    'Draft a publishable internal article draft from this source packet.',
    'Return JSON only.',
    'Write a real article draft, not a source summary, bullet list, or transcript digest.',
    'Use only the facts supported by the packet. Attribute claims when needed.',
    'Do not paste raw URLs into the body unless the story itself is about the URL or registration link.',
    'Do not say "This draft was generated from the current source packet only."',
    'Do not simply enumerate source items.',
    'The body should read like a local news article with a clear lead and short paragraphs.',
    buildSourcePacketPrompt(input),
  ].join('\n\n');
}

function buildAnthropicSystemPrompt(draftType: string) {
  return [
    'You are an internal newsroom drafting assistant for Highlander Today.',
    'Use only the provided source packet. Do not invent facts, quotes, chronology, or attribution.',
    'If information is uncertain, explicitly say so in the draft rather than smoothing over the gap.',
    'Write in a grounded, human, local-news voice. Avoid robotic filler, hype, and generic AI phrasing.',
    'Return valid JSON only with keys: headline, dek, body, generationNotes.',
    draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
      ? 'For source packet summaries, produce internal Reporter Agent analysis with sections for What we know, Source strength, Missing information, Reporting gaps, Coverage recommendation, and Next steps. This is internal newsroom guidance, not a public article. Avoid second-person coaching language.'
      : 'For article drafts, produce a clean article draft with short paragraphs and no markdown.',
  ].join(' ');
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

function parseDraftJson(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not contain a JSON object');
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

function finalizeProviderDraft(
  parsed: any,
  fallback: ReporterProviderDraftResult,
  draftType: string,
  provider: string,
  model: string
): ReporterProviderDraftResult {
  const headline =
    typeof parsed.headline === 'string' && parsed.headline.trim()
      ? parsed.headline.trim()
      : fallback.headline;
  const dek =
    typeof parsed.dek === 'string' && parsed.dek.trim() ? parsed.dek.trim() : null;
  const body =
    typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body.trim() : fallback.body;
  const generationNotes =
    typeof parsed.generationNotes === 'string' && parsed.generationNotes.trim()
      ? parsed.generationNotes.trim()
      : 'Draft generated through Anthropic Messages API from the current source packet.';

  const usedFallbackBody = body === fallback.body;

  if (usedFallbackBody) {
    throw new Error(
      'Anthropic returned an incomplete draft payload; fallback article text was not persisted.'
    );
  }

  return {
    headline,
    dek,
    body,
    draftType: draftType as ReporterProviderDraftResult['draftType'],
    modelProvider: provider,
    modelName: model,
    generationNotes,
    metadata: {
      provider,
      model,
    },
  };
}

export class AnthropicReporterProvider implements ReporterProviderAdapter {
  readonly provider = 'anthropic';
  readonly model: string;

  constructor(model = process.env.REPORTER_MODEL_NAME || 'claude-haiku-4-5') {
    this.model = model;
  }

  async generateDraft(
    input: ReporterDraftGenerationInput
  ): Promise<ReporterProviderDraftResult> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not available to the running server process. Restart the dev server after updating .env.'
      );
    }

    const draftType = input.draftType ?? REPORTER_DRAFT_TYPE.ARTICLE_DRAFT;

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY ? 1200 : 2200,
          temperature: 0.4,
          system: buildAnthropicSystemPrompt(draftType),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: buildAnthropicUserPrompt(input, draftType),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Anthropic request failed with status ${response.status}${
            errorText ? `: ${errorText.slice(0, 300)}` : ''
          }`
        );
      }

      const data = await response.json();
      const rawText = extractTextFromAnthropicResponse(data);

      if (!rawText) {
        throw new Error('Anthropic response did not include text content');
      }

      const parsed = parseDraftJson(rawText);
      const fallback = buildFallbackDraft(this.provider, this.model, {
        ...input,
        draftType,
      });

      return finalizeProviderDraft(parsed, fallback, draftType, this.provider, this.model);
    } catch (error) {
      console.error('Anthropic reporter draft generation failed:', error);
      throw error instanceof Error
        ? error
        : new Error('Anthropic reporter draft generation failed');
    }
  }
}
