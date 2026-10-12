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

describe('validateReporterDraft', () => {
  it('requires body context when four or more assessed facts support a developed brief', () => {
    const packet = buildPacket();
    packet.supportedClaims = Array.from({ length: 4 }, (_, index) => ({ id: `claim-${index}`, claimType: 'BACKGROUND_CONTEXT', claimText: `Supported fact ${index}`, sourceExcerpt: 'Source passage.', attribution: null, confidence: 'MEDIUM', verificationStatus: 'SUPPORTED' }));
    const draft: ReporterGeneratedDraft = { headline: 'Bridge closure', dek: null, body: 'The county closed the bridge.', draftType: 'ARTICLE_DRAFT', modelProvider: 'openai', modelName: 'gpt-6-luna', generationNotes: null };
    expect(validateReporterDraft(draft, packet).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DRAFT_UNDERDEVELOPED' })]));
    draft.body += '\n\nThe county published the repair schedule and detour route.';
    expect(validateReporterDraft(draft, packet).hasCriticalIssues).toBe(false);
  });
  it('blocks the reported headline-only disclaimer in article copy', () => {
    const draft: ReporterGeneratedDraft = { headline: 'Measles cases', dek: null, body: 'A Stateline headline says measles cases have reached 4,080 for the year. The number could not be independently confirmed from the materials available for this story.', draftType: 'ARTICLE_DRAFT', modelProvider: 'openai', modelName: 'gpt-6-luna', generationNotes: null };
    expect(validateReporterDraft(draft, buildPacket()).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'REPORTING_INCOMPLETE', severity: 'CRITICAL' })]));
  });

  it('allows ordinary attributed uncertainty about an event', () => {
    const draft: ReporterGeneratedDraft = { headline: 'Bridge closed', dek: null, body: 'County officials could not confirm when the bridge would reopen. The county announced the closure on Tuesday.', draftType: 'ARTICLE_DRAFT', modelProvider: 'openai', modelName: 'gpt-6-luna', generationNotes: null };
    expect(validateReporterDraft(draft, buildPacket()).hasCriticalIssues).toBe(false);
  });
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
