import { NextRequest, NextResponse } from 'next/server';
import { MembershipRole, UserPlaceRelationshipType } from '@prisma/client';
import { db } from '@/lib/db';
import { getObservedGeoLocations, syncObservedGeoLocations } from '@/lib/observed-geo';

const CONTRIBUTOR_ROLES = new Set<MembershipRole>([
  'CONTRIBUTOR',
  'STAFF_WRITER',
  'EDITOR',
  'ADMIN',
  'SUPER_ADMIN',
]);

function isSuperAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'SUPER_ADMIN';
}

function buildPlaceMapKey(placeId: string) {
  return placeId;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const shouldSync = request.nextUrl.searchParams.get('sync') === 'true';
    if (shouldSync) {
      await syncObservedGeoLocations();
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [currentRelationships, connectedRelationships, coverageAreas, observedGeo] = await Promise.all([
      db.userPlaceRelationship.findMany({
        where: {
          isCurrent: true,
          placeId: { not: null },
        },
        select: {
          userId: true,
          placeId: true,
          user: {
            select: {
              trustLevel: true,
              memberships: {
                select: { role: true },
                take: 1,
              },
              loginEvents: {
                where: {
                  createdAt: {
                    gte: thirtyDaysAgo,
                  },
                },
                select: { id: true },
                take: 1,
              },
            },
          },
          place: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              type: true,
              admin2Name: true,
            },
          },
        },
      }),
      db.userPlaceRelationship.findMany({
        where: {
          isCurrent: false,
          relationshipType: {
            in: [
              UserPlaceRelationshipType.FROM_HERE,
              UserPlaceRelationshipType.FAMILY_IN,
              UserPlaceRelationshipType.WORKS_IN,
              UserPlaceRelationshipType.OWNS_PROPERTY_IN,
              UserPlaceRelationshipType.CARES_ABOUT,
            ],
          },
          placeId: { not: null },
        },
        select: {
          userId: true,
          placeId: true,
        },
      }),
      db.tenantCoverageArea.findMany({
        where: { isActive: true },
        select: {
          communityId: true,
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          placeId: true,
          coverageType: true,
        },
      }),
      getObservedGeoLocations(50),
    ]);

    const connectedCountByPlace = new Map<string, number>();
    for (const relationship of connectedRelationships) {
      if (!relationship.placeId) {
        continue;
      }

      const key = buildPlaceMapKey(relationship.placeId);
      connectedCountByPlace.set(key, (connectedCountByPlace.get(key) || 0) + 1);
    }

    const coverageByPlace = new Map<
      string,
      Array<{ community: { id: string; name: string; slug: string }; coverageType: string }>
    >();
    for (const area of coverageAreas) {
      const key = buildPlaceMapKey(area.placeId);
      const current = coverageByPlace.get(key) || [];
      current.push({
        community: area.community,
        coverageType: area.coverageType,
      });
      coverageByPlace.set(key, current);
    }

    const declaredPlaces = currentRelationships
      .reduce<
        Array<{
          place: NonNullable<(typeof currentRelationships)[number]['place']>;
          currentResidents: number;
          connectedUsers: number;
          trustedUsers: number;
          contributors: number;
          activeUsers30d: number;
          coverage: Array<{ community: { id: string; name: string; slug: string }; coverageType: string }>;
        }>
      >((accumulator, relationship) => {
        if (!relationship.place) {
          return accumulator;
        }

        const key = buildPlaceMapKey(relationship.place.id);
        const existing = accumulator.find((entry) => entry.place.id === relationship.place?.id);
        const role = relationship.user.memberships[0]?.role ?? 'READER';
        const isTrusted = relationship.user.trustLevel === 'TRUSTED';
        const isActive = relationship.user.loginEvents.length > 0;

        if (existing) {
          existing.currentResidents += 1;
          if (isTrusted) {
            existing.trustedUsers += 1;
          }
          if (CONTRIBUTOR_ROLES.has(role as MembershipRole)) {
            existing.contributors += 1;
          }
          if (isActive) {
            existing.activeUsers30d += 1;
          }
          return accumulator;
        }

        accumulator.push({
          place: relationship.place,
          currentResidents: 1,
          connectedUsers: connectedCountByPlace.get(key) || 0,
          trustedUsers: isTrusted ? 1 : 0,
          contributors: CONTRIBUTOR_ROLES.has(role as MembershipRole) ? 1 : 0,
          activeUsers30d: isActive ? 1 : 0,
          coverage: coverageByPlace.get(key) || [],
        });

        return accumulator;
      }, [])
      .sort((a, b) => {
        if (b.currentResidents !== a.currentResidents) {
          return b.currentResidents - a.currentResidents;
        }
        if (b.activeUsers30d !== a.activeUsers30d) {
          return b.activeUsers30d - a.activeUsers30d;
        }
        return b.trustedUsers - a.trustedUsers;
      });

    const coverageGaps = declaredPlaces.filter((entry) => entry.coverage.length === 0 && entry.currentResidents > 0);

    return NextResponse.json({
      declaredPlaces,
      coverageGaps,
      observedGeo,
    });
  } catch (error) {
    console.error('Error building geography dashboard data:', error);
    return NextResponse.json({ error: 'Failed to build geography dashboard data' }, { status: 500 });
  }
}
