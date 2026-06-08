import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canManageOrganizationMembership } from '@/lib/organization-membership';
import { hasValidPhoneDigits } from '@/lib/organization-admin';
import { isValidOrganizationType } from '@/lib/organization-taxonomy';
import { sanitizeArticleHtml } from '@/lib/sanitize';

const UpdateWorkspaceOrganizationSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).optional().or(z.literal('')),
    logoUrl: z.string().trim().url().optional().or(z.literal('')),
    bannerUrl: z.string().trim().url().optional().or(z.literal('')),
    websiteUrl: z.string().trim().url().optional().or(z.literal('')),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
    contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
    directoryGroup: z.enum(['BUSINESS', 'GOVERNMENT', 'ORGANIZATION']).optional(),
    organizationType: z.string().trim().min(2).max(80).optional(),
    isPublicMemberRoster: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!hasValidPhoneDigits(value.contactPhone || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactPhone'],
        message: 'Contact phone must include 10 digits.',
      });
    }

    if (value.directoryGroup && value.organizationType && !isValidOrganizationType(value.directoryGroup, value.organizationType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organizationType'],
        message: 'Organization type is not valid for the selected group.',
      });
    }
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; organizationId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const membership = await db.organizationMembership.findFirst({
      where: {
        organizationId: params.organizationId,
        userId,
      },
      select: {
        role: true,
        status: true,
        organization: {
          select: {
            id: true,
            directoryGroup: true,
            organizationType: true,
          },
        },
      },
    });

    if (!membership || !canManageOrganizationMembership({ role: membership.role, status: membership.status })) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateWorkspaceOrganizationSchema.parse(body);
    const nextGroup = validated.directoryGroup || membership.organization.directoryGroup;
    const nextType = validated.organizationType || membership.organization.organizationType;
    const sanitizedDescription =
      validated.description === undefined ? undefined : validated.description ? sanitizeArticleHtml(validated.description) : '';

    if (!isValidOrganizationType(nextGroup, nextType)) {
      return NextResponse.json(
        { error: 'Organization type is not valid for the selected group.' },
        { status: 400 }
      );
    }

    const organization = await db.organization.update({
      where: { id: membership.organization.id },
      data: {
        name: validated.name,
        description: sanitizedDescription === undefined ? undefined : sanitizedDescription || null,
        logoUrl: validated.logoUrl === undefined ? undefined : validated.logoUrl || null,
        bannerUrl: validated.bannerUrl === undefined ? undefined : validated.bannerUrl || null,
        websiteUrl: validated.websiteUrl === undefined ? undefined : validated.websiteUrl || null,
        contactEmail: validated.contactEmail === undefined ? undefined : validated.contactEmail || null,
        contactPhone: validated.contactPhone === undefined ? undefined : validated.contactPhone || null,
        directoryGroup: validated.directoryGroup,
        organizationType: validated.organizationType,
        isPublicMemberRoster: validated.isPublicMemberRoster,
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
        status: true,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating workspace organization:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
