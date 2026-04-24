import { describe, expect, it } from '@jest/globals';
import {
  buildTranscriptFromTurns,
  getInterviewQuestionPlan,
} from '@/lib/reporter/interview-templates';

describe('reporter interview templates', () => {
  it('builds a deterministic witness question plan', () => {
    const plan = getInterviewQuestionPlan({
      request: {
        interviewType: 'WITNESS',
        purpose: 'Clarify what happened at the scene.',
        mustLearn: 'Exact timeline and direct observations.',
        relationshipToStory: 'Resident who was present',
        intervieweeName: 'Jordan',
      },
      language: 'ENGLISH',
      priorTurns: [],
    });

    expect(plan.questions[0]).toMatchObject({
      key: 'witness_scene',
    });
    expect(plan.nextQuestion).toMatchObject({
      key: 'witness_scene',
      language: 'ENGLISH',
    });
    expect(plan.questions.length).toBeGreaterThan(1);
  });

  it('builds a transcript string from ordered turns', () => {
    const transcript = buildTranscriptFromTurns([
      {
        sortOrder: 1,
        questionText: 'What happened next?',
        answerText: 'The meeting ended.',
      },
      {
        sortOrder: 0,
        questionText: 'What did you see?',
        answerText: 'I saw the vote.',
      },
    ] as any);

    expect(transcript).toContain('Q1: What did you see?');
    expect(transcript).toContain('A2: The meeting ended.');
  });
});
