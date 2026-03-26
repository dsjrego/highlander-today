import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';

const RegisterSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(255),
  dateOfBirth: z.string().trim().optional().or(z.literal('')),
});

const DEFAULT_ALLOW_REGISTRATION = true;
const DEFAULT_COMMUNITY_SLUG = 'highlander-today';

function parseBoolean(value: string | null | undefined, fallback: boolean) {
  if (value === null || value === undefined) {
    return fallback;
  }

  return value === 'true';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RegisterSchema.parse(body);
    const email = validated.email.toLowerCase();

    const community =
      (await db.community.findUnique({
        where: { slug: DEFAULT_COMMUNITY_SLUG },
        select: { id: true },
      })) ||
      (await db.community.findFirst({
        select: { id: true },
      }));

    if (!community) {
      return NextResponse.json(
        { message: 'Community bootstrap is incomplete. Registration is unavailable.' },
        { status: 503 }
      );
    }

    const registrationSetting = await db.siteSetting.findUnique({
      where: {
        communityId_key: {
          communityId: community.id,
          key: 'allowUserRegistration',
        },
      },
      select: { value: true },
    });

    if (!parseBoolean(registrationSetting?.value, DEFAULT_ALLOW_REGISTRATION)) {
      return NextResponse.json(
        { message: 'New registrations are currently disabled.' },
        { status: 403 }
      );
    }

    const bannedEmail = await db.bannedEmail.findUnique({
      where: { email },
      select: { unbannedAt: true },
    });

    if (bannedEmail && !bannedEmail.unbannedAt) {
      return NextResponse.json(
        { message: 'This email address is banned from registration.' },
        { status: 403 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with that email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await db.user.create({
      data: {
        email,
        firstName: validated.firstName,
        lastName: validated.lastName,
        passwordHash,
        dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
        trustLevel: 'REGISTERED',
        memberships: {
          create: {
            communityId: community.id,
            role: 'READER',
          },
        },
      },
      select: { id: true, email: true },
    });

    return NextResponse.json(
      {
        message: 'Registration successful.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation failed.', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Registration failed.' },
      { status: 500 }
    );
  }
}
