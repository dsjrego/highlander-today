import { describe, expect, it } from '@jest/globals';
import { validateReporterDraft } from '@/lib/reporter/draft-validator';
import {
  REPORTER_DRAFT_TYPE,
  type ReporterGeneratedDraft,
  type ReporterSourcePacket,
} from '@/lib/reporter/types';

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

describe('validateReporterDraft', () => {
  it('accepts analysis with the new weak-packet sections and recommendation label', () => {
    const draft: ReporterGeneratedDraft = {
      headline: 'Reporter Agent Analysis: Bridge closure',
      dek: null,
      draftType: REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY,
      modelProvider: 'openai',
      modelName: 'gpt-5.4-mini',
      generationNotes: null,
      body: [
        'What we know',
        '- County officials closed the bridge after an inspection.',
        '',
        'Source strength',
        '- Strongest current source: the county statement is directly attributable.',
        '- Weakest current source: there is no engineer memo or quoted inspection report.',
        '',
        'Missing information',
        '- When will the bridge reopen?',
        '',
        'Reporting gaps',
        '- The packet has no independent confirmation of repair scope.',
        '',
        'Coverage recommendation',
        '- brief-ready. This supports a narrow service update, not a fuller accountability story yet.',
        '',
        'Next steps',
        '- Request repair timeline and detour details from county officials.',
      ].join('\n'),
    };

    const result = validateReporterDraft(draft, buildPacket());

    expect(result.hasCriticalIssues).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('flags analysis that omits an explicit coverage recommendation label', () => {
    const draft: ReporterGeneratedDraft = {
      headline: 'Reporter Agent Analysis: Bridge closure',
      dek: null,
      draftType: REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY,
      modelProvider: 'openai',
      modelName: 'gpt-5.4-mini',
      generationNotes: null,
      body: [
        'What we know',
        '- County officials closed the bridge after an inspection.',
        '',
        'Source strength',
        '- Strongest current source: the county statement is directly attributable.',
        '- Weakest current source: there is no engineer memo or quoted inspection report.',
        '',
        'Missing information',
        '- When will the bridge reopen?',
        '',
        'Reporting gaps',
        '- The packet has no independent confirmation of repair scope.',
        '',
        'Coverage recommendation',
        '- This supports a narrow service update, not a fuller accountability story yet.',
        '',
        'Next steps',
        '- Request repair timeline and detour details from county officials.',
      ].join('\n'),
    };

    const result = validateReporterDraft(draft, buildPacket());

    expect(result.hasCriticalIssues).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ANALYSIS_RECOMMENDATION_MISSING',
        }),
      ])
    );
  });
});
