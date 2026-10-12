import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OpenAIReporterProvider } from '@/lib/reporter/provider-openai';
import { REPORTER_MODEL_TASK, resolveReporterModelRoute } from '@/lib/reporter/model-routing';
import { REPORTER_DRAFT_TYPE, type ReporterSourcePacket } from '@/lib/reporter/types';

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const originalFetch = global.fetch;
const originalModel = process.env.REPORTER_MODEL_NAME;
const originalReasoning = process.env.REPORTER_MODEL_REASONING_EFFORT;

function buildPacket(): ReporterSourcePacket {
  return {
    runId: 'run-1',
    mode: 'REQUEST',
    requestType: 'ARTICLE_REQUEST',
    topic: 'Bridge closure',
    title: 'Bridge closure',
    subjectName: null,
    requestedArticleType: null,
    requestSummary: 'Bridge closed after inspection.',
    editorNotes: null,
    supportedClaims: [],
    sources: [
      {
        id: 'source-1',
        sourceType: 'OFFICIAL_URL',
        title: 'County statement',
        url: 'https://example.com/statement',
        publisher: 'Cambria County',
        author: null,
        publishedAt: '2026-04-22T12:00:00.000Z',
        excerpt: 'Officials announced a bridge closure after an inspection.',
        note: null,
        contentText: 'Officials announced a bridge closure after an inspection.',
        reliabilityTier: 'HIGH',
      },
    ],
  };
}

describe('OpenAIReporterProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_OPENAI_API_KEY === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
    }
    for (const [key, value] of Object.entries({
      REPORTER_MODEL_NAME: originalModel,
      REPORTER_MODEL_REASONING_EFFORT: originalReasoning,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    global.fetch = originalFetch;
  });

  it('throws when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const provider = new OpenAIReporterProvider();

    await expect(
      provider.generateDraft({
        packet: buildPacket(),
        draftType: REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
      })
    ).rejects.toThrow('OPENAI_API_KEY is not available');
  });

  it('uses Luna medium despite stale globals and returns parsed Responses API output', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.REPORTER_MODEL_NAME = 'gpt-5.6-luna';
    process.env.REPORTER_MODEL_REASONING_EFFORT = 'high';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          headline: 'Bridge Closure Disrupts Morning Traffic',
          dek: 'Inspection forces immediate closure.',
          body: 'Officials closed the bridge after an inspection found structural concerns.',
          generationNotes: 'Generated from county statement and staff notes.',
        }),
      }),
    })) as any;

    const provider = new OpenAIReporterProvider();
    const result = await provider.generateDraft({
      packet: buildPacket(),
      draftType: REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
    });

    expect(result).toMatchObject({
      headline: 'Bridge Closure Disrupts Morning Traffic',
      dek: 'Inspection forces immediate closure.',
      body: 'Officials closed the bridge after an inspection found structural concerns.',
      draftType: 'ARTICLE_DRAFT',
      modelProvider: 'openai',
      modelName: 'gpt-6-luna',
      generationNotes: 'Generated from county statement and staff notes.',
      metadata: {
        provider: 'openai',
        model: 'gpt-6-luna',
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-key',
        }),
      })
    );
    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: { effort: 'medium' },
    });
  });

  it('uses and records the server-selected task route', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          headline: 'Bridge Closure Disrupts Morning Traffic',
          dek: null,
          body: 'Officials closed the bridge after an inspection.',
          generationNotes: null,
        }),
      }),
    })) as any;
    const routing = resolveReporterModelRoute({
      task: REPORTER_MODEL_TASK.ARTICLE_DRAFT,
      packet: buildPacket(),
    });
    const provider = new OpenAIReporterProvider(routing);

    const result = await provider.generateDraft({
      packet: buildPacket(),
      draftType: REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
    });

    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: { effort: 'medium' },
    });
    expect(result.metadata).toMatchObject({
      reasoningEffort: 'medium',
      routing: {
        policyVersion: 'reporter-gpt-6-luna-medium-v1',
        task: 'ARTICLE_DRAFT',
        model: 'gpt-6-luna',
      },
      inputSnapshotJson: {
        routing: {
          task: 'ARTICLE_DRAFT',
        },
      },
    });
  });

  it('parses source-packet analysis from structured output blocks', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  headline: 'Reporter Agent Analysis: Bridge closure',
                  dek: null,
                  body: [
                    'What we know',
                    '- County officials closed the bridge after an inspection.',
                    '',
                    'Source strength',
                    '- Strongest current source: the county statement is the clearest direct attribution in the packet.',
                    '- Weakest current source: there is still no engineer quote or repair memo in the packet.',
                    '',
                    'Missing information',
                    '- The exact repair timeline is still unknown.',
                    '',
                    'Reporting gaps',
                    '- No engineer or PennDOT comment is included yet.',
                    '',
                    'Coverage recommendation',
                    '- brief-ready. The packet supports a narrowly framed service update, but not a fuller accountability or impact story yet.',
                    '',
                    'Next steps',
                    '- Request repair timeline and detour details from county officials.',
                  ].join('\n'),
                  generationNotes: 'Generated from the current source packet.',
                }),
              },
            ],
          },
        ],
      }),
    })) as any;

    const provider = new OpenAIReporterProvider();
    const result = await provider.generateDraft({
      packet: buildPacket(),
      draftType: REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY,
    });

    expect(result.draftType).toBe('SOURCE_PACKET_SUMMARY');
    expect(result.body).toContain('What we know');
    expect(result.body).toContain('Source strength');
    expect(result.body).toContain('Coverage recommendation');
    expect(result.body).toContain('Next steps');
  });

  it('throws when the model payload fails schema validation', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          headline: 'Bridge Closure Disrupts Morning Traffic',
          dek: 'Inspection forces immediate closure.',
          generationNotes: 'Incomplete payload from test.',
        }),
      }),
    })) as any;

    const provider = new OpenAIReporterProvider();

    await expect(
      provider.generateDraft({
        packet: buildPacket(),
        draftType: REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
      })
    ).rejects.toThrow('Required');
  });
});
