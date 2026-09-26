import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { runReporterDailyCoverageOrchestrator } from '@/lib/reporter/daily-coverage-orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sourceFetchLimit: z.coerce.number().int().min(1).max(50).optional(),
  candidateLimit: z.coerce.number().int().min(1).max(25).optional(),
});

function schedulerSecrets() {
  return [process.env.CRON_SECRET?.trim(), process.env.REPORTER_SCHEDULER_TOKEN?.trim()].filter(
    (value): value is string => Boolean(value)
  );
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ communitySlug: string }> }
) {
  try {
    const secrets = schedulerSecrets();
    if (secrets.length === 0) {
      return NextResponse.json(
        { error: 'Reporter scheduler authentication is not configured' },
        { status: 503 }
      );
    }

    const token = bearerToken(request);
    if (!token || !secrets.includes(token)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { communitySlug } = await props.params;
    const query = querySchema.parse({
      date: request.nextUrl.searchParams.get('date') || undefined,
      sourceFetchLimit: request.nextUrl.searchParams.get('sourceFetchLimit') || undefined,
      candidateLimit: request.nextUrl.searchParams.get('candidateLimit') || undefined,
    });
    const community = await db.community.findUnique({
      where: { slug: communitySlug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!community) {
      return NextResponse.json({ error: 'Requested community not found' }, { status: 404 });
    }

    const result = await runReporterDailyCoverageOrchestrator({
      communityId: community.id,
      date: query.date,
      sourceFetchLimit: query.sourceFetchLimit,
      candidateLimit: query.candidateLimit,
    });

    return NextResponse.json({
      community,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error running reporter daily coverage orchestrator:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to run reporter daily coverage orchestrator',
      },
      { status: 500 }
    );
  }
}
