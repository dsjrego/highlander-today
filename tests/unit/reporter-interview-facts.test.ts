import { describe, expect, it } from '@jest/globals';
import {
  buildInterviewFacts,
  buildInterviewSourcePayload,
} from '@/lib/reporter/interview-facts';

describe('reporter interview facts', () => {
  it('derives structured facts from answered turns', () => {
    const facts = buildInterviewFacts({
      session: {
        id: 'session-1',
        language: 'ENGLISH',
      } as any,
      turns: [
        {
          id: 'turn-1',
          sortOrder: 0,
          questionKey: 'timeline',
          questionText: 'Walk through the timeline.',
          answerText: 'The alert went out at 8 a.m. and crews arrived around 9 a.m.',
        },
        {
          id: 'turn-2',
          sortOrder: 1,
          questionKey: 'follow_up',
          questionText: 'Who else should we talk to?',
          answerText: 'Please confirm the closure time with the borough manager.',
        },
      ],
    });

    expect(facts.some((fact) => fact.factType === 'CHRONOLOGY_ITEM')).toBe(true);
    expect(facts.some((fact) => fact.factType === 'FOLLOW_UP_REQUIREMENT')).toBe(true);
    expect(facts.some((fact) => fact.factType === 'QUOTED_STATEMENT')).toBe(true);
  });

  it('builds a reporter source payload from interview output', () => {
    const source = buildInterviewSourcePayload({
      intervieweeName: 'Jordan',
      interviewType: 'WITNESS',
      purpose: 'Clarify the road closure timeline.',
      transcriptText: 'Q1...\nA1...',
      englishSummary: 'Jordan said the closure started early.',
      factCount: 4,
    });

    expect(source).toMatchObject({
      sourceType: 'INTERVIEW_NOTE',
      title: 'Interview: Jordan',
      reliabilityTier: 'PRIMARY',
    });
    expect(source.note).toContain('Structured fact count: 4');
  });
});
