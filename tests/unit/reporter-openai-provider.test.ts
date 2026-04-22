import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OpenAIReporterProvider } from '@/lib/reporter/provider-openai';
import { REPORTER_DRAFT_TYPE, type ReporterSourcePacket } from '@/lib/reporter/types';

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const originalFetch = global.fetch;

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
    global.fetch = originalFetch;
  });

  it('throws when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const provider = new OpenAIReporterProvider('gpt-5.4-mini');

    await expect(
      provider.generateDraft({
        packet: buildPacket(),
        draftType: REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
      })
    ).rejects.toThrow('OPENAI_API_KEY is not available');
  });

  it('returns parsed article draft output from the Responses API', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
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

    const provider = new OpenAIReporterProvider('gpt-5.4-mini');
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
      modelName: 'gpt-5.4-mini',
      generationNotes: 'Generated from county statement and staff notes.',
      metadata: {
        provider: 'openai',
        model: 'gpt-5.4-mini',
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

    const provider = new OpenAIReporterProvider('gpt-5.4-mini');
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

  it('throws instead of silently persisting the fallback article template', async () => {
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

    const provider = new OpenAIReporterProvider('gpt-5.4-mini');

    await expect(
      provider.generateDraft({
        packet: buildPacket(),
        draftType: REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
      })
    ).rejects.toThrow('fallback article text was not persisted');
  });
});
