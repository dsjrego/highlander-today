import { describe, expect, it } from '@jest/globals';
import { buildInterviewSafetyFlags } from '@/lib/reporter/interview-safety';

describe('reporter interview safety', () => {
  it('flags anonymity and legal-risk language from interview answers', () => {
    const flags = buildInterviewSafetyFlags({
      intervieweeName: 'Jordan',
      turns: [
        {
          answerText:
            'Please keep my name anonymous because my attorney expects a lawsuit over this issue.',
        },
      ],
    });

    expect(flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flagType: 'ANONYMITY_REQUEST',
          blockerCode: 'INTERVIEW_FLAG_ANONYMITY',
        }),
        expect.objectContaining({
          flagType: 'LEGAL_EXPOSURE',
          blockerCode: 'INTERVIEW_FLAG_LEGAL',
        }),
      ])
    );
  });
});
