import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { REPORTER_DRAFT_TYPE, type ReporterSourcePacket } from '@/lib/reporter/types';

jest.mock('@/lib/reporter/agent-trace-service', () => ({
  createSuccessfulReporterAgentTrace: jest.fn(() => Promise.resolve({ id: 'trace-1' })),
  createFailedReporterAgentTrace: jest.fn(() => Promise.resolve({ id: 'trace-2' })),
}));

const { buildDeterministicSourcePacketAnalysis } = require('@/lib/reporter/source-packet-analysis') as typeof import('@/lib/reporter/source-packet-analysis');
const { generateReporterDraftWithValidation } = require('@/lib/reporter/draft-generator') as typeof import('@/lib/reporter/draft-generator');

const originalFetch = global.fetch;

function buildPacket(): ReporterSourcePacket {
  return {
    runId: 'run-1',
    mode: 'REQUEST',
    requestType: 'ARTICLE_REQUEST',
    topic: 'Cambria Heights School District Color Blast',
    title: 'Cambria Heights School District Color Blast',
    subjectName: null,
    requestedArticleType: null,
    requestSummary: 'School district event announcement.',
    editorNotes: null,
    supportedClaims: [],
    sources: [
      {
        id: 'source-1',
        sourceType: 'OFFICIAL_URL',
        title: 'Color Blast announcement',
        url: 'https://example.com/color-blast',
        publisher: 'Cambria Heights School District',
        author: null,
        publishedAt: '2026-04-22T12:00:00.000Z',
        excerpt:
          'The Highlander Foundation is hosting the second annual Highlander Color Blast 5k run on Saturday, May 16, at 11 AM.',
        note: null,
        contentText:
          'The Highlander Foundation is hosting the second annual Highlander Color Blast 5k run on Saturday, May 16, at 11 AM.',
        reliabilityTier: 'HIGH',
      },
    ],
  };
}

describe('buildDeterministicSourcePacketAnalysis', () => {
  it('classifies thin event material as brief-ready', () => {
    const result = buildDeterministicSourcePacketAnalysis(buildPacket());

    expect(result.body).toContain('Coverage recommendation');
    expect(result.body).toContain('brief-ready');
    expect(result.body).toContain('short attributed brief or event item');
    expect(result.body).toContain('Color Blast announcement (Cambria Heights School District)');
    expect(result.body).not.toContain('https://example.com/color-blast');
    expect(result.body).toContain('this is also the only substantive source in the packet');
  });
});

describe('generateReporterDraftWithValidation', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('requests one same-model revision when an evidence-rich article stops at its lead', async () => {
    process.env.REPORTER_MODEL_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    const packet = buildPacket();
    packet.supportedClaims = Array.from({ length: 4 }, (_, index) => ({ id: `claim-${index}`, claimType: 'BACKGROUND_CONTEXT', claimText: `Supported fact ${index}`, sourceExcerpt: 'Source passage supports this fact.', attribution: 'County', confidence: 'MEDIUM', verificationStatus: 'SUPPORTED' }));
    const replies = ['The county announced a bridge closure.', 'The county announced a bridge closure.\n\nOfficials published a repair schedule and detour route.'];
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify({ headline: 'Bridge closure', dek: null, body: replies.shift(), generationNotes: null }) }) })) as any;
    const result = await generateReporterDraftWithValidation(packet, REPORTER_DRAFT_TYPE.ARTICLE_DRAFT);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.validation.hasCriticalIssues).toBe(false);
    const request = JSON.parse((global.fetch as any).mock.calls[1][1].body);
    expect(request).toMatchObject({ model: 'gpt-6-luna', reasoning: { effort: 'medium' } });
    expect(JSON.stringify(request.input)).toContain('REQUIRED REVISION');
  });

  it('replaces weak source-packet summaries with deterministic brief analysis', async () => {
    process.env.REPORTER_MODEL_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              headline: 'Reporter Agent Analysis: Color Blast',
              dek: null,
              body: [
                'What we know',
                '1. Event announcement only.',
                '',
                'Missing information',
                '- Additional sourcing may still be needed to confirm details and context.',
                '',
                'Recommended next steps',
                '- Review the strongest source items.',
              ].join('\n'),
              generationNotes: 'Weak model output from test.',
            }),
          },
        ],
      }),
    })) as any;

    const result = await generateReporterDraftWithValidation(
      buildPacket(),
      REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
    );

    expect(result.validation.hasCriticalIssues).toBe(false);
    expect(result.draft.body).toContain('Coverage recommendation');
    expect(result.draft.body).toContain('brief-ready');
    expect(result.draft.generationNotes).toContain('Weak model output from test.');
  });

  it('downgrades provider failures into deterministic source-packet analysis', async () => {
    process.env.REPORTER_MODEL_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              headline: 'Reporter Agent Analysis: Color Blast',
              dek: null,
              generationNotes: 'Incomplete model output from test.',
            }),
          },
        ],
      }),
    })) as any;

    const result = await generateReporterDraftWithValidation(
      buildPacket(),
      REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
    );

    expect(result.validation.hasCriticalIssues).toBe(false);
    expect(result.draft.body).toContain('Coverage recommendation');
    expect(result.draft.body).toContain('brief-ready');
    expect(result.draft.generationNotes).toContain('failed model response');
    expect(result.draft.generationNotes).toContain('"body"');
  });

  it('retries a failed OpenAI draft once on the fixed Luna medium-reasoning route', async () => {
    process.env.REPORTER_MODEL_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'temporary provider failure',
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({
            headline: 'Color Blast Returns in May',
            dek: 'The Highlander Foundation announced its second annual event.',
            body:
              'The Highlander Foundation will host its second annual Highlander Color Blast 5K on Saturday, May 16, at 11 a.m., according to the school district announcement.',
            generationNotes: 'Recovered on the bounded medium-reasoning retry.',
          }),
        }),
      } as never) as any;

    const result = await generateReporterDraftWithValidation(
      buildPacket(),
      REPORTER_DRAFT_TYPE.ARTICLE_DRAFT
    );

    const requests = (global.fetch as jest.Mock).mock.calls.map((call) =>
      JSON.parse(String((call[1] as RequestInit).body))
    );
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: { effort: 'medium' },
    });
    expect(requests[1]).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: { effort: 'medium' },
    });
    expect(result.draft.generationNotes).toContain('bounded medium-reasoning retry');
  });
});
