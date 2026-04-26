import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { canCreateMemoriamSubmission, canReviewMemoriam } from '@/lib/memoriam/permissions';

const CREATE_SUBMISSION_STATUSES = ['DRAFT', 'PENDING_REVIEW'] as const;
const SUBMISSION_TYPES = ['DEATH_NOTICE', 'MEMORIAL_PAGE', 'PRIVATE_REQUEST'] as const;
const PAGE_TYPES = ['DEATH_NOTICE', 'MEMORIAL_PAGE'] as const;
const VERIFICATION_ROLES = [
  'FAMILY',
  'FUNERAL_HOME',
  'CLERGY',
  'CEMETERY',
  'ORGANIZATION',
  'TRUSTED_CONFIRMATION',
  'STAFF',
] as const;

const CreateMemoriamSubmissionSchema = z.object({
  submissionType: z.enum(SUBMISSION_TYPES),
  status: z.enum(CREATE_SUBMISSION_STATUSES).optional().default('PENDING_REVIEW'),
  relationshipToDeceased: z.string().trim().min(2).max(120),
  requesterName: z.string().trim().min(2).max(120).optional().nullable(),
  requesterEmail: z.string().trim().email().max(255).optional().nullable(),
  requesterPhone: z.string().trim().max(40).optional().nullable(),
  summary: z.string().trim().min(10).max(4000),
  person: z.object({
    fullName: z.string().trim().min(2).max(255),
    preferredName: z.string().trim().max(120).optional().nullable(),
    age: z.number().int().min(0).max(130).optional().nullable(),
    townName: z.string().trim().max(120).optional().nullable(),
    birthTownName: z.string().trim().max(120).optional().nullable(),
    deathTownName: z.string().trim().max(120).optional().nullable(),
    birthDate: z.string().datetime().optional().nullable(),
    deathDate: z.string().datetime().optional().nullable(),
  }),
  pageDraft: z
    .object({
      pageType: z.enum(PAGE_TYPES).optional().nullable(),
      title: z.string().trim().min(2).max(255).optional().nullable(),
      shortSummary: z.string().trim().max(600).optional().nullable(),
      biography: z.string().trim().max(20000).optional().nullable(),
      lifeStory: z.string().trim().max(20000).optional().nullable(),
      serviceDetails: z.string().trim().max(5000).optional().nullable(),
      familyDetails: z.string().trim().max(5000).optional().nullable(),
      provenanceNote: z.string().trim().max(500).optional().nullable(),
      categoryId: z.string().uuid().optional().nullable(),
      videoEmbeds: z.array(z.string().url()).max(10).optional().default([]),
      serviceStreamUrl: z.string().url().optional().nullable(),
    })
    .optional()
    .nullable(),
  photos: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        caption: z.string().trim().max(500).optional().nullable(),
        altText: z.string().trim().max(255).optional().nullable(),
      })
    )
    .max(20)
    .optional()
    .default([]),
  verifications: z
    .array(
      z.object({
        verificationRole: z.enum(VERIFICATION_ROLES),
        verifierName: z.string().trim().min(2).max(255),
        verifierOrganization: z.string().trim().max(255).optional().nullable(),
        verifierContact: z.string().trim().max(255).optional().nullable(),
        note: z.string().trim().max(1000).optional().nullable(),
      })
    )
    .max(5)
    .optional()
    .default([]),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function makeUniqueSlug(
  model: 'memorialPerson' | 'memorialPage',
  communityId: string,
  value: string
) {
  const base = slugify(value) || 'memoriam';
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing =
      model === 'memorialPerson'
        ? await db.memorialPerson.findUnique({
            where: { communityId_slug: { communityId, slug: candidate } },
            select: { id: true },
          })
        : await db.memorialPage.findUnique({
            where: { communityId_slug: { communityId, slug: candidate } },
            select: { id: true },
          });

    if (!existing) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

async function resolveCommunity(request: NextRequest) {
  const currentCommunity = await getCurrentCommunity({ headers: request.headers });

  if (currentCommunity) {
    return currentCommunity;
  }

  return db.community.findFirst({
    select: { id: true, name: true, slug: true, domain: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!canReviewMemoriam(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.trim() || undefined;
    const query = searchParams.get('q')?.trim() || undefined;

    const submissions = await db.memorialSubmission.findMany({
      where: {
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
        ...(status ? { status: status as never } : {}),
        ...(query
          ? {
              OR: [
                { requesterName: { contains: query, mode: 'insensitive' } },
                { requesterEmail: { contains: query, mode: 'insensitive' } },
                { relationshipToDeceased: { contains: query, mode: 'insensitive' } },
                { summary: { contains: query, mode: 'insensitive' } },
                { memorialPerson: { fullName: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        submissionType: true,
        status: true,
        relationshipToDeceased: true,
        requesterName: true,
        requesterEmail: true,
        summary: true,
        updatedAt: true,
        createdAt: true,
        memorialPerson: {
          select: {
            id: true,
            fullName: true,
            deathDate: true,
            townName: true,
          },
        },
        memorialPage: {
          select: {
            id: true,
            status: true,
            title: true,
            slug: true,
            pageType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            verifications: true,
            auditLogs: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching memoriam submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memoriam submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userTrustLevel = request.headers.get('x-user-trust-level');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canCreateMemoriamSubmission(userRole, userTrustLevel)) {
      return NextResponse.json(
        { error: 'Only trusted users can start Memoriam submissions' },
        { status: 403 }
      );
    }

    const community = await resolveCommunity(request);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateMemoriamSubmissionSchema.parse(body);

    if (!validated.requesterName && !validated.requesterEmail) {
      return NextResponse.json(
        { error: 'Requester name or email is required for follow-up' },
        { status: 400 }
      );
    }

    if (validated.pageDraft?.categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: validated.pageDraft.categoryId,
          contentModel: 'MEMORIAM',
          OR: [{ communityId: community.id }, { communityId: null }],
        },
        select: { id: true },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Memoriam category not found for this community' },
          { status: 400 }
        );
      }
    }

    const personSlug = await makeUniqueSlug('memorialPerson', community.id, validated.person.fullName);
    const pageTitle =
      validated.pageDraft?.title?.trim() || `${validated.person.fullName.trim()} Memorial`;
    const pageSlug = await makeUniqueSlug('memorialPage', community.id, pageTitle);
    const pageType =
      validated.pageDraft?.pageType ||
      (validated.submissionType === 'DEATH_NOTICE' ? 'DEATH_NOTICE' : 'MEMORIAL_PAGE');

    const createdSubmission = await db.$transaction(async (tx) => {
      const memorialPerson = await tx.memorialPerson.create({
        data: {
          communityId: community.id,
          fullName: validated.person.fullName.trim(),
          slug: personSlug,
          preferredName: validated.person.preferredName?.trim() || null,
          age: validated.person.age ?? null,
          townName: validated.person.townName?.trim() || null,
          birthTownName: validated.person.birthTownName?.trim() || null,
          deathTownName: validated.person.deathTownName?.trim() || null,
          birthDate: validated.person.birthDate ? new Date(validated.person.birthDate) : null,
          deathDate: validated.person.deathDate ? new Date(validated.person.deathDate) : null,
        },
      });

      const firstPhotoUrl = validated.photos?.[0]?.imageUrl ?? null;
      const memorialPage = await tx.memorialPage.create({
        data: {
          communityId: community.id,
          memorialPersonId: memorialPerson.id,
          categoryId: validated.pageDraft?.categoryId || null,
          pageType,
          status: validated.status === 'PENDING_REVIEW' ? 'PENDING_REVIEW' : 'DRAFT',
          title: pageTitle,
          slug: pageSlug,
          shortSummary: validated.pageDraft?.shortSummary?.trim() || null,
          biography: validated.pageDraft?.biography?.trim() || null,
          lifeStory: validated.pageDraft?.lifeStory?.trim() || null,
          serviceDetails: validated.pageDraft?.serviceDetails?.trim() || null,
          familyDetails: validated.pageDraft?.familyDetails?.trim() || null,
          provenanceNote: validated.pageDraft?.provenanceNote?.trim() || null,
          heroImageUrl: firstPhotoUrl,
          videoEmbeds: validated.pageDraft?.videoEmbeds ?? [],
          serviceStreamUrl: validated.pageDraft?.serviceStreamUrl?.trim() || null,
          createdByUserId: userId,
        },
      });

      // Create pending photo records for staff review
      if (validated.photos && validated.photos.length > 0) {
        await tx.memorialPhoto.createMany({
          data: validated.photos.map((photo) => ({
            communityId: community.id,
            memorialPageId: memorialPage.id,
            createdByUserId: userId,
            imageUrl: photo.imageUrl,
            caption: photo.caption?.trim() || null,
            altText: photo.altText?.trim() || null,
            status: 'PENDING',
          })),
        });
      }

      const submission = await tx.memorialSubmission.create({
        data: {
          communityId: community.id,
          memorialPersonId: memorialPerson.id,
          memorialPageId: memorialPage.id,
          submittedByUserId: userId,
          submissionType: validated.submissionType,
          status: validated.status,
          relationshipToDeceased: validated.relationshipToDeceased.trim(),
          requesterName: validated.requesterName?.trim() || null,
          requesterEmail: validated.requesterEmail?.trim() || null,
          requesterPhone: validated.requesterPhone?.trim() || null,
          summary: validated.summary.trim(),
          verifications: {
            create: validated.verifications.map((verification) => ({
              verificationRole: verification.verificationRole,
              verifierName: verification.verifierName.trim(),
              verifierOrganization: verification.verifierOrganization?.trim() || null,
              verifierContact: verification.verifierContact?.trim() || null,
              note: verification.note?.trim() || null,
              createdByUserId: userId,
            })),
          },
          auditLogs: {
            create: {
              communityId: community.id,
              actorUserId: userId,
              action: 'CREATE_SUBMISSION',
              note: 'Initial memoriam submission created',
              metadata: {
                submissionType: validated.submissionType,
                pageType,
                verificationCount: validated.verifications.length,
                photoCount: validated.photos?.length ?? 0,
                hasVideo: (validated.pageDraft?.videoEmbeds?.length ?? 0) > 0,
              },
            },
          },
        },
        select: {
          id: true,
          submissionType: true,
          status: true,
          relationshipToDeceased: true,
          requesterName: true,
          requesterEmail: true,
          requesterPhone: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          memorialPerson: {
            select: {
              id: true,
              fullName: true,
              deathDate: true,
              townName: true,
              slug: true,
            },
          },
          memorialPage: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              pageType: true,
            },
          },
          verifications: {
            select: {
              id: true,
              verificationRole: true,
              verifierName: true,
              status: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return submission;
    });

    return NextResponse.json(createdSubmission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating memoriam submission:', error);
    return NextResponse.json(
      { error: 'Failed to create memoriam submission' },
      { status: 500 }
    );
  }
}
