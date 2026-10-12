import { z } from 'zod';
import { readResponseBytes } from '@/lib/security/safe-fetch';
import { buildPromptTraceMetadata, hashReporterJson, loadReporterPromptTemplate, renderReporterPromptTemplate } from './prompt-loader';
import { createFailedReporterAgentTrace, createSuccessfulReporterAgentTrace } from './agent-trace-service';
import { REPORTER_MODEL_TASK, resolveReporterModelRoute } from './model-routing';
import type { ReporterSourcePacket } from './types';

export const ReporterEvidenceAssessmentSchema = z.object({
  ready: z.boolean(),
  summary: z.string().min(1).max(2000),
  headline: z.string().min(1).max(300).nullable().default(null),
  omittedClaims: z.array(z.string().min(1).max(1000)).max(12).default([]),
  gaps: z.array(z.string().min(1).max(500)).max(12),
  claims: z.array(z.object({
    text: z.string().min(1).max(1000),
    central: z.boolean(),
    status: z.enum(['supported', 'attributed', 'unresolved', 'disputed']),
    attribution: z.string().nullable(),
    asOf: z.string().nullable(),
    evidence: z.array(z.object({
      sourceId: z.string(),
      quote: z.string().min(20).max(2000),
    })).max(4),
  })).max(16),
});
export type ReporterEvidenceAssessment = z.infer<typeof ReporterEvidenceAssessmentSchema>;
const DiscoverySchema = z.object({ urls: z.array(z.string().url()).max(4) });
const nullableString = { type: ['string', 'null'] };
const evidenceJsonSchema = {
  type: 'object', additionalProperties: false,
  required: ['ready', 'summary', 'headline', 'omittedClaims', 'gaps', 'claims'],
  properties: {
    ready: { type: 'boolean' }, summary: { type: 'string' }, headline: nullableString,
    omittedClaims: { type: 'array', items: { type: 'string' } }, gaps: { type: 'array', items: { type: 'string' } },
    claims: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['text', 'central', 'status', 'attribution', 'asOf', 'evidence'], properties: {
        text: { type: 'string' }, central: { type: 'boolean' }, status: { type: 'string', enum: ['supported', 'attributed', 'unresolved', 'disputed'] },
        attribution: nullableString, asOf: nullableString,
        evidence: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['sourceId', 'quote'],
          properties: { sourceId: { type: 'string' }, quote: { type: 'string' } } } },
      } } },
  },
};

async function requestReporterResearch(params: {
  packet: ReporterSourcePacket;
  promptKey: 'research-discovery' | 'research-assessment';
  input: unknown;
  search?: boolean;
  signal: AbortSignal;
}) {
  const routing = resolveReporterModelRoute({ task: REPORTER_MODEL_TASK.SOURCE_PACKET_ANALYSIS, packet: params.packet });
  const provider = (process.env.REPORTER_MODEL_PROVIDER || 'openai').toLowerCase();
  const isOpenAI = provider === 'openai';
  if (params.search && !isOpenAI) return null;
  const template = await loadReporterPromptTemplate(`${params.promptKey}.system`);
  const system = renderReporterPromptTemplate(template, {});
  const input = JSON.stringify(params.input);
  const metadata = buildPromptTraceMetadata({ promptFamilyKey: params.promptKey, templates: [template], renderedPrompts: [system] });
  const startedAt = Date.now();
  const model = isOpenAI ? routing.model : process.env.REPORTER_MODEL_NAME || 'claude-sonnet-4-6';
  try {
    const key = isOpenAI ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Reporter research provider key is unavailable.');
    const response = await fetch(isOpenAI ? 'https://api.openai.com/v1/responses' : 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: isOpenAI ? { 'content-type': 'application/json', authorization: `Bearer ${key}` } :
        { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.any([params.signal, AbortSignal.timeout(90000)]),
      body: JSON.stringify(isOpenAI ? {
        model, reasoning: { effort: routing.reasoningEffort }, store: false,
        max_output_tokens: params.search ? 2500 : 6500,
        ...(!params.search ? { text: { format: { type: 'json_schema', name: 'reporter_research_assessment', strict: true, schema: evidenceJsonSchema } } } : {}),
        ...(params.search ? { tools: [{ type: 'web_search', search_context_size: 'low' }], tool_choice: 'required', max_tool_calls: 3, include: ['web_search_call.action.sources'] } : {}),
        input: [{ role: 'system', content: system }, { role: 'user', content: input }],
      } : { model, max_tokens: 6500, system, messages: [{ role: 'user', content: input }] }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Reporter research provider returned HTTP ${response.status}.`);
    }
    const data = JSON.parse(new TextDecoder().decode(await readResponseBytes(response, 1_000_000)));
    if (isOpenAI && data.status && data.status !== 'completed') throw new Error('Reporter research response was incomplete.');
    const rawText = isOpenAI
      ? data.output_text || (data.output || []).flatMap((item: any) => item.content || []).filter((item: any) => item.type === 'output_text').map((item: any) => item.text).join('\n')
      : (data.content || []).filter((item: any) => item.type === 'text').map((item: any) => item.text).join('\n');
    const parsed = JSON.parse(rawText.slice(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1));
    const result = params.search ? DiscoverySchema.parse(parsed) : ReporterEvidenceAssessmentSchema.parse(parsed);
    if (params.search) {
      // URLs invented in the final answer are never treated as search discoveries.
      const consulted = new Set<string>((data.output || []).filter((item: any) => item.type === 'web_search_call')
        .flatMap((item: any) => item.action?.sources || []).map((source: any) => source.url));
      (result as z.infer<typeof DiscoverySchema>).urls = (result as z.infer<typeof DiscoverySchema>).urls.filter((url) => consulted.has(url));
    }
    await createSuccessfulReporterAgentTrace({ reporterRunId: params.packet.runId, traceType: 'SOURCE_PACKET_ANALYSIS', provider, modelName: model,
      ...metadata, inputHash: hashReporterJson(params.input), inputSnapshotJson: params.input, rawOutputText: rawText,
      parsedOutputJson: result, validationJson: { routing, search: Boolean(params.search) }, latencyMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    await createFailedReporterAgentTrace({ reporterRunId: params.packet.runId, traceType: 'SOURCE_PACKET_ANALYSIS', provider, modelName: model,
      ...metadata, errorMessage: error instanceof Error ? error.message : 'Reporter research failed.', latencyMs: Date.now() - startedAt });
    throw error;
  }
}

export async function discoverReporterEvidence(packet: ReporterSourcePacket, signal: AbortSignal, followUp?: { missingEvidence: string[]; excludedUrls: string[] }): Promise<string[]> {
  // Send public document context only. Interview notes, intake and editor notes are
  // not search queries and must not be disclosed to a search tool.
  const publicSources = packet.sources.filter((source) => source.url && ['NEWS_ARTICLE', 'OFFICIAL_URL', 'DOCUMENT'].includes(source.sourceType));
  if (!publicSources.length) return [];
  const result = await requestReporterResearch({ packet, promptKey: 'research-discovery', search: true, signal,
    input: { sources: publicSources.map((source) => ({ url: source.url, title: source.title, text: source.contentText?.slice(0, 10000) })), followUp } });
  return result ? DiscoverySchema.parse(result).urls : [];
}

export async function assessReporterEvidence(packet: ReporterSourcePacket, signal: AbortSignal): Promise<ReporterEvidenceAssessment> {
  const result = await requestReporterResearch({ packet, promptKey: 'research-assessment', signal, input: {
    topic: packet.topic, title: packet.title, sources: packet.sources,
    // Human disputed/rejected claims remain explicit constraints on assessment.
    disputedClaims: packet.supportedClaims.filter((claim) => ['DISPUTED', 'REJECTED'].includes(claim.verificationStatus)),
  } });
  return ReporterEvidenceAssessmentSchema.parse(result);
}
