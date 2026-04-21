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
      'Missing information',
      'Reporting gaps',
      'Editorial angle',
      'Next steps',
      'This is internal newsroom analysis, not a public article or press-brief rewrite.',
      'Each section should contain concise bullet-style lines or short paragraphs.',
      'Make every section specific to this story. Do not use generic placeholder advice.',
      'Do not write vague filler such as "additional sourcing may still be needed", "review the strongest source items", or "identify missing primary-source confirmation".',
      'Missing information must name the exact unanswered questions for this story.',
      'Reporting gaps must explain what is weak, missing, single-sourced, or unverified in this packet.',
      'Editorial angle must propose 2-3 concrete framing options for Highlander Today coverage.',
      'Next steps must be concrete reporting actions tied to this story, not generic process advice.',
      'Do not output a news story lead unless it appears inside Editorial angle as one possible framing idea.',
      'If the packet only supports a simple event brief, say that explicitly in Editorial angle or Reporting gaps.',
      buildSourcePacketPrompt(input),
    ].join('\n\n');
  }

  return [
    'Draft from this source packet.',
    'Return JSON only.',
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
      ? 'For source packet summaries, produce internal Reporter Agent analysis with sections for What we know, Missing information, Reporting gaps, Editorial angle, and Next steps. This is internal newsroom guidance, not a public article. Avoid second-person coaching language.'
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

      return {
        headline:
          typeof parsed.headline === 'string' && parsed.headline.trim()
            ? parsed.headline.trim()
            : fallback.headline,
        dek:
          typeof parsed.dek === 'string' && parsed.dek.trim() ? parsed.dek.trim() : null,
        body:
          typeof parsed.body === 'string' && parsed.body.trim()
            ? parsed.body.trim()
            : fallback.body,
        draftType,
        modelProvider: this.provider,
        modelName: this.model,
        generationNotes:
          typeof parsed.generationNotes === 'string' && parsed.generationNotes.trim()
            ? parsed.generationNotes.trim()
            : 'Draft generated through Anthropic Messages API from the current source packet.',
        metadata: {
          provider: this.provider,
          model: this.model,
        },
      };
    } catch (error) {
      console.error('Anthropic reporter draft generation failed:', error);
      throw error instanceof Error
        ? error
        : new Error('Anthropic reporter draft generation failed');
    }
  }
}
