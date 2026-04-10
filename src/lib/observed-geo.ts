import { db } from '@/lib/db';

type ObservedGeoAggregateRow = {
  city: string | null;
  region: string | null;
  country: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  loginCount: number;
  distinctUserCount: number;
};

function cleanPart(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildObservedGeoLabel(city?: string | null, region?: string | null, country?: string | null) {
  const parts = [cleanPart(city), cleanPart(region), cleanPart(country)].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown';
}

export async function syncObservedGeoLocations() {
  const aggregates = await db.$queryRaw<ObservedGeoAggregateRow[]>`
    SELECT
      NULLIF(BTRIM(city), '') AS city,
      NULLIF(BTRIM(region), '') AS region,
      NULLIF(BTRIM(country), '') AS country,
      MIN("createdAt") AS "firstSeenAt",
      MAX("createdAt") AS "lastSeenAt",
      COUNT(*)::int AS "loginCount",
      COUNT(DISTINCT "userId")::int AS "distinctUserCount"
    FROM login_events
    WHERE city IS NOT NULL OR region IS NOT NULL OR country IS NOT NULL
    GROUP BY 1, 2, 3
  `;

  for (const row of aggregates) {
    const normalizedLabel = buildObservedGeoLabel(row.city, row.region, row.country);

    await db.observedGeoLocation.upsert({
      where: { normalizedLabel },
      update: {
        city: cleanPart(row.city),
        region: cleanPart(row.region),
        country: cleanPart(row.country),
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        loginCount: row.loginCount,
        distinctUserCount: row.distinctUserCount,
      },
      create: {
        normalizedLabel,
        city: cleanPart(row.city),
        region: cleanPart(row.region),
        country: cleanPart(row.country),
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        loginCount: row.loginCount,
        distinctUserCount: row.distinctUserCount,
      },
    });
  }

  return aggregates.length;
}

export async function getObservedGeoLocations(limit = 100) {
  return db.observedGeoLocation.findMany({
    orderBy: [{ distinctUserCount: 'desc' }, { loginCount: 'desc' }, { lastSeenAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      normalizedLabel: true,
      city: true,
      region: true,
      country: true,
      reviewStatus: true,
      firstSeenAt: true,
      lastSeenAt: true,
      loginCount: true,
      distinctUserCount: true,
      matchedPlace: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          type: true,
        },
      },
    },
  });
}
