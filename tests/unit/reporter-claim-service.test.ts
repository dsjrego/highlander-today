import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const {
  createReporterClaimsFromSourcePacketAnalysis,
} = require('@/lib/reporter/claim-service') as typeof import('@/lib/reporter/claim-service');

describe('reporter claim service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates multiple structured claims from source packet analysis seeds', async () => {
    (prismaMock.reporterClaim.findMany as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'claim-1',
          claimType: 'OFFICIAL_STATEMENT',
          claimText: 'Borough council budget meeting agenda',
          sourceExcerpt:
            'The borough council will review the 2026 budget on Tuesday night. Public comment is scheduled before the vote.',
          attribution: 'Borough Council',
          confidence: 'HIGH',
          verificationStatus: 'SUPPORTED',
          reporterSource: {
            id: 'source-1',
            sourceType: 'OFFICIAL_URL',
            title: 'Borough council budget meeting agenda',
            url: 'https://borough.example/agenda',
            publisher: 'Borough Council',
          },
          createdByUser: null,
        },
        {
          id: 'claim-2',
          claimType: 'DATE_TIME_FACT',
          claimText: 'Borough council budget meeting agenda was published on May 25, 2026.',
          sourceExcerpt: null,
          attribution: 'Borough Council',
          confidence: 'HIGH',
          verificationStatus: 'SUPPORTED',
          reporterSource: {
            id: 'source-1',
            sourceType: 'OFFICIAL_URL',
            title: 'Borough council budget meeting agenda',
            url: 'https://borough.example/agenda',
            publisher: 'Borough Council',
          },
          createdByUser: null,
        },
      ]);

    const result = await createReporterClaimsFromSourcePacketAnalysis({
      reporterRunId: 'run-1',
      createdByUserId: 'staff-1',
      sources: [
        {
          id: 'source-1',
          sourceType: 'OFFICIAL_URL',
          title: 'Borough council budget meeting agenda',
          excerpt:
            'The borough council will review the 2026 budget on Tuesday night. Public comment is scheduled before the vote.',
          contentText: null,
          note: null,
          publisher: 'Borough Council',
          publishedAt: new Date('2026-05-25T12:00:00.000Z'),
          reliabilityTier: 'PRIMARY',
        },
        {
          id: 'source-2',
          sourceType: 'NEWS_ARTICLE',
          title: 'Neighbors raise questions about bridge work',
          excerpt: 'Residents say the bridge closure may last through June.',
          contentText: null,
          note: null,
          publisher: 'Local Newsroom',
          publishedAt: new Date('2026-05-25T16:00:00.000Z'),
          reliabilityTier: 'UNVERIFIED',
        },
      ],
    });

    expect(prismaMock.reporterClaim.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          reporterRunId: 'run-1',
          reporterSourceId: 'source-1',
          claimType: 'OFFICIAL_STATEMENT',
          claimText: 'Borough council budget meeting agenda',
          verificationStatus: 'SUPPORTED',
        }),
        expect.objectContaining({
          reporterRunId: 'run-1',
          reporterSourceId: 'source-1',
          claimType: 'DATE_TIME_FACT',
          claimText: 'Borough council budget meeting agenda was published on May 25, 2026.',
          verificationStatus: 'SUPPORTED',
        }),
        expect.objectContaining({
          reporterRunId: 'run-1',
          reporterSourceId: 'source-2',
          claimType: 'FOLLOW_UP_REQUIREMENT',
          verificationStatus: 'UNREVIEWED',
        }),
      ]),
    });
    expect(result).toHaveLength(2);
  });
});
