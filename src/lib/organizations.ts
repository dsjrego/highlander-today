import { db } from '@/lib/db';
import { stripHtmlToText } from '@/lib/sanitize';

export function formatOrganizationTypeLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

export function buildOrganizationMetadataDescription(description: string | null, name: string) {
  const trimmed = description ? stripHtmlToText(description) : '';
  if (trimmed) {
    return trimmed.slice(0, 157).trimEnd() + (trimmed.length > 157 ? '...' : '');
  }

  return `${name} organization profile on Highlander Today.`;
}

interface GetPublicOrganizationProfileOptions {
  communityId: string;
  slug: string;
}

export async function getPublicOrganizationProfile({
  communityId,
  slug,
}: GetPublicOrganizationProfileOptions) {
  const now = new Date();

  return db.organization.findFirst({
    where: {
      communityId,
      slug,
      status: 'APPROVED',
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      websiteUrl: true,
      contactEmail: true,
      contactPhone: true,
      directoryGroup: true,
      organizationType: true,
      isPublicMemberRoster: true,
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      locations: {
        where: {
          isPublic: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          label: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          municipality: true,
          contactEmail: true,
          contactPhone: true,
          websiteUrl: true,
          hoursSummary: true,
          isPrimary: true,
        },
      },
      departments: {
        where: {
          isPublic: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          contactEmail: true,
          contactPhone: true,
          websiteUrl: true,
          hoursSummary: true,
          location: {
            select: {
              id: true,
              label: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
        },
      },
      contacts: {
        where: {
          isPublic: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          label: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          websiteUrl: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          location: {
            select: {
              id: true,
              label: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
        },
      },
      memberships: {
        where: {
          status: 'ACTIVE',
          isPublic: true,
        },
        orderBy: [{ isPrimaryContact: 'desc' }, { joinedAt: 'asc' }],
        select: {
          id: true,
          role: true,
          title: true,
          isPrimaryContact: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      events: {
        where: {
          status: 'PUBLISHED',
          OR: [{ endDatetime: { gte: now } }, { endDatetime: null, startDatetime: { gte: now } }],
        },
        orderBy: [{ startDatetime: 'asc' }],
        take: 6,
        select: {
          id: true,
          title: true,
          description: true,
          startDatetime: true,
          endDatetime: true,
          seriesPosition: true,
          seriesCount: true,
          venueLabel: true,
          series: {
            select: {
              id: true,
              summary: true,
              occurrenceCount: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
        },
      },
    },
  });
}
