import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const {
  listReporterStoryCandidates,
  materializeReporterStoryCandidates,
} = require('@/lib/reporter/story-candidates') as typeof import('@/lib/reporter/story-candidates');

describe('reporter story candidate service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.$transaction as any).mockImplementation(async (callback: any) => callback(prismaMock));
  });

  it('materializes clustered and ranked story candidates from recent ingestion items', async () => {
    (prismaMock.siteSetting.findUnique as any).mockResolvedValue({
      value: 'school board, budget',
    });
    (prismaMock.reporterRun.findMany as any).mockResolvedValue([
      {
        id: 'run-1',
        topic: 'Old parade planning',
        title: 'Old parade planning',
        status: 'NEW',
      },
    ]);
    (prismaMock.article.findMany as any).mockResolvedValue([
      {
        id: 'article-1',
        title: 'Water authority rates unchanged',
        excerpt: 'A separate water authority story from last week.',
        publishedAt: new Date('2026-05-20T12:00:00Z'),
      },
    ]);
    (prismaMock.reporterSourceIngestionItem.findMany as any).mockResolvedValue([
      {
        id: 'item-1',
        title: 'School board budget meeting set for Tuesday',
        canonicalUrl: 'https://district.example/budget-meeting',
        publishedAt: new Date('2026-05-24T12:00:00Z'),
        firstSeenAt: new Date('2026-05-24T12:05:00Z'),
        lastSeenAt: new Date('2026-05-24T12:05:00Z'),
        publisher: 'District',
        excerpt: 'The school board will review the proposed budget on Tuesday night.',
        monitoredSource: {
          id: 'source-1',
          label: 'District updates',
          place: {
            id: 'place-1',
            displayName: 'Westmont',
            slug: 'westmont',
            type: 'BOROUGH',
          },
        },
      },
      {
        id: 'item-2',
        title: 'Tuesday school board budget meeting agenda posted',
        canonicalUrl: 'https://newsroom.example/board-budget-meeting',
        publishedAt: new Date('2026-05-24T13:00:00Z'),
        firstSeenAt: new Date('2026-05-24T13:05:00Z'),
        lastSeenAt: new Date('2026-05-24T13:05:00Z'),
        publisher: 'Newsroom',
        excerpt: 'The agenda includes the district budget and staffing discussion.',
        monitoredSource: {
          id: 'source-2',
          label: 'Local newsroom',
          place: {
            id: 'place-1',
            displayName: 'Westmont',
            slug: 'westmont',
            type: 'BOROUGH',
          },
        },
      },
      {
        id: 'item-3',
        title: 'Water authority meeting scheduled',
        canonicalUrl: 'https://authority.example/water-meeting',
        publishedAt: new Date('2026-05-24T14:00:00Z'),
        firstSeenAt: new Date('2026-05-24T14:05:00Z'),
        lastSeenAt: new Date('2026-05-24T14:05:00Z'),
        publisher: 'Authority',
        excerpt: 'The authority will discuss summer infrastructure repairs.',
        monitoredSource: {
          id: 'source-3',
          label: 'Authority notices',
          place: null,
        },
      },
    ]);
    (prismaMock.reporterStoryCandidate.findMany as any).mockResolvedValue([
      {
        id: 'candidate-1',
        title: 'Tuesday school board budget meeting agenda posted',
        summary:
          'The agenda includes the district budget and staffing discussion. The school board will review the proposed budget on Tuesday night.',
        sourceCount: 2,
        itemCount: 2,
        latestSourceAt: new Date('2026-05-24T13:00:00Z'),
        matchedKeywords: ['school board', 'budget'],
        signalLevel: 'LIKELY',
        score: 10,
        reasons: ['appears across 2 sources', 'matches 2 tenant terms', 'has a direct article link'],
        linkedReporterRun: null,
        candidateItems: [
          {
            ingestionItem: {
              id: 'item-2',
              title: 'Tuesday school board budget meeting agenda posted',
              canonicalUrl: 'https://newsroom.example/board-budget-meeting',
              publishedAt: new Date('2026-05-24T13:00:00Z'),
              firstSeenAt: new Date('2026-05-24T13:05:00Z'),
              lastSeenAt: new Date('2026-05-24T13:05:00Z'),
              publisher: 'Newsroom',
              excerpt: 'The agenda includes the district budget and staffing discussion.',
              monitoredSource: {
                id: 'source-2',
                label: 'Local newsroom',
                place: { displayName: 'Westmont' },
              },
            },
          },
        ],
      },
      {
        id: 'candidate-2',
        title: 'Water authority meeting scheduled',
        summary: 'The authority will discuss summer infrastructure repairs.',
        sourceCount: 1,
        itemCount: 1,
        latestSourceAt: new Date('2026-05-24T14:00:00Z'),
        matchedKeywords: [],
        signalLevel: 'POSSIBLE',
        score: 5,
        reasons: ['has a direct article link', 'mentions civic/public-interest terms', 'has recent activity'],
        linkedReporterRun: null,
        candidateItems: [
          {
            ingestionItem: {
              id: 'item-3',
              title: 'Water authority meeting scheduled',
              canonicalUrl: 'https://authority.example/water-meeting',
              publishedAt: new Date('2026-05-24T14:00:00Z'),
              firstSeenAt: new Date('2026-05-24T14:05:00Z'),
              lastSeenAt: new Date('2026-05-24T14:05:00Z'),
              publisher: 'Authority',
              excerpt: 'The authority will discuss summer infrastructure repairs.',
              monitoredSource: {
                id: 'source-3',
                label: 'Authority notices',
                place: null,
              },
            },
          },
        ],
      },
    ]);

    const result = await materializeReporterStoryCandidates({
      communityId: 'community-1',
      limit: 12,
    });

    expect(prismaMock.reporterStoryCandidateItem.deleteMany).toHaveBeenCalled();
    expect(prismaMock.reporterStoryCandidate.deleteMany).toHaveBeenCalledWith({
      where: { communityId: 'community-1' },
    });
    expect(prismaMock.reporterStoryCandidate.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.reporterStoryCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          signalLevel: 'LIKELY',
          sourceCount: 2,
          itemCount: 2,
          matchedKeywords: expect.arrayContaining(['school board', 'budget']),
          candidateItems: {
            create: expect.arrayContaining([
              expect.objectContaining({ ingestionItemId: 'item-1' }),
              expect.objectContaining({ ingestionItemId: 'item-2' }),
            ]),
          },
        }),
      })
    );
    expect(result).toMatchObject({
      candidateCount: 2,
      candidates: expect.arrayContaining([
        expect.objectContaining({
          id: 'candidate-1',
          signal: expect.objectContaining({ level: 'likely', score: 10 }),
          linkedReporterRun: null,
          readiness: expect.objectContaining({
            level: 'unclaimed',
            label: 'Unclaimed Lead',
          }),
        }),
      ]),
    });
  });

  it('lists persisted story candidates in view shape', async () => {
    (prismaMock.reporterStoryCandidate.findMany as any).mockResolvedValue([
      {
        id: 'candidate-1',
        title: 'Budget meeting',
        summary: 'Summary',
        sourceCount: 2,
        itemCount: 2,
        latestSourceAt: new Date('2026-05-24T13:00:00Z'),
        matchedKeywords: ['budget'],
        signalLevel: 'LIKELY',
        score: 9,
        reasons: ['appears across 2 sources'],
        linkedReporterRun: {
          id: 'run-1',
          title: 'Budget meeting',
          topic: 'Budget meeting',
          status: 'READY_FOR_DRAFT',
          blockers: [],
          claims: [
            {
              claimType: 'OFFICIAL_STATEMENT',
              verificationStatus: 'SUPPORTED',
            },
          ],
        },
        candidateItems: [
          {
            ingestionItem: {
              id: 'item-1',
              title: 'Budget meeting',
              canonicalUrl: 'https://example.com/budget',
              publishedAt: new Date('2026-05-24T13:00:00Z'),
              firstSeenAt: new Date('2026-05-24T13:05:00Z'),
              lastSeenAt: new Date('2026-05-24T13:05:00Z'),
              publisher: 'Example',
              excerpt: 'Summary',
              monitoredSource: {
                id: 'source-1',
                label: 'Local newsroom',
                place: { displayName: 'Westmont' },
              },
            },
          },
        ],
      },
    ]);

    const result = await listReporterStoryCandidates({ communityId: 'community-1', limit: 5 });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'candidate-1',
        signal: {
          level: 'likely',
          score: 9,
          reasons: ['appears across 2 sources'],
        },
        readiness: {
          level: 'draftable',
          label: 'Draftable',
          reason: 'Linked run has supported claims and no unresolved follow-up queue.',
          actionableClaimCount: 0,
          supportedClaimCount: 1,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        items: [
          expect.objectContaining({
            id: 'item-1',
            sourceLabel: 'Local newsroom',
            sourcePlaceName: 'Westmont',
          }),
        ],
      }),
    ]);
  });
});
