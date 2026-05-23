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

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

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

async function buildOpenAIPromptBundle(
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
      : 'Draft generated through OpenAI Responses API from the current source packet.';

  const usedFallbackBody = body === fallback.body;

  if (usedFallbackBody) {
    throw new Error(
      'OpenAI returned an incomplete draft payload; fallback article text was not persisted.'
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

export class OpenAIReporterProvider implements ReporterProviderAdapter {
  readonly provider = 'openai';
  readonly model: string;

  constructor(model = process.env.REPORTER_MODEL_NAME || 'gpt-5.4-mini') {
    this.model = model;
  }

  async generateDraft(
    input: ReporterDraftGenerationInput
  ): Promise<ReporterProviderDraftResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY is not available to the running server process. Restart the dev server after updating .env.'
      );
    }

    const draftType = input.draftType ?? REPORTER_DRAFT_TYPE.ARTICLE_DRAFT;

    try {
      const promptBundle = await buildOpenAIPromptBundle(input, draftType);
      const startedAt = Date.now();
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.4,
          max_output_tokens: draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY ? 1200 : 2200,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: promptBundle.systemPrompt,
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
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
          `OpenAI request failed with status ${response.status}${
            errorText ? `: ${errorText.slice(0, 300)}` : ''
          }`
        );
      }

      const data = await response.json();
      const rawText = extractTextFromOpenAIResponse(data);

      if (!rawText) {
        throw new Error('OpenAI response did not include text content');
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
      console.error('OpenAI reporter draft generation failed:', error);
      throw error instanceof Error ? error : new Error('OpenAI reporter draft generation failed');
    }
  }
}
