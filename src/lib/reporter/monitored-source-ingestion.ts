import { createHash } from 'crypto';
import type { Prisma, ReporterSourceFetchStatus } from '@prisma/client';
import { db } from '@/lib/db';

type ReporterIngestionItemInput = {
  dedupeKey?: string | null;
  externalId?: string | null;
  canonicalUrl?: string | null;
  title: string;
  excerpt?: string | null;
  publishedAt?: Date | string | null;
  retrievedAt?: Date | string | null;
  publisher?: string | null;
  contentText?: string | null;
  metadataJson?: Prisma.InputJsonValue | null;
};

interface RecordReporterMonitoredSourceFetchInput {
  monitoredSourceId: string;
  status: ReporterSourceFetchStatus;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  httpStatus?: number | null;
  responseEtag?: string | null;
  responseLastModified?: string | null;
  errorMessage?: string | null;
  items?: ReporterIngestionItemInput[];
}

function normalizeDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function compactText(value?: string | null) {
  return value?.trim() || null;
}

export function buildReporterSourceItemFingerprint(item: ReporterIngestionItemInput) {
  const fingerprintSource = JSON.stringify({
    canonicalUrl: compactText(item.canonicalUrl),
    title: item.title.trim(),
    excerpt: compactText(item.excerpt),
    publishedAt: normalizeDate(item.publishedAt)?.toISOString() || null,
    publisher: compactText(item.publisher),
    contentText: compactText(item.contentText),
  });

  return createHash('sha256').update(fingerprintSource).digest('hex');
}

export function buildReporterSourceItemDedupeKey(item: ReporterIngestionItemInput) {
  const explicitKey = compactText(item.dedupeKey);
  if (explicitKey) {
    return explicitKey;
  }

  const externalId = compactText(item.externalId);
  if (externalId) {
    return externalId;
  }

  const canonicalUrl = compactText(item.canonicalUrl);
  if (canonicalUrl) {
    return canonicalUrl;
  }

  return createHash('sha256')
    .update(
      JSON.stringify({
        title: item.title.trim(),
        publishedAt: normalizeDate(item.publishedAt)?.toISOString() || null,
        publisher: compactText(item.publisher),
      })
    )
    .digest('hex');
}

export async function recordReporterMonitoredSourceFetch(
  input: RecordReporterMonitoredSourceFetchInput
) {
  const startedAt = normalizeDate(input.startedAt) || new Date();
  const completedAt = normalizeDate(input.completedAt) || new Date();
  const items = input.items || [];

  return db.$transaction(async (tx) => {
    const monitoredSource = await tx.reporterMonitoredSource.findUnique({
      where: { id: input.monitoredSourceId },
      select: {
        id: true,
        status: true,
        lastChangedAt: true,
      },
    });

    if (!monitoredSource) {
      throw new Error('Monitored source not found.');
    }

    const normalizedItems = items.map((item) => ({
      dedupeKey: buildReporterSourceItemDedupeKey(item),
      externalId: compactText(item.externalId),
      canonicalUrl: compactText(item.canonicalUrl),
      title: item.title.trim(),
      excerpt: compactText(item.excerpt),
      publishedAt: normalizeDate(item.publishedAt),
      retrievedAt: normalizeDate(item.retrievedAt) || completedAt,
      publisher: compactText(item.publisher),
      contentText: compactText(item.contentText),
      metadataJson: item.metadataJson || null,
      sourceFingerprint: buildReporterSourceItemFingerprint(item),
    }));

    const existingItems = normalizedItems.length
      ? await tx.reporterSourceIngestionItem.findMany({
          where: {
            monitoredSourceId: input.monitoredSourceId,
            dedupeKey: {
              in: normalizedItems.map((item) => item.dedupeKey),
            },
          },
          select: {
            id: true,
            dedupeKey: true,
            sourceFingerprint: true,
          },
        })
      : [];

    const existingByDedupeKey = new Map(existingItems.map((item) => [item.dedupeKey, item]));
    let newItemCount = 0;
    let changedItemCount = 0;

    for (const item of normalizedItems) {
      const existing = existingByDedupeKey.get(item.dedupeKey);

      if (!existing) {
        newItemCount += 1;
        await tx.reporterSourceIngestionItem.create({
          data: {
            monitoredSourceId: input.monitoredSourceId,
            dedupeKey: item.dedupeKey,
            externalId: item.externalId,
            canonicalUrl: item.canonicalUrl,
            title: item.title,
            excerpt: item.excerpt,
            publishedAt: item.publishedAt,
            retrievedAt: item.retrievedAt,
            firstSeenAt: completedAt,
            lastSeenAt: completedAt,
            publisher: item.publisher,
            contentText: item.contentText,
            metadataJson: item.metadataJson ?? undefined,
            sourceFingerprint: item.sourceFingerprint,
          },
        });
        continue;
      }

      const hasChanged = existing.sourceFingerprint !== item.sourceFingerprint;
      if (hasChanged) {
        changedItemCount += 1;
      }

      await tx.reporterSourceIngestionItem.update({
        where: {
          monitoredSourceId_dedupeKey: {
            monitoredSourceId: input.monitoredSourceId,
            dedupeKey: item.dedupeKey,
          },
        },
        data: {
          externalId: item.externalId,
          canonicalUrl: item.canonicalUrl,
          title: item.title,
          excerpt: item.excerpt,
          publishedAt: item.publishedAt,
          retrievedAt: item.retrievedAt,
          lastSeenAt: completedAt,
          publisher: item.publisher,
          contentText: item.contentText,
          metadataJson: item.metadataJson ?? undefined,
          sourceFingerprint: item.sourceFingerprint,
        },
      });
    }

    const fetch = await tx.reporterSourceFetch.create({
      data: {
        monitoredSourceId: input.monitoredSourceId,
        status: input.status,
        startedAt,
        completedAt,
        httpStatus: input.httpStatus ?? null,
        responseEtag: compactText(input.responseEtag),
        responseLastModified: compactText(input.responseLastModified),
        sourceFingerprint: normalizedItems.length
          ? createHash('sha256')
              .update(normalizedItems.map((item) => item.sourceFingerprint).join('|'))
              .digest('hex')
          : null,
        errorMessage: compactText(input.errorMessage),
        itemCount: normalizedItems.length,
        newItemCount,
        changedItemCount,
      },
    });

    await tx.reporterMonitoredSource.update({
      where: { id: input.monitoredSourceId },
      data: {
        lastFetchedAt: completedAt,
        lastHttpStatus: input.httpStatus ?? null,
        lastETag: compactText(input.responseEtag),
        lastModifiedHeader: compactText(input.responseLastModified),
        ...(input.status === 'FAILED'
          ? {
              lastErrorAt: completedAt,
              lastErrorMessage: compactText(input.errorMessage),
            }
          : {
              lastSuccessfulAt: completedAt,
              lastErrorAt: null,
              lastErrorMessage: null,
              ...(newItemCount > 0 || changedItemCount > 0 ? { lastChangedAt: completedAt } : {}),
            }),
      },
    });

    return {
      fetch,
      summary: {
        itemCount: normalizedItems.length,
        newItemCount,
        changedItemCount,
      },
    };
  });
}
