import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { checkPermission } from '@/lib/permissions';
import {
  parseReporterTenantKeywords,
  REPORTER_TENANT_KEYWORDS_SETTING_KEY,
} from '@/lib/reporter/tenant-keywords';

const UpdateReporterTenantKeywordsSchema = z.object({
  keywordsText: z.string().max(5000),
});

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'reporter:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const setting = await db.siteSetting.findUnique({
      where: {
        communityId_key: {
          communityId: currentCommunity.id,
          key: REPORTER_TENANT_KEYWORDS_SETTING_KEY,
        },
      },
      select: {
        value: true,
      },
    });

    const keywordsText = setting?.value || '';

    return NextResponse.json({
      keywordsText,
      keywords: parseReporterTenantKeywords(keywordsText),
    });
  } catch (error) {
    console.error('Error fetching reporter tenant keywords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporter tenant keywords' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'reporter:assign')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateReporterTenantKeywordsSchema.parse(body);
    const keywordsText = validated.keywordsText.trim();

    await db.siteSetting.upsert({
      where: {
        communityId_key: {
          communityId: currentCommunity.id,
          key: REPORTER_TENANT_KEYWORDS_SETTING_KEY,
        },
      },
      update: {
        value: keywordsText,
      },
      create: {
        communityId: currentCommunity.id,
        key: REPORTER_TENANT_KEYWORDS_SETTING_KEY,
        value: keywordsText,
      },
    });

    return NextResponse.json({
      keywordsText,
      keywords: parseReporterTenantKeywords(keywordsText),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating reporter tenant keywords:', error);
    return NextResponse.json(
      { error: 'Failed to update reporter tenant keywords' },
      { status: 500 }
    );
  }
}
