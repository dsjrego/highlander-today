import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const {
  buildReporterSourceItemDedupeKey,
  buildReporterSourceItemFingerprint,
  recordReporterMonitoredSourceFetch,
} = require('@/lib/reporter/monitored-source-ingestion') as typeof import('@/lib/reporter/monitored-source-ingestion');

describe('reporter monitored source ingestion service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.$transaction as any).mockImplementation(async (callback: any) => callback(prismaMock));
  });

  it('builds stable fallback dedupe keys and fingerprints', () => {
    const item = {
      title: 'Agenda posted',
      canonicalUrl: 'https://example.com/agenda',
      publisher: 'Borough',
    };

    expect(buildReporterSourceItemDedupeKey(item)).toBe('https://example.com/agenda');
    expect(buildReporterSourceItemFingerprint(item)).toHaveLength(64);
  });

  it('records fetch history and upserts ingestion items', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      status: 'ACTIVE',
      lastChangedAt: null,
    });
    (prismaMock.reporterSourceIngestionItem.findMany as any).mockResolvedValue([
      {
        id: 'item-1',
        dedupeKey: 'https://example.com/existing',
        sourceFingerprint: 'old-fingerprint',
      },
    ]);
    (prismaMock.reporterSourceFetch.create as any).mockResolvedValue({
      id: 'fetch-1',
      status: 'SUCCESS',
    });

    const result = await recordReporterMonitoredSourceFetch({
      monitoredSourceId: 'source-1',
      status: 'SUCCESS',
      httpStatus: 200,
      items: [
        {
          canonicalUrl: 'https://example.com/existing',
          title: 'Existing item updated',
          excerpt: 'Updated excerpt',
        },
        {
          canonicalUrl: 'https://example.com/new',
          title: 'New item',
        },
      ],
    });

    expect(prismaMock.reporterSourceIngestionItem.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.reporterSourceIngestionItem.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.reporterSourceFetch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          monitoredSourceId: 'source-1',
          itemCount: 2,
          newItemCount: 1,
          changedItemCount: 1,
        }),
      })
    );
    expect(prismaMock.reporterMonitoredSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'source-1' },
        data: expect.objectContaining({
          lastFetchedAt: expect.any(Date),
          lastSuccessfulAt: expect.any(Date),
          lastChangedAt: expect.any(Date),
        }),
      })
    );
    expect(prismaMock.reporterSourceIngestionItem.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          monitoredSourceId: 'source-1',
          lastSeenAt: expect.objectContaining({
            lt: expect.any(Date),
          }),
        }),
      })
    );
    expect(result.summary).toEqual({
      itemCount: 2,
      newItemCount: 1,
      changedItemCount: 1,
    });
  });
});
