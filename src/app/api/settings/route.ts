import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';

const settingKeys = {
  siteName: 'siteName',
  siteDescription: 'siteDescription',
  logoUrl: 'logoUrl',
  bannerUrl: 'bannerUrl',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  maintenanceMode: 'maintenanceMode',
  requireEmailVerification: 'requireEmailVerification',
  allowUserRegistration: 'allowUserRegistration',
  maxUploadSize: 'maxUploadSize',
} as const;

const defaultSettings = {
  siteName: 'Highlander Today',
  siteDescription: 'Community platform',
  logoUrl: null,
  bannerUrl: null,
  primarycolor: 'var(--brand-primary)',
  secondaryColor: 'var(--brand-accent)',
  maintenanceMode: false,
  requireEmailVerification: true,
  allowUserRegistration: true,
  maxUploadSize: 5 * 1024 * 1024,
};

const UpdateSettingsSchema = z.object({
  siteName: z.string().min(1).max(255).optional(),
  siteDescription: z.string().max(1000).optional(),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().min(1).max(50).optional(),
  secondaryColor: z.string().min(1).max(50).optional(),
  maintenanceMode: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  allowUserRegistration: z.boolean().optional(),
  maxUploadSize: z.number().int().positive().optional(),
});

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

function parseNumber(value: string | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function materializeSettings(rows: Array<{ key: string; value: string }>) {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    siteName: byKey.get(settingKeys.siteName) ?? defaultSettings.siteName,
    siteDescription:
      byKey.get(settingKeys.siteDescription) ?? defaultSettings.siteDescription,
    logoUrl: byKey.get(settingKeys.logoUrl) ?? defaultSettings.logoUrl,
    bannerUrl: byKey.get(settingKeys.bannerUrl) ?? defaultSettings.bannerUrl,
    primaryColor: byKey.get(settingKeys.primaryColor) ?? defaultSettings.primaryColor,
    secondaryColor:
      byKey.get(settingKeys.secondaryColor) ?? defaultSettings.secondaryColor,
    maintenanceMode: parseBoolean(
      byKey.get(settingKeys.maintenanceMode),
      defaultSettings.maintenanceMode
    ),
    requireEmailVerification: parseBoolean(
      byKey.get(settingKeys.requireEmailVerification),
      defaultSettings.requireEmailVerification
    ),
    allowUserRegistration: parseBoolean(
      byKey.get(settingKeys.allowUserRegistration),
      defaultSettings.allowUserRegistration
    ),
    maxUploadSize: parseNumber(
      byKey.get(settingKeys.maxUploadSize),
      defaultSettings.maxUploadSize
    ),
  };
}

function requireCommunityId(request: NextRequest) {
  return request.headers.get('x-community-id');
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'settings:view')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const communityId = requireCommunityId(request);
    if (!communityId) {
      return NextResponse.json(
        { error: 'Community context required' },
        { status: 400 }
      );
    }

    const rows = await db.siteSetting.findMany({
      where: { communityId },
      select: { key: true, value: true },
    });

    return NextResponse.json(materializeSettings(rows));
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
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
    if (!checkPermission(userRole, 'settings:update')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const communityId = requireCommunityId(request);
    if (!communityId) {
      return NextResponse.json(
        { error: 'Community context required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = UpdateSettingsSchema.parse(body);

    await db.$transaction(
      Object.entries(validated).map(([key, value]) =>
        db.siteSetting.upsert({
          where: {
            communityId_key: {
              communityId,
              key,
            },
          },
          update: {
            value: value === null ? '' : String(value),
          },
          create: {
            communityId,
            key,
            value: value === null ? '' : String(value),
          },
        })
      )
    );

    const rows = await db.siteSetting.findMany({
      where: { communityId },
      select: { key: true, value: true },
    });

    return NextResponse.json(materializeSettings(rows));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
