import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { buildDeterministicSourcePacketAnalysis } from '@/lib/reporter/source-packet-analysis';
import { generateReporterDraftWithValidation } from '@/lib/reporter/draft-generator';
import { REPORTER_DRAFT_TYPE, type ReporterSourcePacket } from '@/lib/reporter/types';

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
    expect(result.draft.generationNotes).toContain('incomplete draft payload');
  });
});
