import type { ReporterProviderAdapter } from './provider-adapter';
import {
  REPORTER_DRAFT_TYPE,
  type ReporterDraftGenerationInput,
  type ReporterProviderDraftResult,
} from './types';
import { buildFallbackDraft } from './provider-adapter';
import {
  buildPromptTraceMetadata,
  hashReporterJson,
  loadReporterPromptTemplate,
  renderReporterPromptTemplate,
} from './prompt-loader';
import {
  ReporterDraftOutputSchema,
  SourcePacketAnalysisOutputSchema,
} from './reporter-agent-schemas';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

function buildSourcePacketPrompt(input: ReporterDraftGenerationInput) {
  const claims = input.packet.supportedClaims
    .slice(0, 8)
    .map((claim, index) => {
      const claimParts = [
        `${index + 1}. ${claim.claimText}`,
        `type=${claim.claimType}`,
        `verification=${claim.verificationStatus}`,
        `confidence=${claim.confidence}`,
        claim.attribution ? `attribution=${claim.attribution}` : null,
        claim.sourceExcerpt ? `excerpt=${claim.sourceExcerpt}` : null,
      ].filter(Boolean);

      return claimParts.join('\n');
    })
    .join('\n\n');

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
    'Preferred claims:',
    claims || 'No prioritized claims were provided.',
    '',
    'Sources:',
    sources || 'No sources provided.',
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

async function buildAnthropicPromptBundle(
  input: ReporterDraftGenerationInput,
  draftType: string
) {
  const promptFamilyKey =
    draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
      ? 'source-packet-analysis'
      : 'draft-generation';
  const systemTemplate = await loadReporterPromptTemplate(`${promptFamilyKey}.system`);
  const userTemplate = await loadReporterPromptTemplate(`${promptFamilyKey}.user`);
  const sourcePacketPrompt = buildSourcePacketPrompt(input);
  const systemPrompt = renderReporterPromptTemplate(systemTemplate, {});
  const userPrompt = renderReporterPromptTemplate(userTemplate, {
    sourcePacketPrompt,
  });

  return {
    systemPrompt,
    userPrompt,
    inputSnapshotJson: {
      packet: input.packet,
      draftType,
    },
    traceMetadata: buildPromptTraceMetadata({
      promptFamilyKey,
      templates: [systemTemplate, userTemplate],
      renderedPrompts: [systemPrompt, userPrompt],
    }),
  };
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

  constructor(model = process.env.REPORTER_MODEL_NAME || 'claude-sonnet-4-6') {
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
      const promptBundle = await buildAnthropicPromptBundle(input, draftType);
      const startedAt = Date.now();
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
          system: promptBundle.systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptBundle.userPrompt,
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
      const validatedParsed =
        draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
          ? SourcePacketAnalysisOutputSchema.parse(parsed)
          : ReporterDraftOutputSchema.parse(parsed);
      const fallback = buildFallbackDraft(this.provider, this.model, {
        ...input,
        draftType,
      });

      const result = finalizeProviderDraft(
        validatedParsed,
        fallback,
        draftType,
        this.provider,
        this.model
      );

      return {
        ...result,
        metadata: {
          ...result.metadata,
          ...promptBundle.traceMetadata,
          inputHash: hashReporterJson(promptBundle.inputSnapshotJson),
          inputSnapshotJson: promptBundle.inputSnapshotJson,
          rawOutputText: rawText,
          parsedOutputJson: validatedParsed,
          latencyMs: Date.now() - startedAt,
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
